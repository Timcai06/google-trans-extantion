# GoogleTrans HTTP API

Requires Node 24. SQLite is bundled with Node; the only runtime dependency is the bundled shared core.

From the repository root:

```sh
pnpm --filter @googletrans/api build
node --env-file=.env apps/api/dist/server.mjs
```

Copy `.env.example` to `.env` first. Or use `pnpm --filter @googletrans/api start` with exported environment variables. Its default database path is relative to the process working directory, so keep that working directory consistent across restarts. `pnpm --filter @googletrans/api dev` watches API and shared-core source, rebuilds, and restarts the server after successful changes.

`GET /health` is public. Register and login accept `{email,password}` and return `{token,user:{id,email}}`. All other `/v1` endpoints require `Authorization: Bearer <token>`. Passwords require 8–256 characters and are salted with random 32-byte salts and derived using scrypt. Sessions use random 256-bit tokens, store their SHA-256 hashes, expire after `SESSION_TTL_DAYS`, and are revoked by logout. Responses never contain password material. Errors have `{error:{code,message}}`.

`POST /v1/sync` implements the core sync contract. A SQLite transaction records all accepted mutation IDs, acknowledges losing changes, updates winning records and appends winners to a cursor log. A request containing a reused mutation ID with a different payload fails atomically with 409. Pagination returns at most `SYNC_PAGE_SIZE` winning changes; the client must continue while `hasMore` is true. Cursor positions can have gaps because the append log is shared, but all reads and writes are scoped to the authenticated user. Tombstones and review events survive restart. No log compaction is performed, so offline clients can replay the complete history.

`POST /v1/translate` accepts `{text,sourceLanguage,targetLanguage}`. Configure an exact OpenAI-compatible chat-completions URL, server-only API key, and model through `TRANSLATION_*`. Providers may return `choices[0].message.content` or `{translation}`. The service limits input, response size, concurrency and timeout. Without provider configuration it returns 503 `TRANSLATION_UNAVAILABLE`; manual translation entry remains available in clients.

Auth allows 20 attempts per remote IP per 15 minutes by default and at most four simultaneous password derivations per IP. The service deliberately does not trust forwarded IP headers. When using a reverse proxy, also enforce a per-client auth limit there; otherwise all proxied clients share this process limit. Allowed browser origins must be explicitly listed, including the built extension ID. Native clients may omit Origin. No bearer credentials are written to logs.

For cloud deployment, see [deployment instructions](../../deploy/README.md).
