# Changelog

All notable changes to this project are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
This project uses [Semantic Versioning](https://semver.org) for the software,
plus a separate `YYYY-MM` tariff schedule version — see
[ADR-0004](docs/adr/0004-versioning-and-release-policy.md).

---

## [Unreleased]

Nothing yet. Next up is resolving the defects below — each needs a product
decision first, recorded in [OPEN-QUESTIONS.md](docs/OPEN-QUESTIONS.md).

- **DEF-001** (high) — fractional kWh input falls through to tier 7
- **DEF-002** (medium) — negative kWh produces a positive tier-7 bill
- **DEF-003** (low) — reset boundaries duplicated between `TIERS` and `updateSlider()`
- **DEF-004** (low) — Arabic-Indic and Latin digits mixed on the same page
- **DEF-005** (low) — slider capped at 1300 kWh, cannot reach real tier-7 consumption

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

[Unreleased]: https://github.com/MALskylineee/egypt-electricity-calculator/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/MALskylineee/egypt-electricity-calculator/releases/tag/v1.0.0
