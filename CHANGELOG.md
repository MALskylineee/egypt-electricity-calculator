# Changelog

All notable changes to this project are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
This project uses [Semantic Versioning](https://semver.org) for the software,
plus a separate `YYYY-MM` tariff schedule version — see
[ADR-0004](docs/adr/0004-versioning-and-release-policy.md).

---

## [Unreleased]

No known calculation or presentation defects. Remaining items are scope
questions — see [OPEN-QUESTIONS.md](docs/OPEN-QUESTIONS.md).

- **DEF-005** (low) — slider capped at 1300 kWh, cannot reach real tier-7 consumption

---

## [1.2.1] — 2026-08-20

Wording only. No calculation, figure or layout changed.

### Changed

- The tier-3 section heading read `لحظة الصدمة` ("the moment of shock") —
  sensational framing for what is a factual comparison. Replaced with a plain
  descriptive question: `إيه اللي بيحصل أول ما تدخل الشريحة الثالثة؟`, matching
  the neutral voice of the other section headings.
- Its intro line was reworded from `مثال حقيقي … شوف إيه اللي بيحصل للفاتورة`
  to `مثال … ده الفرق في الفاتورة`, so it no longer repeats the heading.
- `README.md` and `docs/TARIFF-MODEL.md` reworded to match ("tier-entry
  comparison" / "tier-entry jumps" rather than "shock").

The internal CSS classes, element ids and `buildShock()` keep their existing
names. Renaming them would be a large diff with no user-visible effect, and
this project does not rename things opportunistically — see CONTRIBUTING.md.

---

## [1.2.0] — 2026-08-20

Presentation and honesty. **No calculation changed**; every figure is
identical to v1.1.0. Tariff schedule unchanged (`2026-08`).

### Added

- **An explicit unofficial disclaimer, in Arabic, directly under the hero** —
  above the calculator, not buried in the footer. It states that the tool is
  unofficial, unaffiliated with the Ministry of Electricity, the distribution
  companies or any official body; that it is one person's effort; that the
  figures **may contain errors or reflect a stale tariff**; and that the
  official bill from the user's distribution company is the only authoritative
  reference.
- `fmtInt()` for whole-kWh quantities, alongside `fmt()` for money.
- 6 tests asserting no formatter can emit a character in the Arabic-Indic
  digit ranges, so DEF-004 cannot return silently.

### Fixed

- **DEF-004 — two numeral systems on one page.** `fmt()` and the slider's kWh
  label used `toLocaleString('ar-EG')`, rendering Arabic-Indic digits
  (`١٬٢٣٤٫٥٠`), while the tier table, the service fees and *all* of the page's
  hand-written Arabic copy used Western digits. The calculator card showed a
  total in one system beside a fee in the other.

  Now unified on Western digits via a single `NUM_LOCALE` constant. Western
  rather than Arabic-Indic because the distribution company's bill and the
  meter both use Western digits, and comparing against that bill is the whole
  point of the tool. Reasoning and the rejected alternative in
  [ADR-0006](docs/adr/0006-western-digits-and-unofficial-disclaimer.md).

### Changed

- Footer reworded from `حاسبة مرجعية` ("reference calculator") to
  `حاسبة غير رسمية ومجهود شخصي`, so it no longer contradicts the disclaimer.

### Verified

| Check | Result |
|---|---|
| Every figure vs v1.1.0 | ✅ Unchanged — presentation only |
| Arabic-Indic digits anywhere in the rendered page | ✅ **Zero**, scanned across every leaf element |
| Disclaimer renders and is visible | ✅ Confirmed in the browser |
| Test suite | ✅ 57 tests, 57 pass |

---

## [1.1.0] — 2026-08-20

Fixes every known **calculation** defect. Tariff schedule unchanged (`2026-08`).

MINOR rather than PATCH because displayed figures change for the inputs that
were previously wrong — see [ADR-0004](docs/adr/0004-versioning-and-release-policy.md).

### Fixed

- **DEF-001 (high) — fractional consumption fell through to tier 7.** Tier
  ranges are integer ranges, so any decimal matched no tier and hit the
  last-tier fallback: the most expensive flat rate. Typing `50.5` reported
  **الشريحة 7 and 185.95 EGP instead of about 36.87** — five times too high.
  Reproduced in the browser, not only in tests.
- **DEF-002 (medium) — negative consumption produced a positive tier-7 bill.**
  `-5` reported 25.55 EGP. Now clamps to 0.
- **DEF-003 (low) — reset boundaries were duplicated.** `updateSlider()`
  hard-coded `[101, 651, 1001]` alongside the same values in `TIERS`. A future
  tariff change could have left the in-app warning pointing at a stale
  boundary. Now derived as `RESET_BOUNDARIES`.
- Junk input (`abc`, empty, `NaN`, `Infinity`, `null`) now reads as 0 kWh and
  shows the tier 1 service fee, instead of a nonsense figure.
- The re-baselining loop in `actualCostNoFee()` tested `mode === 'reset'` while
  the branch above it treated `reset` and `flat` alike. Behaviour-neutral with
  today's registry, since the only `flat` tier is last — corrected to
  `mode !== 'cum'` so a future registry cannot expose the inconsistency.

### Added

- `normalizeKwh()` — a single input boundary that coerces, clamps and rounds
  consumption to a whole kWh. Household consumption *is* a whole number of
  kWh: it is how the meter is read, how the bill is issued, and how the tariff
  table is written. Reasoning and the rejected alternative in
  [ADR-0005](docs/adr/0005-normalise-consumption-to-whole-kwh.md).
- 8 tests covering the normalisation contract: rounding direction, boundary
  carry, clamping, junk input, numeric strings, and non-negative cost.
- An invariant test asserting every boundary the app warns about produces a
  real jump.

### Verified

| Check | Result |
|---|---|
| Whole-kWh bills vs v1.0.1 | ✅ **All 13 reference values identical** — no regression |
| Previously broken inputs | ✅ `50.5`→tier 2 · `100.5`→tier 3 · `-5`→tier 1 |
| Monotonicity across fractional input (0–1300, step 0.25) | ✅ Bill never decreases |
| Browser behaviour | ✅ Confirmed on the live page, no console errors |
| Test suite | ✅ 51 tests, 51 pass, 0 todo |

Both regression tests were run **red before the fix** and green after.

---

## [1.0.1] — 2026-08-20

Tooling only. **No change to any displayed figure**, to `index.html`, or to
the tariff schedule (still `2026-08`).

### Fixed

- `npm test` passed a glob to `node --test`, which Node 20 does not support —
  it resolved the pattern as a literal path and exited 1. CI failed on the
  v1.0.0 commit for this reason while the suite passed locally on Node 24.
  Switched to bare `node --test`, which scans using default patterns on every
  supported version.

### Added

- CI now runs the suite on **Node 20 and 22**, so a version-specific
  regression fails in CI rather than only on a contributor's machine.

---

## [1.0.0] — 2026-08-20

First public release. **Tariff schedule `2026-08`.**

The calculator itself is byte-identical to the reviewed original apart from
its filename — see [ADR-0002](docs/adr/0002-preserve-behaviour-on-first-publish.md)
for why defects were documented rather than fixed in this release.

### Added

- Published as a public repository with GitHub Pages deployment
- **Canonical tariff contract** ([TARIFF-MODEL.md](docs/TARIFF-MODEL.md)) —
  the three billing mechanisms (`cum` / `reset` / `flat`), the frozen tier
  registry, the algorithm, 11 worked reference values, and per-value provenance
- **Test suite** — 43 tests, zero dependencies, run against the real
  `index.html` so there is no duplicated copy of the tariff logic
  ([TESTING.md](docs/TESTING.md))
- **Invariant tests** that hold for any valid tariff: monotonicity across
  0–1300 kWh, non-negative energy cost, reset tiers must actually cause a jump,
  slider segments must sum to exactly 100%, and hard-coded warning boundaries
  must still match `TIERS`
- **Defect and open-question register** ([OPEN-QUESTIONS.md](docs/OPEN-QUESTIONS.md))
  — 5 defects with severity and reproduction, 5 open questions with named owners
- **Architecture notes** ([ARCHITECTURE.md](docs/ARCHITECTURE.md)) — the
  load-bearing pure/DOM split, and why the RTL slider maths inverts
- Four ADRs covering single-file design, publish-with-defects, the HTML
  extraction test strategy, and versioning policy
- CI on push and pull request; MIT license; contribution guide

### Changed

- `egypt_electricity_calculator.html` → `index.html`, required for GitHub Pages.
  The original filename and byte content are preserved in the first commit
  (`git log --follow index.html`).

### Verified

Tariff data checked against the regulator and current reporting:

| Item | Result |
|---|---|
| Service fees (1/2/6/11/15/25/40 EGP) | ✅ Match EgyptERA exactly |
| Tier ranges (50/100/200/350/650/1000) | ✅ Match EgyptERA exactly |
| Tier 1–2, 5–6 prices | ✅ Consistent with EgyptERA base × 1.12 (Aug 2026 increase) |
| `reset` mechanism on tiers 3, 6, 7 | ✅ Corroborated — Aug-2026 reporting lists these tiers with ranges starting from zero |
| Tier 7 price (2.89) | ⚠️ Unconfirmed — see [OQ-002](docs/OPEN-QUESTIONS.md) |
| Tier 3 / tier 4 prices to the qirsh | ⚠️ Unconfirmed — see [OQ-003](docs/OPEN-QUESTIONS.md) |

### Known issues

See **[Unreleased]** above and
[OPEN-QUESTIONS.md](docs/OPEN-QUESTIONS.md). The one that affects users today:
**entering a decimal consumption value gives a badly inflated bill.** Use whole
numbers.

[Unreleased]: https://github.com/MALskylineee/egypt-electricity-calculator/compare/v1.2.1...HEAD
[1.2.1]: https://github.com/MALskylineee/egypt-electricity-calculator/releases/tag/v1.2.1
[1.2.0]: https://github.com/MALskylineee/egypt-electricity-calculator/releases/tag/v1.2.0
[1.1.0]: https://github.com/MALskylineee/egypt-electricity-calculator/releases/tag/v1.1.0
[1.0.1]: https://github.com/MALskylineee/egypt-electricity-calculator/releases/tag/v1.0.1
[1.0.0]: https://github.com/MALskylineee/egypt-electricity-calculator/releases/tag/v1.0.0
