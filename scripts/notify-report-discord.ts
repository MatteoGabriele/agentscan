/// <reference types="node" />
/**
 * Announce automation report activity in the reviewers' Discord channel.
 *
 * Reviewers rule on reports by reacting to the issue, so they first have to
 * know one exists. Three moments are announced, and only those three: a report
 * being opened, and the review workflow approving or rejecting it. Nothing is
 * posted while a report sits pending, so the channel stays a to-do list rather
 * than a running commentary.
 *
 *   --event=opened   --issue=<n>          a freshly opened report
 *   --event=decided  --decisions=<file>   the review workflow's outcomes
 *
 * Add --dry-run to print the messages instead of sending them.
 *
 * Configuration comes from the environment (see the workflows):
 *   DISCORD_WEBHOOK_REPORT  webhook URL for the reviewers' channel
 *   GITHUB_TOKEN            used to read the issues
 *   MIN_APPROVALS           only to render the 👍 n/N denominator
 *   MIN_REJECTIONS          only to render the 👎 n/N denominator
 */

import fs from 'fs'
import { Octokit } from 'octokit'
import { parseIssueBody } from './parse-automation-issue'
import type { Decision } from './review-automation-issues'

const OWNER = 'MatteoGabriele'
const REPO = 'agentscan'

const REPORT_LABEL = 'automation'

/** Discord caps a message at 2000 characters; the reason is the only long part. */
const MAX_REASON_LENGTH = 300

/** Discord rate limits webhooks, and a run can settle several reports at once. */
const POST_INTERVAL_MS = 1_000

export interface ReportSummary {
  issue: number
  url: string
  username: string
  reportedBy: string
  reason: string
}

export interface Thresholds {
  minApprovals: number
  minRejections: number
}

export function truncate(text: string, maxLength = MAX_REASON_LENGTH): string {
  const clean = text.trim()

  if (clean.length <= maxLength) {
    return clean
  }

  return `${clean.slice(0, maxLength - 1).trimEnd()}…`
}

export function openedMessage(report: ReportSummary): string {
  return [
    '🆕 **New automation report**',
    '',
    `Account: \`@${report.username}\``,
    `Reported by: \`@${report.reportedBy}\``,
    '',
    `> ${truncate(report.reason)}`,
    '',
    `React 👍 or 👎 on the issue to review it: ${report.url}`,
  ].join('\n')
}

export function decidedMessage(
  report: ReportSummary,
  decision: Decision,
  thresholds: Thresholds,
): string {
  const approved = decision.outcome === 'approved'

  const outcome = approved
    ? decision.alreadyListed
      ? `\`@${report.username}\` was already on the automation list, so no new entry was added.`
      : `\`@${report.username}\` has been added to the automation list.`
    : `\`@${report.username}\` was not flagged.`

  return [
    approved ? '✅ **Report approved**' : '❌ **Report not flagged**',
    '',
    outcome,
    '',
    // Counts only. Who voted which way stays on the issue, where the scoreboard
    // comment already spells it out.
    `👍 ${decision.approvals}/${thresholds.minApprovals}  ·  👎 ${decision.rejections}/${thresholds.minRejections}`,
    '',
    report.url,
  ].join('\n')
}

function readThresholds(): Thresholds {
  // Defaults match scripts/review-automation-issues.ts, so a message rendered
  // without the workflow's environment still shows the real bar.
  const minApprovals = parseInt(process.env.MIN_APPROVALS || '5', 10)
  const minRejections = parseInt(process.env.MIN_REJECTIONS || '3', 10)

  return {
    minApprovals: Number.isInteger(minApprovals) ? minApprovals : 5,
    minRejections: Number.isInteger(minRejections) ? minRejections : 3,
  }
}

function client(): Octokit {
  const auth = process.env.GITHUB_TOKEN

  if (!auth) {
    console.error('✗ GITHUB_TOKEN is not set')
    process.exit(1)
  }

  return new Octokit({ auth })
}

/**
 * Returns null when the issue is not an automation report, so a mistargeted
 * dispatch posts nothing rather than posting nonsense.
 */
async function fetchReport(
  octokit: Octokit,
  issue: number,
): Promise<ReportSummary | null> {
  const { data } = await octokit.rest.issues.get({
    owner: OWNER,
    repo: REPO,
    issue_number: issue,
  })

  const labels = data.labels.map((label) =>
    typeof label === 'string' ? label : label.name || '',
  )

  if (!labels.includes(REPORT_LABEL)) {
    console.log(`ℹ️ Issue #${issue} is not an automation report — skipping`)
    return null
  }

  const parsed = parseIssueBody(data.body || '')

  return {
    issue,
    url: data.html_url,
    username: parsed.username || 'unknown',
    reportedBy: data.user?.login || 'unknown',
    reason: parsed.reason || 'No reason given.',
  }
}

async function post(content: string, dryRun: boolean): Promise<void> {
  if (dryRun) {
    console.log('Dry run — nothing sent to Discord:\n')
    console.log(content)
    console.log('')
    return
  }

  const webhook = process.env.DISCORD_WEBHOOK_REPORT

  if (!webhook) {
    console.error('✗ DISCORD_WEBHOOK_REPORT is not set')
    process.exit(1)
  }

  const response = await fetch(webhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
    signal: AbortSignal.timeout(10_000),
  })

  if (!response.ok) {
    console.error('✗ Discord webhook failed:', response.status)
    process.exit(1)
  }

  console.log('✓ Discord notification sent')
}

function flag(name: string): string | undefined {
  const match = process.argv
    .slice(2)
    .find((arg) => arg.startsWith(`--${name}=`))
  return match?.split('=').slice(1).join('=')
}

async function openedEvent(dryRun: boolean): Promise<void> {
  const raw = flag('issue')

  if (!raw || !/^\d+$/.test(raw)) {
    console.error('✗ --event=opened needs --issue=<number>')
    process.exit(1)
  }

  const octokit = client()
  const report = await fetchReport(octokit, parseInt(raw, 10))

  if (!report) {
    return
  }

  await post(openedMessage(report), dryRun)
}

async function decidedEvent(dryRun: boolean): Promise<void> {
  const decisionsPath = flag('decisions') || 'automation-decisions.json'

  if (!fs.existsSync(decisionsPath)) {
    console.log('No decisions file — nothing to announce')
    return
  }

  const decisions = JSON.parse(
    fs.readFileSync(decisionsPath, 'utf-8'),
  ) as Decision[]

  if (!decisions.length) {
    console.log('No decisions were made — nothing to announce')
    return
  }

  const octokit = client()
  const thresholds = readThresholds()

  for (const [index, decision] of decisions.entries()) {
    const report = await fetchReport(octokit, decision.issue)

    if (!report) {
      continue
    }

    if (index > 0 && !dryRun) {
      await new Promise((resolve) => setTimeout(resolve, POST_INTERVAL_MS))
    }

    await post(decidedMessage(report, decision, thresholds), dryRun)
  }
}

async function main() {
  const event = flag('event')
  const dryRun = process.argv.slice(2).includes('--dry-run')

  if (event === 'opened') {
    await openedEvent(dryRun)
    return
  }

  if (event === 'decided') {
    await decidedEvent(dryRun)
    return
  }

  console.error(`✗ Unknown event "${event}" — expected opened or decided`)
  process.exit(1)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error('Error:', err.message)
    process.exit(1)
  })
}
