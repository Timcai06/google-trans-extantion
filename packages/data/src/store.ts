import type { LibraryState, LibraryStore } from './types.js';

export function emptyLibraryState(): LibraryState {
  return { records: {}, outbox: {}, cursor: 0, meta: {} };
}
export function clone<T>(value: T): T {
  return value === undefined ? value : (JSON.parse(JSON.stringify(value)) as T);
}

function assertSynchronous(value: unknown): void {
  if (value && typeof value === 'object' && 'then' in value)
    throw new TypeError('Storage transaction callback must be synchronous');
}

/** Useful for tests and ephemeral clients; it has the same serializable transaction semantics. */
export function createMemoryStore(): LibraryStore {
  const spaces = new Map<string, LibraryState>();
  let queue: Promise<unknown> = Promise.resolve();
  return {
    transaction<R>(namespace: string, update: (state: LibraryState) => R): Promise<R> {
      const operation = queue.then(() => {
        const draft = clone(spaces.get(namespace) ?? emptyLibraryState());
        const result = update(draft);
        assertSynchronous(result);
        spaces.set(namespace, clone(draft));
        return clone(result);
      });
      queue = operation.catch(() => undefined);
      return operation;
    },
  };
}

/** Records, outbox rows, and metadata share a single native readwrite transaction.
 * IndexedDB serializes this transaction across tabs, extension pages, and client instances.
 * No network or asynchronous callback runs inside the transaction.
 */
export function createIndexedDBStore(
  options: { name?: string; indexedDB?: IDBFactory } = {},
): LibraryStore {
  const factory = options.indexedDB ?? globalThis.indexedDB;
  if (!factory) throw new Error('IndexedDB is unavailable');
  let opening: Promise<IDBDatabase> | undefined;
  const open = (): Promise<IDBDatabase> =>
    (opening ??= new Promise((resolve, reject) => {
      const request = factory.open(options.name ?? 'googletrans-library-v1', 1);
      request.onupgradeneeded = () => {
        for (const name of ['records', 'outbox']) {
          if (!request.result.objectStoreNames.contains(name)) {
            const storage = request.result.createObjectStore(name, {
              keyPath: ['namespace', 'key'],
            });
            storage.createIndex('namespace', 'namespace');
          }
        }
        if (!request.result.objectStoreNames.contains('meta'))
          request.result.createObjectStore('meta');
      };
      request.onerror = () => {
        opening = undefined;
        reject(request.error);
      };
      request.onblocked = () => {
        opening = undefined;
        reject(new Error('Library database upgrade is blocked by an older open page'));
      };
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => {
          db.close();
          opening = undefined;
        };
        resolve(db);
      };
    }));
  return {
    async transaction<R>(namespace: string, update: (state: LibraryState) => R): Promise<R> {
      const db = await open();
      return new Promise<R>((resolve, reject) => {
        const transaction = db.transaction(['records', 'outbox', 'meta'], 'readwrite');
        const recordsStore = transaction.objectStore('records');
        const outboxStore = transaction.objectStore('outbox');
        const metaStore = transaction.objectStore('meta');
        let result: R;
        let failure: unknown;
        const recordsRequest = recordsStore.index('namespace').getAll(namespace);
        const outboxRequest = outboxStore.index('namespace').getAll(namespace);
        const metaRequest = metaStore.get(namespace);
        let loaded = 0;
        const onLoaded = () => {
          if (++loaded !== 3) return;
          try {
            const records = Object.fromEntries(
              (recordsRequest.result as Row[]).map((row) => [row.key, row.mutation]),
            );
            const outbox = Object.fromEntries(
              (outboxRequest.result as Row[]).map((row) => [row.key, row.mutation]),
            );
            const metadata = metaRequest.result as
              | { cursor: number; meta: LibraryState['meta'] }
              | undefined;
            const state: LibraryState = {
              records,
              outbox,
              cursor: metadata?.cursor ?? 0,
              meta: metadata?.meta ?? {},
            };
            const beforeRecords = clone(records);
            const beforeOutbox = clone(outbox);
            result = update(state);
            assertSynchronous(result);
            const persist = (
              storage: IDBObjectStore,
              before: LibraryState['records'],
              after: LibraryState['records'],
            ) => {
              for (const key of Object.keys(before))
                if (!Object.prototype.hasOwnProperty.call(after, key))
                  storage.delete([namespace, key]);
              for (const [key, mutation] of Object.entries(after)) {
                if (JSON.stringify(before[key]) !== JSON.stringify(mutation))
                  storage.put({ namespace, key, mutation });
              }
            };
            persist(recordsStore, beforeRecords, state.records);
            persist(outboxStore, beforeOutbox, state.outbox);
            metaStore.put({ cursor: state.cursor, meta: state.meta }, namespace);
          } catch (error) {
            failure = error;
            transaction.abort();
          }
        };
        recordsRequest.onsuccess = onLoaded;
        outboxRequest.onsuccess = onLoaded;
        metaRequest.onsuccess = onLoaded;
        transaction.oncomplete = () => resolve(result);
        transaction.onabort = () =>
          reject(failure ?? transaction.error ?? new Error('Library transaction aborted'));
        transaction.onerror = () => {
          failure ??= transaction.error;
        };
      });
    },
  };
}
export const createIndexedDbStore = createIndexedDBStore;
type Row = { namespace: string; key: string; mutation: LibraryState['records'][string] };
