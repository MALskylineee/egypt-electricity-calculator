# Open Questions & Known Defects

Two registers. **Defects** are things the code does wrong regardless of the
tariff data. **Open questions** need a decision or an authoritative source
before they can be resolved.

Last reviewed: **2026-08-20**

---

## A. Known defects

### DEF-005 — Slider cannot reach real tier-7 consumption · **severity: low**

`SLIDER_MAX = 1300`, and the track is labelled `1300+`. Tier 7 is unbounded,
so households above 1300 kWh cannot model their bill on the slider. The
numeric calculator has no such cap, so the feature is not blocked — only the
visual explorer is.

---

## B. Open questions

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

### OQ-006 — Should the normalised consumption be shown back to the user? · blocks: nothing

Since v1.1.0, input is rounded to a whole kWh
([ADR-0005](adr/0005-normalise-consumption-to-whole-kwh.md)). The rounding is
silent: typing `100.5` produces a tier 3 bill with no indication that the
value was treated as 101 — which matters, because that rounding is what
crossed the reset boundary.

**Owner:** Mohamed. **Proposal:** echo the normalised figure in the results
card when it differs from what was typed.

---

## C. Resolved

| ID | Defect | Resolved in |
|---|---|---|
| DEF-001 | Fractional kWh fell through to tier 7, overstating the bill by up to 5× | v1.1.0 — [ADR-0005](adr/0005-normalise-consumption-to-whole-kwh.md) |
| DEF-002 | Negative kWh produced a positive tier-7 bill | v1.1.0 — same normalisation |
| DEF-003 | Reset boundaries duplicated between `TIERS` and `updateSlider()` | v1.1.0 — now derived as `RESET_BOUNDARIES` |
| DEF-004 | Arabic-Indic and Western digits mixed on the same page | v1.2.0 — [ADR-0006](adr/0006-western-digits-and-unofficial-disclaimer.md) |

### Resolved questions

| ID | Question | Answer |
|---|---|---|
| OQ-001 | Should the page state a tariff effective date? | Yes — v1.3.0 shows `1 أغسطس 2026` under the tier table |
| OQ-005 | Does the tool model prepaid or postpaid meters? | Prepaid card meters are the primary audience; the schedule is the same for both, so the copy is settlement-neutral. [ADR-0007](adr/0007-prepaid-framing-and-tariff-date.md) |
| OQ-002 | Is the tier 7 price really 2.89? | **Yes** — confirmed by the owner, 2026-08-20. The top bracket did not follow the flat 12% rise; 2.50 is the wrong derivation. |
| OQ-007 | Is the service fee deducted from prepaid credit as modelled? | **Yes** — confirmed by the owner, 2026-08-20. One fee, per the tier reached, applied on entering that tier and taken from the card's credit. Matches the implementation. |

---

## How to close an item

1. Record the decision and its reasoning in an ADR under `docs/adr/`.
2. Update [TARIFF-MODEL.md](TARIFF-MODEL.md) if the contract changed.
3. For a defect: write the regression test first and watch it fail, then fix,
   then confirm it goes green.
4. Move the entry to **Resolved** above and add a line to
   [CHANGELOG.md](../CHANGELOG.md).
