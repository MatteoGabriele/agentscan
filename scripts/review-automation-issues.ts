/// <reference types="node" />
/**
 * Review community-reported automation issues by counting reviewer reactions.
 *
 * Reactions emit no webhook event, so this polls the open `automation` issues
 * on a schedule instead of reacting to one.
 *
 * It runs in two modes, so an issue is never closed before its entry is safely
 * on main:
 *   --mode=decide    count reactions, run `add:automation` for approved issues
 *                    and write the outcomes to --decisions=<file>
 *   --mode=finalize  replay that file: comment, relabel and close the issues
 * The workflow commits and pushes in between. If that push fails, finalize
 * never runs, the issues stay open, and the next run redoes the work from
 * scratch.
 *
 * Configuration comes from the environment (see the workflow):
 *   REVIEWERS       newline- or comma-separated GitHub handles that may vote
 *   MIN_APPROVALS   👍 from reviewers needed to flag the account
 *   MIN_REJECTIONS  👎 from reviewers needed to reject outright
 */

import fs from 'fs'
import { execFileSync } from 'child_process'
import { Octokit } from 'octokit'

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
  /** Set when the account was already in the list, so nothing was added. */
  alreadyListed?: boolean
}

export interface Config {
  reviewers: string[]
  minApprovals: number
  minRejections: number
}

export function parseReviewers(raw: string | undefined): string[] {
  return [
    ...new Set(
      (raw || '')
        .split(/[\s,]+/)
        .map((name) => name.trim().replace(/^@/, '').toLowerCase())
        .filter(Boolean),
    ),
  ]
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

export function readConfig(): Config {
  const reviewers = parseReviewers(process.env.REVIEWERS)

  if (reviewers.length === 0) {
    console.error('✗ REVIEWERS is empty — nothing to count reactions against')
    process.exit(1)
  }

  const minApprovals = parseInt(process.env.MIN_APPROVALS || '5', 10)
  const minRejections = parseInt(process.env.MIN_REJECTIONS || '3', 10)

  if (!Number.isInteger(minApprovals) || minApprovals < 1) {
    console.error('✗ MIN_APPROVALS must be a positive integer')
    process.exit(1)
  }
  if (!Number.isInteger(minRejections) || minRejections < 1) {
    console.error('✗ MIN_REJECTIONS must be a positive integer')
    process.exit(1)
  }
  if (minApprovals > reviewers.length) {
    console.error(
      `✗ MIN_APPROVALS (${minApprovals}) is higher than the reviewer count (${reviewers.length}) — no report could ever pass`,
    )
    process.exit(1)
  }

  return { reviewers, minApprovals, minRejections }
}

function client(): Octokit {
  const auth = process.env.GITHUB_TOKEN

  if (!auth) {
    console.error('✗ GITHUB_TOKEN is not set')
    process.exit(1)
  }

  return new Octokit({ auth })
}

export async function openReports(
  octokit: Octokit,
  only?: number,
): Promise<{ number: number; labels: string[] }[]> {
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

  return (
    issues
      .filter((issue) => issue.state === 'open')
      // listForRepo returns pull requests too.
      .filter((issue) => !issue.pull_request)
      .map((issue) => ({
        number: issue.number,
        labels: issue.labels.map((label) =>
          typeof label === 'string' ? label : label.name || '',
        ),
      }))
      .filter((issue) => issue.labels.includes('automation'))
      // Already ruled on by hand; leave it alone.
      .filter(
        (issue) =>
          !issue.labels.includes(CONFIRMED_LABEL) &&
          !issue.labels.includes(REJECTED_LABEL),
      )
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

/** Returns true when the entry is already in the list, so nothing was added. */
function addAutomation(issue: number, approvedBy: string[]): boolean {
  try {
    const output = execFileSync(
      'pnpm',
      [
        'add:automation',
        String(issue),
        // The 👍 that carried it, recorded on the entry itself.
        `--approved-by=${approvedBy.join(',')}`,
      ],
      {
        encoding: 'utf-8',
        stdio: 'pipe',
        env: process.env,
      },
    )
    console.log(output.trim())
    return false
  } catch (error) {
    const failure = error as { stdout?: string; stderr?: string }
    const output = `${failure.stdout || ''}${failure.stderr || ''}`

    if (output.includes('already exists in the list')) {
      console.log(`ℹ️ Issue #${issue} is already in the list`)
      return true
    }

    console.error(output.trim())
    throw new Error(`add:automation failed for issue #${issue}`, {
      cause: error,
    })
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
    ? 'This account was already on the list, so no new entry was added.'
    : 'The account has been added to `data/verified-automations-list.json`.'

  return [
    `## ✅ Approved`,
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
    `## ❌ Not flagged`,
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

async function decidePhase(
  octokit: Octokit,
  config: Config,
  decisionsPath: string,
): Promise<void> {
  const only = flag('issue') ? parseInt(flag('issue')!, 10) : undefined
  const reports = await openReports(octokit, only)

  console.log(
    `🔍 Reviewing ${reports.length} open automation report(s) against ${config.reviewers.length} reviewer(s)\n`,
  )

  const decisions: Decision[] = []

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
      decision.alreadyListed = addAutomation(report.number, counted.approvedBy)
    }

    decisions.push(decision)
  }

  fs.writeFileSync(decisionsPath, JSON.stringify(decisions, null, 2) + '\n')
  console.log(`\n📝 Wrote ${decisions.length} decision(s) to ${decisionsPath}`)
}

async function finalizePhase(
  octokit: Octokit,
  config: Config,
  decisionsPath: string,
): Promise<void> {
  if (!fs.existsSync(decisionsPath)) {
    console.log('No decisions file — nothing to finalize')
    return
  }

  const decisions = JSON.parse(
    fs.readFileSync(decisionsPath, 'utf-8'),
  ) as Decision[]

  for (const decision of decisions) {
    await closeIssue(octokit, decision, config)
  }
}

async function main() {
  const mode = flag('mode') || 'decide'
  const decisionsPath = flag('decisions') || 'automation-decisions.json'

  if (mode !== 'decide' && mode !== 'finalize') {
    console.error(`✗ Unknown mode "${mode}" — expected decide or finalize`)
    process.exit(1)
  }

  const config = readConfig()
  const octokit = client()

  if (mode === 'decide') {
    await decidePhase(octokit, config, decisionsPath)
  } else {
    await finalizePhase(octokit, config, decisionsPath)
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error('Error:', err.message)
    process.exit(1)
  })
}
