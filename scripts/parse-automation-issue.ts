/// <reference types="node" />
/**
 * Parse automation report issues and generate JSON entries
 * Usage: npx tsx scripts/parse-automation-issue.ts <issue-number> [--approved-by=a,b]
 *        npx tsx scripts/parse-automation-issue.ts <issue-body> [issue-url] (legacy mode)
 *
 * --approved-by is passed by the review workflow: the reviewers whose 👍 carried the
 * report, recorded on the entry so the list says who stood behind it.
 */

import fs from 'fs'
import path from 'path'
import { parseIssue } from '@github/issue-parser'
import { Octokit } from 'octokit'

interface AutomationEntry {
  username: string
  id: number
  reason: string
  issueUrl: string
  createdAt: string
  reportedBy: string
  /** Omitted entirely when the entry was added without a recorded vote. */
  approvedBy?: string[]
}

export type { AutomationEntry }

/**
 * The reason is shown as plain prose on the public list, so it has to stay one
 * sentence-shaped string. Links belong in Supporting Evidence / Additional Context,
 * where reviewers read them; reporters still paste them here, so they are stripped
 * rather than trusted.
 */
export const MAX_REASON_LENGTH = 280

/**
 * Strips everything that is not sentence text: markdown images and links, bare and
 * autolinked URLs, HTML tags, code ticks and list bullets. Link text is kept, since
 * "self-describes as [an AI agent](url)" still reads as a reason without the URL.
 */
export function sanitizeReason(raw: string | undefined): string | undefined {
  if (!raw) {
    return raw
  }

  let reason = raw.split(/\n\s*\n/)[0]

  reason = reason
    // ![alt](url) - an image says nothing once the URL is gone
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    // [text](url) -> text
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    // a whole parenthetical built around a link ("(see https://...)") goes with it
    .replace(/\([^)]*(?:https?:\/\/|www\.|\.[a-z]{2,}\/)[^)]*\)?/gi, ' ')
    // <https://...> and any HTML tag
    .replace(/<[^>\s]+>/g, ' ')
    // bare URLs, with or without a scheme
    .replace(/\b(?:https?:\/\/|www\.)\S+/gi, ' ')
    .replace(/\b[\w-]+(?:\.[\w-]+)*\.[a-z]{2,}\/\S*/gi, ' ')
    // markdown leftovers: code ticks, and line-leading bullets/quotes/headings.
    // Emphasis markers are left alone mid-word so `some_bot_name` survives intact.
    .replace(/`/g, '')
    .replace(/^[\s>#*-]+/gm, ' ')
    // empty brackets or parens left behind by a stripped URL
    .replace(/\(\s*\)|\[\s*\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return truncateReason(trimDanglingTail(reason))
}

/**
 * A stripped URL usually leaves the words that introduced it ("spam PRs, see",
 * "flagged in:"). Drop that tail so the reason still ends like a sentence.
 */
function trimDanglingTail(reason: string): string {
  return reason
    .replace(/[\s,;:–—(-]+$/, '')
    .replace(
      /(?:[\s,;:–—-]*\b(?:see|at|in|on|via|from|here|and|e\.g)\b\.?)+$/i,
      '',
    )
    .replace(/[\s,;:–—(-]+$/, '')
    .trim()
}

/** Cuts at a word boundary so a long report reads as a sentence, not a fragment. */
function truncateReason(reason: string): string {
  if (reason.length <= MAX_REASON_LENGTH) {
    return reason
  }

  const clipped = reason.slice(0, MAX_REASON_LENGTH)
  const lastSpace = clipped.lastIndexOf(' ')

  return (
    (lastSpace > 0 ? clipped.slice(0, lastSpace) : clipped).replace(
      /[\s,;:.–—-]+$/,
      '',
    ) + '…'
  )
}

export function parseIssueBody(body: string): Partial<AutomationEntry> {
  // Parse GitHub form template format using @github/issue-parser
  const parsed = parseIssue(body)

  // Extract fields from the parsed form
  const username = parsed['GitHub Username']?.toString().trim()
  const idStr = parsed['GitHub User ID']?.toString().trim()
  const id = idStr ? parseInt(idStr, 10) : undefined
  const reason = sanitizeReason(
    parsed['Why do you believe this is an automated account?']
      ?.toString()
      .trim(),
  )

  return {
    username,
    id,
    reason,
  }
}

/**
 * Reads the `--approved-by` list. Casing is left alone: these are GitHub logins as
 * the reactions reported them, and they end up on the public list.
 */
export function parseApprovedBy(raw: string | undefined): string[] {
  return [
    ...new Set(
      (raw || '')
        .split(/[\s,]+/)
        .map((name) => name.trim().replace(/^@/, ''))
        .filter(Boolean),
    ),
  ]
}

export function validateEntry(
  entry: Partial<AutomationEntry>,
): entry is AutomationEntry {
  if (!entry.username || typeof entry.username !== 'string') {
    console.error('✗ Missing or invalid username')
    return false
  }
  if (!entry.id || typeof entry.id !== 'number') {
    console.error('✗ Missing or invalid GitHub user ID')
    return false
  }
  if (!entry.reason || typeof entry.reason !== 'string') {
    console.error('✗ Missing or invalid reason')
    return false
  }
  // Belt and braces: sanitizeReason already strips these, so a link reaching here
  // means a reason was built by some other path and must not go on the public list.
  if (/https?:\/\/|www\.|\]\(/i.test(entry.reason)) {
    console.error(
      '✗ Reason must be plain text - move links to Supporting Evidence',
    )
    return false
  }
  if (entry.reason.length > MAX_REASON_LENGTH + 1) {
    console.error(`✗ Reason is longer than ${MAX_REASON_LENGTH} characters`)
    return false
  }
  if (!entry.issueUrl || typeof entry.issueUrl !== 'string') {
    console.error('✗ Missing issue URL')
    return false
  }
  if (!entry.reportedBy || typeof entry.reportedBy !== 'string') {
    console.error('✗ Missing or invalid reportedBy')
    return false
  }
  if (entry.approvedBy !== undefined) {
    if (
      !Array.isArray(entry.approvedBy) ||
      entry.approvedBy.length === 0 ||
      entry.approvedBy.some((name) => typeof name !== 'string' || !name.trim())
    ) {
      console.error('✗ Invalid approvedBy list')
      return false
    }
  }
  return true
}

export function generateEntry(
  parsed: Partial<AutomationEntry>,
  issueUrl: string,
  reportedBy: string,
  createdAt?: string,
  approvedBy?: string[],
): AutomationEntry {
  return {
    username: parsed.username!,
    id: parsed.id!,
    reason: parsed.reason!,
    issueUrl,
    reportedBy,
    createdAt: createdAt || new Date().toISOString().split('T')[0],
    // Left off rather than written as [], so an entry added by hand reads the same
    // as the ones that predate the vote being recorded.
    ...(approvedBy?.length ? { approvedBy } : {}),
  }
}

function addEntryToJson(entry: AutomationEntry): void {
  const jsonPath = path.join(
    process.cwd(),
    'data/verified-automations-list.json',
  )

  if (!fs.existsSync(jsonPath)) {
    console.error('✗ JSON file not found:', jsonPath)
    process.exit(1)
  }

  const data = JSON.parse(
    fs.readFileSync(jsonPath, 'utf-8'),
  ) as AutomationEntry[]

  // Check if username already exists
  if (data.some((item) => item.username === entry.username)) {
    console.error(`✗ Username "${entry.username}" already exists in the list`)
    process.exit(1)
  }

  data.push(entry)
  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2) + '\n')
  console.log(`✓ Added "${entry.username}" to verified-automations-list.json`)
}

async function fetchIssueFromGitHub(issueNumber: number): Promise<{
  body: string
  issueUrl: string
  createdAt: string
  reportedBy: string
}> {
  // Authenticated when running in CI, so the review workflow does not burn
  // through the 60/hour unauthenticated budget.
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN })

  try {
    const { data: issue } = await octokit.rest.issues.get({
      owner: 'MatteoGabriele',
      repo: 'agentscan',
      issue_number: issueNumber,
    })

    return {
      body: issue.body || '',
      issueUrl: issue.html_url,
      createdAt:
        issue.created_at?.split('T')[0] ||
        new Date().toISOString().split('T')[0],
      reportedBy: issue.user?.login || '',
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error(`✗ Failed to fetch issue #${issueNumber}:`, error.message)
    } else {
      console.error(`✗ Failed to fetch issue #${issueNumber}`)
    }
    process.exit(1)
  }
}

function isIssueNumber(arg: string): boolean {
  return /^\d+$/.test(arg)
}

/**
 * `--name=value` only. Legacy mode takes the issue body as a positional argument,
 * so a bare `--` prefix is not enough to tell a flag from a report that happens to
 * open with a dash.
 */
function flag(name: string): string | undefined {
  const match = process.argv
    .slice(2)
    .find((arg) => arg.startsWith(`--${name}=`))
  return match?.split('=').slice(1).join('=')
}

function positionalArgs(): string[] {
  return process.argv.slice(2).filter((arg) => !/^--[a-z-]+=/.test(arg))
}

async function main() {
  const positional = positionalArgs()
  const [firstArg, secondArg, thirdArg] = positional
  const approvedBy = parseApprovedBy(flag('approved-by'))

  if (!firstArg) {
    console.error(
      'Usage: npx tsx scripts/parse-automation-issue.ts <issue-number> [--approved-by=a,b]',
    )
    console.error(
      '  or: npx tsx scripts/parse-automation-issue.ts <issue-body> [issue-url] [reported-by] [created-at] (legacy)',
    )
    process.exit(1)
  }

  console.log('🔍 Parsing automation report...\n')

  let issueBody: string
  let issueUrl: string
  let reportedBy: string
  let createdAt: string

  // Check if first argument is an issue number
  if (isIssueNumber(firstArg)) {
    const issueNumber = parseInt(firstArg, 10)
    console.log(`📥 Fetching issue #${issueNumber} from GitHub...\n`)
    const {
      body,
      issueUrl: fetchedUrl,
      createdAt: fetchedDate,
      reportedBy: fetchedReportedBy,
    } = await fetchIssueFromGitHub(issueNumber)
    issueBody = body
    issueUrl = fetchedUrl
    createdAt = fetchedDate
    reportedBy = fetchedReportedBy
  } else {
    // Legacy mode: issue body passed directly
    issueBody = firstArg
    issueUrl = secondArg || ''
    reportedBy = thirdArg || ''
    createdAt = positional[3] || new Date().toISOString().split('T')[0]
  }

  const parsed = parseIssueBody(issueBody)

  // Debug output
  console.log('DEBUG - Parsed values:')
  console.log(`  username: "${parsed.username}"`)
  console.log(`  id: ${parsed.id}`)
  console.log(`  reason: "${parsed.reason?.substring(0, 60)}..."`)
  console.log(`  reportedBy: "${reportedBy}"`)
  console.log(`  approvedBy: [${approvedBy.join(', ')}]`)
  console.log('')

  const entry = generateEntry(
    parsed,
    issueUrl || '',
    reportedBy,
    createdAt,
    approvedBy,
  )

  if (!validateEntry(entry)) {
    process.exit(1)
  }

  console.log('✓ Parsed successfully:')
  console.log(`  Username: ${entry.username}`)
  console.log(`  ID: ${entry.id}`)
  console.log(`  Reason: ${entry.reason.substring(0, 50)}...`)
  console.log(`  Issue: ${entry.issueUrl}`)
  console.log(`  Reported by: ${entry.reportedBy}`)
  console.log(`  Created: ${entry.createdAt}`)
  if (entry.approvedBy) {
    console.log(`  Approved by: ${entry.approvedBy.join(', ')}`)
  }

  addEntryToJson(entry)
}

// Only run main if this script is executed directly (not imported)
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error('Error:', err.message)
    process.exit(1)
  })
}
