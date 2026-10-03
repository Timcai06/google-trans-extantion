export interface Session {
  token: string;
  user: { id: string; email: string };
}
export interface Connection {
  serverURL: string;
  session: Session | null;
  migration?: { imported: number; skipped: number };
}
const defaultURL = () =>
  !isExtension() && import.meta.env.PROD ? location.origin : 'http://127.0.0.1:8787';
interface ExtensionHost {
  runtime?: { id?: string; sendMessage(message: unknown): Promise<unknown> };
  storage?: {
    local: {
      get(key: string): Promise<Record<string, unknown>>;
      set(value: Record<string, unknown>): Promise<void>;
    };
  };
}
const host = (): ExtensionHost | undefined =>
  (globalThis as typeof globalThis & { chrome?: ExtensionHost }).chrome;
export const isExtension = () => Boolean(host()?.runtime?.id);
export async function readConnection(): Promise<Connection> {
  if (isExtension()) {
    const readiness = (await host()!.runtime!.sendMessage({ type: 'library.ready' })) as
      | {
          ok?: boolean;
          error?: string;
          data?: { migration?: { imported: number; skipped: number } };
        }
      | undefined;
    if (readiness?.ok !== true) throw new Error(readiness?.error ?? '扩展词库初始化失败');
    const result = await host()!.storage!.local.get('googletransConnection');
    const connection = (result.googletransConnection as Connection | undefined) ?? {
      serverURL: defaultURL(),
      session: null,
    };
    return readiness.data?.migration
      ? { ...connection, migration: readiness.data.migration }
      : connection;
  }
  const raw = sessionStorage.getItem('googletransSession');
  return {
    serverURL: localStorage.getItem('googletransServerURL') ?? defaultURL(),
    session: raw ? (JSON.parse(raw) as Session) : null,
  };
}
export async function writeConnection(value: Connection): Promise<void> {
  if (isExtension()) {
    await host()!.storage!.local.set({ googletransConnection: value });
    return;
  }
  localStorage.setItem('googletransServerURL', value.serverURL);
  if (value.session) sessionStorage.setItem('googletransSession', JSON.stringify(value.session));
  else sessionStorage.removeItem('googletransSession');
}
export function validateServerURL(value: string): string {
  const url = new URL(value.trim());
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    (url.pathname !== '/' && url.pathname !== '')
  )
    throw new Error('服务器地址须为 HTTP(S) 根地址');
  if (url.protocol !== 'https:' && !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))
    throw new Error('远程服务器须使用 HTTPS');
  return url.origin;
}
export function translationRequestStillCurrent(
  previous: { text: string; translation: string; sourceLanguage: string; targetLanguage: string },
  submitted: typeof previous,
): boolean {
  return (
    previous.text === submitted.text &&
    previous.translation === submitted.translation &&
    previous.sourceLanguage === submitted.sourceLanguage &&
    previous.targetLanguage === submitted.targetLanguage
  );
}
export async function api<T>(connection: Connection, path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${validateServerURL(connection.serverURL)}${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(connection.session ? { Authorization: `Bearer ${connection.session.token}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(20000),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error?.message ?? `请求失败 (${response.status})`);
  return result as T;
}
