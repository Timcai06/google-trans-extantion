import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { checkExtensionBuild } from '../../scripts/check-extension.mjs';

interface FixtureManifest {
  manifest_version: number;
  version: string;
  action: { default_popup: string };
  background?: { service_worker?: string };
  content_scripts: {
    matches: string[];
    run_at: string;
    world: string;
    all_frames: boolean;
    js: string[];
    css: string[];
  }[];
  permissions: string[];
  optional_permissions: string[];
  host_permissions: string[];
  content_security_policy: { extension_pages: string };
}

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) =>
    rm(directory, { recursive: true, force: true }),
  ));
});

async function packageFixture(changeManifest: (manifest: FixtureManifest) => void) {
  const directory = await mkdtemp(join(tmpdir(), 'googletrans-package-test-'));
  temporaryDirectories.push(directory);
  const repositoryRoot = join(directory, 'repository');
  const outputDir = join(directory, 'output');
  await Promise.all([mkdir(repositoryRoot), mkdir(outputDir)]);

  const manifest: FixtureManifest = {
    manifest_version: 3,
    version: '2.1.0',
    action: { default_popup: 'extension/popup/popup.html' },
    background: { service_worker: 'background.js' },
    content_scripts: [{
      matches: ['<all_urls>'], run_at: 'document_idle', world: 'ISOLATED', all_frames: false,
      js: ['content-scripts/content.js'], css: ['content-scripts/content.css'],
    }],
    permissions: ['storage', 'activeTab', 'tabs'],
    optional_permissions: ['webNavigation'],
    host_permissions: ['<all_urls>'],
    content_security_policy: { extension_pages: "script-src 'self'; object-src 'self'" },
  };
  const baselineManifest = JSON.stringify(manifest);
  changeManifest(manifest);
  // These negative packages deliberately contain only metadata: the background
  // contract must reject them before checking the rest of the packaged assets.
  await Promise.all([
    writeFile(join(repositoryRoot, 'manifest.json'), baselineManifest),
    writeFile(join(repositoryRoot, 'package.json'), JSON.stringify({ version: '2.1.0' })),
    writeFile(join(outputDir, 'manifest.json'), JSON.stringify(manifest)),
  ]);
  return { repositoryRoot, outputDir };
}

describe('extension package background contract', () => {
  it('rejects a package without a background manifest entry', async () => {
    const fixture = await packageFixture((manifest) => { delete manifest.background; });
    await expect(checkExtensionBuild(fixture)).rejects.toThrow(
      'Expected built background service worker at background.js',
    );
  });

  it('rejects a background entry without a service_worker', async () => {
    const fixture = await packageFixture((manifest) => { manifest.background = {}; });
    await expect(checkExtensionBuild(fixture)).rejects.toThrow(
      'Expected built background service worker at background.js',
    );
  });

  it.each(['extension/background/background.js', 'other-worker.js', ''])(
    'rejects a background path other than the built entry: %s', async (path) => {
      const fixture = await packageFixture((manifest) => {
        manifest.background = { service_worker: path };
      });
      await expect(checkExtensionBuild(fixture)).rejects.toThrow(
        'Expected built background service worker at background.js',
      );
    },
  );

  it('rejects the expected manifest path when the worker file is missing', async () => {
    const fixture = await packageFixture(() => {});
    await expect(checkExtensionBuild(fixture)).rejects.toThrow(
      'manifest.json: missing packaged file background.js',
    );
  });
});
