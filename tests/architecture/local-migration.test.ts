import { describe, expect, it } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { createIndexedDBStore, createLibraryClient, createMemoryStore } from '@googletrans/data';
import { readPreviousLibrary } from '../../apps/extension/runtime/previous-library';

function client(store = createMemoryStore()) {
  let id = 0;
  return createLibraryClient({
    store,
    deviceId: 'migration',
    now: () => 1000,
    id: () => `migration-${++id}`,
  });
}

describe.each([
  ['memory', () => createMemoryStore()],
  ['IndexedDB', () => createIndexedDBStore({ indexedDB: new IDBFactory(), name: 'new-library' })],
] as const)('%s local migration reconciliation', (_, store) => {
  it('imports old primitive/aliased entries, preserves ISO dates, and strips nested credentials', async () => {
    const library = client(store());
    const source = {
      translatedWords: {
        hello: '你好',
        second: {
          original: 'author',
          meaning: { text: '作者' },
          language: 'en',
          sentence: 'An author.',
          createdAt: '2026-09-20T00:00:00Z',
          author: 'kept',
          nested: [
            {
              api_key: 'nested-secret',
              secretKey: 'nested-secret-key',
              authHeader: 'nested-secret-header',
              definition: 'kept',
            },
          ],
        },
        broken: null,
      },
      learningHistory: { day: { token: 'history-secret', total: 2 } },
      userSettings: {
        theme: 'dark',
        dailyGoal: 25,
        key: 'settings-secret',
        arbitrary: 'not retained',
      },
      googletransPreferences: {
        autoSave: true,
        disabledHosts: ['example.com'],
        providerKey: 'provider-secret',
      },
    };
    const original = structuredClone(source);
    expect(await library.importLegacy(source)).toEqual({ imported: 2, skipped: 1 });
    const word = (await library.listWords()).find((value) => value.text === 'author');
    expect(word).toMatchObject({
      translation: '作者',
      context: 'An author.',
      createdAt: Date.parse('2026-09-20T00:00:00Z'),
      legacy: { author: 'kept', nested: [{ definition: 'kept' }] },
    });
    const backup = await library.exportBackup();
    expect(backup.legacy).toMatchObject({
      learningHistory: { day: { total: 2 } },
      userSettings: { theme: 'dark', dailyGoal: 25 },
      googletransPreferences: { autoSave: true, disabledHosts: ['example.com'] },
    });
    expect(JSON.stringify(backup)).not.toContain('secret');
    expect(source).toEqual(original);
  });

  it('imports a second source after Chrome migration, preserving current words, tombstones and histories', async () => {
    const library = client(store());
    await library.importLegacy({
      translatedWords: { current: '当前', removed: '删除' },
      learningHistory: { chrome: { count: 2 } },
    });
    const removed = (await library.listWords()).find((value) => value.text === 'removed')!;
    await library.deleteWord(removed.id);
    const source = {
      translatedWords: {
        current: '不要覆盖',
        removed: '不要复活',
        new: {
          text: 'new',
          translation: '新',
          learningProgress: { masteryLevel: 3, reviewCount: 8, correctCount: 6, nextReview: 555 },
        },
      },
      learningHistory: { previousRuntime: { events: [{ id: 'old-review', correct: true }] } },
    };
    expect(await library.importLegacy(source, { sourceId: 'googletrans-vocabulary' })).toEqual({
      imported: 1,
      skipped: 2,
    });
    const words = await library.listWords();
    expect(words.find((word) => word.text === 'current')?.translation).toBe('当前');
    expect(words.find((word) => word.text === 'removed')).toBeUndefined();
    expect(words.find((word) => word.text === 'new')?.progress).toMatchObject({
      masteryLevel: 3,
      reviewCount: 8,
      correctCount: 6,
      nextReview: 555,
    });
    const exported = await library.exportBackup();
    expect(exported.legacy).toMatchObject({
      learningHistory: { chrome: { count: 2 } },
      previousLibraries: { 'googletrans-vocabulary': { learningHistory: source.learningHistory } },
    });
    expect(exported.records.filter((value) => value.record.kind === 'review')).toEqual([]);
    expect(await library.importLegacy(source, { sourceId: 'googletrans-vocabulary' })).toEqual({
      imported: 0,
      skipped: 0,
    });
    expect(await library.exportBackup()).toEqual(exported);
    expect(await library.getPreImportBackup()).not.toBeNull();
    await library.restorePreImportBackup();
    expect((await library.listWords()).map((word) => word.text)).toEqual(['current']);
    expect(await library.importLegacy(source, { sourceId: 'googletrans-vocabulary' })).toEqual({
      imported: 0,
      skipped: 0,
    });
  });

  it('rejects an invalid migration source before changing records or recovery snapshots', async () => {
    const library = client(store());
    await expect(
      library.importLegacy({ translatedWords: { word: '词' } }, { sourceId: '' }),
    ).rejects.toThrow('Invalid legacy migration source');
    expect(await library.listWords()).toEqual([]);
    expect(await library.getPreImportBackup()).toBeNull();
  });

  it('accepts previous exported JSON files without replaying archived reviews, and deduplicates reordered input', async () => {
    const library = client(store());
    await library.importLegacy({ translatedWords: { chrome: '浏览器' } });
    const file = {
      format: 'googletrans-learning-backup',
      version: 1,
      exportedAt: 500,
      entries: [
        {
          id: 'old-id',
          text: 'imported',
          language: 'en',
          translation: '导入',
          context: '',
          createdAt: 100,
          updatedAt: 200,
          starred: true,
        },
      ],
      progress: [
        { entryId: 'old-id', masteryLevel: 2, reviewCount: 3, correctCount: 2, nextReview: 555 },
      ],
      events: [{ id: 'old-event', entryId: 'old-id', correct: true }],
      history: [{ date: '2026-09-20', dateSemantics: 'legacy-utc' }],
      challenges: [],
      preferences: { theme: 'dark', key: 'file-secret' },
    };
    expect(await library.importBackup(file)).toEqual({ imported: 1, skipped: 0 });
    expect((await library.listWords()).find((word) => word.text === 'imported')).toMatchObject({
      starred: true,
      progress: { reviewCount: 3, correctCount: 2, nextReview: 555 },
    });
    const after = await library.exportBackup();
    expect(after.records.filter((value) => value.record.kind === 'review')).toEqual([]);
    expect(JSON.stringify(after.legacy)).toContain('old-event');
    expect(JSON.stringify(after.legacy)).not.toContain('file-secret');
    expect(await library.importBackup(Object.fromEntries(Object.entries(file).reverse()))).toEqual({
      imported: 0,
      skipped: 0,
    });
    expect(await library.exportBackup()).toEqual(after);
    await library.importBackup({
      ...file,
      exportedAt: 600,
      entries: [{ ...file.entries[0], id: 'other', text: 'another' }],
      progress: [],
      events: [],
    });
    expect(
      Object.keys((await library.exportBackup()).legacy.previousLibraries as object),
    ).toHaveLength(2);
  });

  it('rejects malformed previous JSON before writing any words or pre-import snapshot', async () => {
    const library = client(store());
    await expect(
      library.importBackup({
        format: 'googletrans-learning-backup',
        version: 1,
        entries: [{}],
        progress: [],
        events: [],
        history: [],
        challenges: [],
      }),
    ).rejects.toThrow('Invalid or duplicate');
    expect(await library.listWords()).toEqual([]);
    expect(await library.getPreImportBackup()).toBeNull();
  });
});

async function previousDatabase(
  factory: IDBFactory,
  stores = ['entries', 'progress', 'events', 'history', 'challenges', 'legacyMappings'],
) {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = factory.open('googletrans-vocabulary', 3);
    request.onupgradeneeded = () => {
      for (const store of stores) request.result.createObjectStore(store, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

describe('previous runtime IndexedDB adapter', () => {
  it('does not create a database when the previous runtime was never installed', async () => {
    const factory = new IDBFactory();
    expect(await readPreviousLibrary(factory)).toBeNull();
    expect(await factory.databases()).toEqual([]);
  });

  it('reads v3 atomically without changing schema or data; keeps all contexts and review history', async () => {
    const factory = new IDBFactory();
    const db = await previousDatabase(factory);
    const entries = [
      {
        id: 'older',
        text: 'same',
        language: 'en',
        translation: '旧',
        context: 'old context',
        updatedAt: 1,
      },
      {
        id: 'newer',
        text: 'same',
        language: 'en',
        translation: '新',
        context: 'new context',
        updatedAt: 2,
      },
    ];
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(['entries', 'progress', 'events'], 'readwrite');
      entries.forEach((entry) => tx.objectStore('entries').put(entry));
      tx.objectStore('progress').put({
        id: 'newer',
        entryId: 'newer',
        reviewCount: 8,
        correctCount: 6,
        masteryLevel: 3,
      });
      tx.objectStore('events').put({ id: 'old-review', entryId: 'newer', correct: true });
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(tx.error);
    });
    const names = Array.from(db.objectStoreNames);
    db.close();
    const source = await readPreviousLibrary(factory);
    expect(source).toMatchObject({
      learningHistory: {
        previousRuntime: {
          version: 3,
          events: [{ id: 'old-review' }],
          entries: expect.arrayContaining(entries),
        },
      },
    });
    const library = client();
    await library.importLegacy(source, { sourceId: 'googletrans-vocabulary' });
    expect(await library.listWords()).toMatchObject([
      { translation: '新', context: 'new context', progress: { reviewCount: 8 } },
    ]);
    const reopened = await previousDatabase(factory);
    expect(reopened.version).toBe(3);
    expect(Array.from(reopened.objectStoreNames)).toEqual(names);
    const original = await new Promise<unknown>((resolve, reject) => {
      const request = reopened.transaction('entries', 'readonly').objectStore('entries').getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    expect(original).toEqual([...entries].sort((a, b) => a.id.localeCompare(b.id)));
    reopened.close();
  });

  it('rejects an unrecognized old database without mutating it or creating an entries store', async () => {
    const factory = new IDBFactory();
    const db = await previousDatabase(factory, ['unknown']);
    db.close();
    await expect(readPreviousLibrary(factory)).rejects.toThrow('结构无法识别');
    const reopened = await previousDatabase(factory, ['unknown']);
    expect(Array.from(reopened.objectStoreNames)).toEqual(['unknown']);
    reopened.close();
  });
});
