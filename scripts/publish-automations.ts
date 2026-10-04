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
import { readGithubToken } from './lib/github-token'

const OWNER = 'MatteoGabriele'
const REPO = 'agentscan'

const APPROVED_LABEL = 'automation:approved'

/**
 * The approved reports still waiting on a list entry. The review workflow
 * leaves them open on purpose; they are closed by the commit this run's
 * `closes` lines go into.
 */
async function approvedReports(octokit: Octokit): Promise<Report[]> {
  const issues = await octokit.paginate(octokit.rest.issues.listForRepo, {
    owner: OWNER,
    repo: REPO,
    state: 'open',
    // Both labels, so a pull request or an unrelated open issue cannot match.
    labels: `automation,${APPROVED_LABEL}`,
    per_page: 100,
  })

  return issues.filter((issue) => !issue.pull_request).map(toReport)
}

/** Ascending, so the lines read in the order the reports were filed. */
export function closesLines(issues: number[]): string {
  return issues
    .slice()
    .sort((a, b) => a - b)
    .map((issue) => `closes #${issue}`)
    .join('\n')
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

  const octokit = new Octokit({ auth: readGithubToken() })
  const { reviewers } = readConfig()

  const reports = await approvedReports(octokit)
  const list = readList()

  // Deduped before the reactions are read, so an account that is already listed
  // costs nothing beyond the listing itself.
  const entries = new Map<AutomationEntry, Report>()

  for (const report of reports) {
    entries.set(entryFor(report), report)
  }

  const { added, alreadyListed } = split(list, [...entries.keys()])

  for (const username of alreadyListed) {
    console.log(`ℹ @${username} is already on the list — close the report`)
  }

  if (added.length === 0) {
    console.log('\nNothing to publish')
    return
  }

  const publishable: AutomationEntry[] = []
  const published: number[] = []

  for (const entry of added) {
    const report = entries.get(entry)!

    if (!(await stillOnGitHub(octokit, entry.username))) {
      console.log(
        `⏭ @${entry.username} (#${report.number}) no longer exists — close the report by hand`,
      )
      continue
    }

    // Counted now rather than trusted from the closing comment, so the entry
    // records who had actually approved it.
    const { approvedBy } = await tally(octokit, report.number, reviewers)

    if (approvedBy.length) {
      entry.approvedBy = approvedBy
    }

    publishable.push(entry)
    published.push(report.number)
    console.log(`✓ @${entry.username} (#${report.number})`)
  }

  if (publishable.length === 0) {
    console.log('\nNothing to publish')
    return
  }

  if (dryRun) {
    console.log(`\nDry run: ${publishable.length} entr(y/ies) not written`)
    console.log(`\n${closesLines(published)}`)
    return
  }

  writeList([...list, ...publishable])
  console.log(`\nAdded ${publishable.length} entr(y/ies) to ${LIST_PATH}`)
  console.log('Commit it on a branch and open a pull request to publish.')
  // Pasted into the commit message, so merging the list update closes every
  // report it covers.
  console.log('\nPaste into the commit message to close the reports:\n')
  console.log(closesLines(published))
}

// Guarded so importing a helper from here — the tests do — does not publish.
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error('Error:', err.message)
    process.exit(1)
  })
}
