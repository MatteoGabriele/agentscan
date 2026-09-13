/// <reference types="node" />

import { Octokit } from 'octokit'
import {
  generateEntry,
  parseIssueBody,
  validateEntry,
  type AutomationEntry,
} from './parse-automation-issue'
import { LIST_PATH, readList, split, writeList } from './lib/automations-list'
import {
  readConfig,
  tally,
  toReport,
  type Report,
} from './review-automation-issues'

const OWNER = 'MatteoGabriele'
const REPO = 'agentscan'

const CONFIRMED_LABEL = 'automation:confirmed'

/** Every report the reviewers approved, whether or not it is on the list yet. */
async function confirmedReports(octokit: Octokit): Promise<Report[]> {
  const issues = await octokit.paginate(octokit.rest.issues.listForRepo, {
    owner: OWNER,
    repo: REPO,
    state: 'closed',
    // Both labels, so a pull request or an unrelated closed issue cannot match.
    labels: `automation,${CONFIRMED_LABEL}`,
    per_page: 100,
  })

  return issues.filter((issue) => !issue.pull_request).map(toReport)
}

async function stillOnGitHub(
  octokit: Octokit,
  username: string,
): Promise<boolean> {
  try {
    await octokit.rest.users.getByUsername({ username })
    return true
  } catch (error) {
    if ((error as { status?: number }).status === 404) {
      return false
    }

    throw error
  }
}

function entryFor(report: Report): AutomationEntry {
  const entry = generateEntry(
    parseIssueBody(report.body),
    report.issueUrl,
    report.reportedBy,
    report.createdAt,
  )

  if (!validateEntry(entry)) {
    throw new Error(`Issue #${report.number} does not parse into a list entry`)
  }

  return entry
}

async function main() {
  const dryRun = process.argv.slice(2).includes('--dry-run')

  const auth = process.env.GITHUB_TOKEN

  if (!auth) {
    console.error(
      '✗ GITHUB_TOKEN is not set — try `export GITHUB_TOKEN=$(gh auth token)`',
    )
    process.exit(1)
  }

  const octokit = new Octokit({ auth })
  const { reviewers } = readConfig()

  const reports = await confirmedReports(octokit)
  const list = readList()

  // Deduped before the reactions are read, so an account that is already listed
  // costs nothing beyond the listing itself.
  const entries = new Map<AutomationEntry, Report>()

  for (const report of reports) {
    entries.set(entryFor(report), report)
  }

  const { added, alreadyListed } = split(list, [...entries.keys()])

  for (const username of alreadyListed) {
    console.log(`ℹ @${username} is already on the list`)
  }

  if (added.length === 0) {
    console.log('\nNothing to publish')
    return
  }

  const publishable: AutomationEntry[] = []

  for (const entry of added) {
    const report = entries.get(entry)!

    if (!(await stillOnGitHub(octokit, entry.username))) {
      console.log(`⏭ @${entry.username} (#${report.number}) no longer exists`)
      continue
    }

    // Counted now rather than trusted from the closing comment, so the entry
    // records who had actually approved it.
    const { approvedBy } = await tally(octokit, report.number, reviewers)

    if (approvedBy.length) {
      entry.approvedBy = approvedBy
    }

    publishable.push(entry)
    console.log(`✓ @${entry.username} (#${report.number})`)
  }

  if (publishable.length === 0) {
    console.log('\nNothing to publish')
    return
  }

  if (dryRun) {
    console.log(`\nDry run: ${publishable.length} entr(y/ies) not written`)
    return
  }

  writeList([...list, ...publishable])
  console.log(`\nAdded ${publishable.length} entr(y/ies) to ${LIST_PATH}`)
  console.log('Commit it on a branch and open a pull request to publish.')
}

main().catch((err) => {
  console.error('Error:', err.message)
  process.exit(1)
})
