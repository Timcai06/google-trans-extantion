import { describe, expect, it } from 'vitest';
import { checkCoreBoundaries } from '../../scripts/check-boundaries.mjs';

const coreRoot = '/fixture/packages/core/src';

function check(sources: Array<{ fileName: string; text: string }>) {
  return checkCoreBoundaries({ coreRoot, sources });
}

describe('core architecture boundaries', () => {
  it('accepts deterministic platform-independent core source', () => {
    const violations = check([
      {
        fileName: `${coreRoot}/scheduler.ts`,
        text: `export function nextDueAt(now: number, intervalDays: number) {\n  return now + intervalDays * 86_400_000;\n}`,
      },
      {
        fileName: `${coreRoot}/index.ts`,
        text: `export { nextDueAt } from './scheduler.js';`,
      },
    ]);

    expect(violations).toEqual([]);
  });

  it('reports forbidden runtime globals and ambient time access with locations', () => {
    const violations = check([
      {
        fileName: `${coreRoot}/scheduler.ts`,
        text: [
          'export function save() {',
          '  return chrome.storage.local.get("words");',
          '}',
          'export const now = Date.now();',
          'export const parsed = new Date();',
          'export const root = globalThis["indexedDB"];',
          'export const { fetch: injectedFetch } = globalThis;',
        ].join('\n'),
      },
    ]);

    expect(violations.map(({ rule, line }) => [rule, line])).toEqual([
      ['runtime-global', 2],
      ['clock', 4],
      ['clock', 5],
      ['runtime-global', 6],
      ['runtime-global', 7],
    ]);
  });

  it('follows re-exports and reports external or escaped dependencies', () => {
    const violations = check([
      {
        fileName: `${coreRoot}/index.ts`,
        text: [
          `export * from './rules.js';`,
          `export type { Adapter } from '../../../extension/adapter.js';`,
        ].join('\n'),
      },
      {
        fileName: `${coreRoot}/rules.ts`,
        text: `import { z } from 'zod';\nexport const rule = z.string();`,
      },
    ]);

    expect(violations.map(({ rule, message }) => [rule, message])).toEqual([
      ['core-import', 'Relative import "../../../extension/adapter.js" escapes packages/core/src.'],
      ['core-import', 'Core source cannot import external module "zod".'],
    ]);
  });

  it('reports a missing relative dependency inside the core tree', () => {
    const violations = check([
      {
        fileName: `${coreRoot}/index.ts`,
        text: `export * from './missing.js';`,
      },
    ]);

    expect(violations.map(({ rule, message }) => [rule, message])).toEqual([
      [
        'core-import',
        'Relative import "./missing.js" cannot be resolved inside the core source tree.',
      ],
    ]);
  });
});
