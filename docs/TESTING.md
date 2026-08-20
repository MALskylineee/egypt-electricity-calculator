# Testing

```bash
npm test
```

No dependencies — the Node built-in test runner. Requires Node 20+.

## What the suite covers

| Group | Guards against |
|---|---|
| Tariff registry | A price, range, fee or mechanism changing without the contract being updated |
| `tierOf()` boundaries | Off-by-one at each of the 6 tier edges |
| `billOf()` known values | The arithmetic of all three mechanisms, incl. re-baselining |
| Invariants | Any *future* tariff edit producing a nonsensical schedule |
| Input normalisation | Fractions, negatives, junk and numeric strings reaching the pricing arithmetic |
| Fixed defects | Regression cover for DEF-001/002 so they cannot come back |

## How it reaches the code

There is no module to import — the logic lives inside `index.html`. So
`tests/engine.mjs` reads the file, extracts the `<script>` block, slices off
everything from `/* ---------- Section B` onward, and evaluates the remaining
pure prefix in a `node:vm` context.

The tests therefore exercise **the exact code the browser runs**. There is no
second copy of the tariff logic to drift out of sync.

Two consequences worth remembering:

- Keep pure functions above the marker (see [ARCHITECTURE.md](ARCHITECTURE.md)).
- Values crossing out of the vm carry a **different realm's prototypes**.
  `assert.deepStrictEqual` compares prototypes, so spread vm-derived arrays
  into host arrays (`[...arr]`) before deep-comparing them.

## The invariant tests

These are the valuable ones. They encode properties that must hold for *any*
valid tariff, so they catch a bad edit nobody thought to write a case for:

- **Monotonicity** — the bill never decreases as consumption rises (0–1300 kWh, every integer).
- **Non-negative cost** — energy cost never goes below zero.
- **The shock is real** — crossing into a `reset`/`flat` tier must jump the bill by more than 10× the tier's own per-kWh price. If a future edit made the reset mechanism a no-op, this fails.
- **Track segments sum to 100%** — the slider cannot render a gap or overflow.
- **Boundary drift** — `RESET_BOUNDARIES` is still derived from `TIERS` rather than written out by hand.
- **Warnings are real** — every boundary the app warns about actually produces a jump.

## Adding a defect

1. Write the test that *should* pass once fixed.
2. If you are not fixing it now, mark it `{ todo: 'DEF-00N' }` so CI stays
   green while the defect is recorded, and add it to
   [OPEN-QUESTIONS.md](OPEN-QUESTIONS.md).
3. When fixing: remove the `todo` flag **first**, watch the test fail, then
   write the fix and watch it pass. A regression test that was never seen red
   has not been shown to test anything.
4. Move the entry to the Resolved table in OPEN-QUESTIONS.md.

## Not covered

No DOM or browser testing — no rendering, event wiring, RTL layout or
formatting assertions. Everything below the marker is verified by hand; the
manual pass is the table in [CHANGELOG.md](../CHANGELOG.md) for each release.
Adding Playwright is a live option if the UI grows.
