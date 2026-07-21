import type { VueUiHorizontalBarDatasetItem } from 'vue-data-ui/vue-ui-horizontal-bar'
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

// Horizontal bar for package scores

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

export function convertToHorizontalBarDataset(
  source: EcosystemHealthItem[] = [],
  date?: Date | string | null,
): VueUiHorizontalBarDatasetItem[] {
  const targetDay = date ? getDayKey(date) : null

  const grouped = source.reduce<
    Record<string, { total: number; count: number }>
  >((acc, item) => {
    const createdDay = getDayKey(item.created_at)

    if (targetDay && createdDay !== targetDay) {
      return acc
    }

    const existing = acc[item.repo_name] ?? { total: 0, count: 0 }

    acc[item.repo_name] = {
      total: existing.total + item.score,
      count: existing.count + 1,
    }

    return acc
  }, {})

  return Object.entries(grouped).map(([name, { total, count }]) => ({
    name,
    value: total / count,
  }))
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

/**
 * Sorry for the beefy comment but could not make the code clearer.
 * ---
 * Computes the daily snapshot closure-rate evolution for each repository.
 *
 * Each point represents the state of a repository on a specific day, not a
 * cumulative history up to that day.
 *
 * For a given day:
 * - Only entries where `dateKey` matches that given day are considered
 * - PRs are deduped by `pr_key`
 * - A PR is considered closed if at least one entry for that PR on that day has a closed status
 *   (a merged PR does not count as closed — merging is a positive outcome, not a rejection)
 * - A PR is considered eligible if it has at least one entry within the selected score range for that day,
 *   whether open, closed, or merged
 *
 * Closure rate is calculated as:
 *
 *   closedPrs / eligiblePrs
 *
 * Because this is a daily snapshot:
 * - The closedPrs numerator may vary from one day to another
 * - The eligiblePrs denominator may also vary from one day to the next
 * - If a PR is absent from a later snapshot, it no longer contributes to the
 *   closure rate for that day, even if it was counted previously
 *
 * Empty snapshots (0 eligible PRs) are represented as 100%
 */
export function getClosedPrPercentageEvolutionByRepo(
  source: EcosystemHealthItem[] = [],
  scoreBounds: ScoreBounds = [0, 100],
  dateKey: keyof EcosystemHealthItem = 'created_at',
): Array<Array<VueUiXyDatasetItem & { hasData: boolean }>> {
  const dates = getUniqueDatesFromSource(source, dateKey)

  const repoMap = new Map<
    string,
    {
      percentages: (number | null)[]
      eligiblePrs: number[]
      closedPrs: number[]
    }
  >()

  dates.forEach((date, dateIndex) => {
    const results = getClosedPrPercentageByRepoForDate(source, date, {
      scoreBounds,
      dateKey,
    })

    results.forEach((result) => {
      if (!repoMap.has(result.repo)) {
        repoMap.set(result.repo, {
          percentages: Array(dates.length).fill(100),
          eligiblePrs: Array(dates.length).fill(0),
          closedPrs: Array(dates.length).fill(0),
        })
      }

      const repoData = repoMap.get(result.repo)

      if (!repoData) {
        return
      }

      repoData.percentages[dateIndex] = result.percentage
      repoData.eligiblePrs[dateIndex] = result.eligiblePrs
      repoData.closedPrs[dateIndex] = result.closedPrs
    })
  })

  return Array.from(repoMap.entries()).map(([name, data]) => [
    {
      name,
      series: data.percentages,
      type: 'line',
      smooth: true,
      hasData: data.percentages.some((value) => value !== null),
      details: {
        eligiblePrs: data.eligiblePrs,
        closedPrs: data.closedPrs,
      },
    },
  ])
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
 * Utility to be used in vue-data-ui line charts (`VueUiXy`) using the `#svg` slot to display the last value as data label.
 * In case of mutliple series, if label collisions are detected, labels are distributed as close as possible to their related datapoint,  shifted to avoid overlaps, and linked to the last datapoint with an elbowed marker
 */
export function createLastDatapointLabelsSvg({
  series,
  drawingArea,
  colors,
  formatValue,
  isDarkMode,
  fontSize = 20,
  labelOffset = 24,
  labelHeight = 30,
}: {
  series: LastDatapointLabelSerie[]
  drawingArea: {
    top: number
    height?: number
    bottom?: number
  }
  colors: LastDatapointLabelColors
  formatValue: (value: number) => string
  isDarkMode: boolean
  svgWidth?: number
  fontSize?: number
  labelOffset?: number
  labelHeight?: number
}) {
  const drawingAreaTop = Number(drawingArea.top ?? 0)
  const drawingAreaHeight = Number(
    drawingArea.height ?? Number(drawingArea.bottom ?? 0) - drawingAreaTop,
  )
  const drawingAreaBottom = drawingAreaTop + drawingAreaHeight

  const labels = series
    .map((serie) => {
      const lastPlot = Array.isArray(serie.plots) ? serie.plots.at(-1) : null
      if (!lastPlot) {
        return null
      }

      const value = Number(lastPlot.value ?? 0)
      const safeValue = Number.isFinite(value) ? value : 0
      const text = formatValue(safeValue)

      return {
        x: Number(lastPlot.x ?? 0),
        y: Number(lastPlot.y ?? 0),
        value: safeValue,
        color: String(serie.color ?? colors.fallbackSerieColor),
        text,
        width: text.length * fontSize * 0.58,
      }
    })
    .filter(isLastDatapointLabel)

  if (!labels.length) {
    return ''
  }

  const hasCollision = labels.some((label, labelIndex) =>
    labels.some((otherLabel, otherLabelIndex) => {
      if (labelIndex === otherLabelIndex) {
        return false
      }

      return (
        label.x + labelOffset < otherLabel.x + labelOffset + otherLabel.width &&
        label.x + labelOffset + label.width > otherLabel.x + labelOffset &&
        label.y - labelHeight / 2 < otherLabel.y + labelHeight / 2 &&
        label.y + labelHeight / 2 > otherLabel.y - labelHeight / 2
      )
    }),
  )

  if (!hasCollision) {
    return labels
      .map(
        (label) => `
          <text
            text-anchor="start"
            dominant-baseline="middle"
            x="${label.x + labelOffset}"
            y="${label.y}"
            font-size="${fontSize}"
            fill="${colors.foreground}"
            stroke="${colors.background}"
            stroke-width="1"
            paint-order="stroke fill"
          >
            ${label.text}
          </text>
        `,
      )
      .join('\n')
  }

  const sortedLabels = [...labels].sort((firstLabel, secondLabel) => {
    return firstLabel.y - secondLabel.y
  })

  const minimumLabelY = drawingAreaTop + labelHeight / 2
  const maximumLabelY = drawingAreaBottom - labelHeight / 2

  const positionedLabels = sortedLabels.map((label) => ({
    ...label,
    labelY: Math.min(maximumLabelY, Math.max(minimumLabelY, label.y)),
  }))

  for (let index = 1; index < positionedLabels.length; index += 1) {
    const previousLabel = positionedLabels[index - 1]
    const currentLabel = positionedLabels[index]
    if (!previousLabel || !currentLabel) {
      continue
    }
    if (currentLabel.labelY - previousLabel.labelY < labelHeight) {
      currentLabel.labelY = previousLabel.labelY + labelHeight
    }
  }

  const lastLabel = positionedLabels.at(-1)
  if (!lastLabel) {
    return ''
  }
  const overflow = lastLabel.labelY - maximumLabelY

  if (overflow > 0) {
    for (const label of positionedLabels) {
      label.labelY -= overflow
    }
  }

  const labelX =
    Math.max(...positionedLabels.map((label) => label.x)) + labelOffset + 10

  return positionedLabels
    .map((label) => {
      const connectorStartX = label.x + 5
      const connectorEndX = labelX

      return `
        <path
          d="M${connectorStartX},${label.y} ${connectorStartX + 6},${label.y} ${connectorEndX},${label.labelY} ${connectorEndX + 6},${label.labelY}"
          stroke="${label.color}"
          stroke-width="1"
          opacity="${isDarkMode ? '0.7' : '1'}"
          fill="none"
        />
        <text
          text-anchor="start"
          dominant-baseline="middle"
          x="${connectorEndX + 12}"
          y="${label.labelY}"
          font-size="${fontSize}"
          fill="${colors.foreground}"
          stroke="${colors.background}"
          stroke-width="1"
          paint-order="stroke fill"
        >
          ${label.text}
        </text>
      `
    })
    .join('\n')
}

export type LastDatapointLabelColors = {
  foreground: string
  background: string
  fallbackSerieColor: string
}

export type LastDatapointLabelSerie = {
  color?: string
  plots?: {
    x?: number | null
    y?: number | null
    value?: number | null
  }[]
}

type LastDatapointLabel = {
  x: number
  y: number
  value: number
  color: string
  text: string
  width: number
}

function isLastDatapointLabel(
  label: LastDatapointLabel | null,
): label is LastDatapointLabel {
  return label !== null
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
}
