import type { LibraryClient } from '@googletrans/data';
import { parseExtensionRequest, validateServerURL } from './protocol';

export interface Connection {
  serverURL: string;
  session: { token: string; user: { id: string; email: string } } | null;
}

export interface ServiceDependencies {
  ready(): Promise<unknown>;
  connection(): Promise<Connection>;
  client(namespace: string): Promise<LibraryClient>;
  openLibrary(): Promise<unknown>;
  fetch: typeof fetch;
}

export function createExtensionService(deps: ServiceDependencies) {
  return async function handle(input: unknown) {
    const request = parseExtensionRequest(input);
    const migration = await deps.ready();
    if (request.type === 'library.ready') return { ready: true, migration };
    if (request.type === 'library.open') {
      await deps.openLibrary();
      return {};
    }
    const connection = await deps.connection();
    if (request.type === 'word.save') {
      const client = await deps.client(connection.session?.user.id ?? 'local');
      return client.saveWord({
        text: request.text,
        translation: request.translation,
        context: request.context ?? '',
        sourceLanguage: 'en',
        targetLanguage: 'zh',
      });
    }
    if (!connection.session)
      throw new Error('请先在词库中登录并配置同步服务；也可以手工填写翻译后保存。');
    const baseURL = validateServerURL(connection.serverURL);
    const response = await deps.fetch(`${baseURL}/v1/translate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${connection.session.token}`,
      },
      body: JSON.stringify({ text: request.text, sourceLanguage: 'en', targetLanguage: 'zh' }),
      signal: AbortSignal.timeout(20000),
    });
    const body = (await response.json()) as { translation?: unknown; error?: unknown };
    if (!response.ok) {
      const detail =
        body.error && typeof body.error === 'object'
          ? (body.error as { message?: unknown }).message
          : body.error;
      const error =
        typeof detail === 'string' ? detail : '翻译服务暂不可用，请检查服务配置或手工填写';
      throw new Error(error);
    }
    if (typeof body.translation !== 'string') throw new Error('Invalid translation response');
    return { translation: body.translation };
  };
}
