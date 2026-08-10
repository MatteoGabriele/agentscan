import { describe, expect, it } from 'vitest'
import type {
  ClassificationStats,
  ClassificationMetric,
} from '../../../../shared/utils/count-classification-by-date'
import {
  fillEmptyHourlyBuckets,
  getClassificationStatsByDate,
  getCategoryDeltas,
  getClassificationByDateChunks,
  getClassificationForPreviousDays,
  getClassificationStatsByScanTime,
  getWeeklyClassification,
} from '../../../../shared/utils/count-classification-by-date'
import type { EcosystemHealthItem } from '../../../../shared/types/ecosystem-health'

function createEcosystemHealthItem(
  created_at: string,
  score: number,
): EcosystemHealthItem {
  return {
    created_at,
    score,
  } as EcosystemHealthItem
}

function expectClassificationMetric(
  received: ClassificationMetric,
  expected: ClassificationMetric,
): void {
  expect(received.count).toBe(expected.count)
  expect(received.trend).toBeCloseTo(expected.trend, 5)
  expect(received.percentage).toBeCloseTo(expected.percentage, 5)
}

function expectClassificationCounts(
  received: ClassificationStats,
  expected: ClassificationStats,
): void {
  expectClassificationMetric(received.organic, expected.organic)
  expectClassificationMetric(received.mixed, expected.mixed)
  expectClassificationMetric(received.automation, expected.automation)
  expectClassificationMetric(received.total, expected.total)
}

describe('getClassificationStatsByDate', () => {
  it('returns an object with sorted date keys', () => {
    const result = getClassificationStatsByDate([
      createEcosystemHealthItem('2026-06-11T10:00:00.000Z', 90),
      createEcosystemHealthItem('2026-06-10T10:00:00.000Z', 50),
      createEcosystemHealthItem('2026-06-10T11:00:00.000Z', 10),
    ])

    expect(Object.keys(result)).toEqual(['2026-06-10', '2026-06-11'])
  })

  it('ignores insufficient-data entries', () => {
    const result = getClassificationStatsByDate([
      createEcosystemHealthItem('2026-06-10T10:00:00.000Z', 90),
      createEcosystemHealthItem('2026-06-10T11:00:00.000Z', 10),
      createEcosystemHealthItem('2026-06-10T12:00:00.000Z', -1),

      // a date with only insufficient-data never gets a bucket
      createEcosystemHealthItem('2026-06-11T10:00:00.000Z', -1),
    ])

    expect(Object.keys(result)).toEqual(['2026-06-10'])
    expect(result['2026-06-10']!.total.count).toBe(2)
    expect(result['2026-06-10']!.organic.count).toBe(1)
    expect(result['2026-06-10']!.organic.percentage).toBe(50)
    expect(result['2026-06-10']!.automation.count).toBe(1)
    expect(result['2026-06-10']!.automation.percentage).toBe(50)
  })

  it('returns counts, percentages, and default trends for each date', () => {
    const result = getClassificationStatsByDate([
      createEcosystemHealthItem('2026-06-10T10:00:00.000Z', 90),
      createEcosystemHealthItem('2026-06-10T11:00:00.000Z', 50),
      createEcosystemHealthItem('2026-06-10T12:00:00.000Z', 10),
      createEcosystemHealthItem('2026-06-10T13:00:00.000Z', 10),

      createEcosystemHealthItem('2026-06-11T10:00:00.000Z', 90),
      createEcosystemHealthItem('2026-06-11T11:00:00.000Z', 90),
      createEcosystemHealthItem('2026-06-11T12:00:00.000Z', 50),
    ])

    expectClassificationCounts(result['2026-06-10'], {
      organic: {
        count: 1,
        trend: 0,
        percentage: 25,
      },
      mixed: {
        count: 1,
        trend: 0,
        percentage: 25,
      },
      automation: {
        count: 2,
        trend: 0,
        percentage: 50,
      },
      total: {
        count: 4,
        trend: 0,
        percentage: 100,
      },
    })

    expectClassificationCounts(result['2026-06-11'], {
      organic: {
        count: 2,
        trend: 0,
        percentage: 66.67,
      },
      mixed: {
        count: 1,
        trend: 0,
        percentage: 33.33,
      },
      automation: {
        count: 0,
        trend: 0,
        percentage: 0,
      },
      total: {
        count: 3,
        trend: 0,
        percentage: 100,
      },
    })
  })
})

describe('getCategoryDeltas', () => {
  const previousDate = '2026-06-18T11:38:32.093Z'
  const lastDate = '2026-06-19T14:37:04.644Z'

  it('returns category deltas keyed by category', () => {
    const result = getCategoryDeltas([
      createEcosystemHealthItem(lastDate, 90),
      createEcosystemHealthItem(lastDate, 50),
      createEcosystemHealthItem(lastDate, 50),
      createEcosystemHealthItem(lastDate, 10),

      createEcosystemHealthItem(previousDate, 90),
      createEcosystemHealthItem(previousDate, 90),
      createEcosystemHealthItem(previousDate, 50),
      createEcosystemHealthItem(previousDate, 10),
    ])

    expect(result).toEqual({
      organic: {
        category: 'organic',
        previousDate: '2026-06-18',
        previousCount: 2,
        previousTotal: 4,
        previousPercentage: 50,
        lastDate: '2026-06-19',
        lastCount: 1,
        lastTotal: 4,
        lastPercentage: 25,
        percentagePointDifference: -25,
      },
      mixed: {
        category: 'mixed',
        previousDate: '2026-06-18',
        previousCount: 1,
        previousTotal: 4,
        previousPercentage: 25,
        lastDate: '2026-06-19',
        lastCount: 2,
        lastTotal: 4,
        lastPercentage: 50,
        percentagePointDifference: 25,
      },
      automation: {
        category: 'automation',
        previousDate: '2026-06-18',
        previousCount: 1,
        previousTotal: 4,
        previousPercentage: 25,
        lastDate: '2026-06-19',
        lastCount: 1,
        lastTotal: 4,
        lastPercentage: 25,
        percentagePointDifference: 0,
      },
    })
  })

  it('returns null previous values when there is only one date', () => {
    const result = getCategoryDeltas([
      createEcosystemHealthItem(lastDate, 90),
      createEcosystemHealthItem(lastDate, 50),
      createEcosystemHealthItem(lastDate, 10),
    ])

    expect(result).toEqual({
      organic: {
        category: 'organic',
        previousDate: undefined,
        previousCount: null,
        previousTotal: null,
        previousPercentage: null,
        lastDate: '2026-06-19',
        lastCount: 1,
        lastTotal: 3,
        lastPercentage: 33.3,
        percentagePointDifference: null,
      },
      mixed: {
        category: 'mixed',
        previousDate: undefined,
        previousCount: null,
        previousTotal: null,
        previousPercentage: null,
        lastDate: '2026-06-19',
        lastCount: 1,
        lastTotal: 3,
        lastPercentage: 33.3,
        percentagePointDifference: null,
      },
      automation: {
        category: 'automation',
        previousDate: undefined,
        previousCount: null,
        previousTotal: null,
        previousPercentage: null,
        lastDate: '2026-06-19',
        lastCount: 1,
        lastTotal: 3,
        lastPercentage: 33.3,
        percentagePointDifference: null,
      },
    })
  })

  it('returns null values when the source is empty', () => {
    const result = getCategoryDeltas([])

    expect(result).toEqual({
      organic: {
        category: 'organic',
        previousDate: undefined,
        previousCount: null,
        previousTotal: null,
        previousPercentage: null,
        lastDate: undefined,
        lastCount: null,
        lastTotal: null,
        lastPercentage: null,
        percentagePointDifference: null,
      },
      mixed: {
        category: 'mixed',
        previousDate: undefined,
        previousCount: null,
        previousTotal: null,
        previousPercentage: null,
        lastDate: undefined,
        lastCount: null,
        lastTotal: null,
        lastPercentage: null,
        percentagePointDifference: null,
      },
      automation: {
        category: 'automation',
        previousDate: undefined,
        previousCount: null,
        previousTotal: null,
        previousPercentage: null,
        lastDate: undefined,
        lastCount: null,
        lastTotal: null,
        lastPercentage: null,
        percentagePointDifference: null,
      },
    })
  })
})

describe('getClassificationForPreviousDays', () => {
  it('returns aggregated counts and percentage-based trends for the requested day span', () => {
    const result = getClassificationForPreviousDays({
      date: '2026-06-10T18:30:00.000Z',
      days: 3,
      data: [
        createEcosystemHealthItem('2026-06-08T10:00:00.000Z', 90),
        createEcosystemHealthItem('2026-06-08T11:00:00.000Z', 90),
        createEcosystemHealthItem('2026-06-09T10:00:00.000Z', 50),
        createEcosystemHealthItem('2026-06-10T10:00:00.000Z', 10),
        createEcosystemHealthItem('2026-06-10T11:00:00.000Z', 10),
        createEcosystemHealthItem('2026-06-10T12:00:00.000Z', 10),

        createEcosystemHealthItem('2026-06-05T10:00:00.000Z', 90),
        createEcosystemHealthItem('2026-06-06T10:00:00.000Z', 50),
        createEcosystemHealthItem('2026-06-06T11:00:00.000Z', 50),
        createEcosystemHealthItem('2026-06-07T10:00:00.000Z', 10),

        createEcosystemHealthItem('2026-06-04T10:00:00.000Z', 90),
        createEcosystemHealthItem('2026-06-11T10:00:00.000Z', 90),
      ],
    })

    expectClassificationCounts(result, {
      organic: {
        count: 2,
        trend: 33.3,
        percentage: 33.33,
      },
      mixed: {
        count: 1,
        trend: -66.7,
        percentage: 16.67,
      },
      automation: {
        count: 3,
        trend: 100,
        percentage: 50,
      },
      total: {
        count: 6,
        trend: 0,
        percentage: 100,
      },
    })
  })

  it('returns empty counts when the day span is invalid', () => {
    const result = getClassificationForPreviousDays({
      date: '2026-06-10T18:30:00.000Z',
      days: 0,
      data: [createEcosystemHealthItem('2026-06-10T10:00:00.000Z', 90)],
    })

    expectClassificationCounts(result, {
      organic: {
        count: 0,
        trend: 0,
        percentage: 0,
      },
      mixed: {
        count: 0,
        trend: 0,
        percentage: 0,
      },
      automation: {
        count: 0,
        trend: 0,
        percentage: 0,
      },
      total: {
        count: 0,
        trend: 0,
        percentage: 100,
      },
    })
  })

  it('handles missing previous period values when calculating percentage-based trends', () => {
    const result = getClassificationForPreviousDays({
      date: '2026-06-10T18:30:00.000Z',
      days: 2,
      data: [
        createEcosystemHealthItem('2026-06-09T10:00:00.000Z', 90),
        createEcosystemHealthItem('2026-06-10T10:00:00.000Z', 10),
      ],
    })

    expectClassificationCounts(result, {
      organic: {
        count: 1,
        trend: 100,
        percentage: 50,
      },
      mixed: {
        count: 0,
        trend: 0,
        percentage: 0,
      },
      automation: {
        count: 1,
        trend: 100,
        percentage: 50,
      },
      total: {
        count: 2,
        trend: 0,
        percentage: 100,
      },
    })
  })
})

describe('getClassificationByDateChunks', () => {
  it('returns classification chunks grouped by the requested day span', () => {
    const dates = [
      '2026-06-01T10:00:00.000Z',
      '2026-06-02T10:00:00.000Z',
      '2026-06-03T10:00:00.000Z',
      '2026-06-04T10:00:00.000Z',
      '2026-06-05T10:00:00.000Z',
      '2026-06-06T10:00:00.000Z',
      '2026-06-07T10:00:00.000Z',
      '2026-06-08T10:00:00.000Z',
    ]

    const result = getClassificationByDateChunks({
      dates,
      days: 3,
      data: [
        createEcosystemHealthItem('2026-06-01T10:00:00.000Z', 90),
        createEcosystemHealthItem('2026-06-02T10:00:00.000Z', 50),
        createEcosystemHealthItem('2026-06-03T10:00:00.000Z', 10),
        createEcosystemHealthItem('2026-06-04T10:00:00.000Z', 90),
        createEcosystemHealthItem('2026-06-04T11:00:00.000Z', 90),
        createEcosystemHealthItem('2026-06-05T10:00:00.000Z', 50),
        createEcosystemHealthItem('2026-06-06T10:00:00.000Z', 10),
        createEcosystemHealthItem('2026-06-07T10:00:00.000Z', 50),
        createEcosystemHealthItem('2026-06-08T10:00:00.000Z', 10),
      ],
    })

    expect(result).toHaveLength(3)

    expect(result[0].startDate).toBe('2026-06-01')
    expect(result[0].endDate).toBe('2026-06-03')
    expect(result[0].days).toBe(3)
    expectClassificationCounts(result[0].classification, {
      organic: {
        count: 1,
        trend: 100,
        percentage: 33.33,
      },
      mixed: {
        count: 1,
        trend: 100,
        percentage: 33.33,
      },
      automation: {
        count: 1,
        trend: 100,
        percentage: 33.33,
      },
      total: {
        count: 3,
        trend: 0,
        percentage: 100,
      },
    })

    expect(result[1].startDate).toBe('2026-06-04')
    expect(result[1].endDate).toBe('2026-06-06')
    expect(result[1].days).toBe(3)
    expectClassificationCounts(result[1].classification, {
      organic: {
        count: 2,
        trend: 50,
        percentage: 50,
      },
      mixed: {
        count: 1,
        trend: -25,
        percentage: 25,
      },
      automation: {
        count: 1,
        trend: -25,
        percentage: 25,
      },
      total: {
        count: 4,
        trend: 0,
        percentage: 100,
      },
    })

    expect(result[2].startDate).toBe('2026-06-07')
    expect(result[2].endDate).toBe('2026-06-08')
    expect(result[2].days).toBe(2)
    expectClassificationCounts(result[2].classification, {
      organic: {
        count: 0,
        trend: 0,
        percentage: 0,
      },
      mixed: {
        count: 1,
        trend: 0,
        percentage: 50,
      },
      automation: {
        count: 1,
        trend: 0,
        percentage: 50,
      },
      total: {
        count: 2,
        trend: 0,
        percentage: 100,
      },
    })
  })

  it('sorts dates before creating chunks', () => {
    const result = getClassificationByDateChunks({
      days: 2,
      dates: [
        '2026-06-04T10:00:00.000Z',
        '2026-06-01T10:00:00.000Z',
        '2026-06-03T10:00:00.000Z',
        '2026-06-02T10:00:00.000Z',
      ],
      data: [
        createEcosystemHealthItem('2026-06-01T10:00:00.000Z', 90),
        createEcosystemHealthItem('2026-06-02T10:00:00.000Z', 50),
        createEcosystemHealthItem('2026-06-03T10:00:00.000Z', 10),
        createEcosystemHealthItem('2026-06-04T10:00:00.000Z', 90),
      ],
    })

    expect(result.map((chunk) => chunk.startDate)).toEqual([
      '2026-06-01',
      '2026-06-03',
    ])

    expect(result.map((chunk) => chunk.endDate)).toEqual([
      '2026-06-02',
      '2026-06-04',
    ])
  })

  it('keeps calendar chunk boundaries stable when a day is missing', () => {
    const result = getClassificationByDateChunks({
      days: 3,
      dates: [
        '2026-06-01T10:00:00.000Z',
        '2026-06-02T10:00:00.000Z',
        '2026-06-03T10:00:00.000Z',
        // June 4 is intentionally missing.
        '2026-06-05T10:00:00.000Z',
        '2026-06-06T10:00:00.000Z',
      ],
      data: [
        createEcosystemHealthItem('2026-06-01T10:00:00.000Z', 90),
        createEcosystemHealthItem('2026-06-02T10:00:00.000Z', 50),
        createEcosystemHealthItem('2026-06-03T10:00:00.000Z', 10),
        createEcosystemHealthItem('2026-06-05T10:00:00.000Z', 90),
        createEcosystemHealthItem('2026-06-06T10:00:00.000Z', 10),
      ],
    })

    expect(result).toHaveLength(2)

    expect(
      result.map(({ startDate, endDate, days }) => ({
        startDate,
        endDate,
        days,
      })),
    ).toEqual([
      {
        startDate: '2026-06-01',
        endDate: '2026-06-03',
        days: 3,
      },
      {
        startDate: '2026-06-04',
        endDate: '2026-06-06',
        days: 3,
      },
    ])

    expect(result[1].classification.organic.count).toBe(1)
    expect(result[1].classification.mixed.count).toBe(0)
    expect(result[1].classification.automation.count).toBe(1)
    expect(result[1].classification.total.count).toBe(2)
  })

  it('returns an empty array when dates are empty', () => {
    const result = getClassificationByDateChunks({
      dates: [],
      days: 7,
      data: [createEcosystemHealthItem('2026-06-01T10:00:00.000Z', 90)],
    })

    expect(result).toEqual([])
  })

  it('returns an empty array when the day span is invalid', () => {
    const result = getClassificationByDateChunks({
      dates: ['2026-06-01T10:00:00.000Z'],
      days: 0,
      data: [createEcosystemHealthItem('2026-06-01T10:00:00.000Z', 90)],
    })

    expect(result).toEqual([])
  })

  it('keeps a complete calendar week when one dataset day is missing', () => {
    const result = getClassificationByDateChunks({
      days: 7,
      rolling: false,
      dates: [
        '2026-06-08T10:00:00.000Z',
        '2026-06-09T10:00:00.000Z',
        '2026-06-10T10:00:00.000Z',
        // June 11 is intentionally missing.
        '2026-06-12T10:00:00.000Z',
        '2026-06-13T10:00:00.000Z',
        '2026-06-14T10:00:00.000Z',
      ],
      data: [
        createEcosystemHealthItem('2026-06-08T10:00:00.000Z', 90),
        createEcosystemHealthItem('2026-06-09T10:00:00.000Z', 50),
        createEcosystemHealthItem('2026-06-10T10:00:00.000Z', 10),
        createEcosystemHealthItem('2026-06-12T10:00:00.000Z', 90),
        createEcosystemHealthItem('2026-06-13T10:00:00.000Z', 50),
        createEcosystemHealthItem('2026-06-14T10:00:00.000Z', 10),
      ],
    })

    expect(result).toHaveLength(1)
    expect(result[0].startDate).toBe('2026-06-08')
    expect(result[0].endDate).toBe('2026-06-14')
    expect(result[0].days).toBe(7)
    expect(result[0].classification.total.count).toBe(6)
  })

  it('returns only complete Monday to Sunday calendar week chunks when rolling is false', () => {
    const result = getClassificationByDateChunks({
      days: 7,
      rolling: false,
      dates: [
        '2026-06-18T10:00:00.000Z',
        '2026-06-08T10:00:00.000Z',
        '2026-06-22T10:00:00.000Z',
        '2026-06-14T10:00:00.000Z',
        '2026-06-16T10:00:00.000Z',
        '2026-06-09T10:00:00.000Z',
        '2026-06-10T10:00:00.000Z',
        '2026-06-11T10:00:00.000Z',
        '2026-06-12T10:00:00.000Z',
        '2026-06-13T10:00:00.000Z',
        '2026-06-15T10:00:00.000Z',
        '2026-06-17T10:00:00.000Z',
        '2026-06-19T10:00:00.000Z',
        '2026-06-20T10:00:00.000Z',
        '2026-06-21T10:00:00.000Z',
        '2026-06-23T10:00:00.000Z',
      ],
      data: [
        createEcosystemHealthItem('2026-06-08T10:00:00.000Z', 90),
        createEcosystemHealthItem('2026-06-09T10:00:00.000Z', 50),
        createEcosystemHealthItem('2026-06-14T10:00:00.000Z', 10),
        createEcosystemHealthItem('2026-06-15T10:00:00.000Z', 90),
        createEcosystemHealthItem('2026-06-16T10:00:00.000Z', 90),
        createEcosystemHealthItem('2026-06-17T10:00:00.000Z', 50),
        createEcosystemHealthItem('2026-06-18T10:00:00.000Z', 10),
        createEcosystemHealthItem('2026-06-21T10:00:00.000Z', 10),
        createEcosystemHealthItem('2026-06-22T10:00:00.000Z', 50),
        createEcosystemHealthItem('2026-06-23T10:00:00.000Z', 10),
      ],
    })

    expect(result).toHaveLength(2)

    expect(result[0].startDate).toBe('2026-06-08')
    expect(result[0].endDate).toBe('2026-06-14')
    expect(result[0].days).toBe(7)
    expectClassificationCounts(result[0].classification, {
      organic: {
        count: 1,
        trend: 100,
        percentage: 33.33,
      },
      mixed: {
        count: 1,
        trend: 100,
        percentage: 33.33,
      },
      automation: {
        count: 1,
        trend: 100,
        percentage: 33.33,
      },
      total: {
        count: 3,
        trend: 0,
        percentage: 100,
      },
    })

    expect(result[1].startDate).toBe('2026-06-15')
    expect(result[1].endDate).toBe('2026-06-21')
    expect(result[1].days).toBe(7)
    expectClassificationCounts(result[1].classification, {
      organic: {
        count: 2,
        trend: 20,
        percentage: 40,
      },
      mixed: {
        count: 1,
        trend: -40,
        percentage: 20,
      },
      automation: {
        count: 2,
        trend: 20,
        percentage: 40,
      },
      total: {
        count: 5,
        trend: 0,
        percentage: 100,
      },
    })
  })
})

describe('getWeeklyClassification', () => {
  const rollingWindowData = [
    createEcosystemHealthItem('2026-06-05T10:00:00.000Z', 90),
    createEcosystemHealthItem('2026-06-06T10:00:00.000Z', 50),
    createEcosystemHealthItem('2026-06-07T10:00:00.000Z', 50),
    createEcosystemHealthItem('2026-06-08T10:00:00.000Z', 10),
    createEcosystemHealthItem('2026-06-12T10:00:00.000Z', 90),
    createEcosystemHealthItem('2026-06-13T10:00:00.000Z', 90),
    createEcosystemHealthItem('2026-06-14T10:00:00.000Z', 50),
    createEcosystemHealthItem('2026-06-15T10:00:00.000Z', 10),
    createEcosystemHealthItem('2026-06-16T10:00:00.000Z', 10),
    createEcosystemHealthItem('2026-06-18T10:00:00.000Z', 10),
    createEcosystemHealthItem('2026-06-19T10:00:00.000Z', 90),
  ]

  it('uses a rolling 7 day window by default', () => {
    const result = getWeeklyClassification(
      rollingWindowData,
      '2026-06-18T18:30:00.000Z',
    )

    expectClassificationCounts(result, {
      organic: {
        count: 2,
        trend: 33.3,
        percentage: 33.33,
      },
      mixed: {
        count: 1,
        trend: -66.7,
        percentage: 16.67,
      },
      automation: {
        count: 3,
        trend: 100,
        percentage: 50,
      },
      total: {
        count: 6,
        trend: 0,
        percentage: 100,
      },
    })
  })

  it('uses a rolling 7 day window when rolling is true', () => {
    const result = getWeeklyClassification(
      rollingWindowData,
      '2026-06-18T18:30:00.000Z',
      true,
    )

    expectClassificationCounts(result, {
      organic: {
        count: 2,
        trend: 33.3,
        percentage: 33.33,
      },
      mixed: {
        count: 1,
        trend: -66.7,
        percentage: 16.67,
      },
      automation: {
        count: 3,
        trend: 100,
        percentage: 50,
      },
      total: {
        count: 6,
        trend: 0,
        percentage: 100,
      },
    })
  })

  it('uses full Monday to Sunday weeks when rolling is false', () => {
    const result = getWeeklyClassification(
      [
        createEcosystemHealthItem('2026-06-08T10:00:00.000Z', 90),
        createEcosystemHealthItem('2026-06-09T10:00:00.000Z', 50),
        createEcosystemHealthItem('2026-06-10T10:00:00.000Z', 50),
        createEcosystemHealthItem('2026-06-14T10:00:00.000Z', 10),
        createEcosystemHealthItem('2026-06-15T10:00:00.000Z', 90),
        createEcosystemHealthItem('2026-06-16T10:00:00.000Z', 90),
        createEcosystemHealthItem('2026-06-17T10:00:00.000Z', 50),
        createEcosystemHealthItem('2026-06-18T10:00:00.000Z', 10),
        createEcosystemHealthItem('2026-06-21T10:00:00.000Z', 10),
        createEcosystemHealthItem('2026-06-07T10:00:00.000Z', 90),
        createEcosystemHealthItem('2026-06-22T10:00:00.000Z', 90),
      ],
      '2026-06-18T18:30:00.000Z',
      false,
    )

    expectClassificationCounts(result, {
      organic: {
        count: 2,
        trend: 60,
        percentage: 40,
      },
      mixed: {
        count: 1,
        trend: -60,
        percentage: 20,
      },
      automation: {
        count: 2,
        trend: 60,
        percentage: 40,
      },
      total: {
        count: 5,
        trend: 0,
        percentage: 100,
      },
    })
  })
})

describe('fillEmptyHourlyBuckets', () => {
  it('returns an empty result when there is nothing to fill', () => {
    expect(fillEmptyHourlyBuckets({ countsByHour: {} })).toEqual({})
  })

  it('reinstates hours that recorded no entry as empty buckets', () => {
    const countsByHour = getClassificationStatsByScanTime([
      createEcosystemHealthItem('2026-08-08T05:00:00.000Z', 90),
      createEcosystemHealthItem('2026-08-08T08:00:00.000Z', 10),
    ])

    const result = fillEmptyHourlyBuckets({ countsByHour })

    expect(Object.keys(result).sort()).toEqual([
      '2026-08-08T05:00:00.000Z',
      '2026-08-08T06:00:00.000Z',
      '2026-08-08T07:00:00.000Z',
      '2026-08-08T08:00:00.000Z',
    ])

    // Zeroed because there was nothing to classify, not because of a score.
    expectClassificationCounts(result['2026-08-08T06:00:00.000Z']!, {
      organic: { count: 0, trend: 0, percentage: 0 },
      mixed: { count: 0, trend: 0, percentage: 0 },
      automation: { count: 0, trend: 0, percentage: 0 },
      total: { count: 0, trend: 0, percentage: 0 },
    })
  })

  it('keeps the recorded buckets untouched', () => {
    const countsByHour = getClassificationStatsByScanTime([
      createEcosystemHealthItem('2026-08-08T05:00:00.000Z', 90),
      createEcosystemHealthItem('2026-08-08T07:00:00.000Z', 10),
    ])

    const result = fillEmptyHourlyBuckets({ countsByHour })

    expectClassificationCounts(result['2026-08-08T07:00:00.000Z']!, {
      organic: { count: 0, trend: 0, percentage: 0 },
      mixed: { count: 0, trend: 0, percentage: 0 },
      automation: { count: 1, trend: 0, percentage: 100 },
      total: { count: 1, trend: 0, percentage: 100 },
    })
  })

  it('caps the timeline to maxHours counted back from the latest bucket', () => {
    const countsByHour = getClassificationStatsByScanTime([
      createEcosystemHealthItem('2026-08-08T01:00:00.000Z', 90),
      createEcosystemHealthItem('2026-08-08T05:00:00.000Z', 90),
    ])

    const result = fillEmptyHourlyBuckets({ countsByHour, maxHours: 3 })

    expect(Object.keys(result).sort()).toEqual([
      '2026-08-08T03:00:00.000Z',
      '2026-08-08T04:00:00.000Z',
      '2026-08-08T05:00:00.000Z',
    ])
  })

  it('keeps one bucket per clock hour when scan times drift off the hour', () => {
    const countsByHour = getClassificationStatsByScanTime([
      createEcosystemHealthItem('2026-08-08T05:00:12.000Z', 90),
      createEcosystemHealthItem('2026-08-08T06:14:47.000Z', 10),
      createEcosystemHealthItem('2026-08-08T06:41:03.000Z', 10),
      createEcosystemHealthItem('2026-08-08T08:03:29.000Z', 50),
    ])

    const result = fillEmptyHourlyBuckets({ countsByHour })

    expect(Object.keys(result).sort()).toEqual([
      '2026-08-08T05:00:00.000Z',
      '2026-08-08T06:00:00.000Z',
      '2026-08-08T07:00:00.000Z',
      '2026-08-08T08:00:00.000Z',
    ])

    // Both 06:xx scans belong to the same clock hour, so their counts add up
    // instead of splitting into two buckets.
    expectClassificationCounts(result['2026-08-08T06:00:00.000Z']!, {
      organic: { count: 0, trend: 0, percentage: 0 },
      mixed: { count: 0, trend: 0, percentage: 0 },
      automation: { count: 2, trend: 0, percentage: 100 },
      total: { count: 2, trend: 0, percentage: 100 },
    })

    expect(result['2026-08-08T06:00:00.000Z']!.createdAt).toBe(
      '2026-08-08T06:14:47.000Z',
    )

    // The hour with no scan at all is still an empty placeholder.
    expectClassificationCounts(result['2026-08-08T07:00:00.000Z']!, {
      organic: { count: 0, trend: 0, percentage: 0 },
      mixed: { count: 0, trend: 0, percentage: 0 },
      automation: { count: 0, trend: 0, percentage: 0 },
      total: { count: 0, trend: 0, percentage: 0 },
    })
  })
})
