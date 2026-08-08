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

// A day is rolled up once the window has moved past it and still reaches back
// to its first hour, so a day is never stored while it is partly scanned or
// partly aged out of the window.
export function getCompletedDailyEntries(
  results: EcosystemHealthItem[],
): DailyScanEntry[] {
  const buckets = results.map((result) => result.created_at).sort()
  const firstBucket = buckets.at(0)
  const lastBucket = buckets.at(-1)

  if (!firstBucket || !lastBucket) {
    return []
  }

  return [...collectBucketsByDate(results).entries()]
    .filter(
      ([date]) =>
        firstBucket <= getDayStart(date) && getDate(lastBucket) > date,
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

export function mergeDailyEntries(
  stored: DailyScanEntry[],
  entries: DailyScanEntry[],
): DailyScanEntry[] {
  const storedDates = new Set(stored.map((entry) => entry.date))

  return [
    ...stored,
    ...entries.filter((entry) => !storedDates.has(entry.date)),
  ].sort(byDate)
}
