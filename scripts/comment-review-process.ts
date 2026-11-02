/// <reference types="node" />
/**
 * Comments the review process on a newly opened automation report.
 *
 *   --issue=<n>   the report to comment on
 *   --dry-run     print the comment instead of posting it
 *
 * Environment:
 *   NUXT_GITHUB_TOKEN / GITHUB_TOKEN  reads the issue and posts the comment
 *   MIN_APPROVALS   👍 from reviewers needed to flag the account
 *   MIN_REJECTIONS  👎 from reviewers needed to reject outright
 */

import { Octokit } from 'octokit'
import { readThresholds } from './review-automation-issues'
import type { Thresholds } from './review-automation-issues'
import { readGithubToken } from './lib/github-token'

const OWNER = 'MatteoGabriele'
const REPO = 'agentscan'

const REPORT_LABEL = 'automation'

/** Identifies this script's comment so it is posted only once. */
export const MARKER = '<!-- agentscan:review-process -->'

export function reviewProcessComment(thresholds: Thresholds): string {
  const { minApprovals, minRejections } = thresholds

  // One line per paragraph: GitHub renders single newlines as line breaks.
  return [
    MARKER,
    `### How this report gets decided`,
    ``,
    `Reviewers vote by reacting to the **issue itself**:`,
    ``,
    `- **${minApprovals} 👍 — flagged.** The account is added to the [automations list](https://agentscan.tools/automations).`,
    `- **${minRejections} 👎 — rejected.** The report is closed and the account is left alone.`,
    ``,
    `**Only reactions from the review team are counted.** There is nothing further you need to do.`,
  ].join('\n')
}

function client(): Octokit {
  return new Octokit({ auth: readGithubToken() })
}

function flag(name: string): string | undefined {
  const match = process.argv
    .slice(2)
    .find((arg) => arg.startsWith(`--${name}=`))
  return match?.split('=').slice(1).join('=')
}

/** True when this issue is an automation report nobody has explained yet. */
async function needsComment(octokit: Octokit, issue: number): Promise<boolean> {
  const { data } = await octokit.rest.issues.get({
    owner: OWNER,
    repo: REPO,
    issue_number: issue,
  })

  const labels = data.labels.map((label) =>
    typeof label === 'string' ? label : label.name || '',
  )

  if (!labels.includes(REPORT_LABEL)) {
    console.log(`Issue #${issue} is not an automation report — skipping`)
    return false
  }

  const comments = await octokit.paginate(octokit.rest.issues.listComments, {
    owner: OWNER,
    repo: REPO,
    issue_number: issue,
    per_page: 100,
  })

  if (comments.some((comment) => comment.body?.includes(MARKER))) {
    console.log(`Issue #${issue} was already explained — skipping`)
    return false
  }

  return true
}

async function main() {
  const raw = flag('issue')
  const dryRun = process.argv.slice(2).includes('--dry-run')

  if (!raw || !/^\d+$/.test(raw)) {
    console.error('✗ --issue=<number> is required')
    process.exit(1)
  }

  const issue = parseInt(raw, 10)
  const body = reviewProcessComment(readThresholds())

  if (dryRun) {
    console.log('Dry run — nothing posted to GitHub:\n')
    console.log(body)
    return
  }

  const octokit = client()

  if (!(await needsComment(octokit, issue))) {
    return
  }

  await octokit.rest.issues.createComment({
    owner: OWNER,
    repo: REPO,
    issue_number: issue,
    body,
  })

  console.log(`✓ Explained the review process on issue #${issue}`)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error('Error:', err.message)
    process.exit(1)
  })
}
