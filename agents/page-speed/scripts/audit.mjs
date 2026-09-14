#!/usr/bin/env node
// Runs Lighthouse against one URL, keeps the median run, and prints what the
// page-speed agent needs to decide what to fix next.
//
//   node agents/page-speed/scripts/audit.mjs --url http://localhost:3000/ --label round-1
//     [--runs 3] [--compare round-0] [--out .lighthouse]
//
// Every run uses the same Lighthouse major version, preset, and categories so
// scores are comparable between rounds. Lighthouse varies from run to run, so
// it runs several times and keeps the run with the median performance score.
//
// Writes, under --out:
//   <label>-run<N>.json   every raw run
//   <label>.json          the median run (read its audits[id].details.items)
//   <label>.summary.json  scores and metrics, used by --compare

import { execFileSync } from "node:child_process"
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { parseArgs } from "node:util"

const LIGHTHOUSE = "lighthouse@13"
const CATEGORIES = ["performance", "accessibility", "best-practices", "seo"]
const METRICS = {
  "first-contentful-paint": "FCP",
  "largest-contentful-paint": "LCP",
  "total-blocking-time": "TBT",
  "cumulative-layout-shift": "CLS",
  "speed-index": "SI",
}

const { values: args } = parseArgs({
  options: {
    url: { type: "string" },
    label: { type: "string" },
    runs: { type: "string", default: "3" },
    compare: { type: "string" },
    out: { type: "string", default: ".lighthouse" },
  },
})

if (!args.url || !args.label) {
  console.error("Usage: audit.mjs --url <url> --label <label> [--runs 3] [--compare <label>] [--out .lighthouse]")
  process.exit(1)
}

const runs = Math.max(1, Number(args.runs) || 1)
mkdirSync(args.out, { recursive: true })

// Warm up. ISR and uncached routes render on the first request, which would
// otherwise land inside the first measured run.
for (let i = 0; i < 2; i++) {
  try {
    const res = await fetch(args.url)
    await res.arrayBuffer()
    if (i === 0 && !res.ok) console.warn(`Warning: ${args.url} returned HTTP ${res.status}`)
  } catch (error) {
    console.error(`Cannot reach ${args.url}: ${error.message}`)
    process.exit(1)
  }
}

const chromeFlags = ["--headless=new"]
// Containers often run as root, where Chrome refuses to start sandboxed.
if (process.platform === "linux") chromeFlags.push("--no-sandbox")

const reports = []
for (let i = 1; i <= runs; i++) {
  const path = `${args.out}/${args.label}-run${i}.json`
  execFileSync(
    "npx",
    [
      "-y",
      LIGHTHOUSE,
      args.url,
      "--preset=desktop",
      `--only-categories=${CATEGORIES.join(",")}`,
      `--chrome-flags=${chromeFlags.join(" ")}`,
      "--quiet",
      "--output=json",
      `--output-path=${path}`,
    ],
    { stdio: ["ignore", "ignore", "inherit"] },
  )
  reports.push({ path, lhr: JSON.parse(readFileSync(path, "utf8")) })
}

const perfScore = (lhr) => lhr.categories.performance?.score ?? 0
const median = [...reports].sort((a, b) => perfScore(a.lhr) - perfScore(b.lhr))[Math.floor(reports.length / 2)]
const lhr = median.lhr
copyFileSync(median.path, `${args.out}/${args.label}.json`)

if (lhr.runtimeError) {
  console.error(`Lighthouse error: ${lhr.runtimeError.code}: ${lhr.runtimeError.message}`)
  process.exit(1)
}

const pct = (score) => (typeof score === "number" ? Math.round(score * 100) : null)

const summary = {
  url: lhr.finalDisplayedUrl,
  lighthouseVersion: lhr.lighthouseVersion,
  runs,
  scores: Object.fromEntries(CATEGORIES.map((id) => [id, pct(lhr.categories[id]?.score)])),
  metrics: Object.fromEntries(Object.entries(METRICS).map(([id, name]) => [name, lhr.audits[id]?.numericValue ?? null])),
}
writeFileSync(`${args.out}/${args.label}.summary.json`, JSON.stringify(summary, null, 2))

const formatMetric = (name, value) => {
  if (value == null) return "n/a"
  return name === "CLS" ? value.toFixed(3) : `${Math.round(value)}ms`
}

console.log(`# ${args.label}: ${summary.url}`)
console.log(`Lighthouse ${summary.lighthouseVersion}, desktop preset, median of ${runs} run(s)`)
console.log(`Scores:  ${CATEGORIES.map((id) => `${id} ${summary.scores[id] ?? "n/a"}`).join(" · ")}`)
if (runs > 1) console.log(`Performance per run: ${reports.map((r) => pct(perfScore(r.lhr))).join(", ")}`)
console.log(`Metrics: ${Object.entries(summary.metrics).map(([name, v]) => `${name} ${formatMetric(name, v)}`).join(" · ")}`)

if (args.compare) {
  const previousPath = `${args.out}/${args.compare}.summary.json`
  if (!existsSync(previousPath)) {
    console.log(`\n(no ${previousPath} to compare with)`)
  } else {
    const prev = JSON.parse(readFileSync(previousPath, "utf8"))
    const signed = (n, digits = 0) => (n > 0 ? "+" : "") + n.toFixed(digits)
    console.log(`\n## Change since ${args.compare}`)
    console.log(
      "Scores:  " +
        CATEGORIES.map((id) => {
          const [a, b] = [prev.scores[id], summary.scores[id]]
          return `${id} ${a ?? "n/a"}→${b ?? "n/a"}${a != null && b != null ? ` (${signed(b - a)})` : ""}`
        }).join(" · "),
    )
    console.log(
      "Metrics: " +
        Object.keys(summary.metrics)
          .map((name) => {
            const [a, b] = [prev.metrics[name], summary.metrics[name]]
            if (a == null || b == null) return `${name} n/a`
            const delta = name === "CLS" ? signed(b - a, 3) : `${signed(b - a)}ms`
            return `${name} ${formatMetric(name, a)}→${formatMetric(name, b)} (${delta})`
          })
          .join(" · "),
    )
  }
}

// Performance: failing audits with estimated savings. Lighthouse 13 reports
// most of these as "insights" carrying `metricSavings`; older opportunity
// audits carry `details.overallSavingsMs`. Read both.
const timeSavings = (audit) => {
  const { LCP = 0, FCP = 0, TBT = 0, INP = 0 } = audit.metricSavings ?? {}
  return Math.round(audit.details?.overallSavingsMs ?? Math.max(LCP, FCP, TBT, INP))
}
const byteSavings = (audit) => audit.details?.overallSavingsBytes ?? 0
const layoutSavings = (audit) => audit.metricSavings?.CLS ?? 0

const opportunities = Object.values(lhr.audits)
  .filter((audit) => !(audit.id in METRICS))
  .filter((audit) => typeof audit.score === "number" && audit.score < 0.9)
  .filter((audit) => timeSavings(audit) > 0 || byteSavings(audit) > 0 || layoutSavings(audit) > 0)
  .sort((a, b) => timeSavings(b) - timeSavings(a) || byteSavings(b) - byteSavings(a) || layoutSavings(b) - layoutSavings(a))
  .slice(0, 12)

console.log("\n## Largest performance savings")
if (opportunities.length === 0) console.log("(none)")
for (const audit of opportunities) {
  const parts = [
    timeSavings(audit) && `~${timeSavings(audit)}ms`,
    byteSavings(audit) && `~${Math.round(byteSavings(audit) / 1024)}KiB`,
    layoutSavings(audit) && `CLS -${layoutSavings(audit).toFixed(3)}`,
    audit.displayValue,
  ].filter(Boolean)
  console.log(`  ${audit.id.padEnd(36)} ${parts.join("  ")}`)
}

// Other categories: every weighted audit that isn't passing.
console.log("\n## Failing audits in other categories")
for (const id of CATEGORIES.slice(1)) {
  const failing = (lhr.categories[id]?.auditRefs ?? [])
    .filter((ref) => ref.weight > 0)
    .map((ref) => lhr.audits[ref.id])
    .filter((audit) => typeof audit?.score === "number" && audit.score < 1)
    .map((audit) => audit.id)
  console.log(`  ${id}: ${failing.length ? failing.join(", ") : "(none)"}`)
}

console.log(`\nFull report: ${args.out}/${args.label}.json. See audits.<id>.details.items for exact URLs, selectors, and bytes.`)
