# ADR-0004 — Semantic versioning, with the tariff schedule versioned separately

- **Status:** Accepted
- **Date:** 2026-08-20

## Context

The tool has two independent things that change: **the software** (features,
layout, bug fixes) and **the tariff data** (prices set by the Egyptian
regulator). They change for unrelated reasons and on unrelated schedules. A
single version number cannot honestly describe both — "v1.2.0" tells a user
nothing about whether the prices are current, which is the thing they most need
to know.

There was also a real question about whether a first release carrying a known
high-severity defect (DEF-001) should be 1.0.0 at all.

## Decision

**Two version identifiers.**

1. **Software version** — [Semantic Versioning](https://semver.org), tagged in
   git as `vMAJOR.MINOR.PATCH` and mirrored in `package.json`.
   - MAJOR — the bill for a given kWh changes because the *algorithm* changed
   - MINOR — new feature, or a defect fix that changes displayed output
   - PATCH — fixes with no effect on any computed figure
2. **Tariff schedule version** — a `YYYY-MM` string at the top of
   `docs/TARIFF-MODEL.md`, currently `2026-08`.

**A tariff price change is a MINOR bump plus a tariff-version bump**, never a
PATCH — the numbers users see change, and that must be visible in the changelog.

**First release is v1.0.0**, not 0.x. The tool is feature-complete and has been
in real use; its tier model is corroborated against the regulator and current
reporting. 0.x would imply the design is still in flux, which is not true. The
known defects are documented in `docs/OPEN-QUESTIONS.md` with severity and
reproduction, and recorded as `todo` tests — that is a more honest signal than
a version number, which no user reads as "has bugs" anyway.

## Consequences

**Good**

- A user can ask "are these prices current?" and get an answer from the tariff
  version, independent of software releases.
- Tariff updates are impossible to mistake for cosmetic patches.
- Release tags give a stable reference for reporting a bug against.

**Bad**

- Two numbers to keep in step; either can be forgotten. Partly guarded by the
  registry test, which fails if `TIERS` changes — a prompt, though it cannot
  force the version bump itself.
- Shipping 1.0.0 with a known high-severity defect is a judgement call others
  might make differently. ADR-0002 records the reasoning and the accepted risk.

## Release checklist

1. `npm test` — green, and no `todo` that should now be passing.
2. Update `CHANGELOG.md` under a new version heading.
3. Bump `version` in `package.json`.
4. If prices changed: bump the tariff version and the provenance table in
   `docs/TARIFF-MODEL.md`.
5. Commit, then `git tag -a vX.Y.Z -m "..."` and push tags.
6. Create the GitHub release from the tag.
7. Verify the deployed Pages site shows the change.
