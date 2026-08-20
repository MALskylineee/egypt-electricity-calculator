# ADR-0001 — Keep the calculator a single dependency-free HTML file

- **Status:** Accepted
- **Date:** 2026-08-20

## Context

The tool arrived as one self-contained `.html` file: markup, CSS and JS inline,
no dependencies, no build. Publishing it raised the obvious question of whether
to modernise the structure — split into `src/`, add a bundler, maybe a
framework.

The audience is Egyptian households trying to understand a bill. Many will open
it on a mid-range phone, on mobile data, possibly forwarded as a file over
WhatsApp rather than as a link.

## Decision

Keep it as a single file with no build step and no runtime dependencies.
`index.html` is both the source and the artifact.

## Consequences

**Good**

- Loads in one request. No JS bundle, no font fetch, no CDN, works offline.
- Can be emailed or shared as a file and still works, opened from `file://`.
- Nothing to install to contribute — clone and open in a browser.
- No dependency supply chain, no lockfile, no audit noise, no rot. A file that
  works today still works in five years.
- Deploys on GitHub Pages with zero configuration.

**Bad**

- No module imports, so the test suite must extract logic from the HTML by
  text-slicing (see ADR-0003). That is genuinely awkward.
- Editor tooling for CSS/JS inside HTML is weaker than for standalone files.
- The file will get unwieldy if the tool grows substantially.

**Revisit when** the file passes roughly 1,500 lines, a second page is needed,
or a real dependency becomes unavoidable.

## Alternatives considered

- **Vite + a framework.** Rejected: a build step, `node_modules` and a bundle
  to serve a page whose logic is about 60 lines. All cost, no benefit here.
- **Split into `index.html` + `tariff.js` + `styles.css`.** Rejected for now,
  and it is the natural first step if we outgrow this. It would make testing
  cleaner (a real `import`), but breaks single-file portability, which is a
  real property for this audience. Reconsider alongside the trigger above.
