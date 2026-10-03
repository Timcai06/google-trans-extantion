import { defineContentScript } from 'wxt/utils/define-content-script';
import type { ExtensionRequest, ExtensionResponse } from '../runtime/protocol';

export default defineContentScript({
  matches: ['http://*/*', 'https://*/*'],
  runAt: 'document_idle',
  allFrames: false,
  world: 'ISOLATED',
  main(ctx) {
    let host: HTMLDivElement | null = null;
    let revision = 0;
    const dismiss = () => { revision++; host?.remove(); host = null; };
    async function request(message: ExtensionRequest) {
      const response: ExtensionResponse = await chrome.runtime.sendMessage(message);
      if (!response?.ok) throw new Error(response?.error ?? 'Extension is unavailable. Reload this page.');
      return response.data;
    }
    ctx.addEventListener(document, 'keydown', (event) => { if (event.key === 'Escape') dismiss(); });
    ctx.addEventListener(document, 'mouseup', (event) => {
      if (!event.isTrusted) return;
      if (host && event.composedPath().includes(host)) return;
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])')) return;
      const selection = window.getSelection();
      if (!selection?.rangeCount || selection.isCollapsed) return;
      const anchor = selection.anchorNode?.parentElement;
      if (anchor?.closest('input, textarea, [contenteditable]:not([contenteditable="false"])')) return;
      const text = selection.toString().trim();
      if (!text || text.length > 1000) return;
      const context = (anchor?.textContent ?? '').trim().slice(0, 10000);
      const rect = selection.getRangeAt(0).getBoundingClientRect();
      dismiss();
      const current = revision;
      host = document.createElement('div');
      host.dataset.googletrans = 'selection';
      host.style.cssText = `position:fixed;z-index:2147483647;left:${Math.max(8, Math.min(rect.left, innerWidth - 336))}px;top:${Math.max(8, Math.min(rect.bottom + 8, innerHeight - 300))}px`;
      const shadow = host.attachShadow({ mode: 'open' });
      const style = document.createElement('style');
      style.textContent = ':host{all:initial}.panel{font:14px/1.5 system-ui;color:#172033;background:#fff;border:1px solid #cbd5e1;border-radius:10px;padding:14px;width:300px;box-shadow:0 8px 30px #0003}strong{display:block;overflow-wrap:anywhere;max-height:70px;overflow:auto}textarea{box-sizing:border-box;width:100%;height:70px;margin:10px 0;padding:8px;font:inherit}button{font:inherit;border:1px solid #cbd5e1;background:#f1f5f9;border-radius:6px;padding:5px 9px;margin:3px;cursor:pointer}button:disabled{opacity:.5}.status{font-size:12px;min-height:18px;overflow-wrap:anywhere}';
      const panel = document.createElement('section'); panel.className = 'panel'; panel.setAttribute('aria-label', '单词翻译助手');
      const title = document.createElement('strong'); title.textContent = text;
      const translation = document.createElement('textarea'); translation.setAttribute('aria-label', '翻译'); translation.placeholder = '输入翻译，或使用已配置的云端翻译';
      const status = document.createElement('div'); status.className = 'status'; status.setAttribute('role', 'status');
      const translate = document.createElement('button'); translate.textContent = '翻译';
      const save = document.createElement('button'); save.textContent = '保存词条';
      const library = document.createElement('button'); library.textContent = '打开词库';
      const close = document.createElement('button'); close.textContent = '关闭'; close.onclick = event => { if (event.isTrusted) dismiss(); };
      translate.onclick = async (event) => {
        if (!event.isTrusted) return;
        translate.disabled = true; status.textContent = '翻译中…';
        const previousText = translation.value;
        try {
          const result = await request({ type: 'translate', text }) as { translation: string };
          if (revision === current && translation.value === previousText) { translation.value = result.translation; status.textContent = ''; }
        } catch (error) { if (revision === current) status.textContent = (error as Error).message; }
        finally { translate.disabled = false; }
      };
      save.onclick = async (event) => {
        if (!event.isTrusted) return;
        save.disabled = true;
        try { await request({ type: 'word.save', text, translation: translation.value, context }); if (revision === current) status.textContent = '已保存，可在词库中复习和同步'; }
        catch (error) { if (revision === current) status.textContent = (error as Error).message; }
        finally { save.disabled = false; }
      };
      library.onclick = event => { if (event.isTrusted) void request({ type: 'library.open' }).catch(error => { status.textContent = error.message; }); };
      panel.append(title, translation, translate, save, library, close, status);
      shadow.append(style, panel); document.documentElement.append(host);
    });
    ctx.onInvalidated(dismiss);
  },
});
