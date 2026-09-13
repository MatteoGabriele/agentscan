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

const OWNER = 'MatteoGabriele'
const REPO = 'agentscan'

const PENDING_LABEL = 'automation:pending'
const CONFIRMED_LABEL = 'automation:confirmed'
const REJECTED_LABEL = 'automation:rejected'

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
  /** Set when the account is already on the list, so no entry will be added. */
  alreadyListed?: boolean
}

/** The bar a report has to clear, without the roster it is counted against. */
export interface Thresholds {
  minApprovals: number
  minRejections: number
}

export interface Config extends Thresholds {
  reviewers: string[]
}

/**
 * A report is rejected once it can no longer pass, not only once MIN_REJECTIONS
 * is hit: with 7 reviewers and 5 approvals required, a 3rd 👎 leaves at most 4
 * possible 👍, so the outcome is already settled.
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
  const auth = process.env.GITHUB_TOKEN

  if (!auth) {
    console.error('✗ GITHUB_TOKEN is not set')
    process.exit(1)
  }

  return new Octokit({ auth })
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

  return issues
    .filter((issue) => issue.state === 'open')
    .filter((issue) => !issue.pull_request)
    .map(toReport)
    .filter((issue) => issue.labels.includes('automation'))
    .filter(
      (issue) =>
        !issue.labels.includes(CONFIRMED_LABEL) &&
        !issue.labels.includes(REJECTED_LABEL),
    )
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
    : 'The account will be added to the [automations list](https://agentscan.tools/automations) with the next list update.'

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

async function closeIssue(
  octokit: Octokit,
  decision: Decision,
  config: Config,
): Promise<void> {
  const approved = decision.outcome === 'approved'

  await octokit.rest.issues.createComment({
    owner: OWNER,
    repo: REPO,
    issue_number: decision.issue,
    body: approved
      ? approvalComment(decision, config)
      : rejectionComment(decision, config),
  })

  await octokit.rest.issues.update({
    owner: OWNER,
    repo: REPO,
    issue_number: decision.issue,
    state: 'closed',
    state_reason: approved ? 'completed' : 'not_planned',
  })

  await octokit.rest.issues.addLabels({
    owner: OWNER,
    repo: REPO,
    issue_number: decision.issue,
    labels: [approved ? CONFIRMED_LABEL : REJECTED_LABEL],
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
 * The single issue to review, from `--issue=` or the ISSUE environment variable
 * the workflow passes its input through. Validated here rather than in yaml, so
 * the workflow never has to interpolate the input into a shell command.
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
      // Built before anything is closed, so a report that does not parse into
      // an entry fails the run while it is still open to be fixed.
      approved.push({ decision, entry: entryFor(report, counted.approvedBy) })
    }

    decisions.push(decision)
  }

  markAlreadyListed(approved)

  for (const decision of decisions) {
    await closeIssue(octokit, decision, config)
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
