import { emptyLibraryState, type LibraryState, type LibraryStore } from '@googletrans/data';

/** Driver injection keeps adapter tests independent of native module loading. */
export interface SQLiteTransaction {
  getFirstAsync<T>(sql: string, ...params: string[]): Promise<T | null>;
  runAsync(sql: string, ...params: string[]): Promise<unknown>;
}
export interface SQLiteDriver {
  execAsync(sql: string): Promise<void>;
  withExclusiveTransactionAsync(
    task: (transaction: SQLiteTransaction) => Promise<void>,
  ): Promise<void>;
}
export function createSQLiteStore(database: SQLiteDriver): LibraryStore {
  const ready = database.execAsync(
    'CREATE TABLE IF NOT EXISTS libraries (namespace TEXT PRIMARY KEY NOT NULL, state TEXT NOT NULL)',
  );
  let queue: Promise<unknown> = ready;
  return {
    transaction<R>(namespace: string, update: (state: LibraryState) => R): Promise<R> {
      const operation = queue.then(async () => {
        let result: R;
        await database.withExclusiveTransactionAsync(async (transaction) => {
          const row = await transaction.getFirstAsync<{ state: string }>(
            'SELECT state FROM libraries WHERE namespace = ?',
            namespace,
          );
          const state: LibraryState = row ? JSON.parse(row.state) : emptyLibraryState();
          result = update(state);
          if (
            result !== null &&
            (typeof result === 'object' || typeof result === 'function') &&
            'then' in result
          )
            throw new TypeError('Transaction callback must be synchronous');
          await transaction.runAsync(
            'INSERT INTO libraries(namespace, state) VALUES (?, ?) ON CONFLICT(namespace) DO UPDATE SET state = excluded.state',
            namespace,
            JSON.stringify(state),
          );
        });
        return result!;
      });
      queue = operation.catch(() => {});
      return operation;
    },
  };
}
