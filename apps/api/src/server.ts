import { createApi } from './app';
import { existsSync } from 'node:fs';

// Bundled server lives at apps/api/dist/server.mjs in a local checkout.
// Container deployments supply environment variables directly.
const environmentFile = new URL('../../../.env', import.meta.url);
if (existsSync(environmentFile)) process.loadEnvFile(environmentFile);

function positiveInteger(name: string, fallback: number, max: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 1 || value > max)
    throw new Error(`${name} must be an integer between 1 and ${max}`);
  return value;
}

const providerUrl = process.env.TRANSLATION_API_URL;
if (providerUrl && !['https:', 'http:'].includes(new URL(providerUrl).protocol))
  throw new Error('TRANSLATION_API_URL must use HTTP or HTTPS');
const api = createApi({
  databasePath: process.env.DATABASE_PATH ?? './data/googletrans.sqlite',
  allowedOrigins: (
    process.env.ALLOWED_ORIGINS ??
    'http://localhost:5173,http://localhost:4173,http://127.0.0.1:5173,http://127.0.0.1:4173'
  )
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  pageSize: positiveInteger('SYNC_PAGE_SIZE', 100, 100),
  authRateLimit: positiveInteger('AUTH_RATE_LIMIT', 20, 1000),
  sessionTtlMs: positiveInteger('SESSION_TTL_DAYS', 30, 365) * 86_400_000,
  translation: {
    url: providerUrl,
    key: process.env.TRANSLATION_API_KEY,
    model: process.env.TRANSLATION_MODEL,
    timeoutMs: positiveInteger('TRANSLATION_TIMEOUT_MS', 10_000, 30_000),
  },
});
const port = positiveInteger('PORT', 8787, 65535);
api.server.listen(port, process.env.HOST ?? '127.0.0.1', () => {
  process.stdout.write(`GoogleTrans API listening on port ${port}\n`);
});
let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  const deadline = setTimeout(() => process.exit(1), 10_000).unref();
  try {
    await api.close();
    clearTimeout(deadline);
  } catch {
    process.exitCode = 1;
  }
}
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
