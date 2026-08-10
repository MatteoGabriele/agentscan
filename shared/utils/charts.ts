import type { VueUiXyDatasetItem } from 'vue-data-ui/vue-ui-xy'

export function getCompleteDayRange(days: string[]): string[] {
  if (!days.length) {
    return []
  }

  const firstDay = days[0]!
  const lastDay = days[days.length - 1]!
  const firstDayTime = new Date(firstDay).getTime()
  const lastDayTime = new Date(lastDay).getTime()
  const oneDay = 24 * 60 * 60 * 1000
  const completeDays: string[] = []

  for (let time = firstDayTime; time <= lastDayTime; time += oneDay) {
    completeDays.push(new Date(time).toISOString().slice(0, 10))
  }

  return completeDays
}

export function getDayKey(date: string | Date) {
  if (typeof date === 'string') {
    return date.slice(0, 10)
  }

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

// Evolution of pull request closure rates by repository for PRs in a given score range.

export type ScoreBounds = [min: number, max: number]

export type RepoClosedPrOptions = {
  repoKey?: keyof EcosystemHealthItem
  prKey?: keyof EcosystemHealthItem
  stateKey?: keyof EcosystemHealthItem
  scoreKey?: keyof EcosystemHealthItem
  dateKey?: keyof EcosystemHealthItem
  scoreBounds?: ScoreBounds
  openState?: string
  closedState?: string
  mergedState?: string
  includeAlreadyClosed?: boolean
}

export function getClosedPrPercentageByRepo(
  source: EcosystemHealthItem[],
  options: RepoClosedPrOptions = {},
) {
  const {
    repoKey = 'repo_name',
    prKey = 'pr_key',
    stateKey = 'pr_status',
    scoreKey = 'score',
    scoreBounds = [0, 100],
    openState = 'open',
    closedState = 'closed',
    mergedState = 'merged',
  } = options

  const resolvedScoreBounds: ScoreBounds = Array.isArray(scoreBounds)
    ? scoreBounds
    : [0, Number(scoreBounds)]

  const [minScore, maxScore] = resolvedScoreBounds

  const byRepo = new Map<string, Map<string, EcosystemHealthItem[]>>()

  source.forEach((entry) => {
    if (!entry[repoKey] || !entry[prKey]) {
      return
    }

    const repo = String(entry[repoKey])
    const prId = String(entry[prKey])

    if (!byRepo.has(repo)) {
      byRepo.set(repo, new Map())
    }

    const repoMap = byRepo.get(repo)
    if (!repoMap) {
      return
    }

    if (!repoMap.has(prId)) {
      repoMap.set(prId, [])
    }

    repoMap.get(prId)?.push(entry)
  })

  return Array.from(byRepo.entries()).map(([repo, pullRequests]) => {
    let eligiblePrs = 0
    let closedPrs = 0

    pullRequests.forEach((entries) => {
      const entriesInScoreRange = entries.filter((entry) => {
        const score = Number(entry[scoreKey])
        const status = String(entry[stateKey]).toLowerCase()

        return (
          !Number.isNaN(score) &&
          score >= minScore &&
          score <= maxScore &&
          (status === openState ||
            status === closedState ||
            status === mergedState)
        )
      })

      if (!entriesInScoreRange.length) {
        return
      }

      const hasClosedEntry = entriesInScoreRange.some((entry) => {
        return String(entry[stateKey]).toLowerCase() === closedState
      })

      eligiblePrs += 1

      if (hasClosedEntry) {
        closedPrs += 1
      }
    })

    return {
      repo,
      eligiblePrs,
      closedPrs,
      percentage: eligiblePrs
        ? Number(((closedPrs / eligiblePrs) * 100).toFixed(2))
        : 100,
    }
  })
}

export function getUniqueDatesFromSource(
  source: EcosystemHealthItem[],
  dateKey: keyof EcosystemHealthItem = 'created_at',
) {
  return Array.from(
    new Set(
      source
        .map((entry) => {
          const rawDate = entry[dateKey]
          if (rawDate == null) {
            return null
          }
          return getDayKey(String(rawDate))
        })
        .filter((date): date is string => date !== null),
    ),
  ).sort()
}

export function getClosedPrPercentageByRepoForDate(
  source: EcosystemHealthItem[],
  untilDate: string | Date,
  options: RepoClosedPrOptions = {},
) {
  const { dateKey = 'created_at' } = options
  const limitDay = getDayKey(untilDate)
  const filteredSource = source.filter((entry) => {
    return getDayKey(String(entry[dateKey])) === limitDay // <= limitDay to make it cumulative instead of daily
  })
  return getClosedPrPercentageByRepo(filteredSource, options)
}

export type ClosedPrPercentageEvolutionSeries = {
  name: string
  data: (number | null)[]
}

export const AUTOMATION_PR_CLOSURE_RATE = 'Automation PR closure rate' as const

export function getClosedPrPercentageEvolutionTotal(
  source: EcosystemHealthItem[] = [],
  scoreBounds: ScoreBounds = [0, 100],
  dateKey: keyof EcosystemHealthItem = 'created_at',
): VueUiXyDatasetItem {
  const dates = getUniqueDatesFromSource(source, dateKey)

  const series = dates.map((date) => {
    const results = getClosedPrPercentageByRepoForDate(source, date, {
      scoreBounds,
      dateKey,
    })

    const totalEligible = results.reduce(
      (sum, result) => sum + result.eligiblePrs,
      0,
    )

    const totalClosed = results.reduce(
      (sum, result) => sum + result.closedPrs,
      0,
    )

    return totalEligible > 0 ? (totalClosed / totalEligible) * 100 : 100
  })

  return {
    name: AUTOMATION_PR_CLOSURE_RATE,
    series: series.map((value) => Math.round(value)),
    type: 'line',
    smooth: true,
  }
}

export function getClosedPrPercentageTotal(
  source: EcosystemHealthItem[] = [],
  scoreBounds: ScoreBounds = [0, 100],
): number | null {
  const results = getClosedPrPercentageByRepo(source, { scoreBounds })
  const totalEligible = results.reduce((s, r) => s + r.eligiblePrs, 0)
  const totalClosed = results.reduce((s, r) => s + r.closedPrs, 0)
  if (totalEligible === 0) {
    return 100
  }
  return Math.round((totalClosed / totalEligible) * 100)
}

export type ClosedPrPercentageSnapshot = {
  date: string | undefined
  eligiblePrs: number | null
  closedPrs: number | null
  percentage: number | null
}

export type ClosedPrPercentageComparison = {
  previousSnapshot: ClosedPrPercentageSnapshot
  lastSnapshot: ClosedPrPercentageSnapshot
  percentagePointDifference: number | null
}

export function getClosedPrSnapshot(
  source: EcosystemHealthItem[] = [],
  date: string | Date | undefined,
  scoreBounds: ScoreBounds = [0, 100],
  dateKey: keyof EcosystemHealthItem = 'created_at',
): ClosedPrPercentageSnapshot {
  if (!date) {
    return {
      date: undefined,
      eligiblePrs: null,
      closedPrs: null,
      percentage: null,
    }
  }

  const results = getClosedPrPercentageByRepoForDate(source, date, {
    scoreBounds,
    dateKey,
  })

  const eligiblePrs = results.reduce(
    (total, result) => total + result.eligiblePrs,
    0,
  )

  const closedPrs = results.reduce(
    (total, result) => total + result.closedPrs,
    0,
  )

  return {
    date: getDayKey(date),
    eligiblePrs,
    closedPrs,
    // no eligible PRs = 100% closure rate
    percentage:
      eligiblePrs === 0 ? 100 : Math.round((closedPrs / eligiblePrs) * 100),
  }
}

export function getClosedPrDelta(
  source: EcosystemHealthItem[] = [],
  scoreBounds: ScoreBounds = [0, 100],
  dateKey: keyof EcosystemHealthItem = 'created_at',
): ClosedPrPercentageComparison {
  const dates = getUniqueDatesFromSource(source, dateKey)

  const previousDate = dates.at(-2)
  const lastDate = dates.at(-1)

  const previousSnapshot = getClosedPrSnapshot(
    source,
    previousDate,
    scoreBounds,
    dateKey,
  )

  const lastSnapshot = getClosedPrSnapshot(
    source,
    lastDate,
    scoreBounds,
    dateKey,
  )

  return {
    previousSnapshot,
    lastSnapshot,
    percentagePointDifference:
      previousSnapshot.percentage == null || lastSnapshot.percentage == null
        ? null
        : Math.round(
            (lastSnapshot.percentage - previousSnapshot.percentage) * 10,
          ) / 10,
  }
}

/**
 * SVG markup fragments based on related Lucide icons.
 *
 * Render an icon using `v-html` inside an SVG `<g>` element.
 * Apply stroke, fill, and transformation attributes to the `<g>` element.
 *
 * @example
 * ```vue
 * <g
 *   transform="translate(-7.68, -7.68) scale(0.64)"
 *   stroke="currentColor"
 *   stroke-width="2"
 *   stroke-linecap="round"
 *   stroke-linejoin="round"
 *   fill="none"
 *   v-html="landmark.iconSvg"
 * />
 * ```
 * To extend the list of icons, add the lucide icon key, copy the svg from lucide website, and only keep the SVG elements (not the wrapping <svg> tag basically)
 *
 */
export const SVG_ICON = {
  info: `<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>`,
  newspaper: `<path d="M15 18h-5"/><path d="M18 14h-8"/><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-4 0v-9a2 2 0 0 1 2-2h2"/><rect stroke="currentColor" width="8" height="4" x="10" y="6" rx="1"/>`,
  shieldCheck: `<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>`,
}
