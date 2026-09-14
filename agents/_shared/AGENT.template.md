---
name: <agent-name>                # folder name; used in branch names and PR titles
owner: <person>                   # who reviews this agent's PRs
schedule: <e.g. every 2 days>     # for reference only; the routine holds the real schedule
output: pull-request              # pull-request | report-only
targets_per_run: 1
requires:
  env: []                         # env vars the routine must provide
  tools: []                       # e.g. Google Chrome, node 20+
---

# <Agent name>

<One paragraph: what this agent improves, on what, and why it matters.>

Read `agents/_shared/RUNBOOK.md` first. Its rules apply to everything below.

## 1. Pick the target

<Where the work queue lives (usually `targets.md`), how to choose from it, and
how to skip targets that are already in an open PR.>

## 2. Set up

<Exact commands to install, build, serve, and prepare tools. Point to
`scripts/` rather than pasting long inline commands.>

## 3. Procedure

<The loop the agent follows: measure, read the findings, change the code,
measure again. Be explicit about:
- how many iterations to run
- when to stop early
- how to decide whether a change is kept or reverted>

## 4. Rules

<Agent-specific guardrails, on top of the runbook: what it must not touch,
what counts as a regression, and what it must measure the same way every time.>

## 5. Finish

<What to write in `runs/`, how to update `targets.md` and `NOTES.md`, and what
goes in the PR.>

## Definition of done

<A checklist a reviewer can verify from the PR alone.>
