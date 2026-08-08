import type { IdentityClassification } from '@unveil/identity'
import type { EcosystemHealthItem, PrStatus } from '../types/ecosystem-health'
import { classifyByScore } from './health-stats'
import type { GetClassificationStatsByDateResults } from './count-classification-by-date'
import {
  applyClassificationPercentages,
  CLASSIFICATION_CATEGORIES,
  createEmptyClassificationStats,
} from './count-classification-by-date'

// What a day is made of, per classification. Percentages, trends and any other
// chart shape follow from these counts, so nothing here is tied to a graph.
export type DailyClassificationCounts = {
  count: number
  bountyCount: number
  prStatusCounts: Record<PrStatus, number>
}

// One entry per day, derived from the hourly window scans instead of a single
// scan run. `hours` is how many of the day's 24 windows it was built from —
// an hour with nothing to scan and an hour that never ran both leave no rows,
// so under 24 is a hint to read the counts with care, not a defect. Days
// backfilled from the daily sample predate the window entirely and report 0.
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

// Backfill for the days that predate the hourly window: the fixed sample writes
// one run per day, and that run is the whole of what was measured that day —
// there is no partial day to hold back and no later run that could extend it,
// so every date present becomes an entry. It was never built from windows, so
// it reports no hourly coverage, and its counts are capped by the run's
// top-N-per-repo quota rather than by the day's real PR traffic.
export function getSampleDailyEntries(
  results: EcosystemHealthItem[],
): DailyScanEntry[] {
  return [...collectBucketsByDate(results).entries()]
    .map(([date, bucket]) => toDailyEntry(date, bucket, 0))
    .sort(byDate)
}

// Stored days in the shape every health endpoint already returns.
//
// A day keeps the raw counts it was measured with — including the
// `insufficient-data` bucket, which is worth storing — but the aggregate built
// from them leaves that bucket out of the total and the percentages, exactly as
// the scan pipeline has always done. Counting it would quietly reweight every
// day already on the graph, so a backfilled day reads identically to the way it
// reads today, and a window day is measured the same way for free.
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

// Stored days keep their original counts: the hours they were derived from
// have since left the window, so a second pass could only shrink them. The
// same rule settles a date both sources can produce — whichever wrote it first
// keeps it, and backfilling never overwrites a real window day.
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
