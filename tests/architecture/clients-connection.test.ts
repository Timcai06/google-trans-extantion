import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api, readConnection, translationRequestStillCurrent, validateServerURL, writeConnection } from '../../apps/web/src/connection';

function storage() {
  const values = new Map<string, string>();
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); }, removeItem: (key: string) => { values.delete(key); } };
}
beforeEach(() => { vi.stubGlobal('chrome', undefined); vi.stubGlobal('localStorage', storage()); vi.stubGlobal('sessionStorage', storage()); });
describe('web and extension connection host adapters', () => {
  it('keeps browser token in tab session storage and retains only the server in local storage', async () => {
    const session = { token: 'private-session', user: { id: 'alice', email: 'alice@example.com' } };
    await writeConnection({ serverURL: 'https://sync.example.com', session });
    expect(localStorage.getItem('googletransSession')).toBeNull();
    expect(sessionStorage.getItem('googletransSession')).toContain('private-session');
    expect((await readConnection()).session?.user.id).toBe('alice');
    await writeConnection({ serverURL: 'https://sync.example.com', session: null });
    expect(sessionStorage.getItem('googletransSession')).toBeNull();
    expect((await readConnection()).serverURL).toBe('https://sync.example.com');
  });
  it('waits for successful background readiness before reading trusted extension session storage', async () => {
    const order: string[] = [];
    const connection = { serverURL: 'https://sync.example.com', session: null };
    const sendMessage = vi.fn(async (): Promise<{ ok: boolean; error?: string }> => { order.push('ready'); return { ok: true }; });
    const get = vi.fn(async () => { order.push('get'); return { googletransConnection: connection }; });
    const set = vi.fn(async () => {});
    vi.stubGlobal('chrome', { runtime: { id: 'extension', sendMessage }, storage: { local: { get, set } } });
    expect(await readConnection()).toEqual(connection);
    expect(order).toEqual(['ready', 'get']);
    expect(sendMessage).toHaveBeenCalledWith({ type: 'library.ready' });
    await writeConnection(connection); expect(set).toHaveBeenCalledWith({ googletransConnection: connection });
    sendMessage.mockRejectedValueOnce(new Error('migration failed'));
    await expect(readConnection()).rejects.toThrow('migration failed');
    expect(get).toHaveBeenCalledTimes(1);
    sendMessage.mockResolvedValueOnce({ ok: false, error: 'legacy migration failed' });
    await expect(readConnection()).rejects.toThrow('legacy migration failed');
    expect(get).toHaveBeenCalledTimes(1);
  });
  it('discards translations for changed words, languages, or a manually edited translation', () => {
    const submitted = { text: 'hello', translation: '', sourceLanguage: 'en', targetLanguage: 'zh-CN' };
    expect(translationRequestStillCurrent(submitted, submitted)).toBe(true);
    expect(translationRequestStillCurrent({ ...submitted, text: 'goodbye' }, submitted)).toBe(false);
    expect(translationRequestStillCurrent({ ...submitted, sourceLanguage: 'fr' }, submitted)).toBe(false);
    expect(translationRequestStillCurrent({ ...submitted, targetLanguage: 'ja' }, submitted)).toBe(false);
    expect(translationRequestStillCurrent({ ...submitted, translation: '手动输入' }, submitted)).toBe(false);
  });
  it('rejects cleartext remote credentials and sends bearer auth with structured errors', async () => {
    expect(() => validateServerURL('http://sync.example.com')).toThrow('HTTPS');
    expect(() => validateServerURL('https://token@sync.example.com')).toThrow();
    expect(validateServerURL('http://127.0.0.1:8787/')).toBe('http://127.0.0.1:8787');
    const fetchMock = vi.fn(async () => ({ ok: false, status: 503, json: async () => ({ error: { code: 'TRANSLATION_UNAVAILABLE', message: '翻译提供方未配置' } }) }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(api({ serverURL: 'https://sync.example.com', session: { token: 'session', user: { id: 'alice', email: 'a@example.com' } } }, '/v1/translate', { text: 'hello' })).rejects.toThrow('翻译提供方未配置');
    expect(fetchMock).toHaveBeenCalledWith('https://sync.example.com/v1/translate', expect.objectContaining({ method: 'POST', headers: expect.objectContaining({ Authorization: 'Bearer session' }) }));
  });
});
