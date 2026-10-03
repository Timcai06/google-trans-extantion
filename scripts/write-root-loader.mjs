import { readFile, writeFile } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const prefix = 'apps/extension/.output/chrome-mv3/';
const manifest = JSON.parse(await readFile(new URL(`${prefix}manifest.json`, root), 'utf8'));
const mapIcons = icons => typeof icons === 'string' ? prefix + icons : Object.fromEntries(Object.entries(icons ?? {}).map(([size, path]) => [size, prefix + path]));
manifest.background.service_worker = prefix + manifest.background.service_worker;
manifest.action.default_popup = prefix + manifest.action.default_popup;
if (manifest.action.default_icon) manifest.action.default_icon = mapIcons(manifest.action.default_icon);
manifest.icons = mapIcons(manifest.icons);
for (const entry of manifest.content_scripts) {
  entry.js = entry.js.map(path => prefix + path);
  if (entry.css) entry.css = entry.css.map(path => prefix + path);
}
for (const entry of manifest.web_accessible_resources ?? []) entry.resources = entry.resources.map(path => prefix + path);
await writeFile(new URL('manifest.json', root), JSON.stringify(manifest, null, 2) + '\n');
console.log('Root loader updated; reloading the same directory preserves the extension ID.');
