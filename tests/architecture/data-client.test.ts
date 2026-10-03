import { describe, expect, it } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { compareMutations, replayReviews, validateSyncRequest, wordId, type SyncMutation, type SyncRequest, type SyncResponse } from '../../packages/core/src/index.js';
import { createIndexedDBStore, createLibraryClient, createMemoryStore, type LibraryStore } from '../../packages/data/src/index.js';

function client(store = createMemoryStore(), namespace = 'local', deviceId = 'device-a') {
  let sequence = 0;
  return createLibraryClient({ store, namespace, deviceId, now: () => 1_000, id: () => `${deviceId}-${++sequence}` });
}
function server(pageSize = 100) {
  const records = new Map<string, SyncMutation>();
  const log: { cursor: number; mutation: SyncMutation }[] = [];
  const seen = new Set<string>();
  return async (request: SyncRequest): Promise<SyncResponse> => {
    for (const mutation of request.changes) {
      if (seen.has(mutation.mutationId)) continue;
      seen.add(mutation.mutationId);
      const previous = records.get(mutation.record.id);
      if (!previous || compareMutations(mutation, previous) > 0) {
        records.set(mutation.record.id, mutation);
        log.push({ cursor: log.length + 1, mutation });
      }
    }
    const remaining = log.filter(change => change.cursor > request.cursor);
    const changes = remaining.slice(0, pageSize);
    return { acknowledged: request.changes.map(mutation => mutation.mutationId), changes,
      cursor: changes.at(-1)?.cursor ?? request.cursor, hasMore: remaining.length > changes.length };
  };
}

describe('domain sync validation', () => {
  it('canonicalizes Unicode, case and whitespace without identity collisions', () => {
    expect(wordId(' ＨＥＬＬＯ  world ', ' EN ')).toBe(wordId('hello world', 'en'));
    expect(wordId('a:b', 'en')).not.toBe(wordId('b', 'en:a'));
    expect(() => wordId('\uD800', 'en')).toThrow(TypeError);
  });
  it('rejects invalid bodies and word IDs rather than coercing input', async () => {
    const lib = client(); await lib.saveWord({ text: 'hello', translation: '你好' });
    const mutation = (await lib.exportBackup()).records[0]!;
    expect(() => validateSyncRequest({ cursor: '0', changes: [] })).toThrow();
    expect(() => validateSyncRequest({ cursor: 0, changes: [{ ...mutation, record: { ...mutation.record, id: 'wrong' } }] })).toThrow();
    expect(() => validateSyncRequest({ cursor: 0, changes: [mutation, mutation] })).toThrow();
    expect(() => validateSyncRequest({ cursor: 0, changes: Array(101).fill(mutation) })).toThrow();
  });
});

for (const [name, makeStore] of [
  ['memory', () => createMemoryStore()],
  ['IndexedDB', () => createIndexedDBStore({ indexedDB: new IDBFactory() })],
] as const) {
  describe(`${name} transaction and library`, () => {
    it('atomically rolls back failed mutations and recovers the queue', async () => {
      const store = makeStore();
      await expect(store.transaction('local', state => { state.meta.bad = true; throw new Error('abort'); })).rejects.toThrow('abort');
      expect(await store.transaction('local', state => state.meta.bad)).toBeUndefined();
      const lib = client(store);
      await lib.saveWord({ text: 'one', translation: '一' });
      await lib.setStarred(wordId('one', 'en'), true);
      expect((await lib.listWords())[0]?.starred).toBe(true);
      expect(await store.transaction('local', state => Object.keys(state.outbox).length)).toBe(2);
    });
    it('serializes concurrent writes from distinct client instances without losing rows', async () => {
      const store = makeStore();
      const a = client(store, 'local', 'a'); const b = client(store, 'local', 'b');
      await Promise.all(Array.from({ length: 30 }, (_, index) => (index % 2 ? a : b).saveWord({ text: `word ${index}`, translation: '词' })));
      expect(await a.listWords()).toHaveLength(30);
      expect(await store.transaction('local', state => Object.keys(state.outbox).length)).toBe(30);
    });
    it('keeps local and account libraries separate and imports only with an explicit call', async () => {
      const store = makeStore(); const local = client(store); const account = client(store, 'account', 'b');
      await local.saveWord({ text: 'private', translation: '私有' });
      expect(await account.listWords()).toEqual([]);
      await account.importAnonymous();
      expect(await account.listWords()).toHaveLength(1);
      await account.deleteWord(wordId('private', 'en'));
      expect(await local.listWords()).toHaveLength(1);
      expect(await account.listWords()).toHaveLength(0);
    });
    it('replays out-of-order reviews deterministically and deduplicates events', async () => {
      const lib = client(makeStore()); const word = await lib.saveWord({ text: 'learn', translation: '学习' });
      await lib.submitReview({ wordId: word.id, correct: false, mode: 'quiz', reviewedAt: 3_000 });
      const result = await lib.submitReview({ wordId: word.id, correct: true, mode: 'flashcard', reviewedAt: 2_000 });
      expect(result).toMatchObject({ masteryLevel: 0, reviewCount: 2, correctCount: 1, lastReviewed: 3_000 });
      const events = (await lib.exportBackup()).records;
      expect(replayReviews([...events, ...events])).toEqual(result);
    });
    it('retains legacy fields, scheduling, histories and challenges, excluding credentials', async () => {
      const lib = client(makeStore());
      const source = { translatedWords: { hello: { translation: '你好', detailedInfo: { pos: 'noun' }, starred: true, timestamp: 100 } },
        learningProgress: { hello: { masteryLevel: 3, reviewCount: 8, correctCount: 6, nextReview: 555, custom: 'keep' } },
        learningHistory: { day: { words: ['hello'] } }, dailyChallenges: { day: { completed: true } }, token: 'secret' };
      expect(await lib.importLegacy(source)).toEqual({ imported: 1, skipped: 0 });
      const word = (await lib.listWords())[0]!;
      expect(word).toMatchObject({ starred: true, createdAt: 100, progress: { masteryLevel: 3, reviewCount: 8, nextReview: 555 } });
      expect(word.legacy?.detailedInfo).toEqual({ pos: 'noun' });
      expect(word.legacy?.learningProgress).toMatchObject({ custom: 'keep' });
      const next = await lib.submitReview({ wordId: word.id, correct: true, mode: 'spelling' });
      expect(next.reviewCount).toBe(9);
      const exported = await lib.exportBackup();
      expect(exported.legacy.learningHistory).toEqual(source.learningHistory);
      expect(exported.legacy.dailyChallenges).toEqual(source.dailyChallenges);
      expect(JSON.stringify(exported)).not.toContain('secret');
      await lib.deleteWord(word.id);
      expect(await lib.importLegacy(source)).toEqual({ imported: 0, skipped: 0 });
      expect(await lib.listWords()).toEqual([]);
    });
    it('validates backup before writing and snapshots imports for atomic restore', async () => {
      const lib = client(makeStore()); await lib.saveWord({ text: 'first', translation: '一' });
      await expect(lib.importBackup({ version: 1, records: [{ invalid: true }], exportedAt: 0 })).rejects.toThrow();
      expect(await lib.getPreImportBackup()).toBeNull();
      const incoming = client(); await incoming.saveWord({ text: 'second', translation: '二' });
      await lib.importBackup(await incoming.exportBackup());
      expect(await lib.listWords()).toHaveLength(2);
      await lib.restorePreImportBackup();
      expect((await lib.listWords()).map(word => word.text)).toEqual(['first']);
      expect((await lib.exportBackup()).records.find(mutation => mutation.record.id === wordId('second', 'en'))?.record.deleted).toBe(true);
    });
  });
}

describe('sync reconciliation', () => {
  it('persists IndexedDB across independent adapters and keeps transaction scopes atomic', async () => {
    const factory = new IDBFactory();
    const a = client(createIndexedDBStore({ indexedDB: factory }), 'local', 'a');
    const b = client(createIndexedDBStore({ indexedDB: factory }), 'local', 'b');
    await Promise.all([a.saveWord({ text: 'a', translation: '甲' }), b.saveWord({ text: 'b', translation: '乙' })]);
    const reopened = client(createIndexedDBStore({ indexedDB: factory }));
    expect(await reopened.listWords()).toHaveLength(2);
    expect((await reopened.exportBackup()).records).toHaveLength(2);
    const transport = server();
    expect((await reopened.sync(transport)).pending).toBe(0);
  });
  it('handles server pagination and batches more than 100 writes', async () => {
    const transport = server(7); const a = client();
    await Promise.all(Array.from({ length: 105 }, (_, index) => a.saveWord({ text: `word ${index}`, translation: '词' })));
    const report = await a.sync(transport);
    expect(report.sent).toBe(105); expect(report.received).toBe(105); expect(report.pending).toBe(0);
    const b = client(createMemoryStore(), 'local', 'b');
    await b.sync(transport); expect(await b.listWords()).toHaveLength(105);
  });
  it('retries a lost response idempotently without replaying a review twice', async () => {
    const transport = server(); const a = client();
    const word = await a.saveWord({ text: 'hello', translation: '你好' });
    await a.submitReview({ wordId: word.id, correct: true, mode: 'quiz' });
    await expect(a.sync(async request => { await transport(request); throw new Error('network lost'); })).rejects.toThrow('network lost');
    expect((await a.sync(transport)).pending).toBe(0);
    const b = client(createMemoryStore(), 'local', 'b'); await b.sync(transport);
    expect((await b.getProgress(word.id)).reviewCount).toBe(1);
  });
  it('does not let an in-flight response overwrite newer local edits or clear unsent writes', async () => {
    const store = createMemoryStore(); const a = client(store); const transport = server();
    const word = await a.saveWord({ text: 'hello', translation: 'old' });
    let release!: () => void; const gate = new Promise<void>(resolve => { release = resolve; });
    let arrived!: () => void; const arrival = new Promise<void>(resolve => { arrived = resolve; });
    const inFlight = a.sync(async request => { const response = await transport(request); arrived(); await gate; return response; }, 1);
    await arrival; await a.saveWord({ text: 'hello', translation: 'new' }); release();
    const result = await inFlight;
    expect(result.pending).toBe(1);
    expect((await a.listWords())[0]?.translation).toBe('new');
    await a.sync(transport);
    const b = client(createMemoryStore(), 'local', 'b'); await b.sync(transport);
    expect((await b.listWords())[0]?.translation).toBe('new');
    expect((await b.listWords())[0]?.id).toBe(word.id);
  });
  it('retains tombstones and rejects acknowledgments for writes not in the request', async () => {
    const transport = server(); const a = client(); const b = client(createMemoryStore(), 'local', 'b');
    const word = await a.saveWord({ text: 'hello', translation: '你好' }); await a.sync(transport); await b.sync(transport);
    await a.deleteWord(word.id); await a.sync(transport); await b.sync(transport);
    expect(await b.listWords()).toEqual([]);
    expect((await b.exportBackup()).records[0]?.record.deleted).toBe(true);
    await b.saveWord({ text: 'new', translation: '新' });
    await expect(b.sync(async request => ({ cursor: request.cursor, changes: [], acknowledged: ['unsent'], hasMore: false }))).rejects.toThrow('not sent');
    expect((await b.sync(transport)).pending).toBe(0);
  });
  it('rejects regressing cursor responses without losing outbox writes', async () => {
    const lib = client(); const transport = server();
    await lib.saveWord({ text: 'hello', translation: '你好' }); await lib.sync(transport);
    await lib.setStarred(wordId('hello', 'en'), true);
    await expect(lib.sync(async request => ({ cursor: request.cursor - 1, changes: [], acknowledged: request.changes.map(mutation => mutation.mutationId), hasMore: false }))).rejects.toThrow('cursor');
    expect((await lib.sync(transport)).pending).toBe(0);
  });
});
