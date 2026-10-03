export type ExtensionRequest =
  | { type: 'library.ready' }
  | { type: 'library.open' }
  | { type: 'word.save'; text: string; translation: string; context?: string }
  | { type: 'translate'; text: string };

export type ExtensionResponse = { ok: true; data: unknown } | { ok: false; error: string };

export function parseExtensionRequest(value: unknown): ExtensionRequest {
  if (!value || typeof value !== 'object') throw new Error('Invalid extension request');
  const request = value as Record<string, unknown>;
  if (request.type === 'library.ready' || request.type === 'library.open')
    return { type: request.type };
  if (request.type !== 'word.save' && request.type !== 'translate')
    throw new Error('Unknown extension request');
  if (typeof request.text !== 'string' || !request.text.trim() || request.text.length > 1000)
    throw new Error('Text must contain 1–1000 characters');
  if (request.type === 'translate') return { type: 'translate', text: request.text.trim() };
  if (typeof request.translation !== 'string' || request.translation.length > 10000)
    throw new Error('Invalid translation');
  if (
    request.context !== undefined &&
    (typeof request.context !== 'string' || request.context.length > 10000)
  )
    throw new Error('Invalid context');
  return {
    type: 'word.save',
    text: request.text.trim(),
    translation: request.translation.trim(),
    context: request.context as string | undefined,
  };
}

export function validateServerURL(raw: string): string {
  const url = new URL(raw);
  if (url.username || url.password || url.search || url.hash)
    throw new Error('Server URL cannot include credentials, query or fragment');
  if (
    url.protocol !== 'https:' &&
    !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))
  )
    throw new Error('Use HTTPS for remote servers');
  return url.href.replace(/\/$/, '');
}
