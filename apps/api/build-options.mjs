import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.dirname(fileURLToPath(import.meta.url));
export const buildOptions = {
  entryPoints: [path.join(root, 'src/server.ts')],
  outfile: path.join(root, 'dist/server.mjs'),
  bundle: true, platform: 'node', target: 'node24', format: 'esm', sourcemap: true,
  alias: { '@googletrans/core': path.join(root, '../../packages/core/src/index.ts') },
};
