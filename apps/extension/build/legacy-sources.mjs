import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/** Original manifest content-script concatenation order. */
export const CONTENT_UTILITIES = Object.freeze([
  'extension/utils/trie-index.js',
  'extension/utils/word-index-manager.js',
  'extension/utils/dynamic-loader.js',
  'extension/utils/module-manager.js',
  'extension/utils/cache-manager.js',
  'extension/utils/event-manager.js',
  'extension/components/utils/style-manager.js',
]);

export const CONTENT_RUNTIME = 'apps/extension/legacy/content-runtime.js';

export function assembleLegacyContent(repositoryRoot) {
  return [...CONTENT_UTILITIES, CONTENT_RUNTIME]
    .map((path) => readFileSync(resolve(repositoryRoot, path), 'utf8'))
    .join('');
}

/** Compile trusted local scripts as a function; never execute them in Node discovery. */
export function wrapLegacySource(source, startupName) {
  if (!/^startLegacy(?:Content|Background)$/.test(startupName)) {
    throw new Error(`Unsupported legacy startup: ${startupName}`);
  }
  // Classic extension scripts do not have Node's CommonJS globals. Local bindings
  // preserve that branch selection and prevent Vite resolving dormant require().
  return `export function ${startupName}() {\nconst module = undefined;\nconst require = undefined;\n${source}\n}\n`;
}
