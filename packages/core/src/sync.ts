import {
  applyLearningResult,
  normalizeLearningProgress,
  type LearningProgress,
} from './learning.js';

export interface WordData {
  text: string;
  translation: string;
  context: string;
  sourceLanguage: string;
  targetLanguage: string;
  starred: boolean;
  createdAt: number;
  legacy?: Record<string, unknown>;
}
export interface ReviewData {
  wordId: string;
  correct: boolean;
  reviewedAt: number;
  mode: 'flashcard' | 'quiz' | 'spelling';
}
type RecordMetadata = { id: string; deleted: boolean; updatedAt: number; deviceId: string };
export type SyncRecord = RecordMetadata &
  ({ kind: 'word'; value: WordData | null } | { kind: 'review'; value: ReviewData | null });
export interface SyncMutation {
  mutationId: string;
  record: SyncRecord;
}
export interface ServerChange {
  cursor: number;
  mutation: SyncMutation;
}
export interface SyncRequest {
  cursor: number;
  changes: SyncMutation[];
}
export interface SyncResponse {
  cursor: number;
  changes: ServerChange[];
  acknowledged: string[];
  hasMore: boolean;
}

export const SYNC_BATCH_SIZE = 100;
export const MAX_SYNC_BODY_BYTES = 1_048_576;
export const MAX_TIMESTAMP = Number.MAX_SAFE_INTEGER - 31 * 24 * 60 * 60 * 1000;

/** Portable UTF-8 wire size, including replacement encoding for lone surrogates. */
export function utf8ByteLength(text: string): number {
  let bytes = 0;
  for (let index = 0; index < text.length; index++) {
    const code = text.charCodeAt(index);
    if (code < 0x80) bytes++;
    else if (code < 0x800) bytes += 2;
    else if (
      code >= 0xd800 &&
      code <= 0xdbff &&
      index + 1 < text.length &&
      text.charCodeAt(index + 1) >= 0xdc00 &&
      text.charCodeAt(index + 1) <= 0xdfff
    ) {
      bytes += 4;
      index++;
    } else bytes += 3;
  }
  return bytes;
}

/** Pack the oldest writes first. Exact JSON framing and commas count toward the HTTP limit. */
export function packSyncRequest(cursor: number, mutations: readonly SyncMutation[]): SyncRequest {
  const request: SyncRequest = { cursor: cursorValue(cursor), changes: [] };
  let bytes = utf8ByteLength(JSON.stringify(request));
  for (const mutation of mutations) {
    if (request.changes.length === SYNC_BATCH_SIZE) break;
    const addedBytes =
      utf8ByteLength(JSON.stringify(mutation)) + (request.changes.length > 0 ? 1 : 0);
    if (bytes + addedBytes > MAX_SYNC_BODY_BYTES) {
      if (request.changes.length === 0)
        throw new RangeError('A sync mutation exceeds the request byte limit');
      break;
    }
    request.changes.push(mutation);
    bytes += addedBytes;
  }
  return request;
}

/** Canonical identity is transparent and collision-free, including Unicode input. */
export function wordId(text: string, sourceLanguage: string): string {
  const normalized = text.normalize('NFKC').trim().replace(/\s+/gu, ' ').toLowerCase();
  const language = sourceLanguage.trim().toLowerCase();
  if (!normalized || normalized.length > 500 || !language || language.length > 32)
    throw new TypeError('Invalid word identity');
  try {
    return `word:${encodeURIComponent(language)}:${encodeURIComponent(normalized)}`;
  } catch {
    throw new TypeError('Word identity contains malformed Unicode');
  }
}
const ordinal = (a: string, b: string): number => (a === b ? 0 : a < b ? -1 : 1);
export function compareMutations(a: SyncMutation, b: SyncMutation): number {
  return (
    a.record.updatedAt - b.record.updatedAt ||
    ordinal(a.record.deviceId, b.record.deviceId) ||
    ordinal(a.mutationId, b.mutationId)
  );
}
export function objectValue(input: unknown, label = 'value'): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new TypeError(`${label} must be an object`);
  return input as Record<string, unknown>;
}
function stringValue(input: unknown, label: string, max: number, allowEmpty = false): string {
  if (typeof input !== 'string' || input.length > max || (!allowEmpty && !input.trim()))
    throw new TypeError(`Invalid ${label}`);
  return input;
}
export function validateTimestamp(input: unknown): number {
  if (
    typeof input !== 'number' ||
    !Number.isSafeInteger(input) ||
    input < 0 ||
    input > MAX_TIMESTAMP
  )
    throw new RangeError('Invalid timestamp');
  return input;
}
function cursorValue(input: unknown): number {
  if (typeof input !== 'number' || !Number.isSafeInteger(input) || input < 0)
    throw new RangeError('Invalid cursor');
  return input;
}
function jsonObject(input: unknown): Record<string, unknown> {
  const value = objectValue(input, 'legacy');
  const text = JSON.stringify(value);
  if (text.length > 128_000) throw new RangeError('Legacy word data exceeds limit');
  return JSON.parse(text) as Record<string, unknown>;
}
export function validateWordData(input: unknown): WordData {
  const value = objectValue(input, 'word');
  if (typeof value.starred !== 'boolean') throw new TypeError('Invalid starred');
  const result: WordData = {
    text: stringValue(value.text, 'text', 500),
    translation: stringValue(value.translation, 'translation', 16_000, true),
    context: stringValue(value.context, 'context', 16_000, true),
    sourceLanguage: stringValue(value.sourceLanguage, 'sourceLanguage', 32),
    targetLanguage: stringValue(value.targetLanguage, 'targetLanguage', 32),
    starred: value.starred,
    createdAt: validateTimestamp(value.createdAt),
  };
  if (value.legacy !== undefined) result.legacy = jsonObject(value.legacy);
  return result;
}
export function validateReviewData(input: unknown): ReviewData {
  const value = objectValue(input, 'review');
  if (
    typeof value.correct !== 'boolean' ||
    typeof value.mode !== 'string' ||
    !['flashcard', 'quiz', 'spelling'].includes(value.mode)
  )
    throw new TypeError('Invalid review');
  return {
    wordId: stringValue(value.wordId, 'wordId', 10_000),
    correct: value.correct,
    reviewedAt: validateTimestamp(value.reviewedAt),
    mode: value.mode as ReviewData['mode'],
  };
}
export function validateMutation(input: unknown): SyncMutation {
  const mutation = objectValue(input, 'mutation');
  const record = objectValue(mutation.record, 'record');
  const mutationId = stringValue(mutation.mutationId, 'mutationId', 200);
  const metadata = {
    id: stringValue(record.id, 'record id', 10_000),
    deleted: record.deleted as boolean,
    updatedAt: validateTimestamp(record.updatedAt),
    deviceId: stringValue(record.deviceId, 'deviceId', 200),
  };
  if (typeof record.deleted !== 'boolean') throw new TypeError('Invalid deleted');
  if (record.deleted && record.value !== null)
    throw new TypeError('Tombstone must have null value');
  if (!record.deleted && record.value === null)
    throw new TypeError('Live record must have a value');
  if (record.kind === 'word') {
    const value = record.deleted ? null : validateWordData(record.value);
    if (value && metadata.id !== wordId(value.text, value.sourceLanguage))
      throw new TypeError('Word ID does not match value');
    return { mutationId, record: { ...metadata, kind: 'word', value } };
  }
  if (record.kind === 'review')
    return {
      mutationId,
      record: {
        ...metadata,
        kind: 'review',
        value: record.deleted ? null : validateReviewData(record.value),
      },
    };
  throw new TypeError('Invalid record kind');
}
export function validateSyncRequest(input: unknown): SyncRequest {
  const value = objectValue(input, 'sync request');
  if (utf8ByteLength(JSON.stringify(value)) > MAX_SYNC_BODY_BYTES)
    throw new RangeError('Sync request exceeds the byte limit');
  if (!Array.isArray(value.changes) || value.changes.length > SYNC_BATCH_SIZE)
    throw new RangeError('Invalid changes batch');
  const changes = value.changes.map(validateMutation);
  if (new Set(changes.map((change) => change.mutationId)).size !== changes.length)
    throw new TypeError('Duplicate mutation ID');
  return { cursor: cursorValue(value.cursor), changes };
}
export function validateSyncResponse(input: unknown): SyncResponse {
  const value = objectValue(input, 'sync response');
  if (
    !Array.isArray(value.changes) ||
    value.changes.length > SYNC_BATCH_SIZE ||
    !Array.isArray(value.acknowledged) ||
    value.acknowledged.length > SYNC_BATCH_SIZE ||
    typeof value.hasMore !== 'boolean'
  )
    throw new TypeError('Invalid sync response');
  const cursor = cursorValue(value.cursor);
  let previous = -1;
  const changes = value.changes.map((inputChange) => {
    const change = objectValue(inputChange, 'server change');
    const position = cursorValue(change.cursor);
    if (position <= previous || position > cursor)
      throw new RangeError('Non-monotonic server changes');
    previous = position;
    return { cursor: position, mutation: validateMutation(change.mutation) };
  });
  return {
    cursor,
    changes,
    acknowledged: value.acknowledged.map((id) => stringValue(id, 'acknowledged ID', 200)),
    hasMore: value.hasMore,
  };
}
export function replayReviews(
  events: readonly SyncMutation[],
  initial?: unknown,
): LearningProgress {
  const unique = new Map<string, SyncMutation>();
  for (const event of events) {
    const previous = unique.get(event.record.id);
    if (!previous || compareMutations(event, previous) > 0) unique.set(event.record.id, event);
  }
  const reviews = [...unique.values()].filter(
    (event) =>
      event.record.kind === 'review' && !event.record.deleted && event.record.value !== null,
  );
  reviews.sort(
    (a, b) =>
      (a.record.value as ReviewData).reviewedAt - (b.record.value as ReviewData).reviewedAt ||
      ordinal(a.record.id, b.record.id),
  );
  return reviews.reduce((progress, event) => {
    const review = event.record.value as ReviewData;
    return applyLearningResult(progress, review.correct, review.reviewedAt);
  }, normalizeLearningProgress(initial));
}
