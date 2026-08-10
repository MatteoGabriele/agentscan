import type { IdentityClassification } from '@unveil/identity'
import type {
  EcosystemHealthCategory,
  EcosystemHealthItem,
  PrStatus,
} from '../types/ecosystem-health'
import { classifyByScore, formatPercentage } from './health-stats'
import type { GetClassificationStatsByDateResults } from './count-classification-by-date'
import {
  applyClassificationPercentages,
  CLASSIFICATION_CATEGORIES,
  createEmptyClassificationStats,
} from './count-classification-by-date'

export type DailyClassificationCounts = {
  count: number
  bountyCount: number
  prStatusCounts: Record<PrStatus, number>
}

export type DailyScanEntry = {
  date: string
  createdAt: string
  hours: number
  classifications: Record<IdentityClassification, DailyClassificationCounts>
}

type DailyScanBucket = Omit<DailyScanEntry, 'date' | 'hours'> & {
  hours: Set<string>
}

function createClassificationCounts(): DailyClassificationCounts {
  return {
    count: 0,
    bountyCount: 0,
    prStatusCounts: { open: 0, closed: 0, merged: 0 },
  }
}

function createClassifications(): DailyScanEntry['classifications'] {
  return {
    organic: createClassificationCounts(),
    mixed: createClassificationCounts(),
    automation: createClassificationCounts(),
    'insufficient-data': createClassificationCounts(),
  }
}

function getDayStart(date: string): string {
  return `${date}T00:00:00.000Z`
}

function getDate(timestamp: string): string {
  return timestamp.slice(0, 10)
}

function collectBucketsByDate(
  results: EcosystemHealthItem[],
): Map<string, DailyScanBucket> {
  const bucketsByDate = new Map<string, DailyScanBucket>()

  results.forEach((result) => {
    const date = getDate(result.created_at)
    const bucket = bucketsByDate.get(date) ?? {
      createdAt: result.created_at,
      hours: new Set<string>(),
      classifications: createClassifications(),
    }
    const counts = bucket.classifications[classifyByScore(result.score)]

    counts.count += 1
    counts.bountyCount += result.is_bounty ? 1 : 0
    counts.prStatusCounts[result.pr_status] += 1

    bucket.hours.add(result.created_at)
    bucket.createdAt =
      result.created_at < bucket.createdAt
        ? result.created_at
        : bucket.createdAt

    bucketsByDate.set(date, bucket)
  })

  return bucketsByDate
}

function toDailyEntry(
  date: string,
  bucket: DailyScanBucket,
  hours: number,
): DailyScanEntry {
  return {
    date,
    createdAt: bucket.createdAt,
    hours,
    classifications: bucket.classifications,
  }
}

function byDate(a: DailyScanEntry, b: DailyScanEntry): number {
  return a.date.localeCompare(b.date)
}

function getDayEnd(date: string): string {
  return `${date}T23:00:00.000Z`
}

// An hour with no PR writes no row, so the rows alone cannot say how far the
// scan got. The run passes in the hour it just scanned instead, and a day is
// done once that hour reaches its last one, 23:00.
function isFullyScanned(date: string, scannedHour: string): boolean {
  return scannedHour >= getDayEnd(date)
}

// The window only keeps so many hours. A day that has lost its first one is
// half gone, so it is left out.
function isFullyRetained(date: string, firstBucket: string): boolean {
  return firstBucket <= getDayStart(date)
}

// The days that are fully scanned and still fully inside the window.
export function getCompletedDailyEntries(
  results: EcosystemHealthItem[],
  scannedHour: string,
): DailyScanEntry[] {
  const firstBucket = results
    .map((result) => result.created_at)
    .sort()
    .at(0)

  if (!firstBucket) {
    return []
  }

  return [...collectBucketsByDate(results).entries()]
    .filter(
      ([date]) =>
        isFullyRetained(date, firstBucket) && isFullyScanned(date, scannedHour),
    )
    .map(([date, bucket]) => toDailyEntry(date, bucket, bucket.hours.size))
    .sort(byDate)
}

export function getSampleDailyEntries(
  results: EcosystemHealthItem[],
): DailyScanEntry[] {
  return [...collectBucketsByDate(results).entries()]
    .map(([date, bucket]) => toDailyEntry(date, bucket, 0))
    .sort(byDate)
}

export function getDailyCountsByDate(
  entries: DailyScanEntry[],
): GetClassificationStatsByDateResults {
  const result: GetClassificationStatsByDateResults = {}

  ;[...entries].sort(byDate).forEach((entry) => {
    const counts = createEmptyClassificationStats()

    CLASSIFICATION_CATEGORIES.forEach((category) => {
      counts[category].count = entry.classifications[category].count
    })

    counts.createdAt = entry.createdAt
    result[entry.date] = applyClassificationPercentages(counts)
  })

  return result
}

export function getDailyHealthStats(
  entries: DailyScanEntry[],
): Record<
  EcosystemHealthCategory,
  { count: number; percentage: string }
> | null {
  const counts: Record<EcosystemHealthCategory, number> = {
    organic: 0,
    mixed: 0,
    automation: 0,
  }

  entries.forEach((entry) => {
    CLASSIFICATION_CATEGORIES.forEach((category) => {
      counts[category] += entry.classifications[category].count
    })
  })

  const total = CLASSIFICATION_CATEGORIES.reduce(
    (sum, category) => sum + counts[category],
    0,
  )

  if (total === 0) {
    return null
  }

  return {
    organic: {
      count: counts.organic,
      percentage: formatPercentage((counts.organic / total) * 100),
    },
    mixed: {
      count: counts.mixed,
      percentage: formatPercentage((counts.mixed / total) * 100),
    },
    automation: {
      count: counts.automation,
      percentage: formatPercentage((counts.automation / total) * 100),
    },
  }
}

export type DailyClosureRate = {
  date: string | undefined
  eligiblePrs: number
  closedPrs: number
  percentage: number | null
}

export type DailyClosureRateComparison = {
  previousSnapshot: DailyClosureRate
  lastSnapshot: DailyClosureRate
  percentagePointDifference: number | null
}

const EMPTY_CLOSURE_RATE: DailyClosureRate = {
  date: undefined,
  eligiblePrs: 0,
  closedPrs: 0,
  percentage: null,
}

// Merging is a positive outcome, not a rejection, so only `closed` counts as
// closed — the same rule the per-PR closure rate uses.
function toClosureRate(
  entries: DailyScanEntry[],
  category: EcosystemHealthCategory,
  date?: string,
): DailyClosureRate {
  let eligiblePrs = 0
  let closedPrs = 0

  entries.forEach((entry) => {
    const { open, closed, merged } =
      entry.classifications[category].prStatusCounts

    eligiblePrs += open + closed + merged
    closedPrs += closed
  })

  return {
    date,
    eligiblePrs,
    closedPrs,
    // no eligible PRs = 100% closure rate
    percentage:
      eligiblePrs === 0 ? 100 : Math.round((closedPrs / eligiblePrs) * 100),
  }
}

export function getDailyClosureRateTotal(
  entries: DailyScanEntry[],
  category: EcosystemHealthCategory = 'automation',
): number | null {
  return toClosureRate(entries, category).percentage
}

export function getDailyClosureRateDelta(
  entries: DailyScanEntry[],
  category: EcosystemHealthCategory = 'automation',
): DailyClosureRateComparison {
  const sorted = [...entries].sort(byDate)
  const previous = sorted.at(-2)
  const last = sorted.at(-1)

  const previousSnapshot = previous
    ? toClosureRate([previous], category, previous.date)
    : EMPTY_CLOSURE_RATE
  const lastSnapshot = last
    ? toClosureRate([last], category, last.date)
    : EMPTY_CLOSURE_RATE

  return {
    previousSnapshot,
    lastSnapshot,
    percentagePointDifference:
      previousSnapshot.percentage === null || lastSnapshot.percentage === null
        ? null
        : lastSnapshot.percentage - previousSnapshot.percentage,
  }
}

// A seeded day (`hours: 0`) is one snapshot standing in for the whole day, so
// a measured day replaces it. Otherwise the stored day wins and reruns change
// nothing.
function isReplacing(stored: DailyScanEntry, entry: DailyScanEntry): boolean {
  return stored.hours === 0 && entry.hours > 0
}

export function mergeDailyEntries(
  stored: DailyScanEntry[],
  entries: DailyScanEntry[],
): DailyScanEntry[] {
  const byDateEntries = new Map(stored.map((entry) => [entry.date, entry]))

  entries.forEach((entry) => {
    const current = byDateEntries.get(entry.date)

    if (!current || isReplacing(current, entry)) {
      byDateEntries.set(entry.date, entry)
    }
  })

  return [...byDateEntries.values()].sort(byDate)
}
