import { readFileSync, readdirSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'wxt';

const repositoryRoot = fileURLToPath(new URL('../../', import.meta.url));
const manifest = JSON.parse(readFileSync(new URL('./manifest.config.json', import.meta.url), 'utf8'));
const rootPackage = JSON.parse(readFileSync(resolve(repositoryRoot, 'package.json'), 'utf8'));
function files(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? files(path) : [path];
  });
}
export default defineConfig({
  manifestVersion: 3,
  imports: false,
  manifest: { ...manifest, version: rootPackage.version },
  vite: () => ({ build: { minify: false, rolldownOptions: { experimental: { attachDebugInfo: 'none' } } } }),
  hooks: {
    async 'build:publicAssets'(_, assets) {
      const webRoot = resolve(repositoryRoot, 'apps/web/dist');
      for (const path of files(webRoot)) {
        assets.push({ absoluteSrc: path, relativeDest: 'library/' + relative(webRoot, path).split('\\').join('/') });
      }
      assets.push({ absoluteSrc: resolve(repositoryRoot, 'assets/icons/icon16.png'), relativeDest: 'assets/icon16.png' });
    },
  },
});
