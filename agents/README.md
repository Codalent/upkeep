# Agents

Each folder here is one agent: a self-contained brief plus the files it uses to
remember its work between runs. A scheduled job starts an agent with a one-line
prompt:

> Read `agents/<name>/AGENT.md` and follow it.

Everything an agent needs lives in the repo, so a run on a fresh clone behaves
the same as a run on your laptop.

## Agents

| Agent                     | What it does                                             | Schedule     | Output       |
| ------------------------- | -------------------------------------------------------- | ------------ | ------------ |
| [page-speed](page-speed/) | Improves Lighthouse scores, one page or template per run | Every 2 days | Pull request |

Add a row when you add an agent.

## Layout

```
agents/
├── README.md                 this file
├── _shared/
│   ├── RUNBOOK.md            rules every agent follows (read before AGENT.md)
│   ├── AGENT.template.md     starting point for a new agent
│   └── report-template.md    shape of a run report
└── <agent>/
    ├── AGENT.md              the brief: mission, procedure, guardrails, output
    ├── targets.md            work queue (checklist), for list-based agents
    ├── NOTES.md              durable memory: what's done, what not to redo
    ├── runs/                 one report per run: YYYY-MM-DD-<target>.md
    └── scripts/              helpers the agent runs
```

Three kinds of file, kept apart on purpose:

| Kind         | Files                    | Who edits it                  | Changes          |
| ------------ | ------------------------ | ----------------------------- | ---------------- |
| Instructions | `AGENT.md`, `scripts/`   | Humans                        | Rarely           |
| Memory       | `targets.md`, `NOTES.md` | The agent, inside its own PR  | Every run        |
| Output       | `runs/*.md`              | The agent; never edited after | One file per run |

Raw tool output (reports, screenshots, traces) is never committed. Keep it in a
gitignored folder such as `.lighthouse/`.

## How a run flows

1. The job starts on a fresh clone and reads the agent's `AGENT.md`.
2. The agent reads `_shared/RUNBOOK.md`, its `NOTES.md`, and its recent `runs/`.
3. It picks the next unchecked target that isn't already in an open PR.
4. It works on a branch named `agent/<name>/<yyyy-mm-dd>-<target-id>`.
5. It writes a run report, ticks the target, and opens a PR.

**Merging the PR is what marks the work done.** Until then the default branch
still shows the target unchecked, and the next run skips it because its branch
is open. Unmerged work is never duplicated.

## Reviewing agent PRs

- PR titles start with `[agent:<name>]`; the body links to the report.
- **To reject the work:** close the PR, then change the target's `[ ]` to `[-]`
  with a reason. Otherwise the next run picks that target again.
- **To make the agent redo a target:** change `[x]` back to `[ ]`.
- **To reprioritise:** reorder `targets.md`. Agents work top to bottom.

## Adding an agent

1. Copy `_shared/AGENT.template.md` to `agents/<name>/AGENT.md` and fill it in.
2. Add `NOTES.md`, `runs/.gitkeep`, and `targets.md` if it works through a list.
3. Add a row to the table above.
4. Do a manual run and review the PR it opens.
5. Schedule it.
