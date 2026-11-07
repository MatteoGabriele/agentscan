/// <reference types="node" />

import fs from 'fs'
import { Octokit } from 'octokit'
import {
  generateEntry,
  parseIssueBody,
  validateEntry,
  type AutomationEntry,
} from './parse-automation-issue'
import { readList, split } from './lib/automations-list'
import { MIN_APPROVALS, MIN_REJECTIONS, REVIEWERS } from './lib/reviewers'
import { readGithubToken } from './lib/github-token'

const OWNER = 'MatteoGabriele'
const REPO = 'agentscan'

const PENDING_LABEL = 'automation:pending'
const APPROVED_LABEL = 'automation:approved'
const REJECTED_LABEL = 'automation:rejected'
/** Approved reports that were closed before the approvals were left open. */
const CONFIRMED_LABEL = 'automation:confirmed'

export type Outcome = 'approved' | 'rejected' | 'pending'

export interface Tally {
  approvals: number
  rejections: number
  approvedBy: string[]
  rejectedBy: string[]
}

export interface Decision extends Tally {
  issue: number
  outcome: Outcome
  /** Set when the account is already listed; no entry is added. */
  alreadyListed?: boolean
}

/** Approval and rejection thresholds. */
export interface Thresholds {
  minApprovals: number
  minRejections: number
}

export interface Config extends Thresholds {
  reviewers: string[]
}

/**
 * Rejects a report as soon as it can no longer reach MIN_APPROVALS, not only at
 * MIN_REJECTIONS.
 */
export function decide(tally: Tally, config: Config): Outcome {
  if (tally.approvals >= config.minApprovals) {
    return 'approved'
  }

  const stillPossible = config.reviewers.length - tally.rejections

  if (
    tally.rejections >= config.minRejections ||
    stillPossible < config.minApprovals
  ) {
    return 'rejected'
  }

  return 'pending'
}

export function readThresholds(): Thresholds {
  return {
    minApprovals: MIN_APPROVALS,
    minRejections: MIN_REJECTIONS,
  }
}

export function readConfig(): Config {
  return {
    reviewers: REVIEWERS.map((name) => name.toLowerCase()),
    ...readThresholds(),
  }
}

function client(): Octokit {
  return new Octokit({ auth: readGithubToken() })
}

/** An open report, with everything needed to build its list entry. */
export interface Report {
  number: number
  labels: string[]
  body: string
  issueUrl: string
  reportedBy: string
  createdAt: string
}

export function toReport(issue: {
  number: number
  labels: (string | { name?: string | null })[]
  body?: string | null
  html_url: string
  user?: { login: string } | null
  created_at: string
}): Report {
  return {
    number: issue.number,
    labels: issue.labels.map((label) =>
      typeof label === 'string' ? label : label.name || '',
    ),
    body: issue.body || '',
    issueUrl: issue.html_url,
    reportedBy: issue.user?.login || '',
    createdAt: issue.created_at.split('T')[0],
  }
}

export async function openReports(
  octokit: Octokit,
  only?: number,
): Promise<Report[]> {
  const issues = only
    ? [
        (
          await octokit.rest.issues.get({
            owner: OWNER,
            repo: REPO,
            issue_number: only,
          })
        ).data,
      ]
    : await octokit.paginate(octokit.rest.issues.listForRepo, {
        owner: OWNER,
        repo: REPO,
        state: 'open',
        labels: 'automation',
        per_page: 100,
      })

  // Settled reports are skipped by label, so approved ones awaiting publish are
  // not commented on again.
  const settled = [APPROVED_LABEL, CONFIRMED_LABEL, REJECTED_LABEL]

  return issues
    .filter((issue) => issue.state === 'open')
    .filter((issue) => !issue.pull_request)
    .map(toReport)
    .filter((issue) => issue.labels.includes('automation'))
    .filter((issue) => !issue.labels.some((label) => settled.includes(label)))
}

export async function tally(
  octokit: Octokit,
  issue: number,
  reviewers: string[],
): Promise<Tally> {
  const reactions = await octokit.paginate(
    octokit.rest.reactions.listForIssue,
    { owner: OWNER, repo: REPO, issue_number: issue, per_page: 100 },
  )

  const allowed = new Set(reviewers)
  const approvedBy = new Set<string>()
  const rejectedBy = new Set<string>()

  for (const reaction of reactions) {
    const login = reaction.user?.login

    if (!login || !allowed.has(login.toLowerCase())) {
      continue
    }

    if (reaction.content === '+1') {
      approvedBy.add(login)
    } else if (reaction.content === '-1') {
      rejectedBy.add(login)
    }
  }

  return {
    approvals: approvedBy.size,
    rejections: rejectedBy.size,
    approvedBy: [...approvedBy],
    rejectedBy: [...rejectedBy],
  }
}

function entryFor(report: Report, approvedBy: string[]): AutomationEntry {
  const entry = generateEntry(
    parseIssueBody(report.body),
    report.issueUrl,
    report.reportedBy,
    report.createdAt,
    approvedBy,
  )

  if (!validateEntry(entry)) {
    throw new Error(`Issue #${report.number} does not parse into a list entry`)
  }

  return entry
}

function markAlreadyListed(
  approved: { decision: Decision; entry: AutomationEntry }[],
): void {
  if (approved.length === 0) {
    return
  }

  const { added } = split(
    readList(),
    approved.map(({ entry }) => entry),
  )

  for (const { decision, entry } of approved) {
    decision.alreadyListed = !added.includes(entry)
  }
}

function scoreboard(decision: Decision, config: Config): string {
  const format = (logins: string[]) =>
    logins.length ? logins.map((login) => `@${login}`).join(', ') : '—'

  return [
    `👍 **${decision.approvals}/${config.minApprovals}** — ${format(decision.approvedBy)}`,
    `👎 **${decision.rejections}/${config.minRejections}** — ${format(decision.rejectedBy)}`,
  ].join('\n')
}

function approvalComment(decision: Decision, config: Config): string {
  const added = decision.alreadyListed
    ? 'This account is already on the list, so no new entry will be added.'
    : 'The account will be added to the [automations list](https://agentscan.tools/automations) with the next list update. This report stays open until that lands.'

  return [
    `## Approved`,
    ``,
    `This report reached the ${config.minApprovals} approvals required by the review team.`,
    ``,
    scoreboard(decision, config),
    ``,
    added,
    ``,
    `Thanks for the report!`,
  ].join('\n')
}

function rejectionComment(decision: Decision, config: Config): string {
  const unreachable =
    decision.rejections < config.minRejections
      ? `With ${decision.rejections} rejections out of ${config.reviewers.length} reviewers, this report can no longer reach the ${config.minApprovals} approvals it needs.`
      : `This report collected the ${config.minRejections} rejections that settle a review, so it cannot reach the ${config.minApprovals} approvals it needs.`

  return [
    `## Not flagged`,
    ``,
    unreachable,
    ``,
    scoreboard(decision, config),
    ``,
    `This is not a judgement on the account itself — the reviewers just did not find the evidence conclusive. If you have stronger evidence, please open a new report.`,
    ``,
    `Thanks for taking the time to report it.`,
  ].join('\n')
}

/**
 * Comments on a settled report and swaps its label. Rejected and already listed
 * reports are closed; approved ones stay open until `pnpm publish:automations`
 * lands their entry.
 */
async function settleIssue(
  octokit: Octokit,
  decision: Decision,
  config: Config,
): Promise<void> {
  const approved = decision.outcome === 'approved'
  const staysOpen = approved && !decision.alreadyListed

  await octokit.rest.issues.createComment({
    owner: OWNER,
    repo: REPO,
    issue_number: decision.issue,
    body: approved
      ? approvalComment(decision, config)
      : rejectionComment(decision, config),
  })

  await octokit.rest.issues.addLabels({
    owner: OWNER,
    repo: REPO,
    issue_number: decision.issue,
    labels: [approved ? APPROVED_LABEL : REJECTED_LABEL],
  })

  try {
    await octokit.rest.issues.removeLabel({
      owner: OWNER,
      repo: REPO,
      issue_number: decision.issue,
      name: PENDING_LABEL,
    })
  } catch {
    // The label may have been removed by hand already.
  }

  if (staysOpen) {
    console.log(
      `✅ Issue #${decision.issue} approved — left open for the next list update`,
    )
    return
  }

  await octokit.rest.issues.update({
    owner: OWNER,
    repo: REPO,
    issue_number: decision.issue,
    state: 'closed',
    state_reason: approved ? 'completed' : 'not_planned',
  })

  console.log(
    `${approved ? '✅' : '❌'} Issue #${decision.issue} closed as ${approved ? 'approved' : 'rejected'}`,
  )
}

function flag(name: string): string | undefined {
  const match = process.argv
    .slice(2)
    .find((arg) => arg.startsWith(`--${name}=`))
  return match?.split('=').slice(1).join('=')
}

/**
 * The issue to review, from `--issue=` or ISSUE. Validated here so the workflow
 * never interpolates it into a shell command.
 */
function onlyIssue(): number | undefined {
  const raw = (flag('issue') ?? process.env.ISSUE ?? '').trim()

  if (!raw) {
    return undefined
  }

  if (!/^\d+$/.test(raw)) {
    console.error(`✗ issue must be an issue number, got: ${raw}`)
    process.exit(1)
  }

  return parseInt(raw, 10)
}

async function review(
  octokit: Octokit,
  config: Config,
  decisionsPath: string,
): Promise<void> {
  const reports = await openReports(octokit, onlyIssue())

  console.log(
    `🔍 Reviewing ${reports.length} open automation report(s) against ${config.reviewers.length} reviewer(s)\n`,
  )

  const decisions: Decision[] = []
  const approved: { decision: Decision; entry: AutomationEntry }[] = []

  for (const report of reports) {
    const counted = await tally(octokit, report.number, config.reviewers)
    const outcome = decide(counted, config)

    console.log(
      `#${report.number}: 👍 ${counted.approvals}/${config.minApprovals} 👎 ${counted.rejections}/${config.minRejections} → ${outcome}`,
    )

    if (outcome === 'pending') {
      continue
    }

    const decision: Decision = { issue: report.number, outcome, ...counted }

    if (outcome === 'approved') {
      // Built before closing anything, so a report that fails to parse stays open.
      approved.push({ decision, entry: entryFor(report, counted.approvedBy) })
    }

    decisions.push(decision)
  }

  markAlreadyListed(approved)

  for (const decision of decisions) {
    await settleIssue(octokit, decision, config)
  }

  fs.writeFileSync(decisionsPath, JSON.stringify(decisions, null, 2) + '\n')
  console.log(`\nWrote ${decisions.length} decision(s) to ${decisionsPath}`)
}

async function main() {
  const decisionsPath = flag('decisions') || 'automation-decisions.json'

  await review(client(), readConfig(), decisionsPath)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error('Error:', err.message)
    process.exit(1)
  })
}
