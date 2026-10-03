import { describe, expect, it, vi } from 'vitest';
import { createLibraryClient, createMemoryStore } from '@googletrans/data';
import { createExtensionService, type Connection } from '../../apps/extension/runtime/service';
import { parseExtensionRequest, validateServerURL } from '../../apps/extension/runtime/protocol';

describe('extension application service', () => {
  function fixture() {
    const store = createMemoryStore();
    let connection: Connection = { serverURL: 'http://127.0.0.1:8787', session: null };
    const ready = vi.fn(async () => undefined);
    const openLibrary = vi.fn(async () => undefined);
    const fetcher = vi.fn<typeof fetch>();
    const client = (namespace: string) =>
      createLibraryClient({ store, namespace, deviceId: 'extension-test' });
    const handle = createExtensionService({
      ready,
      connection: async () => connection,
      client: async (namespace) => client(namespace),
      openLibrary,
      fetch: fetcher,
    });
    return {
      handle,
      client,
      ready,
      openLibrary,
      fetcher,
      setConnection: (value: Connection) => {
        connection = value;
      },
    };
  }
  it('saves selection with context into shared anonymous library before any network call', async () => {
    const f = fixture();
    await f.handle({
      type: 'word.save',
      text: 'apple',
      translation: '苹果',
      context: 'An apple a day',
    });
    const words = await f.client('local').listWords();
    expect(words).toMatchObject([
      { text: 'apple', translation: '苹果', context: 'An apple a day' },
    ]);
    expect(f.ready).toHaveBeenCalledOnce();
    expect(f.fetcher).not.toHaveBeenCalled();
    await f
      .client('local')
      .submitReview({ wordId: words[0]!.id, correct: true, mode: 'flashcard' });
    expect((await f.client('local').getProgress(words[0]!.id)).reviewCount).toBe(1);
  });
  it('scopes authenticated saves to the same account without uploading anonymous content', async () => {
    const f = fixture();
    await f.handle({ type: 'word.save', text: 'local', translation: '本地' });
    f.setConnection({
      serverURL: 'https://sync.example.com',
      session: { token: 'opaque-test', user: { id: 'alice', email: 'alice@example.com' } },
    });
    await f.handle({ type: 'word.save', text: 'account', translation: '账号' });
    expect((await f.client('alice').listWords()).map((word) => word.text)).toEqual(['account']);
    expect((await f.client('local').listWords()).map((word) => word.text)).toEqual(['local']);
  });
  it('propagates initialization failure instead of accepting writes into an unmigrated library', async () => {
    const f = fixture();
    f.ready.mockRejectedValueOnce(new Error('migration failed'));
    await expect(f.handle({ type: 'word.save', text: 'apple', translation: '' })).rejects.toThrow(
      'migration failed',
    );
    expect(await f.client('local').listWords()).toEqual([]);
  });
  it('validates requests and remote transport before exposing authentication', async () => {
    const f = fixture();
    await expect(f.handle({ type: 'translate', text: 'apple' })).rejects.toThrow('登录');
    expect(() => parseExtensionRequest({ type: 'admin.delete' })).toThrow('Unknown');
    expect(() =>
      parseExtensionRequest({ type: 'word.save', text: 'apple', translation: 42 }),
    ).toThrow('translation');
    expect(() => validateServerURL('http://remote.example.com')).toThrow('HTTPS');
    expect(() => validateServerURL('https://secret@example.com')).toThrow('credentials');
    expect(f.fetcher).not.toHaveBeenCalled();
  });
  it('uses authenticated bounded translation transport and returns structured provider errors', async () => {
    const f = fixture();
    f.setConnection({
      serverURL: 'https://sync.example.com',
      session: { token: 'opaque-test', user: { id: 'alice', email: 'alice@example.com' } },
    });
    f.fetcher.mockResolvedValueOnce(
      new Response(JSON.stringify({ translation: '苹果' }), { status: 200 }),
    );
    await expect(f.handle({ type: 'translate', text: 'apple' })).resolves.toEqual({
      translation: '苹果',
    });
    expect(f.fetcher).toHaveBeenCalledWith(
      'https://sync.example.com/v1/translate',
      expect.objectContaining({ method: 'POST', signal: expect.any(AbortSignal) }),
    );
    f.fetcher.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: { message: 'Configure provider' } }), { status: 503 }),
    );
    await expect(f.handle({ type: 'translate', text: 'apple' })).rejects.toThrow(
      'Configure provider',
    );
  });
});
