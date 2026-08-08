import type { IdentityClassification } from '@unveil/identity'
import type { EcosystemHealthItem, PrStatus } from '../types/ecosystem-health'
import { classifyByScore } from './health-stats'

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
// so under 24 is a hint to read the counts with care, not a defect.
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

  return [...bucketsByDate.entries()]
    .filter(
      ([date]) =>
        firstBucket <= getDayStart(date) && getDate(lastBucket) > date,
    )
    .map(([date, bucket]) => ({
      date,
      createdAt: bucket.createdAt,
      hours: bucket.hours.size,
      classifications: bucket.classifications,
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

// Stored days keep their original counts: the hours they were derived from
// have since left the window, so a second pass could only shrink them.
export function mergeDailyEntries(
  stored: DailyScanEntry[],
  entries: DailyScanEntry[],
): DailyScanEntry[] {
  const storedDates = new Set(stored.map((entry) => entry.date))

  return [
    ...stored,
    ...entries.filter((entry) => !storedDates.has(entry.date)),
  ].sort((a, b) => a.date.localeCompare(b.date))
}
