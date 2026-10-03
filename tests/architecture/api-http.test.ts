import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createServer } from 'node:http';
import { createApi, type ApiOptions } from '../../apps/api/src/app';
import { wordId, type SyncMutation, type SyncResponse } from '../../packages/core/src/index';

type Running = Awaited<ReturnType<typeof start>>;
const active: Array<ReturnType<typeof createApi>> = [];
const directories: string[] = [];
afterEach(async () => {
  for (const api of active.splice(0)) await api.close();
  for (const directory of directories.splice(0))
    rmSync(directory, { recursive: true, force: true });
});

async function start(options: ApiOptions = {}) {
  const api = createApi({ databasePath: ':memory:', authRateLimit: 100, ...options });
  active.push(api);
  await new Promise<void>((resolve, reject) => {
    api.server.once('error', reject);
    api.server.listen(0, '127.0.0.1', resolve);
  });
  const address = api.server.address();
  if (!address || typeof address === 'string') throw new Error('No HTTP address');
  const base = `http://127.0.0.1:${address.port}`;
  async function call(route: string, body?: unknown, token?: string, extra: RequestInit = {}) {
    const response = await fetch(`${base}${route}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      ...extra,
    });
    return { status: response.status, headers: response.headers, body: await response.json() };
  }
  return { api, base, call };
}
async function register(server: Running, email = 'first@example.com') {
  const response = await server.call('/v1/auth/register', { email, password: 'a good password' });
  expect(response.status).toBe(201);
  return response.body as { token: string; user: { id: string; email: string } };
}
function word(text: string, mutationId: string, updatedAt = 100, deviceId = 'a'): SyncMutation {
  return {
    mutationId,
    record: {
      id: wordId(text, 'en'),
      kind: 'word',
      updatedAt,
      deviceId,
      deleted: false,
      value: {
        text,
        translation: `meaning ${mutationId}`,
        context: '',
        sourceLanguage: 'en',
        targetLanguage: 'zh',
        starred: false,
        createdAt: 1,
      },
    },
  };
}

describe('real HTTP backend', () => {
  it('authenticates, normalizes email, hashes credentials, expires and revokes sessions', async () => {
    let timestamp = 100;
    const server = await start({ now: () => timestamp, sessionTtlMs: 1000 });
    const account = await register(server, 'FIRST@EXAMPLE.COM');
    expect(account.user.email).toBe('first@example.com');
    expect((await server.call('/v1/auth/me', undefined, account.token)).body.user).toEqual(
      account.user,
    );
    const storedUser = server.api.storage.db
      .prepare('SELECT salt, password_hash FROM users')
      .get()!;
    expect(storedUser.password_hash).not.toContain('a good password');
    const storedSession = server.api.storage.db.prepare('SELECT token_hash FROM sessions').get()!;
    expect(storedSession.token_hash).not.toBe(account.token);
    expect(
      (
        await server.call('/v1/auth/login', {
          email: account.user.email,
          password: 'wrong password',
        })
      ).status,
    ).toBe(401);
    expect(
      (
        await server.call('/v1/auth/login', {
          email: 'missing@example.com',
          password: 'wrong password',
        })
      ).status,
    ).toBe(401);
    expect(
      (
        await server.call('/v1/auth/register', {
          email: account.user.email,
          password: 'another password',
        })
      ).status,
    ).toBe(409);
    timestamp += 1001;
    expect((await server.call('/v1/auth/me', undefined, account.token)).status).toBe(401);
    const login = await server.call('/v1/auth/login', {
      email: account.user.email,
      password: 'a good password',
    });
    expect(login.status).toBe(200);
    expect((await server.call('/v1/auth/logout', {}, login.body.token)).status).toBe(200);
    expect((await server.call('/v1/auth/me', undefined, login.body.token)).status).toBe(401);
  });

  it('isolates users, acknowledges duplicates/losers and paginates winning changes', async () => {
    const server = await start({ pageSize: 2 });
    const first = await register(server);
    const second = await register(server, 'second@example.com');
    const batch = [word('alpha', 'm1'), word('beta', 'm2'), word('gamma', 'm3')];
    const result = await server.call('/v1/sync', { cursor: 0, changes: batch }, first.token);
    const page = result.body as SyncResponse;
    expect(page.changes).toHaveLength(2);
    expect(page.hasMore).toBe(true);
    expect(page.acknowledged).toEqual(['m1', 'm2', 'm3']);
    const remainder = (
      await server.call('/v1/sync', { cursor: page.cursor, changes: [] }, first.token)
    ).body as SyncResponse;
    expect(remainder.changes[0]?.mutation.mutationId).toBe('m3');
    expect(remainder.hasMore).toBe(false);
    const replay = await server.call(
      '/v1/sync',
      { cursor: remainder.cursor, changes: [batch[0], word('alpha', 'loser', 1)] },
      first.token,
    );
    expect(replay.body.acknowledged).toEqual(['m1', 'loser']);
    expect(replay.body.changes).toEqual([]);
    expect(replay.body.cursor).toBe(remainder.cursor);
    const isolated = await server.call('/v1/sync', { cursor: 0, changes: [] }, second.token);
    expect(isolated.body.changes).toEqual([]);
    expect(isolated.body.cursor).toBe(0);
    // The same mutation ID is independent in another user's namespace.
    expect(
      (await server.call('/v1/sync', { cursor: 0, changes: [word('delta', 'm1')] }, second.token))
        .status,
    ).toBe(200);
    expect(
      (await server.call('/v1/sync', { cursor: 0, changes: [] }, first.token)).body.changes,
    ).toHaveLength(2);
  });

  it('resolves equal-time/device ties deterministically, keeps tombstones and persists reviews across restart', async () => {
    const directory = mkdtempSync(path.join(tmpdir(), 'googletrans-api-'));
    directories.push(directory);
    const filename = path.join(directory, 'library.sqlite');
    const firstServer = await start({ databasePath: filename });
    const account = await register(firstServer);
    const lower = word('persist', 'a', 100, 'device');
    const higher = word('persist', 'z', 100, 'device');
    const tombstone: SyncMutation = {
      mutationId: 'delete',
      record: {
        id: lower.record.id,
        kind: 'word',
        value: null,
        deleted: true,
        updatedAt: 101,
        deviceId: 'device',
      },
    };
    const review: SyncMutation = {
      mutationId: 'review-write',
      record: {
        id: 'review:one',
        kind: 'review',
        deleted: false,
        updatedAt: 100,
        deviceId: 'device',
        value: { wordId: lower.record.id, correct: true, reviewedAt: 100, mode: 'flashcard' },
      },
    };
    const initial = await firstServer.call(
      '/v1/sync',
      { cursor: 0, changes: [higher, lower, tombstone, review] },
      account.token,
    );
    expect(initial.body.acknowledged).toEqual(['z', 'a', 'delete', 'review-write']);
    expect(
      initial.body.changes.map((change: { mutation: SyncMutation }) => change.mutation.mutationId),
    ).toEqual(['z', 'delete', 'review-write']);
    await firstServer.api.close();
    active.splice(active.indexOf(firstServer.api), 1);
    const restarted = await start({ databasePath: filename });
    expect((await restarted.call('/v1/auth/me', undefined, account.token)).status).toBe(200);
    const replay = await restarted.call(
      '/v1/sync',
      { cursor: 0, changes: [higher] },
      account.token,
    );
    expect(replay.body.changes).toHaveLength(3);
    expect(replay.body.changes[1].mutation.record.deleted).toBe(true);
    expect(replay.body.changes[2].mutation.record.value.correct).toBe(true);
    expect(replay.body.acknowledged).toEqual(['z']);
    expect(readFileSync(filename).includes(Buffer.from(account.token))).toBe(false);
  });

  it('rolls back a whole batch on a conflicting mutation ID', async () => {
    const server = await start();
    const account = await register(server);
    await server.call(
      '/v1/sync',
      { cursor: 0, changes: [word('original', 'existing')] },
      account.token,
    );
    const failure = await server.call(
      '/v1/sync',
      { cursor: 0, changes: [word('new', 'new'), word('changed', 'existing')] },
      account.token,
    );
    expect(failure.status).toBe(409);
    const page = await server.call('/v1/sync', { cursor: 0, changes: [] }, account.token);
    expect(page.body.changes).toHaveLength(1);
    expect(
      server.api.storage.db
        .prepare('SELECT mutation_id FROM mutations WHERE mutation_id = ?')
        .get('new'),
    ).toBeUndefined();
  });

  it('rejects future cursors and protects immutable review contents even after deletion', async () => {
    const server = await start();
    const account = await register(server);
    expect(
      (await server.call('/v1/sync', { cursor: 1000, changes: [] }, account.token)).body.error.code,
    ).toBe('INVALID_CURSOR');
    const review: SyncMutation = {
      mutationId: 'review-original',
      record: {
        id: 'review:immutable',
        kind: 'review',
        deleted: false,
        updatedAt: 100,
        deviceId: 'device',
        value: { wordId: wordId('one', 'en'), correct: true, reviewedAt: 100, mode: 'quiz' },
      },
    };
    const stored = await server.call('/v1/sync', { cursor: 0, changes: [review] }, account.token);
    const changed = {
      ...review,
      mutationId: 'review-edit',
      record: {
        ...review.record,
        updatedAt: 200,
        value: { ...review.record.value!, correct: false },
      },
    };
    expect(
      (
        await server.call(
          '/v1/sync',
          { cursor: stored.body.cursor, changes: [changed] },
          account.token,
        )
      ).body.error.code,
    ).toBe('REVIEW_IMMUTABLE');
    const deleted = {
      mutationId: 'review-delete',
      record: { ...review.record, updatedAt: 300, deleted: true, value: null },
    };
    const tombstone = await server.call(
      '/v1/sync',
      { cursor: stored.body.cursor, changes: [deleted] },
      account.token,
    );
    expect(tombstone.status).toBe(200);
    expect(
      (
        await server.call(
          '/v1/sync',
          {
            cursor: tombstone.body.cursor,
            changes: [{ ...changed, record: { ...changed.record, updatedAt: 400 } }],
          },
          account.token,
        )
      ).body.error.code,
    ).toBe('REVIEW_IMMUTABLE');
  });

  it('rejects invalid input, unapproved origins, oversized bodies and limits authentication', async () => {
    const server = await start({ authRateLimit: 2, allowedOrigins: ['https://allowed.example'] });
    const account = await register(server);
    expect((await server.call('/v1/sync', { cursor: -1, changes: [] }, account.token)).status).toBe(
      400,
    );
    expect(
      (
        await server.call(
          '/v1/sync',
          {
            cursor: 0,
            changes: [
              {
                ...word('test', 'invalid'),
                record: { ...word('test', 'invalid').record, updatedAt: Infinity },
              },
            ],
          },
          account.token,
        )
      ).status,
    ).toBe(400);
    const denied = await server.call('/health', undefined, undefined, {
      headers: { Origin: 'https://evil.example' },
    });
    expect(denied.status).toBe(403);
    const approved = await server.call('/health', undefined, undefined, {
      headers: { Origin: 'https://allowed.example' },
    });
    expect(approved.headers.get('access-control-allow-origin')).toBe('https://allowed.example');
    const preflight = await fetch(`${server.base}/v1/sync`, {
      method: 'OPTIONS',
      headers: { Origin: 'https://allowed.example' },
    });
    expect(preflight.status).toBe(204);
    const oversized = await server.call('/v1/auth/login', {
      email: 'first@example.com',
      password: 'x'.repeat(5000),
    });
    expect(oversized.status).toBe(413);
    const limited = await server.call('/v1/auth/login', {
      email: 'first@example.com',
      password: 'wrong password',
    });
    expect(limited.status).toBe(429);
    expect(limited.headers.get('retry-after')).toBeTruthy();
  });

  it('gives a clear unavailable error without a provider, then calls a real configured provider', async () => {
    const unconfigured = await start();
    const account = await register(unconfigured);
    const body = { text: 'hello', sourceLanguage: 'en', targetLanguage: 'zh' };
    const result = await unconfigured.call('/v1/translate', body, account.token);
    expect(result.status).toBe(503);
    expect(result.body.error.code).toBe('TRANSLATION_UNAVAILABLE');
    let providerAuthorization: string | undefined;
    let providerPayload = '';
    const provider = createServer(async (request, response) => {
      providerAuthorization = request.headers.authorization;
      for await (const chunk of request) providerPayload += chunk;
      response.setHeader('Content-Type', 'application/json');
      response.end(JSON.stringify({ choices: [{ message: { content: '你好' } }] }));
    });
    await new Promise<void>((resolve) => provider.listen(0, '127.0.0.1', resolve));
    try {
      const address = provider.address();
      if (!address || typeof address === 'string') throw new Error('No provider address');
      const configured = await start({
        translation: {
          url: `http://127.0.0.1:${address.port}/chat/completions`,
          key: 'server-secret',
          model: 'test',
        },
      });
      const configuredAccount = await register(configured);
      const translated = await configured.call('/v1/translate', body, configuredAccount.token);
      expect(translated.body).toEqual({ translation: '你好' });
      expect(providerAuthorization).toBe('Bearer server-secret');
      expect(JSON.parse(providerPayload).messages[1].content).toBe('hello');
      expect(JSON.parse(providerPayload).model).toBe('test');
    } finally {
      await new Promise<void>((resolve) => provider.close(() => resolve()));
    }
  });

  it('bounds provider waits and rejects malformed provider output', async () => {
    const provider = createServer((request, response) => {
      if (request.url === '/timeout') return;
      response.setHeader('Content-Type', 'application/json');
      response.end('{"unexpected":"value"}');
    });
    await new Promise<void>((resolve, reject) => {
      provider.once('error', reject);
      provider.listen(0, '127.0.0.1', resolve);
    });
    try {
      const address = provider.address();
      if (!address || typeof address === 'string') throw new Error('No provider address');
      const body = { text: 'hello', sourceLanguage: 'en', targetLanguage: 'zh' };
      const malformed = await start({
        translation: { url: `http://127.0.0.1:${address.port}/malformed`, key: 'secret' },
      });
      const firstAccount = await register(malformed);
      const invalid = await malformed.call('/v1/translate', body, firstAccount.token);
      expect(invalid.status).toBe(502);
      expect(invalid.body.error.code).toBe('TRANSLATION_PROVIDER_ERROR');
      const timeout = await start({
        translation: {
          url: `http://127.0.0.1:${address.port}/timeout`,
          key: 'secret',
          timeoutMs: 20,
        },
      });
      const secondAccount = await register(timeout);
      const timedOut = await timeout.call('/v1/translate', body, secondAccount.token);
      expect(timedOut.status).toBe(504);
      expect(timedOut.body.error.code).toBe('TRANSLATION_TIMEOUT');
    } finally {
      provider.closeAllConnections();
      await new Promise<void>((resolve) => provider.close(() => resolve()));
    }
  });
});
