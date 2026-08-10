import { identityConfig } from '@unveil/identity'
import type {
  EcosystemHealthCategory,
  EcosystemHealthCategoryProgression,
} from '../types/ecosystem-health'
import { round } from './numbers'
import { INSUFFICIENT_DATA_SCORE } from './health-stats'
import { calcLinearProgression } from './calc-linear-progression'

export type ClassificationMetric = {
  count: number
  trend: number
  percentage: number
}

export type ClassificationStats = {
  automation: ClassificationMetric
  mixed: ClassificationMetric
  organic: ClassificationMetric
  total: ClassificationMetric
  createdAt: string | null
}

export type GetClassificationStatsByDateResults = Record<
  string,
  ClassificationStats
>

export const CLASSIFICATION_CATEGORIES = [
  'organic',
  'mixed',
  'automation',
] as const

type CategoryPercentageComparison = {
  category: EcosystemHealthCategory
  lastDate: string | undefined
  lastCount: number | null
  lastTotal: number | null
  lastPercentage: number | null
  previousDate: string | undefined
  previousCount: number | null
  previousTotal: number | null
  previousPercentage: number | null
  percentagePointDifference: number | null
}

type CategoryPercentageComparisons = Record<
  EcosystemHealthCategory,
  CategoryPercentageComparison
>

function getDateKey(date: string): string {
  return new Date(date).toISOString().slice(0, 10)
}

export function createEmptyClassificationStats(): ClassificationStats {
  return {
    automation: { count: 0, trend: 0, percentage: 0 },
    mixed: { count: 0, trend: 0, percentage: 0 },
    organic: { count: 0, trend: 0, percentage: 0 },
    total: { count: 0, trend: 0, percentage: 100 },
    createdAt: null,
  }
}

function getClassificationStatsByBucket(
  data: EcosystemHealthItem[],
  getBucketKey: (createdAt: string) => string,
): GetClassificationStatsByDateResults {
  const result: GetClassificationStatsByDateResults = {}

  const scored = data.filter((item) => item.score !== INSUFFICIENT_DATA_SCORE)

  const dates = [
    ...new Set(scored.map((item) => getBucketKey(item.created_at))),
  ].sort()

  dates.forEach((date) => {
    result[date] = createEmptyClassificationStats()
  })

  scored.forEach((item) => {
    const dateCounts = result[getBucketKey(item.created_at)]

    if (!dateCounts) {
      return
    }

    // pick earliest date
    if (!dateCounts.createdAt || item.created_at < dateCounts.createdAt) {
      dateCounts.createdAt = item.created_at
    }

    if (item.score >= identityConfig.THRESHOLD_HUMAN) {
      dateCounts.organic.count += 1
    } else if (item.score >= identityConfig.THRESHOLD_SUSPICIOUS) {
      dateCounts.mixed.count += 1
    } else {
      dateCounts.automation.count += 1
    }
    dateCounts.total.count =
      dateCounts.automation.count +
      dateCounts.mixed.count +
      dateCounts.organic.count

    dateCounts.automation.percentage = round(
      (dateCounts.automation.count / dateCounts.total.count) * 100,
    )
    dateCounts.mixed.percentage = round(
      (dateCounts.mixed.count / dateCounts.total.count) * 100,
    )
    dateCounts.organic.percentage = round(
      (dateCounts.organic.count / dateCounts.total.count) * 100,
    )
  })

  return result
}

export function getClassificationStatsByDate(
  data: EcosystemHealthItem[] = [],
): GetClassificationStatsByDateResults {
  return getClassificationStatsByBucket(data, getDateKey)
}

// Entries written by the same scan run share a `created_at`, so a run is
// already its own bucket — the hourly scan gives one bucket per hour.
export function getClassificationStatsByScanTime(
  data: EcosystemHealthItem[] = [],
): GetClassificationStatsByDateResults {
  return getClassificationStatsByBucket(data, (createdAt) => createdAt)
}

export function applyCumulativeTrends(
  countsByBucket: GetClassificationStatsByDateResults,
): EcosystemHealthCategoryProgression {
  const percentages: Record<EcosystemHealthCategory, number[]> = {
    automation: [],
    mixed: [],
    organic: [],
  }

  Object.keys(countsByBucket)
    .sort()
    .forEach((bucket) => {
      const counts = countsByBucket[bucket]

      if (!counts) {
        return
      }

      CLASSIFICATION_CATEGORIES.forEach((category) => {
        percentages[category].push(counts[category].percentage)
        counts[category].trend = calcLinearProgression(
          percentages[category],
        ).trend
      })
    })

  return {
    automation: calcLinearProgression(percentages.automation),
    mixed: calcLinearProgression(percentages.mixed),
    organic: calcLinearProgression(percentages.organic),
  }
}

const MILLISECONDS_PER_HOUR = 60 * 60 * 1000

// The clock hour a timestamp belongs to, so a scan time and the placeholder
// standing in for it can never end up under two different keys.
function getHourTime(time: number): number {
  return Math.floor(time / MILLISECONDS_PER_HOUR) * MILLISECONDS_PER_HOUR
}

function mergeClassificationStats(
  current: ClassificationStats,
  next: ClassificationStats,
): ClassificationStats {
  const merged = createEmptyClassificationStats()

  CLASSIFICATION_CATEGORIES.forEach((category) => {
    merged[category].count = current[category].count + next[category].count
  })

  merged.createdAt =
    [current.createdAt, next.createdAt]
      .filter((createdAt): createdAt is string => Boolean(createdAt))
      .sort()
      .at(0) ?? null

  return applyClassificationPercentages(merged)
}

export function fillEmptyHourlyBuckets({
  countsByHour,
  maxHours,
}: {
  countsByHour: GetClassificationStatsByDateResults
  maxHours?: number
}): GetClassificationStatsByDateResults {
  const hours = Object.keys(countsByHour).sort()
  const firstHour = hours.at(0)
  const lastHour = hours.at(-1)

  if (!firstHour || !lastHour) {
    return {}
  }

  const firstTime = new Date(firstHour).getTime()
  const lastTime = new Date(lastHour).getTime()

  if (Number.isNaN(firstTime) || Number.isNaN(lastTime)) {
    return countsByHour
  }

  const firstHourTime = getHourTime(firstTime)
  const lastHourTime = getHourTime(lastTime)

  const startTime =
    maxHours && maxHours > 0
      ? Math.max(
          firstHourTime,
          lastHourTime - (maxHours - 1) * MILLISECONDS_PER_HOUR,
        )
      : firstHourTime

  // Scan times that don't sit exactly on the hourly grid still belong to the
  // window, so they collapse onto their clock hour rather than being dropped
  // next to the placeholder for that same hour.
  const recorded: GetClassificationStatsByDateResults = {}

  hours.forEach((hour) => {
    const counts = countsByHour[hour]
    const time = new Date(hour).getTime()

    if (!counts || Number.isNaN(time)) {
      return
    }

    const hourTime = getHourTime(time)

    if (hourTime < startTime) {
      return
    }

    const key = new Date(hourTime).toISOString()
    const current = recorded[key]

    recorded[key] = current ? mergeClassificationStats(current, counts) : counts
  })

  const result: GetClassificationStatsByDateResults = {}

  for (
    let time = startTime;
    time <= lastHourTime;
    time += MILLISECONDS_PER_HOUR
  ) {
    const key = new Date(time).toISOString()

    result[key] =
      recorded[key] ??
      applyClassificationPercentages(createEmptyClassificationStats())
  }

  return result
}

function getTotalClassificationCount(
  counts: ClassificationStats | undefined,
): number | null {
  if (!counts) {
    return null
  }
  return CLASSIFICATION_CATEGORIES.reduce(
    (total, category) => total + counts[category].count,
    0,
  )
}

function getCategoryPercentage(
  counts: ClassificationStats | undefined,
  category: EcosystemHealthCategory,
): number | null {
  if (!counts || counts.total.count === 0) {
    return null
  }

  return Number(counts[category].percentage.toFixed(1))
}

function getCategoryPercentageComparison({
  category,
  lastDate,
  previousDate,
  countsByDate,
}: {
  category: EcosystemHealthCategory
  lastDate: string | undefined
  previousDate: string | undefined
  countsByDate: GetClassificationStatsByDateResults
}): CategoryPercentageComparison {
  const previousCounts = previousDate ? countsByDate[previousDate] : undefined
  const lastCounts = lastDate ? countsByDate[lastDate] : undefined
  const previousPercentage = getCategoryPercentage(previousCounts, category)

  const lastPercentage = getCategoryPercentage(lastCounts, category)

  return {
    category,

    previousDate,
    previousCount: previousCounts?.[category].count ?? null,
    previousTotal: getTotalClassificationCount(previousCounts),
    previousPercentage,

    lastDate,
    lastCount: lastCounts?.[category].count ?? null,
    lastTotal: getTotalClassificationCount(lastCounts),
    lastPercentage,

    percentagePointDifference:
      previousPercentage === null || lastPercentage === null
        ? null
        : round(lastPercentage - previousPercentage, 1),
  }
}

export function getCategoryDeltasByDate(
  countsByDate: GetClassificationStatsByDateResults,
): CategoryPercentageComparisons {
  const dates = Object.keys(countsByDate).sort()
  const previousDate = dates.at(-2)
  const lastDate = dates.at(-1)
  return CLASSIFICATION_CATEGORIES.reduce((comparisons, category) => {
    comparisons[category] = getCategoryPercentageComparison({
      category,
      lastDate,
      previousDate,
      countsByDate,
    })
    return comparisons
  }, {} as CategoryPercentageComparisons)
}

export function getCategoryDeltas(
  results: EcosystemHealthItem[],
): CategoryPercentageComparisons {
  return getCategoryDeltasByDate(getClassificationStatsByDate(results))
}

function getPreviousDays({
  date,
  length,
  offset = 0,
}: {
  date: string
  length: number
  offset?: number
}): Set<string> {
  const millisecondsPerDay = 24 * 60 * 60 * 1000
  const endDate = new Date(`${getDateKey(date)}T00:00:00.000Z`)

  return new Set(
    Array.from({ length }, (_, dayOffset) => {
      const currentDate = new Date(
        endDate.getTime() - (dayOffset + offset) * millisecondsPerDay,
      )

      return getDateKey(currentDate.toISOString())
    }),
  )
}

function getNextDays({
  date,
  length,
}: {
  date: string
  length: number
}): Set<string> {
  const millisecondsPerDay = 24 * 60 * 60 * 1000
  const startDate = new Date(`${getDateKey(date)}T00:00:00.000Z`)
  return new Set(
    Array.from({ length }, (_, dayOffset) => {
      const currentDate = new Date(
        startDate.getTime() + dayOffset * millisecondsPerDay,
      )
      return getDateKey(currentDate.toISOString())
    }),
  )
}

function getMondayDateKey(date: string): string {
  const millisecondsPerDay = 24 * 60 * 60 * 1000
  const currentDate = new Date(`${getDateKey(date)}T00:00:00.000Z`)
  const dayOfWeek = currentDate.getUTCDay()
  const daysSinceMonday = (dayOfWeek + 6) % 7
  const monday = new Date(
    currentDate.getTime() - daysSinceMonday * millisecondsPerDay,
  )

  return getDateKey(monday.toISOString())
}

function getPreviousMondayDateKey(date: string): string {
  const millisecondsPerDay = 24 * 60 * 60 * 1000
  const monday = new Date(`${getMondayDateKey(date)}T00:00:00.000Z`)
  return getDateKey(
    new Date(monday.getTime() - 7 * millisecondsPerDay).toISOString(),
  )
}

function applyClassificationCountTrends({
  currentCounts,
  previousCounts,
}: {
  currentCounts: ClassificationStats
  previousCounts: ClassificationStats
}): ClassificationStats {
  const currentCountsWithPercentages =
    applyClassificationPercentages(currentCounts)
  const previousCountsWithPercentages =
    applyClassificationPercentages(previousCounts)

  CLASSIFICATION_CATEGORIES.forEach((category) => {
    currentCountsWithPercentages[category].trend =
      getClassificationPercentageTrend({
        currentPercentage: currentCountsWithPercentages[category].percentage,
        previousPercentage: previousCountsWithPercentages[category].percentage,
      })
  })

  return currentCountsWithPercentages
}

function sumClassificationCountsByDates({
  countsByDate,
  dates,
}: {
  countsByDate: GetClassificationStatsByDateResults
  dates: Set<string>
}): ClassificationStats {
  const result = createEmptyClassificationStats()

  dates.forEach((date) => {
    const counts = countsByDate[date]

    if (!counts) {
      return
    }

    CLASSIFICATION_CATEGORIES.forEach((category) => {
      result[category].count += counts[category].count
    })
  })

  return applyClassificationPercentages(result)
}

export function applyClassificationPercentages(
  counts: ClassificationStats,
): ClassificationStats {
  const total = CLASSIFICATION_CATEGORIES.reduce((total, category) => {
    return total + counts[category].count
  }, 0)

  counts.total.count = total
  counts.total.percentage = total === 0 ? 0 : 100

  CLASSIFICATION_CATEGORIES.forEach((category) => {
    counts[category].percentage =
      total === 0 ? 0 : round((counts[category].count / total) * 100)
  })

  return counts
}

function getClassificationPercentageTrend({
  currentPercentage,
  previousPercentage,
}: {
  currentPercentage: number
  previousPercentage: number
}): number {
  if (previousPercentage === 0) {
    return currentPercentage === 0 ? 0 : 100
  }

  return round(
    ((currentPercentage - previousPercentage) / previousPercentage) * 100,
    1,
  )
}

export function getClassificationForPreviousDaysByDate({
  countsByDate,
  date,
  days,
}: {
  countsByDate: GetClassificationStatsByDateResults
  date: string
  days: number
}): ClassificationStats {
  if (!Number.isInteger(days) || days < 1) {
    return createEmptyClassificationStats()
  }

  const currentDays = getPreviousDays({
    date,
    length: days,
  })

  const previousDays = getPreviousDays({
    date,
    length: days,
    offset: days,
  })

  const currentCounts = sumClassificationCountsByDates({
    countsByDate,
    dates: currentDays,
  })

  const previousCounts = sumClassificationCountsByDates({
    countsByDate,
    dates: previousDays,
  })

  return applyClassificationCountTrends({
    currentCounts,
    previousCounts,
  })
}

export function getClassificationForPreviousDays({
  data = [],
  date,
  days,
}: {
  data?: EcosystemHealthItem[]
  date: string
  days: number
}): ClassificationStats {
  return getClassificationForPreviousDaysByDate({
    countsByDate: getClassificationStatsByDate(data),
    date,
    days,
  })
}

export function getWeeklyClassificationByDate(
  countsByDate: GetClassificationStatsByDateResults,
  date: string,
  rolling = true,
): ClassificationStats {
  if (rolling) {
    return getClassificationForPreviousDaysByDate({
      countsByDate,
      date,
      days: 7,
    })
  }

  const currentWeekDays = getNextDays({
    date: getMondayDateKey(date),
    length: 7,
  })

  const previousWeekDays = getNextDays({
    date: getPreviousMondayDateKey(date),
    length: 7,
  })

  const currentCounts = sumClassificationCountsByDates({
    countsByDate,
    dates: currentWeekDays,
  })

  const previousCounts = sumClassificationCountsByDates({
    countsByDate,
    dates: previousWeekDays,
  })

  return applyClassificationCountTrends({
    currentCounts,
    previousCounts,
  })
}

export function getWeeklyClassification(
  data: EcosystemHealthItem[] = [],
  date: string,
  rolling = true,
): ClassificationStats {
  return getWeeklyClassificationByDate(
    getClassificationStatsByDate(data),
    date,
    rolling,
  )
}

type ClassificationChunk = {
  startDate: string
  endDate: string
  days: number
  classification: ClassificationStats
}

function getSundayDateKey(date: string): string {
  const millisecondsPerDay = 24 * 60 * 60 * 1000
  const monday = new Date(`${getMondayDateKey(date)}T00:00:00.000Z`)

  return getDateKey(
    new Date(monday.getTime() + 6 * millisecondsPerDay).toISOString(),
  )
}

function getCalendarWeekStartDates(dates: string[]): string[] {
  return [...new Set(dates.map((date) => getMondayDateKey(date)))].sort()
}

function getContinuousDateKeys(dates: string[]): string[] {
  const dateKeys = [...new Set(dates.map((date) => getDateKey(date)))].sort()

  const firstDate = dateKeys.at(0)
  const lastDate = dateKeys.at(-1)

  if (!firstDate || !lastDate) {
    return []
  }

  const millisecondsPerDay = 24 * 60 * 60 * 1000
  const firstTime = new Date(`${firstDate}T00:00:00.000Z`).getTime()

  const lastTime = new Date(`${lastDate}T00:00:00.000Z`).getTime()

  return Array.from(
    {
      length: Math.floor((lastTime - firstTime) / millisecondsPerDay) + 1,
    },
    (_, dayOffset) => {
      return getDateKey(
        new Date(firstTime + dayOffset * millisecondsPerDay).toISOString(),
      )
    },
  )
}

function getClassificationByCalendarWeekChunksByDate({
  countsByDate,
  dates = [],
}: {
  countsByDate: GetClassificationStatsByDateResults
  dates?: string[]
}): ClassificationChunk[] {
  const continuousDates = getContinuousDateKeys(dates)
  const firstDate = continuousDates.at(0)
  const lastDate = continuousDates.at(-1)

  if (!firstDate || !lastDate) {
    return []
  }

  return getCalendarWeekStartDates(continuousDates)
    .map((startDate) => {
      const endDate = getSundayDateKey(startDate)

      const isCompleteWeek = startDate >= firstDate && endDate <= lastDate

      if (!isCompleteWeek) {
        return null
      }

      return {
        startDate,
        endDate,
        days: 7,
        classification: getWeeklyClassificationByDate(
          countsByDate,
          endDate,
          false,
        ),
      }
    })
    .filter((chunk): chunk is ClassificationChunk => Boolean(chunk))
}

export function getClassificationByDateChunksByDate({
  countsByDate,
  dates = [],
  days = 7,
  rolling = true,
}: {
  countsByDate: GetClassificationStatsByDateResults
  dates?: string[]
  days?: number
  rolling?: boolean
}): ClassificationChunk[] {
  if (!Number.isInteger(days) || days < 1) {
    return []
  }

  if (!rolling && days === 7) {
    return getClassificationByCalendarWeekChunksByDate({
      countsByDate,
      dates,
    })
  }

  const sortedDates = getContinuousDateKeys(dates)

  return Array.from(
    {
      length: Math.ceil(sortedDates.length / days),
    },
    (_, chunkIndex) => {
      const chunk = sortedDates.slice(
        chunkIndex * days,
        chunkIndex * days + days,
      )
      const startDate = chunk.at(0)
      const endDate = chunk.at(-1)

      if (!startDate || !endDate) {
        return null
      }

      return {
        startDate,
        endDate,
        days: chunk.length,
        classification: getClassificationForPreviousDaysByDate({
          countsByDate,
          date: endDate,
          days: chunk.length,
        }),
      }
    },
  ).filter((chunk): chunk is ClassificationChunk => Boolean(chunk))
}

export function getClassificationByDateChunks({
  data = [],
  dates = [],
  days = 7,
  rolling = true,
}: {
  data?: EcosystemHealthItem[]
  dates?: string[]
  days?: number
  rolling?: boolean
}): ClassificationChunk[] {
  return getClassificationByDateChunksByDate({
    countsByDate: getClassificationStatsByDate(data),
    dates,
    days,
    rolling,
  })
}
