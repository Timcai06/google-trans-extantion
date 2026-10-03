import { IDBFactory } from 'fake-indexeddb';
import { afterEach, describe, expect, it } from 'vitest';
import { Storage } from '../../apps/api/src/database';
import { createIndexedDBStore, createLibraryClient, createMemoryStore, type LibraryBackup, type LibraryClient, type LibraryStore } from '../../packages/data/src/index.js';
import type { SyncRequest, SyncResponse } from '../../packages/core/src/index.js';

const active: Storage[] = [];
afterEach(() => {
  for (const storage of active.splice(0)) storage.close();
});

function realSyncServer() {
  const storage = new Storage(':memory:');
  active.push(storage);
  const userId = 'backup-regression-user';
  storage.db.prepare('INSERT INTO users(id, email, salt, password_hash, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(userId, 'backup-regression@example.test', 'salt', 'hash', 0);
  const transport = (request: SyncRequest): Promise<SyncResponse> => Promise.resolve(storage.sync(userId, request, 100));
  return { storage, transport };
}

function client(store = createMemoryStore(), deviceId = 'test-device'): LibraryClient {
  let sequence = 0;
  return createLibraryClient({ store, deviceId, now: () => 1_000, id: () => `${deviceId}-${++sequence}` });
}

function snapshot(store: LibraryStore) {
  return store.transaction('local', state => ({ records: state.records, outbox: state.outbox, cursor: state.cursor, meta: state.meta }));
}

function alteredReviewBackup(backup: LibraryBackup, reviewId: string): LibraryBackup {
  const altered = structuredClone(backup);
  const mutation = altered.records.find(item => item.record.id === reviewId)!;
  if (mutation.record.kind !== 'review' || !mutation.record.value) throw new Error('Expected a live review');
  mutation.record.value.correct = false;
  altered.reviewValues![reviewId] = { ...altered.reviewValues![reviewId]!, correct: false };
  return altered;
}

describe('backup regressions for immutable reviews and restore', () => {
  it('rejects a backup that changes a synced review atomically and continues syncing', async () => {
    const { transport } = realSyncServer();
    const store = createMemoryStore();
    const library = client(store);
    const word = await library.saveWord({ text: 'review immutability', translation: '不可变' });
    await library.submitReview({ wordId: word.id, correct: true, mode: 'quiz', reviewedAt: 500 });
    await library.sync(transport);

    const original = await library.exportBackup();
    const stateBeforeImport = await snapshot(store);
    const review = original.records.find(item => item.record.kind === 'review')!;
    const tampered = alteredReviewBackup(original, review.record.id);
    await expect(library.importBackup(tampered)).rejects.toThrow(/immutable/i);
    expect(await library.exportBackup()).toEqual(original);
    expect(await snapshot(store)).toEqual(stateBeforeImport);

    await library.saveWord({ text: 'sync after rejected backup', translation: '继续同步' });
    expect((await library.sync(transport)).pending).toBe(0);
  });

  it('retains original review values through tombstone export and adapter reopen', async () => {
    const factory = new IDBFactory();
    const firstStore = createIndexedDBStore({ indexedDB: factory, name: 'review-tombstone' });
    const library = client(firstStore, 'indexed-device');
    const word = await library.saveWord({ text: 'deleted review', translation: '删除的复习' });
    await library.submitReview({ wordId: word.id, correct: true, mode: 'flashcard', reviewedAt: 501 });
    const live = await library.exportBackup();
    const review = live.records.find(item => item.record.kind === 'review')!;
    const tombstoned = structuredClone(live);
    const tombstone = tombstoned.records.find(item => item.record.id === review.record.id)!;
    tombstone.record.updatedAt += 1;
    tombstone.record.deleted = true;
    tombstone.record.value = null;
    await library.importBackup(tombstoned);

    const reopened = client(createIndexedDBStore({ indexedDB: factory, name: 'review-tombstone' }), 'reopened-device');
    const exported = await reopened.exportBackup();
    expect(exported.records.find(item => item.record.id === review.record.id)?.record.deleted).toBe(true);
    expect(exported.reviewValues?.[review.record.id]).toEqual(review.record.value);
    const tampered = structuredClone(exported);
    tampered.reviewValues![review.record.id] = { ...tampered.reviewValues![review.record.id]!, correct: false };
    const stateBeforeImport = await snapshot(createIndexedDBStore({ indexedDB: factory, name: 'review-tombstone' }));
    await expect(reopened.importBackup(tampered)).rejects.toThrow(/immutable/i);
    expect(await reopened.exportBackup()).toEqual(exported);
    expect(await snapshot(createIndexedDBStore({ indexedDB: factory, name: 'review-tombstone' }))).toEqual(stateBeforeImport);
  });

  it('rejects a record kind change in an imported backup without partial writes', async () => {
    const store = createMemoryStore();
    const persisted = client(store);
    const word = await persisted.saveWord({ text: 'stable identity', translation: '稳定身份' });
    const persistedOriginal = await persisted.exportBackup();
    const persistedChanged = structuredClone(persistedOriginal);
    const persistedMutation = persistedChanged.records.find(item => item.record.id === word.id)!;
    persistedMutation.record.kind = 'review';
    persistedMutation.record.value = { wordId: word.id, correct: true, reviewedAt: 600, mode: 'quiz' };
    const stateBeforeImport = await snapshot(store);

    await expect(persisted.importBackup(persistedChanged)).rejects.toThrow(/kind/i);
    expect(await persisted.exportBackup()).toEqual(persistedOriginal);
    expect(await snapshot(store)).toEqual(stateBeforeImport);
  });

  it('keeps records and outbox unchanged when restoring the same pre-import snapshot twice', async () => {
    const store = createMemoryStore();
    const library = client(store);
    await library.saveWord({ text: 'before import', translation: '导入前' });
    const incoming = client();
    await incoming.saveWord({ text: 'from backup', translation: '来自备份' });
    await library.importBackup(await incoming.exportBackup());

    await library.restorePreImportBackup();
    const afterFirstRestore = await store.transaction('local', state => ({ records: state.records, outbox: state.outbox }));
    await library.restorePreImportBackup();
    const afterSecondRestore = await store.transaction('local', state => ({ records: state.records, outbox: state.outbox }));

    expect(afterSecondRestore).toEqual(afterFirstRestore);
    expect((await library.listWords()).map(item => item.text)).toEqual(['before import']);
  });

  it('replays review progress for a second client through the real storage sync path', async () => {
    const { transport } = realSyncServer();
    const first = client(createMemoryStore(), 'first-device');
    const word = await first.saveWord({ text: 'cross client review', translation: '跨客户端复习' });
    await first.submitReview({ wordId: word.id, correct: true, mode: 'spelling', reviewedAt: 700 });
    await first.sync(transport);

    const second = client(createMemoryStore(), 'second-device');
    expect((await second.sync(transport)).received).toBe(2);
    expect(await second.getProgress(word.id)).toMatchObject({ reviewCount: 1, correctCount: 1, lastReviewed: 700 });
  });
});
