# ADR-0007 — Frame the tool around the tariff, not around a bill

- **Status:** Accepted
- **Date:** 2026-08-20
- **Decided by:** Mohamed (domain owner)
- **Resolves:** OQ-001, OQ-005

## Context

The page was written in the language of a monthly invoice: *"افهم فاتورتك صح"*,
*"إجمالي الفاتورة"*, *"الإجمالي المطلوب دفعه"*, and a footer telling the reader
to *"راجع فاتورتك"*. The disclaimer named the official bill as the only
authoritative reference.

The owner corrected the premise: **the households this tool is for are on
prepaid card meters (`عدادات بكارت شحن`) — there is no bill.** Credit is
loaded onto a card and drawn down as electricity is used. Telling such a
reader to check their bill points at a document that does not exist, and
"الإجمالي المطلوب دفعه" describes a payment that already happened at top-up
time.

His framing: this is not *"understand your bill"*, it is
**"افهم تسعيرة استهلاكك واحسبها صح"** — understand the tariff on your
consumption, and calculate it correctly.

This also explains the tool's own emphasis. On a postpaid account, crossing a
reset boundary is a surprise at the end of the month. On a prepaid meter it is
immediate and visceral: credit disappears faster than expected the moment
consumption crosses into tier 3, 6 or 7. That is the exact complaint the tool
exists to make legible in advance.

Separately, the page never stated *which* tariff schedule it implemented
(OQ-001), so a reader had no way to tell whether the figures were current.

## Decision

**1. Replace bill language with cost/tariff language.** `فاتورة` → `التكلفة`
throughout; `الإجمالي المطلوب دفعه` → `إجمالي تكلفة الاستهلاك`; the hero
adopts the owner's own wording verbatim. The disclaimer and footer now point
at **the published official tariff from the distribution company** rather than
at a bill.

**2. State the tariff date on the page**, under the tier table:
`التعريفة محسوبة على آخر تعديل مُطبَّق بتاريخ 1 أغسطس 2026` — with an explicit
warning that the figures go stale if the tariff changes after that.

**3. Do not narrow the tool to prepaid-only in the UI.** The tier structure,
prices and service fees are the same schedule either way; only the *settlement
mechanism* differs. Neutral cost language serves both prepaid and postpaid
readers, whereas a "prepaid only" label would wrongly exclude postpaid ones.
The prepaid context is recorded here and in `TARIFF-MODEL.md` instead.

## Consequences

**Good**

- The page no longer tells a prepaid user to consult a document they will
  never receive.
- A reader can see at a glance whether the tariff is the one they are on, and
  is told directly that it may have moved since.
- OQ-005 is settled: prepaid is the primary context, not an unknown.
- The wording is the owner's own, not a paraphrase of it.

**Bad**

- `التكلفة` is slightly more abstract than `الفاتورة`. Judged worth it —
  accurate and abstract beats concrete and wrong.
- The date is written in the markup, so it must be updated by hand whenever
  the tariff changes. It is now one more thing that can go stale, alongside
  `TIERS` and the tariff schedule version in `TARIFF-MODEL.md`. The release
  checklist in ADR-0004 covers the version; **this date must be updated in the
  same commit as any price change.**

**Open, not settled by this ADR:** whether the per-tier customer service fee
(`الرسوم الإدارية`) is deducted from prepaid credit in exactly the way the
tool models it. Tracked as OQ-007.

## Alternatives considered

- **Keep bill language and add a prepaid note.** Rejected: the copy would
  still be wrong for the primary audience, with a footnote apologising for it.
- **Rewrite entirely around top-up mechanics** (`رصيد`, `شحن`, "how long will
  this top-up last"). Rejected for now — a much larger change that would
  narrow the tool to prepaid, and a genuinely different feature. Worth
  considering as a future addition rather than a replacement.
- **Put the tariff date only in the docs.** Rejected: the person who needs it
  is the reader of the page, not the reader of the repository.
