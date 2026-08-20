# The Tariff Model — canonical contract

> This document is the **single source of truth** for how a bill is calculated.
> The code in `index.html` implements it; the tests in `tests/tariff.test.mjs`
> enforce it. If these three ever disagree, this document wins and the other
> two are bugs.

**Tariff schedule version:** `2026-08` (post 12% increase)
**Sector:** Residential / household (`منزلي`) only. Commercial, industrial and
agricultural tariffs are **out of scope**.
**Billing period:** one calendar month, per meter.

---

## 1. The three calculation mechanisms

This is the part almost every other calculator gets wrong. Egypt's household
tariff is **not** a plain progressive/cumulative schedule. Three different
mechanisms coexist:

| Code | Arabic label | Meaning |
|---|---|---|
| `cum` | تراكمي عادي | Standard progressive. Each tier's price applies **only to the kWh that fall inside that tier's range**. Everything below keeps the price it already had. |
| `reset` | مسح وإعادة حساب | Once consumption enters this tier, **all previously computed cost is discarded** and the **entire** consumption — from the first kWh — is re-priced at this tier's rate. |
| `flat` | سعر ثابت مطلق | Support is removed entirely. The whole consumption is charged at one uniform rate from zero. Mechanically identical to `reset`; kept as a distinct code because it is a different *policy* (total desubsidisation, not a re-baseline) and may diverge in future schedules. |

### Why `reset` exists

Egyptian reporting describes tiers 3, 6 and 7 with ranges that **start from
zero** (`0–200`, `0–1000`, `1000+`) rather than from the previous tier's
ceiling. That phrasing *is* the reset rule: crossing into one of those tiers
re-prices the whole month, which is why one extra kWh can add tens or hundreds
of pounds to the bill. Demonstrating that effect is the entire purpose of this
tool.

---

## 2. The tier registry (frozen)

Prices in EGP per kWh. The fee is a fixed monthly customer-service charge
(`رسوم خدمة العملاء`) added once, determined by the tier the consumer lands in.

| # | Range (kWh) | Price (EGP/kWh) | Service fee (EGP) | Mechanism |
|---|---|---|---|---|
| 1 | 0 – 50 | 0.68 | 1 | `cum` |
| 2 | 51 – 100 | 0.87 | 2 | `cum` |
| 3 | 101 – 200 | 1.06 | 6 | **`reset`** |
| 4 | 201 – 350 | 1.74 | 11 | `cum` |
| 5 | 351 – 650 | 2.18 | 15 | `cum` |
| 6 | 651 – 1000 | 2.35 | 25 | **`reset`** |
| 7 | above 1000 | 2.89 | 40 | **`flat`** |

> **Changing any value in this table is an approval-gated decision.** It is a
> frozen enumerated registry. Update this table, `TIERS` in `index.html`, and
> the `EXPECTED` table in `tests/tariff.test.mjs` in the **same commit**, and
> bump the tariff schedule version above. The test suite fails otherwise —
> that is intentional, so drift is loud rather than silent.

---

## 3. The algorithm

### 3.0 Input normalisation

Household consumption is **a whole number of kWh** — that is how the meter is
read, how the bill is issued, and how the tier ranges above are written. Input
is normalised before any pricing happens:

```
normalizeKwh(X):
    n = Number(X)
    if n is not finite, or n <= 0:  return 0
    return round(n)
```

So `450.7 → 451`, `-5 → 0`, `"abc" → 0`. Rounding can carry a consumer across a
boundary (`100.5 → 101`, which triggers the tier 3 reset); that is correct,
because the bill would be issued for 101 kWh. See
[ADR-0005](adr/0005-normalise-consumption-to-whole-kwh.md).

### 3.1 Pricing

Given normalised consumption `X` kWh, let `T` be the tier whose range contains `X`.

```
if T.mode is 'reset' or 'flat':
    consumptionCost = X * T.price

if T.mode is 'cum':
    walk every tier BELOW T in order, maintaining (base, prevHi):
        if that tier is NOT 'cum':  base  = tier.hi * tier.price   # re-baseline
        else:                       base += (tier.hi - prevHi) * tier.price
        prevHi = tier.hi
    consumptionCost = base + (X - prevHi) * T.price

totalBill = consumptionCost + T.fee
```

The subtlety in the `cum` branch: a `reset` tier **below** the current one
leaves behind a re-baselined floor (`tier.hi * tier.price`) rather than an
accumulated sum. That is why 201 kWh costs `200×1.06 + 1×1.74 + 11`, not
`50×0.68 + 50×0.87 + 100×1.06 + 1×1.74 + 11`.

---

## 4. Worked reference values

These are locked in by `tests/tariff.test.mjs`.

| kWh | Total bill (EGP) | Derivation |
|---|---|---|
| 0 | 1.00 | no energy, tier 1 fee still applies |
| 50 | 35.00 | 50×0.68 = 34.00 (+1) |
| 100 | 79.50 | 34.00 + 50×0.87 = 77.50 (+2) |
| 101 | 113.06 | **reset** → 101×1.06 = 107.06 (+6) |
| 200 | 218.00 | 200×1.06 = 212.00 (+6) |
| 201 | 224.74 | 212.00 + 1×1.74 = 213.74 (+11) |
| 350 | 484.00 | 212.00 + 150×1.74 = 473.00 (+11) |
| 650 | 1142.00 | 473.00 + 300×2.18 = 1127.00 (+15) |
| 651 | 1554.85 | **reset** → 651×2.35 = 1529.85 (+25) |
| 1000 | 2375.00 | 1000×2.35 = 2350.00 (+25) |
| 1001 | 2932.89 | **flat** → 1001×2.89 = 2892.89 (+40) |

### Tier-entry jumps, quantified

| Boundary crossed | Bill jump | Energy actually bought |
|---|---|---|
| 100 → 101 kWh | **+33.56 EGP** | 1.06 EGP |
| 650 → 651 kWh | **+412.85 EGP** | 2.35 EGP |
| 1000 → 1001 kWh | **+557.89 EGP** | 2.89 EGP |

Crossing into tier 6 costs **176× more** than the kWh that triggered it.

---

## 5. Provenance and verification status

| Item | Status | Source |
|---|---|---|
| Service fees (1/2/6/11/15/25/40) | ✅ Verified | EgyptERA official tariff page |
| Tier ranges (50/100/200/350/650/1000) | ✅ Verified | EgyptERA official tariff page |
| Tier 1 price 0.68 | ✅ Verified | EgyptERA; frozen, excluded from the 12% rise |
| Tier 2 price 0.87 | ✅ Consistent | EgyptERA base 0.78 × 1.12 = 0.874 |
| Tier 5 price 2.18 | ✅ Consistent | EgyptERA base 1.95 × 1.12 = 2.184 |
| Tier 6 price 2.35 | ✅ Consistent | EgyptERA base 2.10 × 1.12 = 2.352 |
| Tier 7 price 2.89 | ⚠️ Confirm | Matches Aug-2026 reporting, but EgyptERA base 2.23 × 1.12 = 2.50. Other outlets cite 2.58 and 2.74. See OQ-002. |
| Tier 3 price 1.06 | ⚠️ Confirm | EgyptERA base 0.95 × 1.12 = 1.064 ✅, but one outlet rounds it to "1 pound". See OQ-003. |
| Tier 4 price 1.74 | ⚠️ Confirm | EgyptERA base 1.55 × 1.12 = 1.736 → rounds to 1.74; one outlet states 1.73. See OQ-003. |
| `reset` on tiers 3, 6, 7 | ✅ Corroborated | Aug-2026 reporting lists these tiers with ranges beginning at zero. |

### Derived constants

`RESET_BOUNDARIES` — the kWh values at which the whole bill is re-priced from
zero — is **derived from this registry** (`[101, 651, 1001]` today), never
written out by hand. The in-app proximity warning reads it, so a tariff change
cannot leave the warning pointing at a stale boundary.

Unresolved items are tracked in [OPEN-QUESTIONS.md](OPEN-QUESTIONS.md).

**Reference sources**

- EgyptERA (regulator), current tariff — <https://egyptera.org/en/TarrifAug2024.aspx>
- Youm7, new tier prices after the 12% increase (1 Aug 2026) — <https://www.youm7.com/story/2026/8/1/7499145>
- Ahram Business, official 2026 tier prices — <https://business.ahram.org.eg/News/78077.aspx>

---

## 6. Out of scope

Deliberately **not** modelled. Do not add these without an ADR:

- VAT, stamp duty, municipal or lighting levies
- Arrears, instalments, meter rental, reconnection charges
- Prepaid (`كودي` / card) meter behaviour, which can differ
- Non-residential tariffs
- Historical schedules and back-dated recalculation
