# Single-instance deployment

The API container builds a bundled Node 24 service and persists SQLite in the `api-data` named volume. The Web container serves the previously built `apps/web/dist` and proxies `/v1/` to the API.

```sh
pnpm build:web
cp .env.example .env
docker compose --env-file .env -f deploy/compose.yaml up --build -d
```

Open `http://localhost:8080`. Configure the Web client's backend URL as `http://localhost:8080` (or your public HTTPS origin). The direct API is available at `http://localhost:8787`. To start only the backend, append `api` to the compose command; no Web build is required.

On a cloud host, put a TLS reverse proxy in front of the loopback-bound ports and route your HTTPS site to port 8080. Set `ALLOWED_ORIGINS` to the public site URL and every extension origin in use. Mobile and extension clients should use that same public HTTPS backend URL. Add per-client auth rate limiting at the outer proxy. Docker's configuration keeps API keys in environment variables; use the host's secret management and restrict `.env` permissions. Do not expose the raw service over plain HTTP publicly.

Use one API replica with this volume. SQLite WAL and transactions are durable on a normal local persistent filesystem; do not mount the database on shared network storage. The volume holds accounts, hashed sessions, sync records, tombstones, review events and mutation history. `docker compose down` preserves it; `down -v` deletes it.

Back up the database using SQLite's online backup tooling, or stop the API before copying the entire volume (including WAL files if present). Restore into the same `/data` path. Do not copy just the active `.sqlite` file while WAL writes are running. Client backups intentionally exclude auth credentials; those are separate from this server database backup.

Local checks build and exercise the Node backend. A real cloud host/TLS endpoint must be provisioned separately; the compose files do not create a cloud account or external deployment.
