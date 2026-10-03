import { defineBackground } from 'wxt/utils/define-background';
import { createIndexedDBStore, createLibraryClient } from '@googletrans/data';
import { createExtensionService, type Connection } from '../runtime/service';

export default defineBackground(() => {
  const store = createIndexedDBStore({ name: 'googletrans-library-v1' });
  let deviceId: string;
  const ready = (async () => {
    await chrome.storage.local.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' });
    const settings = await chrome.storage.local.get(['googletransDeviceId', 'googletransMigrationReport']);
    deviceId = typeof settings.googletransDeviceId === 'string' ? settings.googletransDeviceId : crypto.randomUUID();
    await chrome.storage.local.set({ googletransDeviceId: deviceId });
    const legacy = await chrome.storage.local.get(['translatedWords', 'learningProgress', 'learningHistory', 'dailyChallenges', 'userSettings']);
    const local = createLibraryClient({ store, deviceId, namespace: 'local' });
    const report = await local.importLegacy(legacy);
    if (report.imported || report.skipped || !settings.googletransMigrationReport) {
      await chrome.storage.local.set({ googletransMigrationReport: report });
      return report;
    }
    return settings.googletransMigrationReport;
  })();
  // Attach immediately so initialization failures do not become unhandled
  // rejections; requests still receive the original failure through ready.
  void ready.catch(error => console.error('Library initialization failed', error.message));
  const handle = createExtensionService({
    ready: () => ready,
    async connection() {
      const result = await chrome.storage.local.get('googletransConnection');
      return (result.googletransConnection ?? { serverURL: 'http://127.0.0.1:8787', session: null }) as Connection;
    },
    async client(namespace) { await ready; return createLibraryClient({ store, deviceId, namespace }); },
    async openLibrary() {
      const popup = chrome.runtime.getManifest().action?.default_popup;
      if (!popup) throw new Error('Library entry is missing');
      return chrome.tabs.create({ url: chrome.runtime.getURL(popup) });
    },
    fetch: (...args) => fetch(...args),
  });
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (sender.id !== chrome.runtime.id) return false;
    void handle(message).then(
      data => sendResponse({ ok: true, data }),
      error => sendResponse({ ok: false, error: error instanceof Error ? error.message : 'Extension operation failed' }),
    );
    return true;
  });
});
