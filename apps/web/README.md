# GoogleTrans web

Run `pnpm --filter @googletrans/web dev` or build with `pnpm --filter @googletrans/web build`. The API defaults to `http://127.0.0.1:8787` in development. Production defaults to the page origin so the deployment proxy can serve `/v1` on the same host; an explicit server setting overrides it. Remote servers require HTTPS.

Words persist in IndexedDB `googletrans-library-v1`. Anonymous namespace `local` and authenticated user IDs are isolated. Login does not implicitly upload local words; “导入本机词库到账号” explicitly copies them. Logout retains library data. Web tokens are in **sessionStorage**, so closing the tab removes its login session; server address and device ID are in localStorage. When this same UI runs inside the extension, connection settings use Chrome trusted extension storage under `googletransConnection` and initialization waits for background migration.

All edits commit locally before shared outbox sync. Manual sync, account login, local edits, and reconnect attempt synchronization; an error keeps the outbox for retry. The production service worker caches the built app shell and versioned assets for offline reopening after its first successful installation. API/auth responses are never put in that cache. Serving from HTTPS or localhost is required for the service worker.

Word and translation/context editing, favorites, search, due review with flashcard/translation/spelling modes, progress, optional server translation, JSON backup import/export, and pre-import backup restore use the shared library client.
