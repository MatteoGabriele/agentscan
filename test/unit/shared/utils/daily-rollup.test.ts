import { describe, expect, it } from 'vitest'
import type { DailyScanEntry } from '../../../../shared/utils/daily-rollup'
import {
  getCompletedDailyEntries,
  getDailyCountsByDate,
  getSampleDailyEntries,
  mergeDailyEntries,
} from '../../../../shared/utils/daily-rollup'
import { getClassificationStatsByDate } from '../../../../shared/utils/count-classification-by-date'
import type { EcosystemHealthItem } from '../../../../shared/types/ecosystem-health'

function createEcosystemHealthItem(
  item: Partial<EcosystemHealthItem>,
): EcosystemHealthItem {
  return {
    created_at: '2026-06-10T00:00:00.000Z',
    score: 90,
    pr_status: 'open',
    is_bounty: false,
    ...item,
  } as EcosystemHealthItem
}

function createFullDay(date: string, score: number): EcosystemHealthItem[] {
  return Array.from({ length: 24 }, (_, hour) =>
    createEcosystemHealthItem({
      created_at: `${date}T${String(hour).padStart(2, '0')}:00:00.000Z`,
      score,
    }),
  )
}

function createDailyScanEntry(entry: Partial<DailyScanEntry>): DailyScanEntry {
  return {
    date: '2026-06-10',
    createdAt: '2026-06-10T00:00:00.000Z',
    hours: 24,
    ...entry,
  } as DailyScanEntry
}

describe('getCompletedDailyEntries', () => {
  it('returns one entry per completed day', () => {
    const [entry, ...rest] = getCompletedDailyEntries([
      ...createFullDay('2026-06-10', 90),
      createEcosystemHealthItem({ created_at: '2026-06-11T00:00:00.000Z' }),
    ])

    expect(rest).toEqual([])
    expect(entry?.date).toBe('2026-06-10')
    expect(entry?.createdAt).toBe('2026-06-10T00:00:00.000Z')
    expect(entry?.hours).toBe(24)
    expect(entry?.classifications.organic.count).toBe(24)
    expect(entry?.classifications.automation.count).toBe(0)
  })

  it('counts bounty hunters, pr statuses and insufficient data apart', () => {
    const [entry] = getCompletedDailyEntries([
      createEcosystemHealthItem({
        created_at: '2026-06-10T00:00:00.000Z',
        score: 10,
        pr_status: 'closed',
        is_bounty: true,
      }),
      createEcosystemHealthItem({
        created_at: '2026-06-10T01:00:00.000Z',
        score: 10,
        pr_status: 'merged',
      }),
      createEcosystemHealthItem({
        created_at: '2026-06-10T02:00:00.000Z',
        score: -1,
      }),
      createEcosystemHealthItem({ created_at: '2026-06-11T00:00:00.000Z' }),
    ])

    expect(entry?.classifications.automation).toEqual({
      count: 2,
      bountyCount: 1,
      prStatusCounts: { open: 0, closed: 1, merged: 1 },
    })
    expect(entry?.classifications['insufficient-data'].count).toBe(1)
    expect(entry?.hours).toBe(3)
  })

  it('skips the day still being scanned', () => {
    expect(getCompletedDailyEntries(createFullDay('2026-06-10', 90))).toEqual(
      [],
    )
  })

  it('skips a day whose first hours already left the window', () => {
    const result = getCompletedDailyEntries([
      createEcosystemHealthItem({ created_at: '2026-06-10T12:00:00.000Z' }),
      createEcosystemHealthItem({ created_at: '2026-06-11T00:00:00.000Z' }),
    ])

    expect(result).toEqual([])
  })
})

describe('getSampleDailyEntries', () => {
  it('turns every day of the sample into an entry, latest day included', () => {
    const entries = getSampleDailyEntries([
      createEcosystemHealthItem({
        created_at: '2026-06-10T04:00:00.000Z',
        score: 10,
        is_bounty: true,
      }),
      createEcosystemHealthItem({ created_at: '2026-06-10T04:00:00.000Z' }),
      createEcosystemHealthItem({ created_at: '2026-06-11T09:30:00.000Z' }),
    ])

    expect(entries.map((entry) => entry.date)).toEqual([
      '2026-06-10',
      '2026-06-11',
    ])
    expect(entries[0]?.createdAt).toBe('2026-06-10T04:00:00.000Z')
    expect(entries[0]?.classifications.automation).toEqual({
      count: 1,
      bountyCount: 1,
      prStatusCounts: { open: 1, closed: 0, merged: 0 },
    })
    expect(entries[0]?.classifications.organic.count).toBe(1)
  })

  it('reports no hourly coverage, whatever the run was built from', () => {
    const [entry] = getSampleDailyEntries(createFullDay('2026-06-10', 90))

    expect(entry?.hours).toBe(0)
  })

  it('returns nothing for an empty scan file', () => {
    expect(getSampleDailyEntries([])).toEqual([])
  })
})

describe('getDailyCountsByDate', () => {
  // The day the scan pipeline would report for the same rows, so the stored
  // entry can be checked against the numbers already on the graph.
  const rows = [
    ...Array.from({ length: 6 }, () =>
      createEcosystemHealthItem({ score: 90 }),
    ),
    ...Array.from({ length: 3 }, () =>
      createEcosystemHealthItem({ score: 10 }),
    ),
    createEcosystemHealthItem({ score: 60 }),
    createEcosystemHealthItem({ score: -1 }),
  ]

  it('reads a stored day exactly as the scan pipeline reads the same rows', () => {
    const [entry] = getSampleDailyEntries(rows)

    expect(getDailyCountsByDate([entry!])).toEqual(
      getClassificationStatsByDate(rows),
    )
  })

  it('leaves insufficient-data out of the total and the percentages', () => {
    const [entry] = getSampleDailyEntries(rows)
    const counts = getDailyCountsByDate([entry!])['2026-06-10']

    // 11 rows were measured, but only the 10 scored ones are aggregated.
    expect(entry?.classifications['insufficient-data'].count).toBe(1)
    expect(counts?.total.count).toBe(10)
    expect(counts?.automation.percentage).toBe(30)
    expect(counts?.organic.percentage).toBe(60)
    expect(counts?.mixed.percentage).toBe(10)
  })

  it('keeps the day sorted and carries its scan time through', () => {
    const entries = getSampleDailyEntries([
      createEcosystemHealthItem({ created_at: '2026-06-11T09:30:00.000Z' }),
      createEcosystemHealthItem({ created_at: '2026-06-10T04:00:00.000Z' }),
    ])
    const counts = getDailyCountsByDate(entries)

    expect(Object.keys(counts)).toEqual(['2026-06-10', '2026-06-11'])
    expect(counts['2026-06-10']?.createdAt).toBe('2026-06-10T04:00:00.000Z')
  })
})

describe('mergeDailyEntries', () => {
  it('adds new days and keeps stored ones untouched', () => {
    const stored = [createDailyScanEntry({ date: '2026-06-10', hours: 24 })]

    const result = mergeDailyEntries(stored, [
      createDailyScanEntry({ date: '2026-06-10', hours: 6 }),
      createDailyScanEntry({ date: '2026-06-11' }),
    ])

    expect(result.map((entry) => [entry.date, entry.hours])).toEqual([
      ['2026-06-10', 24],
      ['2026-06-11', 24],
    ])
  })

  it('never lets a backfilled day replace a stored window day', () => {
    const stored = [createDailyScanEntry({ date: '2026-06-10', hours: 24 })]

    const result = mergeDailyEntries(stored, [
      createDailyScanEntry({ date: '2026-06-10', hours: 0 }),
      createDailyScanEntry({ date: '2026-06-09', hours: 0 }),
    ])

    expect(result.map((entry) => [entry.date, entry.hours])).toEqual([
      ['2026-06-09', 0],
      ['2026-06-10', 24],
    ])
  })
})
