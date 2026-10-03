import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import { createLibraryClient } from '@googletrans/data';
import { createSQLiteStore, type SQLiteDriver } from '../../apps/mobile/src/sqlite-store';

function driver(database: DatabaseSync): SQLiteDriver {
  return {
    async execAsync(sql) {
      database.exec(sql);
    },
    async withExclusiveTransactionAsync(task) {
      database.exec('BEGIN EXCLUSIVE');
      try {
        await task({
          async getFirstAsync<T>(sql: string, ...params: string[]) {
            return (database.prepare(sql).get(...params) ?? null) as T | null;
          },
          async runAsync(sql, ...params) {
            return database.prepare(sql).run(...params);
          },
        });
        database.exec('COMMIT');
      } catch (error) {
        database.exec('ROLLBACK');
        throw error;
      }
    },
  };
}
describe('mobile SQLite adapter with real SQLite injected driver', () => {
  it('commits records and outbox atomically, isolates accounts, and survives reopening an adapter', async () => {
    const database = new DatabaseSync(':memory:');
    try {
      const store = createSQLiteStore(driver(database));
      const local = createLibraryClient({
        store,
        deviceId: 'native',
        id: () => 'local-save',
        now: () => 1000,
      });
      await local.saveWord({
        text: 'Offline',
        translation: '离线',
        context: 'Saved without a network.',
      });
      const user = createLibraryClient({
        store,
        deviceId: 'native',
        namespace: 'alice',
        id: () => 'account-save',
        now: () => 2000,
      });
      expect(await user.listWords()).toEqual([]);
      await user.importAnonymous();
      expect(await user.listWords()).toHaveLength(1);
      expect(await local.listWords()).toHaveLength(1);
      const reopened = createSQLiteStore(driver(database));
      const restored = createLibraryClient({ store: reopened, deviceId: 'native' });
      expect((await restored.listWords())[0].context).toBe('Saved without a network.');
      expect(
        await reopened.transaction('local', (state) => Object.keys(state.outbox)),
      ).toHaveLength(1);
      expect(await reopened.transaction('bob', (state) => Object.keys(state.records))).toHaveLength(
        0,
      );
    } finally {
      database.close();
    }
  });
  it('rolls back a callback failure and serializes concurrent read-modify-write operations', async () => {
    const database = new DatabaseSync(':memory:');
    try {
      const store = createSQLiteStore(driver(database));
      await expect(
        store.transaction('local', (state) => {
          state.cursor = 100;
          state.meta.dirty = true;
          throw new Error('abort');
        }),
      ).rejects.toThrow('abort');
      expect(await store.transaction('local', (state) => state.cursor)).toBe(0);
      expect(await store.transaction('local', (state) => state.meta.dirty)).toBeUndefined();
      await expect(
        store.transaction('local', async (state) => {
          state.cursor = 900;
        }),
      ).rejects.toThrow('synchronous');
      expect(await store.transaction('local', (state) => state.cursor)).toBe(0);
      await Promise.all(
        Array.from({ length: 20 }, () =>
          store.transaction('local', (state) => {
            state.cursor += 1;
          }),
        ),
      );
      expect(await store.transaction('local', (state) => state.cursor)).toBe(20);
    } finally {
      database.close();
    }
  });
  it('keeps offline writes queued after a transport error then acknowledges a successful sync', async () => {
    const database = new DatabaseSync(':memory:');
    try {
      const store = createSQLiteStore(driver(database));
      const client = createLibraryClient({
        store,
        deviceId: 'native',
        namespace: 'alice',
        id: () => 'word-write',
        now: () => 1000,
      });
      await client.saveWord({ text: 'retry', translation: '重试' });
      await expect(
        client.sync(async () => {
          throw new Error('offline');
        }),
      ).rejects.toThrow('offline');
      expect(await store.transaction('alice', (state) => Object.keys(state.outbox))).toHaveLength(
        1,
      );
      const result = await client.sync(async (request) => ({
        cursor: 1,
        acknowledged: request.changes.map((change) => change.mutationId),
        changes: request.changes.map((mutation) => ({ cursor: 1, mutation })),
        hasMore: false,
      }));
      expect(result.pending).toBe(0);
      expect(await client.listWords()).toHaveLength(1);
    } finally {
      database.close();
    }
  });
});
