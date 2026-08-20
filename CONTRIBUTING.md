# Contributing

The tool's value is that its numbers are right. Most of these rules exist to
protect that.

## Before you start

Read [docs/TARIFF-MODEL.md](docs/TARIFF-MODEL.md). It is the contract the code
implements; the code is not the authority, that document is.

## Setup

```bash
git clone https://github.com/MALskylineee/egypt-electricity-calculator.git
```

Then `npm test`. Node 20+, no dependencies to install. Open `index.html`
directly in a browser to see your changes — there is no dev server and no
build step.

## The rules

**1. The tariff registry is frozen.** Prices, ranges, fees and mechanisms are
approval-gated. Changing one means, in a single commit:

- update the table in `docs/TARIFF-MODEL.md` **and** its provenance row
- update `TIERS` in `index.html`
- update `EXPECTED` in `tests/tariff.test.mjs`
- bump the tariff schedule version (`YYYY-MM`)
- add a CHANGELOG entry under a **MINOR** version — never a patch

The test suite fails if these drift apart. That is deliberate.

**2. Cite a source for any tariff claim.** A news article is a starting point,
not proof; several contradict each other. Prefer EgyptERA, an official decision
document, or a real bill. If you cannot confirm it, add it to
[OPEN-QUESTIONS.md](docs/OPEN-QUESTIONS.md) rather than committing an
unverified number.

**3. Every bug gets a regression test before it gets a fix.** Write the test
first, watch it fail, then fix. Remove the `todo` flag in the same commit.

**4. Keep pure logic above the marker.** `tests/engine.mjs` slices the
`<script>` block at the Section B comment and evaluates everything above it.
Functions that touch the DOM go below; pure functions go above, or they drop
out of coverage silently. See [ARCHITECTURE.md](docs/ARCHITECTURE.md).

**5. Make the minimum change.** No opportunistic refactoring, no renaming, no
reformatting unrelated lines. Preserve the existing function names and output
format unless the change is the point.

**6. Record decisions.** Anything a future contributor would reasonably ask
"why is it like this?" about belongs in an ADR under `docs/adr/`, with the
alternatives you rejected and why.

## Things that need discussion first

Open an issue before building any of these:

- Adding a dependency or a build step (would overturn [ADR-0001](docs/adr/0001-single-file-no-build-step.md))
- Adding analytics, telemetry or any network call
- Changing the calculation algorithm
- Modelling a new sector (commercial, industrial, agricultural) or prepaid meters

## Pull requests

- One concern per PR
- `npm test` green, with output in the description
- If you changed the UI, say which browsers and screen sizes you checked — the
  layout is RTL and there is no automated UI coverage
- Update the docs in the same PR. A change that leaves the docs stale is
  incomplete.
