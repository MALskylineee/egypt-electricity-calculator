# ADR-0002 — Publish v1.0.0 with behaviour unchanged, including known defects

- **Status:** Accepted
- **Date:** 2026-08-20

## Context

Reviewing the calculator before publication turned up real defects — most
seriously, any fractional kWh input falls through to tier 7 and overstates the
bill by up to 5× (DEF-001). The tempting move was to fix them as part of
publishing.

Two things argued against it. First, the fixes are not mechanical: DEF-001 has
two defensible resolutions (round the input, or widen tier matching) that
produce different numbers at the boundary, and picking one is a product
decision about how a meter reading is understood — not a typo fix. Second,
mixing "publish the existing tool" with "change what the tool computes" makes
the first release impossible to verify against the thing that was reviewed.

## Decision

Publish v1.0.0 with the calculation behaviour **byte-identical** to the
reviewed original. Ship the review as documentation and as recorded, failing-by-
design tests instead of as code changes.

Concretely:

- `index.html` is unchanged apart from its filename.
- Every defect gets a regression test **before** it gets a fix, marked
  `{ todo: 'DEF-00N' }` so it is recorded and visible without breaking CI.
- Every defect and unresolved tariff question is written up in
  `docs/OPEN-QUESTIONS.md` with severity, evidence and the decision needed.
- Fixes land in v1.1.0 once the owner has made those calls.

## Consequences

**Good**

- v1.0.0 is exactly the artifact that was reviewed. The review's claims are
  checkable against the published code.
- Defects are recorded with reproducible evidence rather than silently patched.
- Judgement calls stay with the owner. The domain is Egyptian electricity
  billing; guessing at the right rounding behaviour is not the agent's call.
- Each fix arrives as its own reviewable change with a test that flips green.

**Bad**

- **A published v1.0.0 has a known high-severity bug.** A user typing `50.5`
  sees a bill 5× too high. This is mitigated only by documentation, not by code.
- "1.0.0 with a known high-severity defect" is a defensible but debatable
  version choice — see ADR-0004.

**Accepted risk.** The window between publishing and fixing should be short.
If DEF-001 is not resolved promptly, the right response is to fix it, not to
extend the exception.

## Alternatives considered

- **Fix everything, then publish.** Rejected: bundles unreviewed product
  decisions into the initial release, and the tariff questions (OQ-002/003)
  need external sources that may take a while. Publishing need not block on it.
- **Publish as 0.9.0 / pre-release.** Rejected — see ADR-0004.
- **Add an in-app warning banner about DEF-001.** Rejected: that *is* a
  behaviour change, and a confusing one to explain to end users. The existing
  footer disclaimer already frames the figures as indicative.
