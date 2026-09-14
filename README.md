# upkeep — coding agents that keep your codebase in shape, on a schedule

A convention for scheduled coding agents that keep their memory in your repo.

An agent that runs on a schedule starts cold every time. It has no recollection
of what it did on Tuesday, what it already tried, or what a human told it not to
touch. So put all of that in the repo, next to the code it works on.

Each agent is a folder holding four things:

- **a brief** the agent reads at the start of every run
- **a work queue** it takes one item from
- **durable notes** carrying what past runs learned
- **one report per run**, appended, never rewritten

A scheduled job starts it with a single line:

> Read `agents/<name>/AGENT.md` and follow it.

The agent works on a branch and opens a pull request. Merging the PR is what
records the work as done, so review stays where your team already reviews
things.

There's no runtime and nothing to install. This is Markdown, a directory
layout, and one Node script.

## Quickstart

1. Copy the `agents/` folder into your repo.
2. Edit `agents/page-speed/AGENT.md`: the build, serve and lint commands for
   your project, and anything the agent must not touch.
3. Replace the placeholder entries in `agents/page-speed/targets.md` with your
   own pages, in priority order.
4. Do a manual run first and review the PR it opens:

   ```sh
   claude "Read agents/page-speed/AGENT.md and follow it."
   ```

5. Once that looks right, point a scheduled job at the same prompt.

**Run it by hand before you schedule it.** The first run is where you find out
that your build needs an env var the runner doesn't have, or that your lint
script is broken.

## Layout

```
agents/
├── README.md                 the conventions, for humans and agents alike
├── _shared/
│   ├── RUNBOOK.md            rules every agent follows
│   ├── AGENT.template.md     starting point for a new agent
│   └── report-template.md    shape of a run report
└── <agent>/
    ├── AGENT.md              mission, procedure, guardrails, output
    ├── targets.md            work queue (if the agent works through a list)
    ├── NOTES.md              durable memory: what's done, what didn't work
    ├── runs/                 one report per run: YYYY-MM-DD-<target>.md
    └── scripts/              helpers, so commands aren't retyped in prose
```

The split that makes it work: **instructions** change rarely and are edited by
humans, **memory** is updated by the agent inside its own PR, and **output** is
append-only. Mixing them is how these setups turn to mush.

## Included agent: page-speed

A worked example, not a toy. It improves Lighthouse scores one page or template
at a time:

1. Picks the next unchecked target from `targets.md`, skipping anything already
   in an open PR.
2. Builds the site and serves it locally from a production build.
3. Runs three rounds of: audit → read the report → fix → rebuild.
4. Reverts its own change if a round measures worse than the last.
5. Writes a report, ticks the target, appends what it learned, opens a PR.

`scripts/audit.mjs` wraps Lighthouse: three runs, keeps the median, and prints
scores, metrics, the biggest savings, and failing accessibility, best-practices
and SEO audits. `--compare <label>` prints the delta against an earlier round.

```sh
node agents/page-speed/scripts/audit.mjs --url http://localhost:3000/ --label round-1
node agents/page-speed/scripts/audit.mjs --url http://localhost:3000/ --label round-2 --compare round-1
```

Requires Node 20+ and Chrome. Lighthouse is pinned to a major version so scores
stay comparable between runs.

## Setting up a routine

Any runner works that can check out the repo, run an agent with a prompt, and
push a branch. Built for [Claude Code](https://claude.com/claude-code) routines.

- **Prompt:** `Read agents/<name>/AGENT.md and follow it.`
- **Environment:** whatever the agent's `requires:` frontmatter lists. Usually
  the same variables your production build needs.
- **Permissions:** push branches and open PRs. Never push to the default branch.
- **Watch out for build side effects.** If your build publishes a search index
  or pings an analytics service when a variable is set, leave that variable
  unset in the runner.

## Reviewing agent PRs

PR titles start with `[agent:<name>]`. The body summarises the run and links to
the report.

- **Reject the work:** close the PR, then change the target's `[ ]` to `[-]`
  on the default branch with a reason. Otherwise the next run picks it up again.
- **Redo a target:** change `[x]` back to `[ ]`.
- **Reprioritise:** reorder `targets.md`. Agents work top to bottom.

## Writing your own agent

Copy `_shared/AGENT.template.md` and fill it in. The template is opinionated
about the parts that are easy to get wrong: how to pick exactly one target, how
to decide whether a change is kept or reverted, and what to do when blocked.

Some lessons already baked into the page-speed agent, each learned the hard way:

- **Measure more than once.** A single Lighthouse run is noisy enough to
  trigger false reverts. Take a median, and set thresholds that ignore noise.
- **Verify the environment you're measuring.** A stale server left running on
  the port will happily serve a build directory that was replaced underneath
  it, producing failures that look like regressions.
- **Don't let a broken repo-wide command block every run.** Report it instead.
- **One target per run.** Small PRs get reviewed; large ones sit.

## What this isn't

- Not a framework or library. Nothing imports this.
- Not a substitute for review. Agents propose; humans merge.
- Not autonomous refactoring. The guardrails deliberately forbid dependency
  bumps, CI changes, and rewrites.

## License

MIT. See [LICENSE](LICENSE).
