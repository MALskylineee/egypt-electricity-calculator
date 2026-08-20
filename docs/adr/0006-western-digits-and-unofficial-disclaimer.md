# ADR-0006 — Western digits throughout, and an explicit unofficial disclaimer

- **Status:** Accepted
- **Date:** 2026-08-20
- **Resolves:** DEF-004

## Context

Two separate honesty-and-clarity problems, fixed together because both are
about the page not misleading the person reading it.

**1. Two numeral systems on one page.** `fmt()` and the slider's kWh label
used `toLocaleString('ar-EG')`, which renders Arabic-Indic digits
(`١٬٢٣٤٫٥٠`). Everything else — the tier table's prices via `toFixed(2)`, the
service fees, and *all* of the page's hand-written Arabic copy
(`الشرائح 1، 2، 4، 5`, `أكثر من 1000`, `عند 100 كيلوواط`) — used Western
digits. The calculator card showed a total in Arabic-Indic directly beside a
fee in Western digits.

**2. The page did not say it was unofficial.** The footer described it as a
`حاسبة مرجعية` — a *reference* calculator — "built on the current official
household tiers". For a tool that reproduces a government tariff in the
government's own language, that phrasing invites a reader to assume an
official connection that does not exist. Two tariff figures are also still
unconfirmed (OQ-002, OQ-003).

## Decision

**1. Western digits everywhere.** A single `NUM_LOCALE = 'ar-EG-u-nu-latn'`
constant drives `fmt()` (money, 2dp) and `fmtInt()` (whole kWh). The locale
stays Arabic — only the numbering system is pinned.

Western digits, not Arabic-Indic, because:

- The Egyptian distribution company's **bill and the meter both use Western
  digits**. The entire purpose of this tool is to be compared against that
  bill, so matching it is what reduces reader effort.
- The page's own authored Arabic copy already used Western digits everywhere.
  Unifying downward was both the smaller change and the one consistent with
  the author's existing voice.
- Western numerals are the everyday default in Egyptian usage.

**2. A prominent disclaimer, in Arabic, above the calculator.** Placed
directly under the hero — before any figure is shown, not buried in a footer.
It states plainly that the tool is unofficial, unaffiliated with the Ministry
of Electricity, the distribution companies or any official body, that it is
one person's effort, that it **may contain errors or a stale tariff**, and
that the official bill is the only authoritative reference.

The footer's `حاسبة مرجعية` was changed to `حاسبة غير رسمية ومجهود شخصي` so
it no longer contradicts the banner.

## Consequences

**Good**

- One numeral system; a reader never parses two at once, and never has to
  mentally convert to check a figure against their bill.
- A reader is told what this is *before* they act on a number.
- The numeral choice is one constant. Flipping `NUM_LOCALE` to `'ar-EG'`
  restores Arabic-Indic digits across the whole page in one edit.
- Guarded by tests: `fmt()` and `fmtInt()` are asserted never to emit a
  character in the Arabic-Indic ranges, so the defect cannot return silently.

**Bad**

- Readers who prefer Arabic-Indic numerals in Arabic text lose them. Judged
  the lesser cost, since consistency with the bill is the tool's whole job.
- The disclaimer takes vertical space above the content on mobile. Accepted:
  a disclaimer nobody scrolls to is not a disclaimer.

## Alternatives considered

- **Unify on Arabic-Indic instead.** Rejected: it would mean rewriting every
  hand-written number in the page's Arabic copy, and would then *differ* from
  the bill the user is holding — more work for a worse result.
- **Leave the numerals, fix only the disclaimer.** Rejected: DEF-004 is a real
  legibility defect; a figure that looks foreign next to its own label is
  exactly the confusion this tool exists to remove.
- **Footer-only disclaimer.** Rejected: the reader reaches the calculator, and
  a conclusion, long before the footer.
