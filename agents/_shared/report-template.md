---
agent: <name>
date: YYYY-MM-DD
target: <target-id>
status: done            # done | partial | no-op | blocked
branch: agent/<name>/YYYY-MM-DD-<target-id>
---

# <Target title> — YYYY-MM-DD

## Summary

<Two or three sentences: what was worked on, the headline result, and anything
a reviewer must know before merging.>

## Results

<Before → after figures for whatever this agent measures. Use a table.>

## Changes

| Commit | What changed | Files | Addresses |
| ------ | ------------ | ----- | --------- |
|        |              |       |           |

## Reverted

<Changes that were tried and rolled back, and the measurement that showed they
didn't help. Write "None" if nothing was reverted.>

## Left alone

<Findings that weren't acted on, each with the reason: out of scope, needs a
dependency change, CMS content rather than code, third-party, and so on.>

## Notes for the next run

<Anything a future run should know. Copy the durable points into `NOTES.md`.>
