import { defineConfig } from 'vite';
import { createHash } from 'node:crypto';
export default defineConfig({
  base: './',
  build: { target: 'es2022' },
  plugins: [
    {
      name: 'offline-shell',
      generateBundle(_options, bundle) {
        const assets = [
          'index.html',
          ...Object.keys(bundle).filter((file) => !file.endsWith('.map')),
        ];
        const revision = createHash('sha256')
          .update(JSON.stringify(assets))
          .update(
            Object.values(bundle)
              .map((item) => (item.type === 'chunk' ? item.code : String(item.source)))
              .join('\n'),
          )
          .digest('hex')
          .slice(0, 16);
        this.emitFile({
          type: 'asset',
          fileName: 'sw.js',
          source: `const CACHE='googletrans-shell-${revision}';const ASSETS=${JSON.stringify(assets)};self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS))));self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('googletrans-shell-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));self.addEventListener('fetch',event=>{const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/v1/'))return;event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).catch(error=>{if(event.request.mode==='navigate')return caches.match('index.html');throw error;})));});`,
        });
      },
    },
  ],
});
