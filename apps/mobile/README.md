# GoogleTrans mobile

`pnpm --filter @googletrans/mobile start` opens the Expo development server. Scan with an SDK 57 compatible Expo Go or use an iOS/Android development build. `pnpm --filter @googletrans/mobile build` exports **native iOS and Android JavaScript bundles**; it does not run a simulator or produce a signed binary.

SQLite stores records, pending mutations, cursor, and metadata together in a transactional namespace. `local` is the anonymous library; each authenticated user ID is a separate library. Login never copies anonymous words automatically. Tokens and server connection settings use Expo SecureStore. Logout retains word data. Automatic sync runs after local edits, when connectivity returns, and when the app resumes; transport errors retain pending mutations. Use “立即同步” to retry.

Set the server address before login. On a physical device `127.0.0.1` points at the phone; use the development computer's LAN address while developing. Production remote connections require HTTPS. Changing server logs out the previous local session.

Backup export opens the native share sheet with JSON and also displays the JSON for copying. Paste that JSON to import into the active library. Backups omit authentication settings. An import keeps the previous library backup for recovery.

Versions were verified against [Expo SDK compatibility](https://docs.expo.dev/versions/latest/) and the [SDK 57 bundled modules](https://github.com/expo/expo/blob/sdk-57/packages/expo/bundledNativeModules.json). Native runtime acceptance requires an actual simulator/device; adapter tests inject Node's real SQLite driver and validate rollback, persistence, account isolation, and offline retry.
