# Page-speed targets

The page-speed agent works through this list top to bottom, one target per run.

**Replace the examples below with your own pages.** Order them by traffic and
by how much shared code each one exercises: a template that renders fifty pages
is worth more than a single leaf page. If you have analytics, use them.

## Legend

- `[ ]` to do
- `[x]` done: date, score change, and branch are appended
- `[-]` skipped: add the reason after the id

## Target types

- **page:** audit its one URL.
- **template:** audit the first URL every round. Audit the "Also check" URLs
  once before and once after, to confirm template-level changes help them and
  don't hurt them.

Paths are relative to the site root, audited against the local production build
at `http://localhost:3000<path>`.

---

## Priority 1: highest traffic, most shared code

- [ ] `home` **Home** · page
  - URL: `/`
  - Code: `<route file>`, `<components>`, `<styles>`

- [ ] `product-template` **Product pages** · template
  - URL: `/products/example`
  - Also check: `/products/another`, `/products/third`
  - Code: `<route file>`, `<shared template components>`

- [ ] `pricing` **Pricing** · page
  - URL: `/pricing`
  - Code: `<route file>`

- [ ] `article` **Article** · template
  - URL: `/blog/an-example-post`
  - Also check: `/blog/another-post`
  - Code: `<route file>`, `<article template>`
  - If posts render on demand, the audit script warms each URL before measuring.

- [ ] `blog-index` **Blog index** · page
  - URL: `/blog`
  - Code: `<route file>`

## Priority 2: everything else worth measuring

- [ ] `search` **Search results** · page
  - URL: `/search?q=example`
  - Code: `<route file>`

- [ ] `legal-template` **Legal pages** · template
  - URL: `/privacy`
  - Also check: `/terms`, `/cookies`
  - Code: `<route file>`, `<shared legal layout>`

---

## Not in scope

List the routes agents should ignore, so each run doesn't rediscover them:
API routes, feeds, sitemaps, redirect-only paths, and any page behind auth.
