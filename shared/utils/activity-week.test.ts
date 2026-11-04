import { describe, expect, it } from 'vitest'
import type { ActivityDailyResponse } from '../types/logs-api'
import { getActivityWeekSnapshot } from './activity-week'
import {
  applyClassificationPercentages,
  createEmptyClassificationStats,
} from './count-classification-by-date'

type Day = [organic: number, mixed: number, automation: number]

function createActivity(
  days: Day[],
): Pick<ActivityDailyResponse, 'dates' | 'countsByDate'> {
  const start = new Date('2026-01-01').getTime()
  const oneDay = 24 * 60 * 60 * 1000
  const dates = days.map((_, index) =>
    new Date(start + index * oneDay).toISOString().slice(0, 10),
  )

  const countsByDate = Object.fromEntries(
    days.map(([organic, mixed, automation], index) => {
      const stats = createEmptyClassificationStats()
      stats.organic.count = organic
      stats.mixed.count = mixed
      stats.automation.count = automation

      return [dates[index], applyClassificationPercentages(stats)]
    }),
  )

  return { dates, countsByDate }
}

describe('getActivityWeekSnapshot', () => {
  it('returns null without data', () => {
    expect(getActivityWeekSnapshot({ dates: [], countsByDate: {} })).toBeNull()
    expect(
      getActivityWeekSnapshot(createActivity(Array(7).fill([0, 0, 0]))),
    ).toBeNull()
  })

  it('summarises the last seven days against the seven before', () => {
    const previousWeek: Day[] = Array(7).fill([80, 10, 10])
    const week: Day[] = Array(7).fill([60, 10, 30])
    const snapshot = getActivityWeekSnapshot(
      createActivity([[1, 1, 1], ...previousWeek, ...week]),
    )

    expect(snapshot).toEqual({
      dates: [
        '2026-01-09',
        '2026-01-10',
        '2026-01-11',
        '2026-01-12',
        '2026-01-13',
        '2026-01-14',
        '2026-01-15',
      ],
      total: 700,
      shares: { organic: 60, mixed: 10, automation: 30 },
      changes: { organic: -20, mixed: 0, automation: 20 },
      series: {
        organic: Array(7).fill(60),
        mixed: Array(7).fill(10),
        automation: Array(7).fill(30),
      },
    })
  })

  it('weights the week share by volume rather than averaging days', () => {
    const snapshot = getActivityWeekSnapshot(
      createActivity([
        [90, 0, 10],
        [10, 0, 90],
        [10, 0, 90],
        [10, 0, 90],
        [10, 0, 90],
        [10, 0, 90],
        [900, 0, 100],
      ]),
    )

    // 1040 of 1600 pull requests, where averaging the days would give 32.9%
    expect(snapshot?.shares).toEqual({ organic: 65, mixed: 0, automation: 35 })
    expect(snapshot?.series.organic).toEqual([90, 10, 10, 10, 10, 10, 90])
  })

  it('has no changes without a previous week', () => {
    const snapshot = getActivityWeekSnapshot(createActivity([[5, 0, 5]]))

    expect(snapshot?.changes).toEqual({
      organic: null,
      mixed: null,
      automation: null,
    })
    expect(snapshot?.dates).toEqual(['2026-01-01'])
  })
})
