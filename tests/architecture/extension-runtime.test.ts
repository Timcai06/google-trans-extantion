import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import { transformSync } from 'esbuild';
import { describe, expect, it, vi } from 'vitest';
import { assembleLegacyContent, wrapLegacySource } from '../../apps/extension/build/legacy-sources.mjs';

const repositoryRoot = fileURLToPath(new URL('../../', import.meta.url));
const backgroundSource = readFileSync(new URL('../../extension/background/background.js', import.meta.url), 'utf8');

function loadWrapper(source: string, sandbox: Record<string, unknown>) {
  const module = { exports: {} as { startLegacyBackground: () => void } };
  const code = transformSync(wrapLegacySource(source, 'startLegacyBackground'), {
    format: 'cjs', target: 'es2022',
  }).code;
  runInNewContext(code, { ...sandbox, module }, { timeout: 1000 });
  return module.exports.startLegacyBackground;
}

function backgroundRuntime(withNavigation: boolean) {
  const installed = vi.fn();
  const message = vi.fn();
  const updated = vi.fn();
  const committed = vi.fn();
  const history = vi.fn();
  const sendMessage = vi.fn(async () => undefined);
  const chrome = {
    runtime: { onInstalled: { addListener: installed }, onMessage: { addListener: message } },
    tabs: { onUpdated: { addListener: updated }, sendMessage },
    storage: { local: { get: vi.fn(async () => ({})), set: vi.fn(async () => undefined) } },
    ...(withNavigation ? {
      webNavigation: {
        onCommitted: { addListener: committed }, onHistoryStateUpdated: { addListener: history },
      },
    } : {}),
  };
  const start = loadWrapper(backgroundSource, {
    chrome, self: {}, performance: { now: () => 0 }, setTimeout: vi.fn(),
    AbortSignal: { timeout: () => ({}) }, fetch: vi.fn(async () => ({ ok: false })),
    console: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
  });
  return { start, installed, message, updated, committed, history, sendMessage };
}

describe('extension runtime build boundary', () => {
  it('assembles the currently shipped content behavior from independently tracked sources', () => {
    const baseline = readFileSync(new URL('../../extension/content/content-bundle.js', import.meta.url), 'utf8');
    expect(assembleLegacyContent(repositoryRoot)).toBe(baseline);
  });

  it('can discover the background module without running browser code', () => {
    // There are deliberately no chrome/self globals during discovery.
    expect(typeof loadWrapper(backgroundSource, {})).toBe('function');
  });

  it('registers runtime listeners even when optional webNavigation permission is unavailable', () => {
    const runtime = backgroundRuntime(false);
    expect(runtime.message).not.toHaveBeenCalled();
    expect(() => runtime.start()).not.toThrow();
    expect(runtime.installed).toHaveBeenCalledTimes(1);
    expect(runtime.message).toHaveBeenCalledTimes(1);
    expect(runtime.updated).toHaveBeenCalledTimes(1);
    expect(runtime.committed).not.toHaveBeenCalled();
    const reply = vi.fn();
    runtime.message.mock.calls[0]![0]({ type: 'GET_OLLAMA_STATUS' }, {}, reply);
    expect(reply).toHaveBeenCalledWith({ ok: true, available: false, baseUrl: null });
  });

  it('retains frame-specific highlight refresh when optional navigation APIs are available', () => {
    const runtime = backgroundRuntime(true);
    runtime.start();
    expect(runtime.committed).toHaveBeenCalledTimes(1);
    expect(runtime.history).toHaveBeenCalledTimes(1);
    runtime.committed.mock.calls[0]![0]({ tabId: 7, frameId: 2 });
    expect(runtime.sendMessage).toHaveBeenCalledWith(7, { type: 'REHIGHLIGHT' }, { frameId: 2 });
  });
});
