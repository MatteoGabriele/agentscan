import type { IdentifyFlag } from '@unveil/identity'

const REPORT_ISSUE_URL =
  'https://github.com/matteogabriele/agentscan/issues/new'
const MAX_EVIDENCE_FLAGS = 8
const MAX_EXAMPLE_PRS = 5

type ReportIssueParams = {
  username: string
  userId: number | undefined
  flags: IdentifyFlag[]
  sourceUrl: string
}

type EvidenceParams = {
  flags: IdentifyFlag[]
  sourceUrl?: string
}

/**
 * A github.com link to a PR/issue in the evidence body would make GitHub post an
 * unwanted "mentioned this pull request" backlink on that PR once the report issue
 * is filed. redirect.github.com is GitHub's documented escape hatch: it 302s to the
 * same page but isn't recognized by the reference parser, so no backlink is created.
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

/**
 * Flags carry the raw GitHub events that triggered them. Pull a handful of the
 * actual PRs behind a "PR volume"/"fork→PR pattern" style flag so a reviewer has
 * concrete examples to look at, instead of just the aggregate detail string.
 */
function extractExamplePrUrls(flags: IdentifyFlag[], limit: number): string[] {
  const urls = new Set<string>()

  for (const flag of flags) {
    for (const event of flag.events ?? []) {
      if (urls.size >= limit) {
        break
      }
      if (event.type !== 'PullRequestEvent') {
        continue
      }

      const pr = event.payload?.pull_request as
        | { html_url?: string; number?: number }
        | undefined
      const url =
        pr?.html_url ??
        (event.repo?.name && pr?.number !== undefined
          ? `https://github.com/${event.repo.name}/pull/${pr.number}`
          : undefined)

      if (url) {
        urls.add(url)
      }
    }
  }

  return [...urls].slice(0, limit)
}

/**
 * Builds the evidence lines shared between the PR/issue comment and the pre-filled
 * report-issue link, so both surfaces always show the same facts.
 */
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
 * Builds a pre-filled "Report Automated Account" issue URL from an already-computed
 * analysis, so a maintainer only has to review and submit it instead of retyping
 * evidence AgentScan already has. Shared between the GitHub webhook comment and the
 * "Add report" link on the analysis page, so both point at the same rich report.
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
