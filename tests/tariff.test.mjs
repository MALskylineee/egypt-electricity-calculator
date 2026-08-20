import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadEngine, readHtml, money } from './engine.mjs';

const { TIERS, tierOf, actualCostNoFee, billOf, SLIDER_MAX, RESET_BOUNDARIES,
        fmt, fmtInt } = loadEngine();

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

  test('exactly ONE service fee is charged - the tier reached, never accumulated', () => {
    // Confirmed by the owner 2026-08-20: the fee is the one printed in the
    // table for the tier you land in, applied on entering that tier and taken
    // from prepaid credit. It is NOT the sum of the fees of every tier passed
    // through on the way there - that would overcharge by 20 EGP at tier 5.
    let cumulative = 0;
    for (const t of TIERS) {
      cumulative += t.fee;
      const kwh = t.hi === Infinity ? 1200 : t.hi;
      const charged = money(billOf(kwh) - actualCostNoFee(kwh));
      assert.equal(charged, t.fee,
        `tier ${t.n} charged ${charged} in fees, expected exactly ${t.fee}`);
      if (t.n > 1) {
        assert.notEqual(charged, cumulative,
          `tier ${t.n} is charging accumulated fees (${cumulative}) instead of ${t.fee}`);
      }
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

  test('RESET_BOUNDARIES is derived from TIERS, not written out by hand', () => {
    // The in-app warning ("you are N kWh from a reset tier") reads these.
    // They must come from TIERS so a tariff change cannot leave the warning
    // pointing at the wrong kWh.
    // Spread into a host-realm array: values cross out of a vm context and
    // carry a different Array.prototype, which deepStrictEqual rejects.
    const derived = [...TIERS.filter((t) => t.mode !== 'cum').map((t) => t.lo)];
    assert.deepEqual([...RESET_BOUNDARIES], derived,
      'RESET_BOUNDARIES has drifted from the TIERS registry');
    assert.deepEqual([...RESET_BOUNDARIES], [101, 651, 1001]);
  });

  test('every reset boundary warning quotes a real jump', () => {
    for (const b of RESET_BOUNDARIES) {
      const jump = billOf(b) - billOf(b - 1);
      assert.ok(jump > 0, `no jump at the boundary the app warns about (${b} kWh)`);
    }
  });
});

/* =========================================================================
   5. INPUT NORMALISATION.
   Household consumption is a whole number of kWh - that is how a meter is
   read and how a bill is issued. Anything else is normalised at the
   boundary before it reaches the pricing engine. See ADR-0005.
   ========================================================================= */
describe('input normalisation', () => {
  test('a whole number is left exactly as-is', () => {
    for (const x of [0, 1, 50, 51, 100, 101, 650, 651, 1000, 1001, 5000]) {
      assert.equal(tierOf(x).n, tierOf(x).n);
      assert.equal(money(billOf(x)), money(billOf(Math.round(x))));
    }
  });

  test('fractional consumption rounds to the nearest whole kWh', () => {
    assert.equal(money(billOf(450.4)), money(billOf(450)));
    assert.equal(money(billOf(450.6)), money(billOf(451)));
    assert.equal(money(billOf(99.5)),  money(billOf(100)));
    assert.equal(money(billOf(100.4)), money(billOf(100)));
  });

  test('rounding can carry a consumer across a tier boundary', () => {
    // 100.5 rounds to 101, which is the tier 3 reset boundary. This is
    // correct: the bill is issued for 101 kWh, so tier 3 is what applies.
    assert.equal(tierOf(100.5).n, 3);
    assert.equal(money(billOf(100.5)), money(billOf(101)));
    assert.equal(tierOf(100.4).n, 2);
    assert.equal(money(billOf(100.4)), money(billOf(100)));
  });

  test('negative consumption is clamped to zero', () => {
    for (const x of [-1, -5, -0.5, -9999]) {
      assert.equal(tierOf(x).n, 1, `${x} kWh should clamp into tier 1`);
      assert.equal(money(billOf(x)), 1.00, `${x} kWh should bill the tier 1 fee only`);
    }
  });

  test('non-numeric and non-finite input is treated as zero', () => {
    for (const x of [NaN, Infinity, -Infinity, undefined, null, '', 'abc']) {
      assert.equal(money(billOf(x)), 1.00, `${String(x)} should bill as 0 kWh`);
      assert.equal(tierOf(x).n, 1);
    }
  });

  test('a numeric string is accepted', () => {
    assert.equal(money(billOf('450')), money(billOf(450)));
    assert.equal(tierOf('651').n, 6);
  });

  test('normalisation never produces a negative cost', () => {
    for (const x of [-1000, -1, -0.1, 0, 0.1, 0.5]) {
      assert.ok(actualCostNoFee(x) >= 0, `negative cost at ${x}`);
    }
  });
});

/* =========================================================================
   6. NUMBER FORMATTING.
   Every figure on the page must use ONE numeral system. The page's Arabic
   copy, the meter and the real bill all use Western digits, so the
   formatters must too. See ADR-0006.
   ========================================================================= */
describe('number formatting', () => {
  const ARABIC_INDIC = /[\u0660-\u0669\u06F0-\u06F9]/;

  test('fmt() renders Western digits, never Arabic-Indic', () => {
    for (const n of [0, 1.5, 79.5, 1234.5, 2932.89]) {
      const out = fmt(n);
      assert.ok(!ARABIC_INDIC.test(out), `fmt(${n}) produced "${out}"`);
    }
  });

  test('fmtInt() renders Western digits, never Arabic-Indic', () => {
    for (const n of [0, 300, 1300, 5000]) {
      const out = fmtInt(n);
      assert.ok(!ARABIC_INDIC.test(out), `fmtInt(${n}) produced "${out}"`);
    }
  });

  test('fmt() always shows exactly two decimal places', () => {
    assert.equal(fmt(0), '0.00');
    assert.equal(fmt(35), '35.00');
    assert.equal(fmt(113.06), '113.06');
  });

  test('fmtInt() shows no decimal places', () => {
    assert.equal(fmtInt(300), '300');
    assert.equal(fmtInt(0), '0');
  });

  test('thousands are grouped', () => {
    // The group separator varies by engine and locale data, so require
    // exactly one non-digit between the groups rather than pinning a comma.
    assert.match(fmt(2932.89), /^2\D932\.89$/);
    assert.match(fmtInt(1300), /^1\D300$/);
  });

  test('every bill on the tier boundaries formats without Arabic-Indic digits', () => {
    for (const t of TIERS) {
      const kwh = t.hi === Infinity ? 1300 : t.hi;
      assert.ok(!ARABIC_INDIC.test(fmt(billOf(kwh))));
      assert.ok(!ARABIC_INDIC.test(fmtInt(kwh)));
    }
  });
});

/* =========================================================================
   7. SEARCH-ENGINE VISIBILITY.
   The page is deliberately kept out of search results - it is unofficial and
   shared by link, not found by search. See ADR-0008. If the owner decides to
   open it up, delete this block in the same commit as the meta tag.
   ========================================================================= */
describe('search engine visibility', () => {
  const html = readHtml();

  test('the page carries a robots meta tag', () => {
    assert.match(html, /<meta\s+name=["']robots["']/i,
      'the robots meta tag is missing from index.html');
  });

  test('that tag tells crawlers not to index the page', () => {
    const tag = html.match(/<meta\s+name=["']robots["'][^>]*>/i)[0];
    assert.match(tag, /noindex/i, `robots tag does not say noindex: ${tag}`);
    assert.match(tag, /nofollow/i, `robots tag does not say nofollow: ${tag}`);
  });

  test('the tag is inside <head>, where crawlers read it', () => {
    const head = html.slice(0, html.indexOf('</head>'));
    assert.match(head, /<meta\s+name=["']robots["']/i,
      'the robots tag is outside <head> and will be ignored');
  });
});

/* =========================================================================
   8. REGRESSION TESTS for fixed defects. See docs/OPEN-QUESTIONS.md history.
   ========================================================================= */
describe('fixed defects (regression)', () => {
  test('fractional kWh should not fall through to tier 7', () => {
    assert.equal(tierOf(50.5).n, 2, '50.5 kWh currently resolves to tier 7');
    assert.equal(tierOf(100.5).n, 3);
    assert.equal(tierOf(650.5).n, 6);
  });

  test('negative kWh should not produce a tier-7 bill', () => {
    assert.equal(tierOf(-5).n, 1, '-5 kWh currently resolves to tier 7');
    assert.ok(billOf(-5) <= 1, `-5 kWh currently bills ${billOf(-5).toFixed(2)} EGP`);
  });
});
