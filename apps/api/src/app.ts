import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { MAX_SYNC_BODY_BYTES, validateSyncRequest } from '@googletrans/core';
import { Storage } from './database';
import { Auth } from './auth';
import { ApiError } from './errors';
import { translate, type TranslationConfig } from './translate';

export type ApiOptions = {
  databasePath?: string; allowedOrigins?: string[]; pageSize?: number; maxBodyBytes?: number;
  sessionTtlMs?: number; now?: () => number; authRateLimit?: number; authRateWindowMs?: number;
  translation?: TranslationConfig;
};

async function readJson(request: IncomingMessage, maxBytes: number): Promise<unknown> {
  if (!(request.headers['content-type'] ?? '').toLowerCase().startsWith('application/json')) {
    throw new ApiError(415, 'JSON_REQUIRED', 'Use Content-Type: application/json.');
  }
  const declared = Number(request.headers['content-length']);
  if (Number.isFinite(declared) && declared > maxBytes) throw new ApiError(413, 'BODY_TOO_LARGE', 'Request body exceeds the size limit.');
  let bytes = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    bytes += buffer.byteLength;
    if (bytes > maxBytes) throw new ApiError(413, 'BODY_TOO_LARGE', 'Request body exceeds the size limit.');
    chunks.push(buffer);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new ApiError(400, 'INVALID_JSON', 'Request body must be valid JSON.'); }
}

function json(response: ServerResponse, status: number, value: unknown) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(value));
}

export function createApi(options: ApiOptions = {}) {
  const storage = new Storage(options.databasePath ?? './data/googletrans.sqlite');
  const now = options.now ?? Date.now;
  const auth = new Auth(storage, now, options.sessionTtlMs ?? 30 * 86_400_000);
  const allowedOrigins = new Set(options.allowedOrigins ?? ['http://localhost:5173', 'http://localhost:4173', 'http://127.0.0.1:5173', 'http://127.0.0.1:4173']);
  const pageSize = options.pageSize ?? 100;
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) throw new Error('pageSize must be between 1 and 100');
  const attempts = new Map<string, { count: number; expires: number }>();
  const rateWindow = options.authRateWindowMs ?? 15 * 60_000;
  const rateLimit = options.authRateLimit ?? 20;
  const inFlightAuth = new Map<string, number>();
  let activeAuth = 0;
  let activeTranslations = 0;

  function rateCheck(key: string) {
    const timestamp = now();
    for (const [ip, bucket] of attempts) if (bucket.expires <= timestamp) attempts.delete(ip);
    let bucket = attempts.get(key);
    if (!bucket) {
      // Bound memory even when the process is reached directly from many addresses.
      if (attempts.size >= 10_000) throw new ApiError(429, 'RATE_LIMITED', 'Too many authentication requests. Try again later.');
      bucket = { count: 0, expires: timestamp + rateWindow };
      attempts.set(key, bucket);
    }
    if (++bucket.count > rateLimit) throw new ApiError(429, 'RATE_LIMITED', 'Too many authentication attempts. Try again later.');
  }

  const server = createServer(async (request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Vary', 'Origin');
    try {
      const origin = request.headers.origin;
      if (origin) {
        if (!allowedOrigins.has(origin)) throw new ApiError(403, 'ORIGIN_NOT_ALLOWED', 'This client origin is not allowed.');
        response.setHeader('Access-Control-Allow-Origin', origin);
        response.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
        response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      }
      if (request.method === 'OPTIONS') { response.writeHead(204); response.end(); return; }
      const route = new URL(request.url ?? '/', 'http://localhost').pathname;
      if (request.method === 'GET' && route === '/health') { json(response, 200, { status: 'ok' }); return; }
      if (request.method === 'POST' && (route === '/v1/auth/register' || route === '/v1/auth/login')) {
        const ip = request.socket.remoteAddress ?? 'unknown';
        // Never trust X-Forwarded-For from arbitrary clients. Rate limiting at a proxy
        // should additionally cover its individual clients.
        rateCheck(ip);
        const pending = inFlightAuth.get(ip) ?? 0;
        if (pending >= 4 || activeAuth >= 32) throw new ApiError(429, 'RATE_LIMITED', 'Too many simultaneous authentication requests.');
        inFlightAuth.set(ip, pending + 1);
        activeAuth++;
        try {
          const body = await readJson(request, 4096);
          json(response, route.endsWith('register') ? 201 : 200,
            route.endsWith('register') ? await auth.register(body) : await auth.login(body));
        } finally {
          activeAuth--;
          const remaining = (inFlightAuth.get(ip) ?? 1) - 1;
          if (remaining > 0) inFlightAuth.set(ip, remaining); else inFlightAuth.delete(ip);
        }
        return;
      }
      if (!['/v1/auth/me', '/v1/auth/logout', '/v1/sync', '/v1/translate'].includes(route)) {
        throw new ApiError(404, 'NOT_FOUND', 'Endpoint not found.');
      }
      const user = auth.authenticate(request.headers.authorization);
      if (request.method === 'GET' && route === '/v1/auth/me') { json(response, 200, { user }); return; }
      if (request.method === 'POST' && route === '/v1/auth/logout') {
        auth.logout(request.headers.authorization!); json(response, 200, { ok: true }); return;
      }
      if (request.method === 'POST' && route === '/v1/sync') {
        const body = await readJson(request, options.maxBodyBytes ?? MAX_SYNC_BODY_BYTES);
        let syncRequest;
        try { syncRequest = validateSyncRequest(body); }
        catch { throw new ApiError(400, 'INVALID_SYNC', 'Sync request contains invalid records or cursor.'); }
        json(response, 200, storage.sync(user.id, syncRequest, pageSize)); return;
      }
      if (request.method === 'POST' && route === '/v1/translate') {
        const body = await readJson(request, 64_000);
        if (activeTranslations >= 8) throw new ApiError(429, 'RATE_LIMITED', 'Too many translation requests. Try again shortly.');
        activeTranslations++;
        try { json(response, 200, await translate(body, options.translation ?? {})); }
        finally { activeTranslations--; }
        return;
      }
      throw new ApiError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed for this endpoint.');
    } catch (error) {
      const failure = error instanceof ApiError ? error : new ApiError(500, 'INTERNAL_ERROR', 'The request could not be completed.');
      if (failure.status === 429) response.setHeader('Retry-After', String(Math.ceil(rateWindow / 1000)));
      if (!response.headersSent && !response.destroyed) json(response, failure.status, { error: { code: failure.code, message: failure.message } });
      else if (!response.destroyed) response.end();
    }
  });
  server.requestTimeout = 30_000;
  server.headersTimeout = 15_000;
  server.keepAliveTimeout = 5_000;
  return {
    server, storage,
    async close() {
      if (server.listening) await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
      storage.close();
    },
  };
}
