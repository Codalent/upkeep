# Page-speed notes

This is the agent's long-term memory. Read it before choosing what to change.

- **Humans** curate the first two sections.
- **The agent** appends to "Learnings" at the end of each run: one or two dated
  bullets, and never rewrites earlier ones.

Seed this file before the first run. Ten minutes spent here saves an agent from
undoing a deliberate decision.

## Already done (don't redo or undo)

Performance work already in the codebase, especially anything that looks wrong
without context. For example:

- A font that is deliberately **not** preloaded, and why.
- A third-party script loaded only on interaction.
- An image deliberately left eager because it is the LCP element.

## Constraints

What the agent may not trade away. For example:

- Which third-party scripts must stay, whatever they cost.
- Which parts of the page come from a CMS, so oversized assets are a content
  fix rather than a code fix.
- That localhost scores exclude your CDN, compression, and edge caching, so
  caching-header and server-response findings measured locally need care.

## Learnings

<!-- Agent-appended. Format: - YYYY-MM-DD (`target-id`): learning -->
