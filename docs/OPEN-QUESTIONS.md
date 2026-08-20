# Open Questions & Known Defects

Two registers. **Defects** are things the code does wrong regardless of the
tariff data. **Open questions** need a decision or an authoritative source
before they can be resolved.

Last reviewed: **2026-08-20**

---

## A. Known defects

### DEF-001 — Fractional kWh input falls through to tier 7 · **severity: high**

`tierOf(X)` matches with `X >= t.lo && X <= t.hi`. Tier ranges are integer
ranges (`…50`, then `51…`), so **any non-integer value lands between two
tiers**, matches nothing, and hits the `|| TIERS[TIERS.length-1]` fallback —
tier 7, the most expensive flat rate.

The calculator input parses with `parseFloat`, and browsers accept typed
decimals in a `number` field regardless of `step="1"`. So this is reachable by
a normal user simply typing `50.5`.

Observed:

| Input | Reported tier | Bill shown | Should be about |
|---|---|---|---|
| 50.5 kWh | 7 | 185.94 EGP | ~36.87 EGP (**5.0× over**) |
| 100.5 kWh | 7 | 330.44 EGP | ~113.06 EGP (**2.9× over**) |
| 650.5 kWh | 7 | 1919.95 EGP | ~1554.85 EGP (**1.2× over**) |

Regression test: `tests/tariff.test.mjs` → *"fractional kWh should not fall
through to tier 7"* (currently `todo`).

**Decision needed:** round the input, or widen tier matching to
`X < nextTier.lo`? Rounding is likelier to match how a meter is actually read.

---

### DEF-002 — Negative kWh produces a positive tier-7 bill · **severity: medium**

Same fallback path. `-5` matches no tier → tier 7 → `-5 × 2.89 + 40 = 25.55
EGP`. The `min="0"` attribute does not prevent typing a negative value, and
nothing clamps it afterwards.

Regression test: *"negative kWh should not produce a tier-7 bill"* (`todo`).

**Decision needed:** clamp to 0, or show a validation message?

---

### DEF-003 — Reset boundaries are duplicated · **severity: low (drift risk)**

`updateSlider()` hard-codes `const nextResetBoundaries = [101, 651, 1001];`.
That is derivable from `TIERS` as
`TIERS.filter(t => t.mode !== 'cum').map(t => t.lo)`.

They agree **today**. If a future tariff moves a boundary and only `TIERS` is
updated, the in-app warning will silently point at the wrong kWh — the worst
kind of failure for a tool whose purpose is warning about boundaries.

Guarded by an invariant test that fails if `TIERS` changes without this
literal being revisited. The duplication itself is not yet removed (see
ADR-0002 on minimum-change discipline).

---

### DEF-004 — Digit rendering is inconsistent · **severity: low (cosmetic)**

`fmt()` uses `toLocaleString('ar-EG')`, which renders Arabic-Indic digits
(`١٬٢٣٤٫٥٠`). But the tier table uses `price.toFixed(2)` and the calculator's
fee box uses raw `tier.fee` — both Latin digits. The same page therefore shows
`٢٬٣٧٥٫٠٠` and `2.35` side by side.

**Decision needed:** pick one numeral system for the whole UI.

---

### DEF-005 — Slider cannot reach real tier-7 consumption · **severity: low**

`SLIDER_MAX = 1300`, and the track is labelled `1300+`. Tier 7 is unbounded,
so households above 1300 kWh cannot model their bill on the slider. The
numeric calculator has no such cap, so the feature is not blocked — only the
visual explorer is.

---

## B. Open questions

### OQ-001 — Should the tool state a tariff effective date in the UI? · blocks: nothing

The footer says the figures are indicative, but the page never says *which*
schedule it implements. A user comparing against an older bill has no way to
tell. A dated line under the tier table would fix it.

**Owner:** Mohamed. **Proposal:** add `التعريفة سارية من أغسطس 2026`.

---

### OQ-002 — Confirm the tier 7 price (2.89) · blocks: numeric accuracy above 1000 kWh

Every other tier is consistent with *EgyptERA base × 1.12*. Tier 7 is not:
`2.23 × 1.12 = 2.50`, yet the tool uses **2.89**. Aug-2026 reporting does cite
289 qirsh, and a larger-than-average rise on the top bracket is plausible
under subsidy reform — but other outlets cite 2.58 and 2.74.

**Owner:** Mohamed (needs an EgyptERA decision document or a real bill above
1000 kWh). **Until resolved:** figures above 1000 kWh may be overstated.

---

### OQ-003 — Confirm tier 3 and tier 4 to the qirsh · blocks: minor accuracy

Tier 3: tool `1.06`; EgyptERA base × 1.12 = `1.064` ✅; one outlet rounds to
"1 pound". Tier 4: tool `1.74`; base × 1.12 = `1.736`; one outlet states
`1.73`. Sub-1-qirsh discrepancies — low impact, worth pinning down.

**Owner:** Mohamed.

---

### OQ-004 — Should the range input be accessible? · blocks: a11y compliance

`#kwhRange` is `opacity: 0` with a custom-drawn thumb, and carries no
`aria-label`, `aria-valuetext` or visible `<label>`. A screen-reader user hears
an unlabelled slider reading raw numbers with no unit or tier context.

**Owner:** Mohamed. **Proposal:** add `aria-label` plus an `aria-valuetext`
updated in `updateSlider()` to announce tier and bill.

---

### OQ-005 — Does the reset rule apply to prepaid (كودي) meters? · blocks: scope claim

The tool implicitly models postpaid billing. Prepaid/card meters are widely
reported to behave differently at tier boundaries. The tool currently makes no
statement either way.

**Owner:** Mohamed — this is a domain call, not a code call.

---

## How to close an item

1. Record the decision and its reasoning in an ADR under `docs/adr/`.
2. Update [TARIFF-MODEL.md](TARIFF-MODEL.md) if the contract changed.
3. For a defect: remove the `todo` flag from its regression test in the same
   commit as the fix, and confirm the test goes green.
4. Delete the entry here and add a line to [CHANGELOG.md](../CHANGELOG.md).
