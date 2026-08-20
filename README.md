<div align="center">

# ⚡ حاسبة شرائح الكهرباء المصرية

**Egypt Electricity Tier Calculator**

افهم تسعيرة استهلاكك واحسبها صح — and see for yourself why one extra
kilowatt-hour can cost hundreds of pounds.

[![CI](https://github.com/MALskylineee/egypt-electricity-calculator/actions/workflows/ci.yml/badge.svg)](https://github.com/MALskylineee/egypt-electricity-calculator/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/MALskylineee/egypt-electricity-calculator)](https://github.com/MALskylineee/egypt-electricity-calculator/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Tariff](https://img.shields.io/badge/tariff-2026--08-orange)](docs/TARIFF-MODEL.md)

**[▶ Open the calculator](https://malskylineee.github.io/egypt-electricity-calculator/)**

</div>

---

> ### ⚠️ تنويه مهم: الحاسبة دي غير رسمية
>
> ده **مجهود شخصي فردي**، مالوش أي علاقة بوزارة الكهرباء ولا بشركات التوزيع
> ولا بأي جهة رسمية، ومش معتمد من أي حد. الهدف منه بس إنه يساعدك تفهم إزاي
> تسعيرة استهلاكك بتتحسب. **الأرقام هنا ممكن يكون فيها أخطاء** أو تكون التعريفة اتغيرت
> ولسه مااتحدثتش هنا. متاخدش أي قرار بناءً عليها، و**التعريفة الرسمية المُعلنة من شركة
> التوزيع بتاعتك هي المرجع الوحيد المعتمد**.
>
> ### ⚠️ This is an unofficial tool
>
> **A solo personal effort.** Not affiliated with, endorsed by, or connected to
> the Egyptian Ministry of Electricity, any distribution company, or any
> official body. It exists only to help people understand how the tariff on their
> consumption is calculated. **The figures may contain errors** or reflect a tariff that has
> since changed. Do not make decisions based on them — **the official published
> tariff from your distribution company is the only authoritative reference.**

---

## ما هذا؟ · What this is

Egyptian households on **prepaid card meters** (`عدادات بكارت شحن`) never see a
monthly invoice — credit is loaded onto a card and drawn down as electricity is
used. So this is not a "understand your bill" tool. It answers the question
that actually matters: **what does my consumption cost under the tariff, and
have I calculated it correctly?**

Most Egyptian electricity calculators assume the tariff is a plain progressive
schedule — each tier's price applied only to the kWh inside it. **It isn't.**

Three tiers behave differently: crossing into tier 3, 6 or 7 **discards the
whole calculation and re-prices every kilowatt-hour you used that month** at
the new tier's rate. That is why bills jump the way they do:

| You go from | to | Your cost rises by | The extra kWh is worth |
|---|---|---|---|
| 100 kWh | 101 kWh | **+33.56 EGP** | 1.06 EGP |
| 650 kWh | 651 kWh | **+412.85 EGP** | 2.35 EGP |
| 1000 kWh | 1001 kWh | **+557.89 EGP** | 2.89 EGP |

Crossing into tier 6 costs **176 times** what the kilowatt-hour that triggered
it is actually worth. On a prepaid meter that is not an end-of-month surprise —
it is credit vanishing the moment you cross the line. This tool exists to make
that visible beforehand.

## What's in it

- **Mechanism explainer** — the three ways a tier can be billed, and which tiers use which
- **Full tier table** — ranges, prices, service fees, mechanism, rendered from one registry
- **Tier-entry comparison** — the three boundary jumps, computed live rather than hard-coded
- **Interactive slider** — drag through 0–1300 kWh; the tier, bill and effective average price update instantly, and a warning appears when you are within 15 kWh of a reset boundary
- **Calculator** — enter your real consumption for a full breakdown

Arabic-first, RTL, mobile-friendly, works offline.

## Using it

Open the [live page](https://malskylineee.github.io/egypt-electricity-calculator/),
or clone and open `index.html` in any browser. There is nothing to install and
no build step — one file, no dependencies, no network calls.

```bash
git clone https://github.com/MALskylineee/egypt-electricity-calculator.git
cd egypt-electricity-calculator
start index.html      # Windows   (macOS: open · Linux: xdg-open)
```

## ⚠️ Before you trust a number

- **Unofficial and indicative.** See the disclaimer above. Figures come from
  the published tariff schedule; your distribution company's official tariff is
  authoritative.
- **Tariff schedule `2026-08`, effective 1 August 2026** — the last applied
  amendment. If the tariff has changed since, these figures are stale.
  Residential/household only.
- **Not modelled:** VAT and levies, arrears, instalments, meter rental,
  non-residential tariffs, or prepaid top-up mechanics (remaining credit, how
  long a top-up lasts). This prices a month's consumption, not the balance on
  your card.
- **Consumption is rounded to a whole kWh** — `450.7` is treated as `451`.
  That is how meters are read and bills are issued
  ([ADR-0005](docs/adr/0005-normalise-consumption-to-whole-kwh.md)).
- Tier 3 and tier 4 prices are still being pinned down to the qirsh —
  see [OQ-003](docs/OPEN-QUESTIONS.md). Sub-1-qirsh, so the effect is small.

## Documentation

| Document | What it answers |
|---|---|
| [TARIFF-MODEL.md](docs/TARIFF-MODEL.md) | **Start here.** The canonical contract: the three mechanisms, the frozen tier registry, the algorithm, worked values, and where each number came from. |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | How the file is laid out, the pure/DOM split, why the RTL slider maths looks backwards. |
| [TESTING.md](docs/TESTING.md) | How the suite reaches code that lives inside an HTML file. |
| [OPEN-QUESTIONS.md](docs/OPEN-QUESTIONS.md) | Known defects with severity and evidence; unresolved tariff questions and who owns them. |
| [ADRs](docs/adr/) | Why single-file, why publish with defects intact, why tests extract from HTML, how versioning works, why consumption is rounded to whole kWh, why Western digits. |
| [CHANGELOG.md](CHANGELOG.md) | What changed in each release. |
| [CONTRIBUTING.md](CONTRIBUTING.md) | The rules that keep the tariff contract honest. |

## Development

```bash
npm test
```

57 tests, no dependencies, Node 20+. They run against the real `index.html` —
there is no second copy of the tariff logic to drift out of sync. Change a
price without updating the contract and the suite fails on purpose.

The suite includes **invariant** tests that hold for any valid tariff: the bill
never decreases as consumption rises, entering a reset tier must actually cause
a jump, and the slider's segments must sum to exactly 100%.

Every bug gets a regression test that is seen **red before the fix** — a test
that was never seen failing has not been shown to test anything.

## Versioning

Two numbers, because two things change independently:

- **Software version** — SemVer, tagged `vX.Y.Z`
- **Tariff schedule version** — `YYYY-MM`, at the top of [TARIFF-MODEL.md](docs/TARIFF-MODEL.md)

A price change is always a MINOR bump, never a PATCH — displayed numbers
changed, and that belongs in the changelog. Details in
[ADR-0004](docs/adr/0004-versioning-and-release-policy.md).

## Sources

- [EgyptERA](https://egyptera.org/en/TarrifAug2024.aspx) — the regulator's published tariff
- [Youm7](https://www.youm7.com/story/2026/8/1/7499145) — tier prices after the August 2026 increase
- [Ahram Business](https://business.ahram.org.eg/News/78077.aspx) — official 2026 tier prices

## License

[MIT](LICENSE) © 2026 Mohamed Abdallah
