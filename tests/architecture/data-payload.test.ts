import { describe, expect, it } from 'vitest';
import { Buffer } from 'node:buffer';
import {
  MAX_SYNC_BODY_BYTES,
  packSyncRequest,
  utf8ByteLength,
  validateSyncRequest,
  type SyncMutation,
  type SyncRequest,
  type SyncResponse,
} from '../../packages/core/src/index.js';
import { createLibraryClient, createMemoryStore } from '../../packages/data/src/index.js';

function library() {
  let sequence = 0;
  const store = createMemoryStore();
  return {
    store,
    client: createLibraryClient({
      store,
      deviceId: 'payload',
      now: () => 1000,
      id: () => `payload-${++sequence}`,
    }),
  };
}
const largeInput = (index: number) => ({
  text: `词条 ${index}`,
  translation: '翻译'.repeat(8000),
  context: '😀'.repeat(8000),
  legacy: { original: '历史'.repeat(60_000) },
});

describe('sync HTTP payload budget', () => {
  it('counts UTF-8 correctly without a platform encoder, including surrogate edge cases', () => {
    for (const text of [
      '',
      'plain ASCII',
      'é中😀',
      '\uD800',
      '\uDC00',
      '\uD800x\uDC00',
      '\uD800\uDC00',
      '\uD800\uD800\uDC00',
    ]) {
      expect(utf8ByteLength(text)).toBe(Buffer.byteLength(text, 'utf8'));
      expect(utf8ByteLength(JSON.stringify(text))).toBe(
        Buffer.byteLength(JSON.stringify(text), 'utf8'),
      );
    }
  });

  it('packs exact framing, commas and non-ASCII bytes rather than just counting records', async () => {
    const { client } = library();
    for (let index = 0; index < 6; index++) await client.saveWord(largeInput(index));
    const records = (await client.exportBackup()).records;
    const packed = packSyncRequest(999_999, records);
    expect(packed.changes.length).toBeGreaterThan(0);
    expect(packed.changes.length).toBeLessThan(records.length);
    expect(Buffer.byteLength(JSON.stringify(packed))).toBeLessThanOrEqual(MAX_SYNC_BODY_BYTES);
    expect(() => validateSyncRequest(packed)).not.toThrow();
    const oneMore = { ...packed, changes: [...packed.changes, records[packed.changes.length]!] };
    expect(Buffer.byteLength(JSON.stringify(oneMore))).toBeGreaterThan(MAX_SYNC_BODY_BYTES);
    expect(() => validateSyncRequest(oneMore)).toThrow('byte limit');
    expect(packed.changes).toEqual(records.slice(0, packed.changes.length));
  });

  it('sends an individual valid large record safely and drains all remaining writes after a lost response', async () => {
    const { client, store } = library();
    for (let index = 0; index < 7; index++) await client.saveWord(largeInput(index));
    const ledger = new Map<string, SyncMutation>();
    const log: SyncResponse['changes'] = [];
    const requests: SyncRequest[] = [];
    const transport = async (request: SyncRequest): Promise<SyncResponse> => {
      expect(Buffer.byteLength(JSON.stringify(request))).toBeLessThanOrEqual(MAX_SYNC_BODY_BYTES);
      requests.push(request);
      for (const mutation of request.changes) {
        if (!ledger.has(mutation.mutationId)) {
          ledger.set(mutation.mutationId, mutation);
          log.push({ cursor: log.length + 1, mutation });
        }
      }
      const changes = log.filter((change) => change.cursor > request.cursor);
      return {
        changes,
        cursor: changes.at(-1)?.cursor ?? request.cursor,
        acknowledged: request.changes.map((mutation) => mutation.mutationId),
        hasMore: false,
      };
    };
    await expect(
      client.sync(async (request) => {
        await transport(request);
        throw new Error('response lost');
      }),
    ).rejects.toThrow('response lost');
    expect(await store.transaction('local', (state) => Object.keys(state.outbox).length)).toBe(7);
    expect((await client.sync(transport)).pending).toBe(0);
    expect(requests[1]).toEqual(requests[0]);
    expect(requests.length).toBeGreaterThan(2);
    expect(ledger.size).toBe(7);
    expect(await client.listWords()).toHaveLength(7);

    const { client: single } = library();
    await single.saveWord(largeInput(100));
    expect(
      (
        await single.sync(async (request) => {
          expect(request.changes).toHaveLength(1);
          expect(Buffer.byteLength(JSON.stringify(request))).toBeLessThanOrEqual(
            MAX_SYNC_BODY_BYTES,
          );
          return {
            changes: [],
            cursor: 0,
            acknowledged: request.changes.map((mutation) => mutation.mutationId),
            hasMore: false,
          };
        })
      ).pending,
    ).toBe(0);
  });
});
