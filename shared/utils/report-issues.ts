export type ReportOutcome = 'pending' | 'approved' | 'rejected' | 'closed'

export type ReportIssue = {
  number: number
  url: string
  state: 'open' | 'closed'
  outcome: ReportOutcome
}

type IssueLike = {
  number: number
  html_url: string
  state: string
  body?: string | null
  labels: (string | { name?: string | null })[]
}

function readUserId(body: string): number | undefined {
  const match = body.match(/^###\s+GitHub User ID\s*\n+\s*(\d+)\s*$/im)

  return match ? Number(match[1]) : undefined
}

function readOutcome(issue: IssueLike): ReportOutcome {
  const labels = issue.labels.map((label) =>
    typeof label === 'string' ? label : label.name,
  )

  if (
    labels.includes('automation:approved') ||
    labels.includes('automation:confirmed')
  ) {
    return 'approved'
  }

  if (labels.includes('automation:rejected')) {
    return 'rejected'
  }

  return issue.state === 'open' ? 'pending' : 'closed'
}

export function findReportIssues(
  issues: IssueLike[],
  userId: number,
): ReportIssue[] {
  return issues
    .filter((issue) => readUserId(issue.body ?? '') === userId)
    .map((issue) => ({
      number: issue.number,
      url: issue.html_url,
      state: issue.state === 'open' ? ('open' as const) : ('closed' as const),
      outcome: readOutcome(issue),
    }))
    .sort((a, b) => b.number - a.number)
}
