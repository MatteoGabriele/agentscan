import type { ActivityCategory, ActivityItem } from '../types/activity'
import type { ActivityRepoScoreDay } from '../types/logs-api'
import type {
  RepoReport,
  RepoReportDay,
  RepoReportPeriod,
  RepoReportPullRequest,
} from '../types/repo-report'
import { classifyByScore, INSUFFICIENT_DATA_SCORE } from './activity-stats'
import { getCompleteDayRange } from './charts'

export const REPO_REPORT_PERIOD_DAYS = 30

type Totals = { count: number; scoreSum: number }

function getMean({ count, scoreSum }: Totals): number | null {
  return count ? scoreSum / count : null
}

function isSameRepo(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase()
}

/**
 * Finds the repo's canonical spelling, since the URL may not match GitHub's
 * casing. Returns null when neither data source has seen the repo.
 */
export function findRepoName({
  repo,
  days,
  results,
}: {
  repo: string
  days: ActivityRepoScoreDay[]
  results: ActivityItem[]
}): string | null {
  console.log(days)
  for (const day of days) {
    const match = day.repos.find((item) => isSameRepo(item.name, repo))

    if (match) {
      return match.name
    }
  }

  const repoEntry = results.find((item) => isSameRepo(item.repo_name, repo))

  return repoEntry?.repo_name ?? null
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

    for (const { name, count, scoreSum } of day.repos) {
      const entry = totals.get(name) ?? { count: 0, scoreSum: 0 }

      entry.count += count
      entry.scoreSum += scoreSum
      totals.set(name, entry)
    }
  }

  return totals
}

function getPeriod(
  totals: Map<string, Totals>,
  repo: string,
  dates: string[],
): RepoReportPeriod {
  const entry = totals.get(repo) ?? { count: 0, scoreSum: 0 }

  return {
    from: dates[0] ?? '',
    to: dates.at(-1) ?? '',
    count: entry.count,
    score: getMean(entry),
  }
}

function getWindow(
  results: ActivityItem[],
  repo: string,
): RepoReport['window'] {
  const counts: Record<ActivityCategory, number> = {
    organic: 0,
    mixed: 0,
    automation: 0,
  }

  const pullRequests: RepoReportPullRequest[] = results
    .filter(
      (item) =>
        item.repo_name === repo && item.score !== INSUFFICIENT_DATA_SCORE,
    )
    .map((item) => {
      const classification = classifyByScore(item.score) as ActivityCategory

      counts[classification]++

      return {
        pr: item.pr ?? null,
        createdAt: item.created_at,
        classification,
      }
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  return { counts, total: pullRequests.length, pullRequests }
}

export function getRepoReport({
  repo,
  days,
  results,
}: {
  repo: string
  days: ActivityRepoScoreDay[]
  results: ActivityItem[]
}): RepoReport {
  const dates = getCompleteDayRange(days.map((day) => day.date).sort())
  const currentDates = dates.slice(-REPO_REPORT_PERIOD_DAYS)
  const previousDates = dates.slice(
    -REPO_REPORT_PERIOD_DAYS * 2,
    -REPO_REPORT_PERIOD_DAYS,
  )

  const currentTotals = sumTotals(days, new Set(currentDates))
  const previousTotals = sumTotals(days, new Set(previousDates))

  const ecosystem = [...currentTotals.values()].reduce(
    (sum, entry) => ({
      count: sum.count + entry.count,
      scoreSum: sum.scoreSum + entry.scoreSum,
    }),
    { count: 0, scoreSum: 0 },
  )

  const repoDays = new Map(
    days.map((day) => [day.date, day.repos.find((item) => item.name === repo)]),
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
    window: getWindow(results, repo),
  }
}
