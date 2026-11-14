import type { ActivityItem } from '../types/activity'
import type { ActivityRepoScoreDay } from '../types/logs-api'
import type {
  RepoReport,
  RepoReportDay,
  RepoReportPeriod,
} from '../types/repo-report'
import { getCompleteDayRange } from './dates'

export const REPO_REPORT_PERIOD_DAYS = 30

type Totals = { count: number; scoreSum: number }

function getMean({ count, scoreSum }: Totals): number | null {
  return count ? scoreSum / count : null
}

function addTotals(a: Totals, b: Totals): Totals {
  return { count: a.count + b.count, scoreSum: a.scoreSum + b.scoreSum }
}

function isSameRepo(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase()
}

/**
 * Finds the repo's canonical spelling, since the URL may not match GitHub's
 * casing. Newest sources win: older days may hold a stale spelling (e.g.
 * tanstack/query before TanStack/query). Returns null when no data source
 * knows the repo.
 */
export function findRepoName({
  repo,
  days,
  results,
  libraries = [],
}: {
  repo: string
  days: ActivityRepoScoreDay[]
  results: ActivityItem[]
  // Tracked repos with no scored pull requests yet.
  libraries?: string[]
}): string | null {
  const repoEntry = results.find((item) => isSameRepo(item.repo_name, repo))

  if (repoEntry) {
    return repoEntry.repo_name
  }

  const newestDays = [...days].sort((a, b) => b.date.localeCompare(a.date))

  for (const day of newestDays) {
    const match = day.repos.find((item) => isSameRepo(item.name, repo))

    if (match) {
      return match.name
    }
  }

  return libraries.find((item) => isSameRepo(item, repo)) ?? null
}

// Days can hold the same repo under more than one casing, so it's matched
// case-insensitively and its entries summed.
function getRepoTotals(
  day: ActivityRepoScoreDay,
  repo: string,
): Totals | undefined {
  const entries = day.repos.filter((item) => isSameRepo(item.name, repo))

  return entries.length
    ? entries.reduce(addTotals, { count: 0, scoreSum: 0 })
    : undefined
}

function sumTotals(
  days: ActivityRepoScoreDay[],
  dates: Set<string>,
): Map<string, Totals> {
  const totals = new Map<string, Totals>()

  for (const day of days) {
    if (!dates.has(day.date)) {
      continue
    }

    for (const entry of day.repos) {
      const key = entry.name.toLowerCase()
      const total = totals.get(key) ?? { count: 0, scoreSum: 0 }

      totals.set(key, addTotals(total, entry))
    }
  }

  return totals
}

function getPeriod(
  totals: Map<string, Totals>,
  repo: string,
  dates: string[],
): RepoReportPeriod {
  const entry = totals.get(repo.toLowerCase()) ?? { count: 0, scoreSum: 0 }

  return {
    from: dates[0] ?? '',
    to: dates.at(-1) ?? '',
    count: entry.count,
    score: getMean(entry),
  }
}

/** Date of the repo's first scored day, or undefined before it has one. */
export function getTrackedSince(days: RepoReportDay[]): string | undefined {
  return days.find((day) => day.count > 0)?.date
}

export function getRepoReport({
  repo,
  days,
}: {
  repo: string
  days: ActivityRepoScoreDay[]
}): RepoReport {
  const dates = getCompleteDayRange(days.map((day) => day.date).sort())
  const currentDates = dates.slice(-REPO_REPORT_PERIOD_DAYS)
  const previousDates = dates.slice(
    -REPO_REPORT_PERIOD_DAYS * 2,
    -REPO_REPORT_PERIOD_DAYS,
  )

  const currentTotals = sumTotals(days, new Set(currentDates))
  const previousTotals = sumTotals(days, new Set(previousDates))

  const ecosystem = [...currentTotals.values()].reduce(addTotals, {
    count: 0,
    scoreSum: 0,
  })

  const repoDays = new Map(
    days.map((day) => [day.date, getRepoTotals(day, repo)]),
  )

  const reportDays: RepoReportDay[] = dates.map((date) => {
    const entry = repoDays.get(date)

    return {
      date,
      count: entry?.count ?? 0,
      score: entry ? getMean(entry) : null,
    }
  })

  return {
    repo,
    days: reportDays,
    current: getPeriod(currentTotals, repo, currentDates),
    // A partial previous period would compare unlike spans.
    previous:
      previousDates.length === REPO_REPORT_PERIOD_DAYS
        ? getPeriod(previousTotals, repo, previousDates)
        : null,
    ecosystemScore: getMean(ecosystem),
  }
}
