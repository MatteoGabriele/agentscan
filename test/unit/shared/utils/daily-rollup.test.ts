import { describe, expect, it } from 'vitest'
import type { DailyScanEntry } from '../../../../shared/utils/daily-rollup'
import {
  getCompletedDailyEntries,
  mergeDailyEntries,
} from '../../../../shared/utils/daily-rollup'
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
})
