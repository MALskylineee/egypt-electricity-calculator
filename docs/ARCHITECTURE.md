# Architecture

## Shape

One file. `index.html` contains the markup, the CSS and the JavaScript, with
no build step, no dependencies and no network calls. Opening it from a local
filesystem works exactly like the deployed page. See
[ADR-0001](adr/0001-single-file-no-build-step.md) for why.

```
index.html
├─ <style>   design tokens in :root, then section-scoped rules
├─ <body>    5 cards, all content-empty; every value is rendered by JS
└─ <script>
   ├─ DATA    TIERS, MECH_TEXT, SLIDER_MAX
   ├─ ENGINE  fmt, tierOf, actualCostNoFee, billOf     ← pure, no DOM
   └─ VIEWS   buildTierTable, buildShock, buildTrackBg,
              updateSlider, updateCalculator            ← DOM only
```

## The one structural rule

**Everything above the `/* ---------- Section B` comment must stay pure —
no DOM access.** `tests/engine.mjs` slices the `<script>` block at exactly that
marker and evaluates the prefix in a `node:vm` context to test the pricing
engine headlessly.

Move a pure function below the marker and it silently drops out of test
coverage. Move a DOM-touching function above it and the whole suite fails to
load with an explicit error. Keep the split.

## Data flow

`TIERS` is the only state. There is no store and no reactivity: each input
event recomputes its own section directly from `TIERS`.

```
                    ┌──────────┐
                    │  TIERS   │  (frozen registry — docs/TARIFF-MODEL.md)
                    └────┬─────┘
          ┌──────────────┼──────────────┬────────────────┐
          ▼              ▼              ▼                ▼
    buildTierTable  buildShock    buildTrackBg    tierOf / billOf
          │              │              │                │
       (static)      (static)       (static)     ┌───────┴────────┐
                                                 ▼                ▼
                                          updateSlider    updateCalculator
                                          ▲                       ▲
                                   'input' on #kwhRange    'input' on #kwhInput
```

The slider and the numeric calculator are **independent**. They do not sync,
by design — the slider is for exploring the shape of the curve, the calculator
is for one specific real bill.

## The engine

Three functions, in dependency order:

| Function | Purpose |
|---|---|
| `tierOf(X)` | Find the tier containing `X`. Falls back to the last tier when nothing matches — the source of [DEF-001/002](OPEN-QUESTIONS.md). |
| `actualCostNoFee(X)` | Energy cost. Branches on the tier's mechanism; the `cum` branch walks all lower tiers, re-baselining whenever it passes a `reset` tier. |
| `billOf(X)` | `actualCostNoFee(X) + tier.fee`. |

Full algorithm and worked values: [TARIFF-MODEL.md](TARIFF-MODEL.md).

## Rendering notes worth knowing

**The layout is RTL.** `dir="rtl"` on `<html>` means the flex track in
`.track-bg` lays tier 1 out at the **right** edge. `updateSlider()` therefore
positions the thumb with `left: (100 - pct)%`, not `left: pct%`. This is
correct — do not "fix" it.

**Track segments are computed, not hard-coded.** `buildTrackBg()` derives each
segment's width from `TIERS`, clamping tier 7's infinite ceiling to
`SLIDER_MAX`. An invariant test asserts the widths sum to exactly 100%.

**The range input is invisible.** `#kwhRange` is `opacity: 0` and stretched
over the track; `.thumb` is a non-interactive div. This keeps native keyboard
and drag behaviour while allowing a custom look — at an accessibility cost
tracked as [OQ-004](OPEN-QUESTIONS.md).

## Deployment

GitHub Pages serves the repository root on every push to `main`. `index.html`
is the entry point, which is why the file was renamed from
`egypt_electricity_calculator.html` — the original name is preserved in the
first commit.
