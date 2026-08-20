# ADR-0003 — Test the engine by extracting it from `index.html`

- **Status:** Accepted
- **Date:** 2026-08-20

## Context

ADR-0001 keeps everything in one HTML file, so there is no module to `import`.
But the pricing engine is the part that most needs testing: three interacting
mechanisms, re-baselining arithmetic, and a domain where a wrong number is the
entire failure mode.

The project constitution requires that a contract be enforced by a test rather
than trusted — silent drift between the documented tariff and the implemented
tariff is the specific risk.

## Decision

`tests/engine.mjs` reads `index.html`, extracts the `<script>` block, slices it
at the marker `/* ---------- Section B`, and evaluates the pure prefix in a
`node:vm` context. Tests import the resulting `TIERS`, `tierOf`,
`actualCostNoFee` and `billOf`.

This makes the structural split load-bearing: **pure logic above the marker,
DOM code below it**.

## Consequences

**Good**

- Tests exercise the *actual* shipped code. There is no second copy of the
  tariff logic, so it cannot drift.
- Zero dependencies; no build step; no jsdom.
- Editing a price in `index.html` fails the registry test immediately, which is
  exactly the intended alarm.

**Bad**

- Text-slicing source code is fragile. Renaming the marker comment breaks the
  loader — mitigated by throwing an explicit error naming the marker rather
  than failing obscurely.
- Only the pure prefix is covered. Nothing below the marker is tested.
- Values crossing the vm boundary carry a different realm's prototypes, so
  `assert.deepStrictEqual` fails on otherwise-identical arrays. Spread into a
  host array first. This cost a debugging cycle during setup and is documented
  in `docs/TESTING.md`.

**Revisit when** ADR-0001 is revisited. If the logic ever moves to its own
file, delete this machinery and import it normally.

## Alternatives considered

- **Duplicate `TIERS` and the functions into a test fixture.** Rejected
  outright: two copies of the tariff is precisely the drift this project is
  built to prevent.
- **jsdom / Playwright against the real page.** Rejected for the engine — heavy
  and slow for testing pure arithmetic. Still the right tool if UI behaviour
  needs covering later.
- **Extract the logic into `tariff.js` now.** Rejected: breaks single-file
  portability (ADR-0001) and changes the shipped artifact, which ADR-0002
  rules out for v1.0.0.
