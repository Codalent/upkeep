# Agent runbook

Rules every agent in `agents/` follows. An agent's `AGENT.md` can tighten these
but never loosen them. If the two disagree, the stricter rule wins.

## Start of a run

1. You are on a fresh clone, with no memory of earlier runs. Your memory is the
   repo. Read, in this order:
   1. this runbook
   2. your `AGENT.md`
   3. your `NOTES.md`
   4. the three most recent reports in your `runs/` folder
2. **Find work already in progress.** Anything on an unmerged branch of yours
   is in progress. Don't pick it again and don't duplicate it:

   ```sh
   git fetch origin --prune
   git branch -r --no-merged origin/<default-branch> --list 'origin/agent/<name>/*'
   ```

   Branch names end in the target id, so you can match them against your queue.
   With the GitHub CLI, `gh pr list --state open --search "head:agent/<name>/"`
   gives the same answer with PR links.
3. Create your branch from the default branch:
   `agent/<name>/<yyyy-mm-dd>-<target-id>`.

## While working

- **One target per run** unless your `AGENT.md` says otherwise. Small PRs get
  reviewed. Large ones sit.
- **Commit in logical steps**, in the style the repo already uses. Where a tool
  flagged the issue, name the finding the commit addresses.
- **Keep behaviour and visuals the same.** A change that loses a feature,
  content, tracking, or visual fidelity is a regression, whatever it does to a
  score.
- **Stay within scope.** Unless your `AGENT.md` explicitly allows it, don't
  change dependency versions or lockfiles, CI configuration, deployment
  configuration, or the framework, build tool, or styling system. If a fix
  genuinely needs one of these, leave it out and describe it in your report
  under "Left alone".
- **External services are read-only.** Never write to a CMS, search index,
  mailing list, or chat service, and never use an admin or management token. If
  a fix belongs in content rather than code, write it up for the people who own
  that content.
- **Never commit** secrets, `.env*` files, or bulky generated output. Keep those
  in gitignored folders.
- **Never** push to the default branch, force-push, rewrite history on a branch
  you didn't create this run, or merge your own PR.
- **Check the repo's own checks before relying on them.** Run the lint or test
  command your `AGENT.md` names, and fix anything you introduced. If the command
  is already broken for reasons unrelated to your change, don't try to fix it
  and don't work around it: say so in the report and carry on.

## When blocked

If something outside your control stops the run, don't improvise changes to
work around it. That includes a build failing before you changed anything, a
missing environment variable, an unreachable service, or a tool that won't
install.

Instead:

1. Write the run report with `status: blocked`, the exact error, and what a
   human needs to do.
2. Open a PR containing only that report, titled
   `[agent:<name>] blocked: <reason>`.
3. Don't tick the target.

Unattended runs have no other way to raise a flag.

## End of a run

1. Write `runs/<yyyy-mm-dd>-<target-id>.md` from `_shared/report-template.md`.
2. Update your memory files as your `AGENT.md` describes. Edit only the lines
   that belong to your target, and append rather than rewrite, so parallel open
   PRs don't conflict.
3. Push the branch and open a PR:
   - **Title:** `[agent:<name>] <target title>: <one-line outcome>`
   - **Body:** the report's summary and results, a link to the report file, and
     a "How to verify" section with the exact commands or URLs to check.
4. End your run by reporting the PR URL and what changed.
