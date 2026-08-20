# ADR-0008 — Keep the page out of search results

- **Status:** Accepted
- **Date:** 2026-08-20
- **Decided by:** Mohamed (owner)

## Context

The site is on GitHub Pages, which is fully public and crawlable by default.
Checked on 2026-08-20, an hour after first publication:

| Check | Result |
|---|---|
| `robots.txt` at the domain root | **404** — and a 404 means "crawl everything" |
| `X-Robots-Tag` response header | none — GitHub Pages does not send one |
| `noindex` meta tag | absent |
| Repository visibility | public |

Nothing was stopping indexing. The page was almost certainly not yet crawled,
which left a short window to decide deliberately rather than react later.

The owner's judgement was to keep it unlisted for now. The tool is explicitly
unofficial, and two tariff prices (OQ-003) are still being pinned down. A page
that reproduces a government tariff in Arabic, ranking in search results, will
be read as authoritative no matter what its disclaimer says.

## Decision

Add to `index.html`:

```html
<meta name="robots" content="noindex, nofollow, noarchive">
```

`noarchive` is included so search engines do not serve a cached snapshot of a
figure that has since been corrected.

The page stays live and fully working. Anyone given the link can open it. It
simply will not be *found* by searching.

**No `robots.txt` is added, because one in this repository would do nothing.**
Crawlers read `robots.txt` only from the domain root —
`https://malskylineee.github.io/robots.txt`. A file in this repo is served at
`https://malskylineee.github.io/egypt-electricity-calculator/robots.txt`,
which no crawler consults. Controlling the real one would require a separate
repository named `malskylineee.github.io`, and it would affect **every** GitHub
Pages project under that account. Out of scope for this repo's decision.

Adding a `robots.txt` here anyway would be worse than useless: it would look
like protection while providing none.

## Consequences

**Good**

- The tool spreads by deliberate sharing rather than by ranking for
  `حاسبة شرائح الكهرباء`, which suits something unofficial and still being
  verified.
- Reversible in one line. Removing a `noindex` is easy; **de-indexing a page
  that has already ranked is slow and incomplete** — cached copies and third
  party scrapes persist. Blocking first and opening later is the recoverable
  ordering; the reverse is not.
- Enforced by tests, so it cannot be dropped by accident in a future edit.

**Bad**

- People who would benefit and are actively searching will not find it. This
  is a real cost, and the reason to revisit once OQ-003 is closed.
- `noindex` is a request, not a wall. Well-behaved crawlers honour it;
  scrapers need not. The page is public and must be treated as such.
- **The GitHub repository itself remains public and indexable on github.com.**
  `noindex` on the Pages site does nothing about that. Making the repo private
  would break Pages on a free account, and would contradict the original goal
  of publishing openly.

**Revisit when** the tariff figures are fully confirmed and the owner wants
reach. Removing the tag and deleting the corresponding test block is the whole
change.

## Alternatives considered

- **Leave it indexable.** Rejected by the owner for now. Legitimate — the tool
  exists to help people, and being findable serves that. It is the natural
  choice once the numbers are confirmed.
- **A `robots.txt` in this repository.** Rejected: served from a path no
  crawler reads. See above.
- **A `malskylineee.github.io` repo with a site-wide `robots.txt`.** Offered
  and not chosen; it would block every project under the account, which is a
  larger decision than this one.
- **Make the repository private.** Rejected: breaks Pages on a free account
  and reverses the original decision to publish openly.
