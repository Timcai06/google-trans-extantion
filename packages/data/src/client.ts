import {
  compareMutations,
  normalizeLearningProgress,
  objectValue,
  packSyncRequest,
  replayReviews,
  validateMutation,
  validateReviewData,
  validateSyncResponse,
  validateTimestamp,
  validateWordData,
  wordId,
  type LearningProgress,
  type ReviewData,
  type SyncMutation,
  type SyncRecord,
  type SyncRequest,
  type SyncResponse,
  type WordData,
} from '@googletrans/core';
import { clone } from './store.js';
import type {
  ImportReport,
  LibraryBackup,
  LibraryClient,
  LibraryState,
  LibraryStore,
  LibraryWord,
  ReviewInput,
  WordInput,
} from './types.js';

function put(map: Record<string, SyncMutation>, key: string, value: SyncMutation): void {
  Object.defineProperty(map, key, { value, writable: true, enumerable: true, configurable: true });
}
function own<T>(map: Record<string, T>, key: string): T | undefined {
  return Object.prototype.hasOwnProperty.call(map, key) ? map[key] : undefined;
}
function reviewValues(state: LibraryState): Record<string, ReviewData> {
  const values = { ...objectOrEmpty(state.meta.reviewValues) } as Record<string, ReviewData>;
  for (const mutation of [...Object.values(state.records), ...Object.values(state.outbox)]) {
    if (
      mutation.record.kind === 'review' &&
      mutation.record.value &&
      !own(values, mutation.record.id)
    )
      Object.defineProperty(values, mutation.record.id, {
        value: mutation.record.value,
        writable: true,
        enumerable: true,
        configurable: true,
      });
  }
  return values;
}
function assertIdentity(
  state: LibraryState,
  record: Pick<SyncRecord, 'id' | 'kind' | 'value'>,
  originals = reviewValues(state),
): void {
  const current = own(state.records, record.id)?.record;
  const queued = Object.values(state.outbox).find(
    (mutation) => mutation.record.id === record.id,
  )?.record;
  if (
    (current && current.kind !== record.kind) ||
    (queued && queued.kind !== record.kind) ||
    (own(originals, record.id) && record.kind !== 'review')
  )
    throw new TypeError('A record ID cannot change its kind');
  const original = own(originals, record.id);
  if (
    record.kind === 'review' &&
    record.value &&
    original &&
    JSON.stringify(record.value) !== JSON.stringify(original)
  )
    throw new TypeError('Reviews are immutable events. Use a new review ID.');
}
function rememberReview(state: LibraryState, record: SyncRecord): void {
  const values = reviewValues(state);
  if (record.kind === 'review' && record.value) {
    Object.defineProperty(values, record.id, {
      value: record.value,
      writable: true,
      enumerable: true,
      configurable: true,
    });
  }
  state.meta.reviewValues = values;
}
function progress(state: LibraryState, id: string): LearningProgress {
  const word = own(state.records, id)?.record;
  const baseline =
    word?.kind === 'word' && word.value ? word.value.legacy?.learningProgress : undefined;
  return replayReviews(
    Object.values(state.records).filter(
      (mutation) => mutation.record.kind === 'review' && mutation.record.value?.wordId === id,
    ),
    baseline,
  );
}
function backup(state: LibraryState, now: number): LibraryBackup {
  return clone({
    version: 1,
    exportedAt: now,
    records: Object.values(state.records),
    legacy: objectOrEmpty(state.meta.legacy),
    reviewValues: reviewValues(state),
  });
}
export function validateBackup(input: unknown): LibraryBackup {
  const value = objectValue(input, 'backup');
  if (value.version !== 1 || !Array.isArray(value.records) || value.records.length > 100_000)
    throw new TypeError('Unsupported or oversized backup');
  const records = value.records.map(validateMutation);
  if (new Set(records.map((mutation) => mutation.record.id)).size !== records.length)
    throw new TypeError('Duplicate backup record ID');
  const legacy = clone(objectValue(value.legacy ?? {}, 'backup legacy'));
  if (JSON.stringify(legacy).length > 32_000_000)
    throw new RangeError('Legacy backup exceeds limit');
  const originals = Object.fromEntries(
    Object.entries(objectValue(value.reviewValues ?? {}, 'backup review values')).map(
      ([key, review]) => [key, validateReviewData(review)],
    ),
  );
  if (Object.keys(originals).length > 100_000)
    throw new RangeError('Too many original review values');
  for (const { record } of records) {
    if (own(originals, record.id) && record.kind !== 'review')
      throw new TypeError('A record ID cannot change its kind');
    if (record.kind === 'review' && record.value) {
      const original = own(originals, record.id);
      if (original && JSON.stringify(original) !== JSON.stringify(record.value))
        throw new TypeError('Reviews are immutable events');
      Object.defineProperty(originals, record.id, {
        value: record.value,
        writable: true,
        enumerable: true,
        configurable: true,
      });
    }
  }
  return {
    version: 1,
    exportedAt: validateTimestamp(value.exportedAt),
    records,
    legacy,
    reviewValues: originals,
  };
}

export function createLibraryClient(options: {
  store: LibraryStore;
  deviceId: string;
  namespace?: string;
  now?: () => number;
  id?: () => string;
}): LibraryClient {
  const { store, deviceId } = options;
  if (!deviceId.trim() || deviceId.length > 200) throw new TypeError('Invalid deviceId');
  const namespace = options.namespace ?? 'local';
  if (!namespace.trim() || namespace.length > 200) throw new TypeError('Invalid namespace');
  const now = options.now ?? Date.now;
  const id = options.id ?? (() => globalThis.crypto.randomUUID());
  let syncQueue: Promise<unknown> = Promise.resolve();
  const transact = <R>(callback: (state: LibraryState) => R): Promise<R> =>
    store.transaction(namespace, callback);
  const mutate = (
    state: LibraryState,
    record: Omit<SyncRecord, 'updatedAt' | 'deviceId'>,
    after = -1,
  ): SyncMutation => {
    const previous = own(state.records, record.id);
    const updatedAt = validateTimestamp(
      Math.max(now(), (previous?.record.updatedAt ?? -1) + 1, after + 1),
    );
    const mutation = validateMutation({
      mutationId: id(),
      record: { ...record, updatedAt, deviceId },
    });
    assertIdentity(state, mutation.record);
    if (own(state.outbox, mutation.mutationId))
      throw new Error('Mutation ID generator returned a duplicate');
    rememberReview(state, mutation.record);
    put(state.records, record.id, mutation);
    put(state.outbox, mutation.mutationId, mutation);
    return mutation;
  };
  const activeWord = (state: LibraryState, key: string): WordData => {
    const record = own(state.records, key)?.record;
    if (!record || record.kind !== 'word' || record.deleted || !record.value)
      throw new Error('Word not found');
    return record.value;
  };
  const save = (state: LibraryState, input: WordInput): LibraryWord => {
    const key = wordId(input.text, input.sourceLanguage ?? 'en');
    const previous = own(state.records, key)?.record;
    const previousValue = previous?.kind === 'word' && !previous.deleted ? previous.value : null;
    const value = validateWordData({
      ...previousValue,
      ...input,
      context: input.context ?? previousValue?.context ?? '',
      sourceLanguage: input.sourceLanguage ?? previousValue?.sourceLanguage ?? 'en',
      targetLanguage: input.targetLanguage ?? previousValue?.targetLanguage ?? 'zh-CN',
      starred: input.starred ?? previousValue?.starred ?? false,
      createdAt: input.createdAt ?? previousValue?.createdAt ?? now(),
    });
    mutate(state, { id: key, kind: 'word', value, deleted: false });
    return { id: key, ...value, progress: progress(state, key) };
  };
  const mergeBackup = (
    state: LibraryState,
    source: LibraryBackup,
    replace = false,
  ): ImportReport => {
    const originals = reviewValues(state);
    // Validate the whole import against all known immutable identities before changing anything.
    for (const [key, value] of Object.entries(source.reviewValues ?? {})) {
      assertIdentity(state, { id: key, kind: 'review', value }, originals);
    }
    for (const mutation of source.records) assertIdentity(state, mutation.record, originals);
    if (!replace) state.meta.preImportBackup = backup(state, now());
    state.meta.reviewValues = { ...originals, ...source.reviewValues };
    const wanted = new Set(source.records.map((mutation) => mutation.record.id));
    if (replace)
      for (const mutation of Object.values(state.records)) {
        if (!wanted.has(mutation.record.id) && !mutation.record.deleted)
          mutate(state, {
            id: mutation.record.id,
            kind: mutation.record.kind,
            value: null,
            deleted: true,
          });
      }
    for (const mutation of source.records) {
      const previous = own(state.records, mutation.record.id)?.record;
      if (
        replace &&
        previous?.kind === mutation.record.kind &&
        previous.deleted === mutation.record.deleted &&
        JSON.stringify(previous.value) === JSON.stringify(mutation.record.value)
      )
        continue;
      mutate(
        state,
        {
          id: mutation.record.id,
          kind: mutation.record.kind,
          value: mutation.record.value,
          deleted: mutation.record.deleted,
        },
        mutation.record.updatedAt,
      );
    }
    state.meta.legacy = clone(source.legacy);
    return { imported: source.records.length, skipped: 0 };
  };
  const review = (input: ReviewInput): Promise<LearningProgress> =>
    transact((state) => {
      activeWord(state, input.wordId);
      const value = validateReviewData({ ...input, reviewedAt: input.reviewedAt ?? now() });
      const eventId = `review:${id()}`;
      if (own(state.records, eventId)) throw new Error('Review ID generator returned a duplicate');
      mutate(state, { id: eventId, kind: 'review', deleted: false, value });
      return progress(state, input.wordId);
    });

  return {
    namespace,
    saveWord: (input) => transact((state) => save(state, input)),
    listWords: () =>
      transact((state) =>
        Object.values(state.records)
          .flatMap(({ record }) =>
            record.kind === 'word' && !record.deleted && record.value
              ? [{ id: record.id, ...record.value, progress: progress(state, record.id) }]
              : [],
          )
          .sort((a, b) => b.createdAt - a.createdAt || a.id.localeCompare(b.id)),
      ),
    deleteWord: (key) =>
      transact((state) => {
        const existing = own(state.records, key)?.record;
        if (existing?.kind === 'word' && !existing.deleted)
          mutate(state, { id: key, kind: 'word', deleted: true, value: null });
      }),
    setStarred: (key, starred) =>
      transact((state) => {
        const value = validateWordData({ ...activeWord(state, key), starred });
        mutate(state, { id: key, kind: 'word', deleted: false, value });
      }),
    submitReview: review,
    recordReview: review,
    getProgress: (key) => transact((state) => progress(state, key)),
    exportBackup: () => transact((state) => backup(state, now())),
    importBackup: async (input) => {
      const source = validateBackup(input);
      return transact((state) => mergeBackup(state, source));
    },
    getPreImportBackup: () =>
      transact((state) =>
        state.meta.preImportBackup ? validateBackup(state.meta.preImportBackup) : null,
      ),
    restorePreImportBackup: () =>
      transact((state) => {
        if (!state.meta.preImportBackup) throw new Error('No pre-import backup is available');
        return mergeBackup(state, validateBackup(state.meta.preImportBackup), true);
      }),
    importAnonymous: async () => {
      if (namespace === 'local') throw new Error('Already in the local library');
      const source = await store.transaction('local', (state) => backup(state, now()));
      return transact((state) => mergeBackup(state, source));
    },
    importLegacy: async (input) => {
      const source = clone(objectValue(input, 'legacy storage'));
      if (JSON.stringify(source).length > 32_000_000)
        throw new RangeError('Legacy storage exceeds limit');
      return transact((state) => {
        if (state.meta.legacyImported) return { imported: 0, skipped: 0 };
        state.meta.preImportBackup = backup(state, now());
        const words =
          source.translatedWords &&
          typeof source.translatedWords === 'object' &&
          !Array.isArray(source.translatedWords)
            ? (source.translatedWords as Record<string, unknown>)
            : {};
        const learning =
          source.learningProgress &&
          typeof source.learningProgress === 'object' &&
          !Array.isArray(source.learningProgress)
            ? (source.learningProgress as Record<string, unknown>)
            : {};
        let imported = 0;
        let skipped = 0;
        for (const [key, inputWord] of Object.entries(words)) {
          try {
            const word = objectValue(inputWord, 'legacy word');
            const text =
              typeof word.text === 'string'
                ? word.text
                : typeof word.word === 'string'
                  ? word.word
                  : key;
            const sourceLanguage =
              typeof word.sourceLanguage === 'string' ? word.sourceLanguage : 'en';
            const destinationId = wordId(text, sourceLanguage);
            // A migration retry never resurrects a word already deleted in the new library.
            if (own(state.records, destinationId)) {
              skipped++;
              continue;
            }
            const originalProgress = learning[key] ?? word.learningProgress ?? {};
            const created =
              word.createdAt ??
              word.timestamp ??
              word.addedTime ??
              (typeof word.firstUsed === 'string' ? Date.parse(word.firstUsed) : undefined);
            const createdAt =
              typeof created === 'number' && Number.isSafeInteger(created) && created >= 0
                ? created
                : now();
            save(state, {
              text,
              sourceLanguage,
              translation: typeof word.translation === 'string' ? word.translation : '',
              context: typeof word.context === 'string' ? word.context : '',
              targetLanguage:
                typeof word.targetLanguage === 'string' ? word.targetLanguage : 'zh-CN',
              starred: word.starred === true || word.isStarred === true,
              createdAt,
              legacy: {
                ...word,
                learningProgress: {
                  ...objectOrEmpty(originalProgress),
                  ...normalizeLearningProgress(originalProgress),
                },
              },
            });
            imported++;
          } catch (error) {
            if (!(error instanceof TypeError || error instanceof RangeError)) throw error;
            skipped++;
          }
        }
        // Whitelist historical user content so backups never accidentally include credentials.
        state.meta.legacy = Object.fromEntries(
          Object.entries(source).filter(([key]) =>
            [
              'translatedWords',
              'learningProgress',
              'history',
              'learningHistory',
              'challenges',
              'dailyChallenges',
              'learningStats',
            ].includes(key),
          ),
        );
        state.meta.legacyImported = true;
        return { imported, skipped };
      });
    },
    sync: (transport, maxPages = 100) => {
      const operation = syncQueue.then(async () => {
        if (!Number.isInteger(maxPages) || maxPages < 1 || maxPages > 1000)
          throw new RangeError('Invalid sync page limit');
        let pages = 0;
        let sent = 0;
        let received = 0;
        while (pages < maxPages) {
          const request: SyncRequest = await transact((state) =>
            packSyncRequest(state.cursor, Object.values(state.outbox)),
          );
          const response = validateSyncResponse(await transport(clone(request)));
          if (
            response.cursor < request.cursor ||
            response.changes.some((change) => change.cursor <= request.cursor) ||
            response.cursor !== (response.changes.at(-1)?.cursor ?? request.cursor) ||
            (response.hasMore && response.cursor === request.cursor)
          )
            throw new Error('Server cursor did not advance correctly');
          const sentIds = new Set(request.changes.map((mutation) => mutation.mutationId));
          if (response.acknowledged.some((ack) => !sentIds.has(ack)))
            throw new Error('Server acknowledged a mutation that was not sent');
          const pending = await transact((state) => {
            for (const { mutation } of response.changes) {
              assertIdentity(state, mutation.record);
              rememberReview(state, mutation.record);
              const previous = own(state.records, mutation.record.id);
              if (!previous || compareMutations(mutation, previous) > 0)
                put(state.records, mutation.record.id, mutation);
            }
            for (const ack of response.acknowledged) delete state.outbox[ack];
            state.cursor = Math.max(state.cursor, response.cursor);
            return Object.keys(state.outbox).length;
          });
          pages++;
          sent += request.changes.length;
          received += response.changes.length;
          if (!response.hasMore && pending === 0) return { pages, sent, received, pending };
          if (!response.hasMore && request.changes.length > 0 && response.acknowledged.length === 0)
            throw new Error('Server did not acknowledge pending mutations');
        }
        const pending = await transact((state) => Object.keys(state.outbox).length);
        return { pages, sent, received, pending };
      });
      syncQueue = operation.catch(() => undefined);
      return operation;
    },
  };
}
function objectOrEmpty(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
