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

export const REPO_REPORT_WINDOW_HOURS = 24

const MILLISECONDS_PER_HOUR = 60 * 60 * 1000

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

/**
 * Start of the last REPO_REPORT_WINDOW_HOURS scanned clock hours. Anchored to
 * the newest PR across every repo, so a quiet repo doesn't shift its own
 * window back in time.
 */
function getWindowStart(results: ActivityItem[]): number {
  const latest = Math.max(
    ...results.map((item) => new Date(item.created_at).getTime()),
  )
  const latestHour =
    Math.floor(latest / MILLISECONDS_PER_HOUR) * MILLISECONDS_PER_HOUR

  return latestHour - (REPO_REPORT_WINDOW_HOURS - 1) * MILLISECONDS_PER_HOUR
}

function getWindow(
  results: ActivityItem[],
  repo: string,
): RepoReport['window'] {
  const windowStart = getWindowStart(results)
  const pullRequests: RepoReportPullRequest[] = results
    .filter((item) => isSameRepo(item.repo_name, repo))
    .filter((item) => new Date(item.created_at).getTime() >= windowStart)
    .filter((item) => item.score !== INSUFFICIENT_DATA_SCORE)
    .map((item) => ({
      pr: item.pr ?? null,
      createdAt: item.created_at,
      classification: classifyByScore(item.score) as ActivityCategory,
    }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  const counts: Record<ActivityCategory, number> = {
    organic: 0,
    mixed: 0,
    automation: 0,
  }

  for (const { classification } of pullRequests) {
    counts[classification]++
  }

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
    window: getWindow(results, repo),
  }
}
