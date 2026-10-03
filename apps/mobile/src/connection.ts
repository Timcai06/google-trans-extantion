import * as SecureStore from 'expo-secure-store';
export interface Session {
  token: string;
  user: { id: string; email: string };
}
export interface Connection {
  serverURL: string;
  session: Session | null;
}
const KEY = 'googletrans.connection';
export async function readConnection(): Promise<Connection> {
  const raw = await SecureStore.getItemAsync(KEY);
  return raw
    ? (JSON.parse(raw) as Connection)
    : { serverURL: 'http://127.0.0.1:8787', session: null };
}
export async function writeConnection(value: Connection): Promise<void> {
  await SecureStore.setItemAsync(KEY, JSON.stringify(value));
}
export function validateServerURL(value: string): string {
  const url = new URL(value.trim());
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== '/'
  )
    throw new Error('服务器须为 HTTP(S) 根地址');
  // Local-network HTTP is a development option for physical devices; deploy with HTTPS.
  if (
    url.protocol !== 'https:' &&
    !__DEV__ &&
    !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
  )
    throw new Error('正式环境服务器须使用 HTTPS');
  return url.origin;
}
export async function api<T>(connection: Connection, path: string, body?: unknown): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(`${validateServerURL(connection.serverURL)}${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(connection.session ? { Authorization: `Bearer ${connection.session.token}` } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: controller.signal,
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error?.message ?? `请求失败 (${response.status})`);
    return result as T;
  } finally {
    clearTimeout(timeout);
  }
}
