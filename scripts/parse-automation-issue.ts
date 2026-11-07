/// <reference types="node" />
/**
 * Parses automation report issues into list entries.
 * Usage: npx tsx scripts/parse-automation-issue.ts <issue-number> [--approved-by=a,b]
 *        npx tsx scripts/parse-automation-issue.ts <issue-body> [issue-url] (legacy mode)
 *
 * --approved-by records the reviewers whose 👍 approved the report.
 */

import fs from 'fs'
import path from 'path'
import { parseIssue } from '@github/issue-parser'
import { Octokit } from 'octokit'
import { readGithubToken } from './lib/github-token'

interface AutomationEntry {
  username: string
  id: number
  reason: string
  issueUrl: string
  createdAt: string
  reportedBy: string
  /** Omitted when no vote was recorded. */
  approvedBy?: string[]
}

export type { AutomationEntry }

/** Max length of the reason shown on the public list. */
export const MAX_REASON_LENGTH = 280

/**
 * Reduces the reason to plain sentence text: removes images, links, URLs, HTML
 * tags, code ticks and list bullets. Link text is kept.
 */
export function sanitizeReason(raw: string | undefined): string | undefined {
  if (!raw) {
    return raw
  }

  let reason = raw.split(/\n\s*\n/)[0]

  reason = reason
    // ![alt](url)
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    // [text](url) -> text
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    // parentheticals containing a link
    .replace(/\([^)]*(?:https?:\/\/|www\.|\.[a-z]{2,}\/)[^)]*\)?/gi, ' ')
    // <https://...> and any HTML tag
    .replace(/<[^>\s]+>/g, ' ')
    // bare URLs, with or without a scheme
    .replace(/\b(?:https?:\/\/|www\.)\S+/gi, ' ')
    .replace(/\b[\w-]+(?:\.[\w-]+)*\.[a-z]{2,}\/\S*/gi, ' ')
    // code ticks and line-leading bullets, quotes and headings (mid-word `_` is kept)
    .replace(/`/g, '')
    .replace(/^[\s>#*-]+/gm, ' ')
    // empty brackets or parens left behind by a stripped URL
    .replace(/\(\s*\)|\[\s*\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return truncateReason(trimDanglingTail(reason))
}

/** Drops words left dangling by a removed URL ("see", "flagged in:"). */
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

/** Truncates at a word boundary. */
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

/** Parses the `--approved-by` list, keeping the logins' casing. */
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
  // Rejects any reason that still contains a link.
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
    // Omitted rather than [] to match entries without recorded votes.
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
  // Authenticated to avoid the 60/hour unauthenticated rate limit.
  const octokit = new Octokit({ auth: readGithubToken() })

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

/** Reads a `--name=value` flag. A bare `--` prefix could be a legacy-mode issue body. */
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
