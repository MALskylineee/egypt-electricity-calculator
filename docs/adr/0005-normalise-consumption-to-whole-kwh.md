# ADR-0005 — Normalise consumption to a whole number of kWh at the boundary

- **Status:** Accepted
- **Date:** 2026-08-20
- **Supersedes:** the DEF-001 / DEF-002 entries in `OPEN-QUESTIONS.md`

## Context

`tierOf()` matched a tier with `X >= t.lo && X <= t.hi`. The registry defines
integer ranges (`0–50`, then `51–100`, …), so **any non-integer value fell
between two ranges, matched nothing, and hit the `|| TIERS[TIERS.length-1]`
fallback** — tier 7, the most expensive flat rate. Negative values did the
same.

The calculator parses its input with `parseFloat`, and browsers accept typed
decimals in a `number` field regardless of `step="1"`. So an ordinary user
typing `50.5` was shown **185.95 EGP instead of about 36.87** — five times too
high — labelled الشريحة 7. Confirmed in the browser, not only in tests.

Two fixes were defensible, and they disagree at the boundary:

- **(A) Round the input to a whole kWh.** `50.5 → 51`, priced as tier 2.
- **(B) Make tier ranges continuous.** Tier 1 becomes `[0, 51)`, so `50.5`
  stays in tier 1 and is priced as `50.5 × 0.68`.

## Decision

**(A). Normalise at the boundary: coerce to a number, clamp anything ≤ 0 or
non-finite to `0`, and round to the nearest whole kWh.**

```js
function normalizeKwh(X){
  const n = Number(X);
  if(!isFinite(n) || n <= 0) return 0;
  return Math.round(n);
}
```

`tierOf`, `actualCostNoFee` and `billOf` each normalise their input, so no
fraction, negative or non-number can reach the pricing arithmetic.

The deciding argument is that this tool models **standard household
consumption**, and household consumption *is* a whole number of kWh. That is
how the meter is read, how the distribution company issues the bill, and how
the published tariff table is written. A bill for 50.5 kWh does not exist.
Option B would price a quantity that never appears on a real bill, and would
make the tool disagree with the invoice it is supposed to explain.

Rounding can carry a consumer across a tier boundary — `100.5` rounds to `101`
and triggers the tier 3 reset. That is correct, not a side effect: if the bill
is issued for 101 kWh, tier 3 is the tier that applies.

## Consequences

**Good**

- The reported bill matches the tariff's own integer model, and therefore the
  real invoice.
- One choke point for all input validation, rather than scattered guards.
- Junk input (`abc`, empty, `NaN`, `Infinity`, `null`) degrades to 0 kWh and
  shows the tier 1 service fee instead of a nonsense figure.
- **Every whole-kWh bill is unchanged**, verified value by value against
  v1.0.1. This fix is strictly additive at the boundaries.

**Bad**

- Rounding is silent. A user typing `100.5` sees a tier 3 bill with no
  explanation that the value was treated as 101. Acceptable for now — the
  input is labelled in whole kWh — but showing the normalised figure back to
  the user is a reasonable future improvement.
- `Math.round` rounds halves up, so `100.5 → 101` while `100.4 → 100`. Anyone
  reading the code should expect that; it is covered by an explicit test.

## Alternatives considered

- **(B) Continuous tier ranges.** Rejected per the reasoning above. It is the
  more "mathematically natural" model and would be the right choice for a
  tariff genuinely defined over real numbers — this one is not.
- **Reject fractional input with a validation error.** Rejected: hostile for a
  user reading `450.7` off a meter app, when the intent is obvious.
- **Fix only `tierOf` and leave the arithmetic alone.** Rejected: it would fix
  the reported tier while still pricing a fractional quantity, so the tier
  label and the total could disagree.
