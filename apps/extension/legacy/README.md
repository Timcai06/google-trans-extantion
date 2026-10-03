# Canonical legacy content runtime

> Historical migration fixture as of 2026-10-03. The 3.0 runtime now uses
> `../entrypoints/content.ts` and `../entrypoints/background.ts`, and embeds the
> shared Web library. Nothing in this directory or `../build/` is loaded by the
> current WXT build. The description below records the first migration step;
> the fixtures remain solely for legacy equivalence tests.

`content-runtime.js` was extracted verbatim from lines 2680–6182 of the active
`extension/content/content-bundle.js` at the first WXT migration. It is the
canonical source of the legacy content behavior during migration.

The existing `extension/content/content.js` differs from that active runtime;
using it would introduce unrelated event-listener and lazy-image changes.

The build reads the seven utility source files listed in
`../build/legacy-sources.mjs`, followed by this runtime. A Vite virtual module
exports their combined code inside `startLegacyContent()`, which WXT calls only
in the browser. No browser code runs while WXT discovers entrypoints, and no
runtime evaluation or generated source files are needed.

The old checked-in JS bundle is excluded from the extension output. The package
checker compares the source assembly with that migration baseline; it is never
an input to the bundler. Future behavioral changes must deliberately update or
retire that baseline check.

The active `content-bundle.css` is imported unchanged to preserve its styling.
Popup, dashboard, and settings remain classic HTML/script pages with their
existing layout, global objects, and loading order. Their active dependencies
are explicitly allowlisted for copying.
