import type { Flag, ReportFlag } from '@unveil/identity/report'

const REPORT_ISSUE_URL =
  'https://github.com/matteogabriele/agentscan/issues/new'
const MAX_EVIDENCE_FLAGS = 8
const MAX_EXAMPLE_PRS = 5

type ReportIssueParams = {
  username: string
  userId: number | string | undefined
  flags: ReportFlag[]
  sourceUrl: string
}

type EvidenceParams = {
  flags: ReportFlag[]
  sourceUrl?: string
}

/**
 * Rewrites github.com PR/issue links to redirect.github.com, so the filed report
 * doesn't create backlinks on them.
 * https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/autolinked-references-and-urls
 */
function withoutBacklink(url: string): string {
  try {
    const parsed = new URL(url)
    if (parsed.hostname === 'github.com') {
      parsed.hostname = 'redirect.github.com'
    }
    return parsed.toString()
  } catch {
    return url
  }
}

/** Example PR URLs from the events behind the flags, for reviewers. */
function extractExamplePrUrls(flags: Flag[], limit: number): string[] {
  const urls = new Set<string>()

  for (const flag of flags) {
    for (const event of flag.events ?? []) {
      if (urls.size >= limit) {
        break
      }

      const number = event.pullRequest?.number
      if (
        event.type !== 'pull-request' ||
        !event.repo ||
        number === undefined
      ) {
        continue
      }

      urls.add(`https://github.com/${event.repo}/pull/${number}`)
    }
  }

  return [...urls].slice(0, limit)
}

/** Evidence lines shared by the PR/issue comment and the report-issue link. */
export function buildEvidenceLines({
  flags,
  sourceUrl,
}: EvidenceParams): string[] {
  const topFlags = [...flags]
    .sort((a, b) => b.points - a.points)
    .slice(0, MAX_EVIDENCE_FLAGS)

  const examplePrUrls = extractExamplePrUrls(flags, MAX_EXAMPLE_PRS)

  const lines: string[] = []

  if (sourceUrl) {
    lines.push(`- Flagged in: ${withoutBacklink(sourceUrl)}`)
  }

  lines.push(...topFlags.map((flag) => `- ${flag.label}: ${flag.detail}`))

  if (flags.length > topFlags.length) {
    lines.push(
      `- (+${flags.length - topFlags.length} more signal(s), see full analysis)`,
    )
  }

  if (examplePrUrls.length > 0) {
    lines.push(
      '',
      `Last ${examplePrUrls.length} PR${examplePrUrls.length === 1 ? '' : 's'}:`,
      ...examplePrUrls.map((url) => `- ${withoutBacklink(url)}`),
    )
  }

  return lines
}

/**
 * Builds a pre-filled "Report Automated Account" issue URL from an analysis.
 * Used by the webhook comment and the "Add report" link on the analysis page.
 */
export function buildReportIssueUrl({
  username,
  userId,
  flags,
  sourceUrl,
}: ReportIssueParams): string {
  const evidenceLines = buildEvidenceLines({ flags, sourceUrl })

  const url = new URL(REPORT_ISSUE_URL)
  url.searchParams.set('template', 'report-automated-account.yml')
  url.searchParams.set('title', `[AUTOMATION] ${username}`)
  url.searchParams.set('username', username)

  if (userId !== undefined) {
    url.searchParams.set('user-id', String(userId))
  }

  url.searchParams.set('evidence', evidenceLines.join('\n'))

  return url.toString()
}
