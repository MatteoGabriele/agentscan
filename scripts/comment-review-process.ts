/// <reference types="node" />
/**
 * Explain the review process on a freshly opened automation report.
 *
 * The issue template spells the voting out, but a reporter who skims it — or
 * who files the report from AgentScan without reading the form — is left
 * wondering why nothing is happening and who gets to decide. So the rules are
 * repeated once, as a comment on their own issue, where they cannot be missed.
 *
 *   --issue=<n>   the report to comment on
 *   --dry-run     print the comment instead of posting it
 *
 * Configuration comes from the environment (see the workflow):
 *   GITHUB_TOKEN    used to read the issue and post the comment
 *   MIN_APPROVALS   👍 from reviewers needed to flag the account
 *   MIN_REJECTIONS  👎 from reviewers needed to reject outright
 */

import { Octokit } from 'octokit'
import { readThresholds } from './review-automation-issues'
import type { Thresholds } from './review-automation-issues'

const OWNER = 'MatteoGabriele'
const REPO = 'agentscan'

const REPORT_LABEL = 'automation'

/**
 * Lets a re-run of the workflow — or a second dispatch — recognise its own
 * comment instead of posting the same explanation twice.
 */
export const MARKER = '<!-- agentscan:review-process -->'

export function reviewProcessComment(thresholds: Thresholds): string {
  const { minApprovals, minRejections } = thresholds

  // One paragraph per entry: GitHub turns single newlines into line breaks, so
  // wrapping the prose here would wrap it in the rendered comment too.
  return [
    MARKER,
    `### How this report gets decided`,
    ``,
    `Reviewers vote by reacting to the **issue itself**:`,
    ``,
    `- 👍 the evidence shows an automated account`,
    `- 👎 the evidence is not conclusive`,
    ``,
    `- **${minApprovals} 👍 — flagged.** The account is added to the [automations list](https://agentscan.tools/automations).`,
    `- **${minRejections} 👎 — rejected.** The report is closed and the account is left alone.`,
    ``,
    `**Only reactions from the review team are counted.** There is nothing further you need to do.`,
  ].join('\n')
}

function client(): Octokit {
  const auth = process.env.GITHUB_TOKEN

  if (!auth) {
    console.error('✗ GITHUB_TOKEN is not set')
    process.exit(1)
  }

  return new Octokit({ auth })
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
