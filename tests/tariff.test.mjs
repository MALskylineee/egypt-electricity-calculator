import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadEngine, money } from './engine.mjs';

const { TIERS, tierOf, actualCostNoFee, billOf, SLIDER_MAX } = loadEngine();

/* =========================================================================
   1. TARIFF REGISTRY - the frozen contract.
   These values are the single source of truth for the whole app. Changing
   any of them is an approval-gated decision (see docs/TARIFF-MODEL.md).
   If you changed a price on purpose, update this table in the SAME commit.
   ========================================================================= */
describe('tariff registry (frozen - see docs/TARIFF-MODEL.md)', () => {
  const EXPECTED = [
    { n: 1, lo: 0,    hi: 50,       price: 0.68, fee: 1,  mode: 'cum'   },
    { n: 2, lo: 51,   hi: 100,      price: 0.87, fee: 2,  mode: 'cum'   },
    { n: 3, lo: 101,  hi: 200,      price: 1.06, fee: 6,  mode: 'reset' },
    { n: 4, lo: 201,  hi: 350,      price: 1.74, fee: 11, mode: 'cum'   },
    { n: 5, lo: 351,  hi: 650,      price: 2.18, fee: 15, mode: 'cum'   },
    { n: 6, lo: 651,  hi: 1000,     price: 2.35, fee: 25, mode: 'reset' },
    { n: 7, lo: 1001, hi: Infinity, price: 2.89, fee: 40, mode: 'flat'  },
  ];

  test('has exactly 7 tiers', () => {
    assert.equal(TIERS.length, 7);
  });

  for (const exp of EXPECTED) {
    test(`tier ${exp.n}: ${exp.lo}-${exp.hi} @ ${exp.price} + ${exp.fee} fee (${exp.mode})`, () => {
      const t = TIERS.find((x) => x.n === exp.n);
      assert.ok(t, `tier ${exp.n} missing`);
      assert.equal(t.lo, exp.lo, 'lower bound');
      assert.equal(t.hi, exp.hi, 'upper bound');
      assert.equal(t.price, exp.price, 'price per kWh');
      assert.equal(t.fee, exp.fee, 'customer service fee');
      assert.equal(t.mode, exp.mode, 'calculation mode');
    });
  }

  test('tier ranges are contiguous with no gaps for integers', () => {
    for (let i = 1; i < TIERS.length; i++) {
      assert.equal(
        TIERS[i].lo, TIERS[i - 1].hi + 1,
        `gap between tier ${TIERS[i - 1].n} and tier ${TIERS[i].n}`
      );
    }
  });

  test('prices increase monotonically across tiers', () => {
    for (let i = 1; i < TIERS.length; i++) {
      assert.ok(
        TIERS[i].price > TIERS[i - 1].price,
        `tier ${TIERS[i].n} price is not above tier ${TIERS[i - 1].n}`
      );
    }
  });
});

/* =========================================================================
   2. TIER LOOKUP at integer boundaries.
   ========================================================================= */
describe('tierOf() at boundaries', () => {
  const CASES = [
    [0, 1], [1, 1], [50, 1],
    [51, 2], [100, 2],
    [101, 3], [200, 3],
    [201, 4], [350, 4],
    [351, 5], [650, 5],
    [651, 6], [1000, 6],
    [1001, 7], [5000, 7],
  ];
  for (const [kwh, tier] of CASES) {
    test(`${kwh} kWh -> tier ${tier}`, () => {
      assert.equal(tierOf(kwh).n, tier);
    });
  }
});

/* =========================================================================
   3. BILL AMOUNTS - characterisation tests.
   Locked-in expected values for the three calculation mechanisms.
   ========================================================================= */
describe('billOf() known values', () => {
  const CASES = [
    // [kWh, expected total bill incl. fee, why]
    [0,     1.00,    'zero consumption still pays tier 1 service fee'],
    [50,    35.00,   '50*0.68 = 34.00 + 1 fee'],
    [100,   79.50,   '34.00 + 50*0.87 = 77.50 + 2 fee'],
    [101,   113.06,  'tier 3 RESET: all 101 kWh at 1.06 = 107.06 + 6 fee'],
    [200,   218.00,  'tier 3 RESET: 200*1.06 = 212.00 + 6 fee'],
    [201,   224.74,  'tier 4 cumulative on top of reset base 212.00 + 1*1.74 + 11 fee'],
    [350,   484.00,  '212.00 + 150*1.74 = 473.00 + 11 fee'],
    [650,   1142.00, '473.00 + 300*2.18 = 1127.00 + 15 fee'],
    [651,   1554.85, 'tier 6 RESET: 651*2.35 = 1529.85 + 25 fee'],
    [1000,  2375.00, 'tier 6 RESET: 1000*2.35 = 2350.00 + 25 fee'],
    [1001,  2932.89, 'tier 7 FLAT: 1001*2.89 = 2892.89 + 40 fee'],
  ];
  for (const [kwh, expected, why] of CASES) {
    test(`${kwh} kWh -> ${expected.toFixed(2)} EGP  (${why})`, () => {
      assert.equal(money(billOf(kwh)), expected);
    });
  }
});

/* =========================================================================
   4. INVARIANTS - properties that must hold for ANY valid tariff table.
   These are the tests that catch a bad future edit to TIERS.
   ========================================================================= */
describe('invariants', () => {
  test('bill never decreases as consumption increases (0..1300 kWh)', () => {
    const drops = [];
    for (let x = 1; x <= 1300; x++) {
      if (billOf(x) < billOf(x - 1)) drops.push(x);
    }
    assert.deepEqual(drops, [], `bill decreased at: ${drops.join(', ')}`);
  });

  test('consumption cost excluding fees is never negative for valid input', () => {
    for (let x = 0; x <= 1300; x++) {
      assert.ok(actualCostNoFee(x) >= 0, `negative cost at ${x} kWh`);
    }
  });

  test('crossing into a reset tier costs more than one kWh of energy', () => {
    // This is the whole point of the app: prove the "shock" is real.
    for (const t of TIERS.filter((t) => t.mode !== 'cum')) {
      const jump = billOf(t.lo) - billOf(t.lo - 1);
      assert.ok(
        jump > t.price * 10,
        `entering tier ${t.n} at ${t.lo} kWh only jumped ${jump.toFixed(2)}`
      );
    }
  });

  test('slider track segments sum to exactly 100%', () => {
    let total = 0;
    for (const t of TIERS) {
      const hi = t.hi === Infinity ? SLIDER_MAX : t.hi;
      const lo = t.n === 1 ? 0 : t.lo - 1;
      total += Math.max(0, Math.min(hi, SLIDER_MAX) - lo) / SLIDER_MAX * 100;
    }
    assert.equal(money(total), 100);
  });

  test('warn-strip boundaries in updateSlider() match the reset/flat tiers', () => {
    // updateSlider() hard-codes [101, 651, 1001]. If TIERS changes and that
    // literal does not, the in-app warning silently points at the wrong kWh.
    // Spread into a host-realm array: TIERS comes from a vm context, so its
    // derived arrays carry a different Array.prototype and would fail
    // deepStrictEqual on the prototype check alone.
    const derived = [...TIERS.filter((t) => t.mode !== 'cum').map((t) => t.lo)];
    assert.deepEqual(
      derived, [101, 651, 1001],
      'TIERS changed but the hard-coded nextResetBoundaries in index.html did not'
    );
  });
});

/* =========================================================================
   5. KNOWN DEFECTS - see docs/OPEN-QUESTIONS.md.
   Marked `todo` so they are recorded and visible without breaking CI.
   Remove the todo flag in the same commit that lands the fix.
   ========================================================================= */
describe('known defects (todo until fixed)', () => {
  test('fractional kWh should not fall through to tier 7', { todo: 'DEF-001' }, () => {
    assert.equal(tierOf(50.5).n, 2, '50.5 kWh currently resolves to tier 7');
    assert.equal(tierOf(100.5).n, 3);
    assert.equal(tierOf(650.5).n, 6);
  });

  test('negative kWh should not produce a tier-7 bill', { todo: 'DEF-002' }, () => {
    assert.equal(tierOf(-5).n, 1, '-5 kWh currently resolves to tier 7');
    assert.ok(billOf(-5) <= 1, `-5 kWh currently bills ${billOf(-5).toFixed(2)} EGP`);
  });
});
