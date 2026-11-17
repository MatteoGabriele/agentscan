import { parseIssue } from '@github/issue-parser'

export type PendingReport = {
  username: string
  number: number
  url: string
}

type IssueLike = {
  number: number
  html_url: string
  body?: string | null
  pull_request?: unknown
}

const USERNAME_RE = /^@?([\w-]+)$/

export function readReportedUsername(
  body: string | null | undefined,
): string | undefined {
  if (!body) {
    return undefined
  }

  const value = parseIssue(body)['GitHub Username']?.toString().trim()
  const match = value?.match(USERNAME_RE)

  return match?.[1]?.toLowerCase()
}

export function toPendingReports(issues: IssueLike[]): PendingReport[] {
  return issues
    .filter((issue) => !issue.pull_request)
    .flatMap((issue) => {
      const username = readReportedUsername(issue.body)

      return username
        ? [{ username, number: issue.number, url: issue.html_url }]
        : []
    })
    .sort((a, b) => b.number - a.number)
}

/** Newest pending report for the given username, if any. */
export function findPendingReport(
  reports: PendingReport[] | null | undefined,
  username: string | null | undefined,
): PendingReport | undefined {
  if (!reports || !username) {
    return undefined
  }

  const name = username.toLowerCase()

  return reports.find((report) => report.username === name)
}
