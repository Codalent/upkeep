---
name: page-speed
owner: <your-name>
schedule: every 2 days
output: pull-request
targets_per_run: 1
rounds: 3
lighthouse: lighthouse@13, desktop preset, median of 3 runs
requires:
  env:
    # Whatever your production build needs. Leave unset anything that makes the
    # build publish to an external service (a search index, an analytics ping).
    - <BUILD_ENV_VARS>
  tools:
    - node 20+
    - Google Chrome or Chromium (installed on the fly if missing; see step 2)
---

# Improve the Lighthouse scores of one page or template

Each run takes **one** target from `agents/page-speed/targets.md` and improves
its Lighthouse scores.

Prefer fixes in shared code over one-off tweaks, so other pages benefit too.
Shared code here means the layout, fonts, the image pipeline, script loading,
and caching headers.

Read `agents/_shared/RUNBOOK.md` first. Its rules apply to everything below.
Then read `agents/page-speed/NOTES.md`. It lists work that's already been done
and things that didn't help, so you don't redo them.

## 1. Pick the target

1. Open `agents/page-speed/targets.md`. It's in priority order. Candidates are
   the items marked `[ ]`.
2. Skip any target whose id matches an unmerged `agent/page-speed/*` branch.
   The runbook explains how to list those branches.
3. Take the first remaining target.
   - If none remain, do a sweep instead (section 6).
4. Create your branch: `agent/page-speed/<yyyy-mm-dd>-<target-id>`.

A target is either:

- **a page**: one URL, or
- **a template**: several URLs rendered by the same route or components.

For a template, the first URL listed is the **primary URL**. You audit it in
every round. The URLs under "Also check" are **siblings**. Audit them once
before your first change and once at the end. That confirms a template change
helped them too, or at least didn't hurt them.

Use the "Code" line of the target as your starting point. Follow the imports
from the route file to find everything that renders.

## 2. Build and serve

Serve the site locally from a **production build**, not a dev server. Adapt
these commands to this project:

```sh
mkdir -p .lighthouse
npm ci
npm run build

# Always free the port before starting. A server left running keeps serving a
# build directory that the rebuild has replaced, which shows up as phantom 500s
# and invalid scores.
lsof -ti:3000 | xargs -r kill -9 2>/dev/null
npm start > .lighthouse/server.log 2>&1 &
for i in $(seq 1 300); do curl -sf -o /dev/null http://localhost:3000/ && break; sleep 2; done
grep -q EADDRINUSE .lighthouse/server.log && echo "PORT CONFLICT - the audit would measure a stale server"
```

- **After every round's changes:** kill the server by port, rebuild, start it
  again, and check for `EADDRINUSE` before auditing. A production build doesn't
  pick up edits, and a stale server serving a half-replaced build produces
  measurements that look like regressions but are not.
- If your build publishes to an external service when some variable is set,
  leave that variable unset.
- If Lighthouse can't find Chrome, install it and point Lighthouse at it:

  ```sh
  npx -y @puppeteer/browsers install chrome@stable
  export CHROME_PATH=<path it printed>
  ```

- If the build fails before you've changed anything, you're blocked. Follow the
  runbook's "When blocked" section.

## 3. Work in three rounds

Each round is:

1. run a fresh Lighthouse audit of the page,
2. read that report,
3. make the improvements it points at,
4. go round again, so the next audit shows what the last round did and what is
   left.

**Before round 1,** audit each sibling URL, if it's a template target:

```sh
node agents/page-speed/scripts/audit.mjs --url "http://localhost:3000<sibling-path>" --label siblings-before-<n>
```

### Each round (1, 2, 3)

1. **Audit.** Run the audit script on the primary URL:

   ```sh
   node agents/page-speed/scripts/audit.mjs --url "http://localhost:3000<path>" --label round-<N> [--compare round-<N-1>]
   ```

   The script runs Lighthouse three times with the desktop preset, keeps the
   median run as `.lighthouse/round-<N>.json`, and prints the scores, metrics,
   largest savings, and failing accessibility, best-practices and SEO audits.
   `--compare` adds the change since an earlier round.

   Always measure the same way, so the numbers compare between rounds.

2. **Read the report.**
   1. Note the four scores and the metrics (LCP, TBT, CLS). Compare them with
      the previous round. In round 1 there's nothing to compare with yet.
   2. **If this round is worse than the last, revert the previous round's
      changes before going on.** Worse means any of:
      - performance down by 3 or more points
      - any other category down at all
      - LCP up by more than 10%
      - TBT up by more than 50 ms
      - CLS up by more than 0.02

      Smaller movements are run-to-run noise. Revert with `git revert`, not a
      reset, so the history shows what was tried. A change that made the page
      slower is not kept.
   3. When checking whether a fix reached the DOM, match attributes exactly as
      the framework renders them (React, for instance, renders
      `fetchPriority`, not `fetchpriority`). A case-insensitive habit here
      saves a wasted round.
   4. List the failing audits with the largest estimated savings. Each audit's
      `details.items` in the JSON carries the exact URLs, selectors, and byte
      counts. Read them rather than guessing.

3. **Improve.**
   - Find the code behind those audits and make the changes they call for, a
     few related ones at a time.
   - Commit each group with a message naming the audits.
   - Keep the page looking and behaving the same. A faster page that lost a
     feature is a regression.
   - Run this project's lint or test command before moving on. If it is already
     broken for unrelated reasons, report that in the run report rather than
     fixing or working around it.

4. **Go round again.** Rebuild and restart the server (see step 2).

### After round 3

1. Rebuild and audit once more with `--label final --compare round-1`.
2. Audit each sibling again with
   `--label siblings-after-<n> --compare siblings-before-<n>`. If a sibling got
   worse by the thresholds above, find out why and fix or revert. Template
   changes must not trade one page for another.

**Stop early** only when a round's report shows nothing worth acting on, and
say so in the report.

## 4. Rules

- Don't change dependency versions, lockfiles, CI, or deployment configuration
  unless a fix genuinely needs it. If one does, say so in the report and leave
  that change out of the PR.
- Don't rewrite the framework, build tool, or styling system.
- Don't remove content, tracking, or features to gain a score. Third-party
  scripts the business relies on stay. Load them better, but don't drop them.
- Don't edit CMS content. If an audit's cause is content, such as an oversized
  uploaded image, list it in the report under "Content fixes for editors". You
  may still fix how the code requests that content, such as image service
  parameters or `sizes` attributes.
- Measure with the same preset every round, through `scripts/audit.mjs`.
- These are localhost numbers with no CDN or real network. They're for
  comparing rounds, not for claiming production scores. Say so in the PR.

## 5. Finish

1. **Write the report** at `agents/page-speed/runs/<yyyy-mm-dd>-<target-id>.md`,
   following `agents/_shared/report-template.md`. It must include:
   - **Results:** the four scores plus LCP, TBT and CLS, from round 1 and the
     final audit, with a before/after row for each sibling.
   - **Changes:** every change, with files and the audit it addressed.
   - **Reverted:** anything rolled back, and the numbers that showed it didn't
     help.
   - **Left alone:** each finding you didn't act on and why, plus a "Content
     fixes for editors" list if there were any.
2. **Tick the target** in `targets.md`: change `[ ]` to `[x]` on your target's
   first line only, and append
   ` — <yyyy-mm-dd>, perf <round-1>→<final>, branch agent/page-speed/<...>`.
   Don't touch any other line.
3. **Update `NOTES.md`.** Append one or two bullets under "Learnings" for
   anything a future run on a different target should know: a shared fix now in
   place, a dead end, or a third-party cost that can't be fixed in code.
4. Open the PR as the runbook describes. If the target was already healthy and
   nothing was worth acting on, status is `no-op`: still tick it, and open a PR
   with the report alone.

## 6. Sweep (when every target is ticked)

Don't change any code in a sweep.

1. Build and serve as in step 2.
2. Audit each target's primary URL once: `--runs 1 --label sweep-<target-id>`.
3. Write `runs/<yyyy-mm-dd>-sweep.md` with one row per target, sorted by
   performance score, lowest first.
4. Recommend which targets to reopen, and why.
5. Open a PR containing only that report. A human decides what to reset.

## Definition of done

- [ ] One target worked on, on its own branch, in one PR.
- [ ] Round 1 and final scores are in the report, measured the same way.
- [ ] Sibling URLs of a template were checked before and after, none regressed.
- [ ] Each commit names the Lighthouse audits it addresses.
- [ ] Nothing reverted is still in the diff, and nothing kept made things worse.
- [ ] The project's lint or test command was run, or its breakage reported.
- [ ] `targets.md` ticked and `NOTES.md` updated.
