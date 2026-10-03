import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir, stat } from 'node:fs/promises';
import { relative, resolve, sep, posix } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const defaultRoot = fileURLToPath(new URL('../', import.meta.url));
export const sha256 = contents => createHash('sha256').update(contents).digest('hex');
async function files(directory, prefix = '') {
  const result = [];
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const path = prefix + item.name;
    result.push(...item.isDirectory() ? await files(resolve(directory, item.name), path + '/') : [path]);
  }
  return result.sort();
}
export async function checkExtensionBuild({ repositoryRoot = defaultRoot, outputDir = resolve(repositoryRoot, 'apps/extension/.output/chrome-mv3') } = {}) {
  const manifest = JSON.parse(await readFile(resolve(outputDir, 'manifest.json'), 'utf8'));
  assert.equal(manifest.background?.service_worker, 'background.js', 'Expected built background service worker at background.js');
  async function exists(path, origin) {
    const full = resolve(outputDir, path);
    const rel = relative(outputDir, full);
    assert(rel !== '..' && !rel.startsWith(`..${sep}`), `${origin}: path escapes package`);
    let entry;
    try { entry = await stat(full); } catch { assert.fail(`${origin}: missing packaged file ${path}`); }
    assert(entry.isFile(), `${origin}: not a file: ${path}`);
  }
  await exists(manifest.background.service_worker, 'manifest.json');
  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.action?.default_popup, 'library/index.html');
  assert.deepEqual(manifest.permissions, ['storage']);
  assert.deepEqual(manifest.host_permissions, ['http://*/*', 'https://*/*']);
  assert.equal(manifest.content_scripts?.length, 1);
  assert.deepEqual(manifest.content_scripts[0].js, ['content-scripts/content.js']);
  assert.deepEqual(manifest.content_scripts[0].matches, ['http://*/*', 'https://*/*']);
  const rootPackage = JSON.parse(await readFile(resolve(repositoryRoot, 'package.json'), 'utf8'));
  assert.equal(manifest.version, rootPackage.version);
  for (const path of [manifest.action.default_popup, ...Object.values(manifest.icons), ...manifest.content_scripts[0].js]) await exists(path, 'manifest.json');
  const html = await readFile(resolve(outputDir, 'library/index.html'), 'utf8');
  for (const script of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    assert(!script[2].trim(), 'Extension UI must not contain inline executable code');
    assert(/\bsrc=/.test(script[1]), 'Missing script source');
  }
  for (const match of html.matchAll(/(?:src|href)=["']([^"']+)["']/g)) {
    const path = match[1];
    assert(!/^(?:\w+:|\/\/|\/)/.test(path), 'UI references must be relative packaged assets');
    await exists(posix.normalize(posix.join('library', path)), 'library/index.html');
  }
  const allFiles = await files(outputDir);
  for (const path of allFiles) {
    assert(['manifest.json', 'background.js', 'content-scripts/content.js', 'assets/icon16.png'].includes(path) || path.startsWith('library/'), `Unexpected asset: ${path}`);
    assert(!path.includes('content-bundle') && !path.startsWith('extension/'), 'Legacy business runtime must not be packaged');
  }
  const rootLoader = JSON.parse(await readFile(resolve(repositoryRoot, 'manifest.json'), 'utf8'));
  const prefix = 'apps/extension/.output/chrome-mv3/';
  assert.equal(rootLoader.background.service_worker, prefix + manifest.background.service_worker);
  assert.equal(rootLoader.action.default_popup, prefix + manifest.action.default_popup);
  assert.equal(rootLoader.version, manifest.version);
  assert.deepEqual(rootLoader.content_scripts[0].js, manifest.content_scripts[0].js.map(path => prefix + path));
  for (const path of allFiles.filter(path => path.startsWith('library/'))) {
    const [source, packaged] = await Promise.all([readFile(resolve(repositoryRoot, 'apps/web/dist', path.slice(8))), readFile(resolve(outputDir, path))]);
    assert(source.equals(packaged), `Shared Web UI changed during packaging: ${path}`);
  }
  const hashes = await Promise.all(allFiles.map(async path => `${path}\0${sha256(await readFile(resolve(outputDir, path)))}`));
  return { fileCount: allFiles.length, packageSha256: sha256(hashes.join('\n')) };
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { console.log(await checkExtensionBuild()); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
