import { describe, expect, it } from 'vitest'
import {
  getCompleteDayRange,
  getDayKey,
  convertToHorizontalBarDataset,
  getClosedPrPercentageByRepo,
  getUniqueDatesFromSource,
  getClosedPrPercentageEvolutionByRepo,
  getClosedPrPercentageEvolutionTotal,
  getClosedPrPercentageTotal,
  getClosedPrDelta,
  createLastDatapointLabelsSvg,
} from '../../../../shared/utils/charts'
import {
  EXPECTED_NB_UNIQUE_REPOS,
  MOCK_ECOSYSTEM_HEALTH_ITEMS,
} from '../../mocks/ecosystemHealthItems'
import type { EcosystemHealthItem } from '../../../../shared/types/ecosystem-health'

describe('getCompleteDayRange', () => {
  it('returns an empty array for an empty array in input', () => {
    expect(getCompleteDayRange([])).toStrictEqual([])
  })

  it('fills in missing days between two dates (YYYY-MM-DD)', () => {
    const startDate = '2050-01-01'
    const endDate = '2050-01-05'
    expect(getCompleteDayRange([startDate, endDate])).toStrictEqual([
      '2050-01-01',
      '2050-01-02',
      '2050-01-03',
      '2050-01-04',
      '2050-01-05',
    ])
  })
})

describe('getDayKey', () => {
  it('converts a timestamp to YYYY-MM-DD format', () => {
    const date = '2050-01-01T04:51:35.330Z'
    expect(getDayKey(date)).toBe('2050-01-01')
  })
})

describe('convertToHorizontalBarDataset', () => {
  it('creates a dataset for the complete ecosystem data source', () => {
    expect(
      convertToHorizontalBarDataset(MOCK_ECOSYSTEM_HEALTH_ITEMS),
    ).toHaveLength(EXPECTED_NB_UNIQUE_REPOS)
  })

  it('creates a filtered dataset for a given date', () => {
    expect(
      convertToHorizontalBarDataset(MOCK_ECOSYSTEM_HEALTH_ITEMS, '2026-05-25'),
    ).toHaveLength(1)
  })

  it('creates a dataset for VueUiHorizontalBar', () => {
    const result = convertToHorizontalBarDataset(MOCK_ECOSYSTEM_HEALTH_ITEMS)

    result.forEach((item) => {
      expect(item).toEqual(
        expect.objectContaining({
          name: expect.any(String),
          value: expect.any(Number),
        }),
      )
    })
  })
})

describe('getClosedPrPercentageByRepo', () => {
  it('maps ecosystem source data to a list of unique repos with eligible and closed PRs and a global health percentage', () => {
    const result = getClosedPrPercentageByRepo(MOCK_ECOSYSTEM_HEALTH_ITEMS, {})

    expect(result).toHaveLength(EXPECTED_NB_UNIQUE_REPOS)

    expect(result).toEqual(
      expect.arrayContaining(
        result.map(() =>
          expect.objectContaining({
            repo: expect.any(String),
            eligiblePrs: expect.any(Number),
            closedPrs: expect.any(Number),
            percentage: expect.any(Number),
          }),
        ),
      ),
    )

    expect(result).toEqual(expect.any(Array))

    result.forEach((item) => {
      expect(item).toEqual(
        expect.objectContaining({
          repo: expect.any(String),
          eligiblePrs: expect.any(Number),
          closedPrs: expect.any(Number),
          percentage: expect.any(Number),
        }),
      )
    })
  })

  it('maps the source data for a given score range', () => {
    const result = getClosedPrPercentageByRepo(MOCK_ECOSYSTEM_HEALTH_ITEMS, {
      scoreBounds: [0, 50],
    })

    // All eligible PRs are closed = 100% closure rate
    expect(result[0]).toEqual(
      expect.objectContaining({
        repo: expect.any(String),
        eligiblePrs: 1,
        closedPrs: 1,
        percentage: 100,
      }),
    )

    // No eligible PRs are closed = 0% closure rate
    expect(result[1]).toEqual(
      expect.objectContaining({
        repo: expect.any(String),
        eligiblePrs: 1,
        closedPrs: 0,
        percentage: 0,
      }),
    )

    // No eligible PRs = 100% closure rate
    expect(result[2]).toEqual(
      expect.objectContaining({
        repo: expect.any(String),
        eligiblePrs: 0,
        closedPrs: 0,
        percentage: 100,
      }),
    )
  })
})

describe('getUniqueDatesFromSource', () => {
  it('returns a sorted array of unique dates from the ecosystem source data', () => {
    const result = getUniqueDatesFromSource(MOCK_ECOSYSTEM_HEALTH_ITEMS)
    expect(result).toHaveLength(2)
    expect(result).toStrictEqual(['2026-05-25', '2026-05-26'])
  })
})

describe('getClosedPrPercentageEvolutionByRepo', () => {
  it('generates a dataset for VueUiXy to graph PR closure rate for a given score range', () => {
    const result = getClosedPrPercentageEvolutionByRepo(
      MOCK_ECOSYSTEM_HEALTH_ITEMS,
    )

    expect(result).toHaveLength(EXPECTED_NB_UNIQUE_REPOS)
    const flatResult = result.flat()
    expect(flatResult).toHaveLength(EXPECTED_NB_UNIQUE_REPOS)

    flatResult.forEach((item) => {
      expect(item).toEqual(
        expect.objectContaining({
          name: expect.any(String),
          series: expect.any(Array),
          type: 'line',
          smooth: true,
          hasData: expect.any(Boolean),
          details: expect.objectContaining({
            eligiblePrs: expect.any(Array),
            closedPrs: expect.any(Array),
          }),
        }),
      )

      expect(item.series.every((value) => typeof value === 'number')).toBe(true)
      expect(
        item.details.eligiblePrs.every(
          (value: unknown) => typeof value === 'number',
        ),
      ).toBe(true)
      expect(
        item.details.closedPrs.every(
          (value: unknown) => typeof value === 'number',
        ),
      ).toBe(true)
    })
  })
})

describe('getClosedPrPercentageEvolutionTotal', () => {
  it('generates a VueUiXyDatasetItem for closed PR percentage', () => {
    const result = getClosedPrPercentageEvolutionTotal(
      MOCK_ECOSYSTEM_HEALTH_ITEMS,
    )
    expect(result).toEqual(
      expect.objectContaining({
        name: 'Automation PR closure rate',
        series: [0, 40],
        type: 'line',
        smooth: true,
      }),
    )
  })
})

describe('getClosedPrPercentageTotal', () => {
  it('returns the total percentage of closed PRs', () => {
    const result = getClosedPrPercentageTotal(MOCK_ECOSYSTEM_HEALTH_ITEMS)
    expect(result).toEqual(40)
  })
})

describe('getClosedPrDelta', () => {
  const previousDate = '2026-05-25T10:00:00.000Z'
  const lastDate = '2026-05-26T10:00:00.000Z'

  function createEcosystemHealthItem(
    created_at: string,
    repo_name: string,
    pr_key: string,
    pr_status: 'open' | 'closed',
    score: number,
  ): EcosystemHealthItem {
    return {
      created_at,
      repo_name,
      pr_key,
      pr_status,
      score,
    } as EcosystemHealthItem
  }

  it('returns closed PR percentage snapshots for the previous and last dates', () => {
    const result = getClosedPrDelta([
      createEcosystemHealthItem(lastDate, 'some/repo', 'pr-1', 'closed', 25),
      createEcosystemHealthItem(
        lastDate,
        'someother/repo',
        'pr-2',
        'closed',
        25,
      ),
      createEcosystemHealthItem(
        previousDate,
        'some/repo',
        'pr-1',
        'closed',
        25,
      ),
      createEcosystemHealthItem(
        previousDate,
        'someother/repo',
        'pr-2',
        'open',
        25,
      ),
    ])

    expect(result).toEqual({
      previousSnapshot: expect.objectContaining({
        date: expect.any(String),
        eligiblePrs: expect.any(Number),
        closedPrs: expect.any(Number),
        percentage: expect.any(Number),
      }),
      lastSnapshot: expect.objectContaining({
        date: expect.any(String),
        eligiblePrs: expect.any(Number),
        closedPrs: expect.any(Number),
        percentage: expect.any(Number),
      }),
      percentagePointDifference: expect.any(Number),
    })
  })

  it('calculates accurate closed PR percentages and point difference', () => {
    const result = getClosedPrDelta([
      createEcosystemHealthItem(lastDate, 'some/repo', 'pr-1', 'closed', 25),
      createEcosystemHealthItem(
        lastDate,
        'someother/repo',
        'pr-2',
        'closed',
        25,
      ),
      createEcosystemHealthItem(
        previousDate,
        'some/repo',
        'pr-1',
        'closed',
        25,
      ),
      createEcosystemHealthItem(
        previousDate,
        'someother/repo',
        'pr-2',
        'open',
        25,
      ),
    ])

    expect(result.previousSnapshot).toEqual({
      date: '2026-05-25',
      eligiblePrs: 2,
      closedPrs: 1,
      percentage: 50,
    })

    expect(result.lastSnapshot).toEqual({
      date: '2026-05-26',
      eligiblePrs: 2,
      closedPrs: 2,
      percentage: 100,
    })

    expect(result.percentagePointDifference).toBe(50)
  })

  it('returns null previous values when there is only one date', () => {
    const result = getClosedPrDelta([
      createEcosystemHealthItem(lastDate, 'some/repo', 'pr-1', 'closed', 25),
      createEcosystemHealthItem(lastDate, 'someother/repo', 'pr-2', 'open', 25),
    ])

    expect(result.previousSnapshot).toEqual({
      date: undefined,
      eligiblePrs: null,
      closedPrs: null,
      percentage: null,
    })

    expect(result.lastSnapshot).toEqual({
      date: '2026-05-26',
      eligiblePrs: 2,
      closedPrs: 1,
      percentage: 50,
    })

    expect(result.percentagePointDifference).toBeNull()
  })

  it('returns null snapshots when the source is empty', () => {
    const result = getClosedPrDelta([])

    expect(result).toEqual({
      previousSnapshot: {
        date: undefined,
        eligiblePrs: null,
        closedPrs: null,
        percentage: null,
      },
      lastSnapshot: {
        date: undefined,
        eligiblePrs: null,
        closedPrs: null,
        percentage: null,
      },
      percentagePointDifference: null,
    })
  })
})

const colors = {
  foreground: '#000000',
  background: '#FFFFFF',
  fallbackSerieColor: '#999999',
}

describe('createLastDatapointLabelsSvg', () => {
  it('returns an empty string when there are no series', () => {
    const result = createLastDatapointLabelsSvg({
      series: [],
      drawingArea: { top: 10, height: 100 },
      colors,
      formatValue: (value) => String(value),
      isDarkMode: false,
    })

    expect(result).toBe('')
  })

  it('returns an empty string when no serie has plots', () => {
    const result = createLastDatapointLabelsSvg({
      series: [{ color: '#FF0000' }, { color: '#00FF00', plots: [] }],
      drawingArea: { top: 10, height: 100 },
      colors,
      formatValue: (value) => String(value),
      isDarkMode: false,
    })

    expect(result).toBe('')
  })

  it('renders regular labels when there is no collision', () => {
    const result = createLastDatapointLabelsSvg({
      series: [
        { color: '#FF0000', plots: [{ x: 100, y: 20, value: 10 }] },
        { color: '#00FF00', plots: [{ x: 100, y: 90, value: 20 }] },
      ],
      drawingArea: { top: 0, height: 120 },
      colors,
      formatValue: (value) => `${value}`,
      isDarkMode: false,
    })

    expect(result).toContain('<text')
    expect(result).not.toContain('<path')
    expect(result).toContain('x="124"')
    expect(result).toContain('y="20"')
    expect(result).toContain('y="90"')
    expect(result).toContain('10')
    expect(result).toContain('20')
  })

  it('uses custom font size, label offset, and colors in regular labels', () => {
    const result = createLastDatapointLabelsSvg({
      series: [{ plots: [{ x: 10, y: 20, value: 42 }] }],
      drawingArea: { top: 0, height: 100 },
      colors,
      formatValue: (value) => `${value}`,
      isDarkMode: false,
      fontSize: 12,
      labelOffset: 10,
    })

    expect(result).toContain('x="20"')
    expect(result).toContain('font-size="12"')
    expect(result).toContain('fill="#000000"')
    expect(result).toContain('stroke="#FFFFFF"')
  })

  it('uses only the last plot of each serie', () => {
    const formatValue = vi.fn((value: number) => `${value}`)

    const result = createLastDatapointLabelsSvg({
      series: [
        {
          color: '#FF0000',
          plots: [
            { x: 10, y: 10, value: 1 },
            { x: 50, y: 50, value: 99 },
          ],
        },
      ],
      drawingArea: { top: 0, height: 100 },
      colors,
      formatValue,
      isDarkMode: false,
    })

    expect(formatValue).toHaveBeenCalledTimes(1)
    expect(formatValue).toHaveBeenCalledWith(99)
    expect(result).toContain('x="74"')
    expect(result).toContain('y="50"')
    expect(result).not.toContain('x="34"')
  })

  it('formats safe numeric values and falls back to zero for invalid values', () => {
    const formatValue = vi.fn((value: number) => `value:${value}`)

    const result = createLastDatapointLabelsSvg({
      series: [{ plots: [{ x: 10, y: 20, value: Number.NaN }] }],
      drawingArea: { top: 0, height: 100 },
      colors,
      formatValue,
      isDarkMode: false,
    })

    expect(formatValue).toHaveBeenCalledWith(0)
    expect(result).toContain('value:0')
  })

  it('renders collision labels as a compact non-overlapping label rack', () => {
    const result = createLastDatapointLabelsSvg({
      series: [
        { color: '#FF0000', plots: [{ x: 100, y: 50, value: 10 }] },
        { color: '#00FF00', plots: [{ x: 100, y: 55, value: 30 }] },
        { color: '#0000FF', plots: [{ x: 100, y: 60, value: 20 }] },
      ],
      drawingArea: { top: 10, height: 120 },
      colors,
      formatValue: (value) => `value-${value}`,
      isDarkMode: false,
    })

    expect(result).toContain('<path')
    expect(result).toContain('opacity="1"')
    expect(result).toContain('stroke="#00FF00"')
    expect(result).toContain('stroke="#0000FF"')
    expect(result).toContain('stroke="#FF0000"')
    expect(result.indexOf('value-10')).toBeLessThan(result.indexOf('value-30'))
    expect(result.indexOf('value-30')).toBeLessThan(result.indexOf('value-20'))
    expect(result).toContain('y="50"')
    expect(result).toContain('y="80"')
    expect(result).toContain('y="110"')
  })

  it('uses drawingArea.bottom when height is not provided', () => {
    const result = createLastDatapointLabelsSvg({
      series: [
        { color: '#FF0000', plots: [{ x: 100, y: 50, value: 10 }] },
        { color: '#00FF00', plots: [{ x: 100, y: 55, value: 20 }] },
      ],
      drawingArea: { top: 20, bottom: 120 },
      colors,
      formatValue: (value) => `${value}`,
      isDarkMode: false,
    })

    expect(result).toContain('y="50"')
    expect(result).toContain('y="80"')
  })

  it('keeps colliding labels close to their related points without overlapping', () => {
    const result = createLastDatapointLabelsSvg({
      series: [
        { color: '#FF0000', plots: [{ x: 100, y: 40, value: 10 }] },
        { color: '#00FF00', plots: [{ x: 100, y: 45, value: 20 }] },
        { color: '#0000FF', plots: [{ x: 100, y: 95, value: 30 }] },
      ],
      drawingArea: { top: 0, height: 120 },
      colors,
      formatValue: (value) => `${value}`,
      isDarkMode: false,
    })

    expect(result).toContain('y="40"')
    expect(result).toContain('y="70"')
    expect(result).toContain('y="100"')
  })

  it('shifts the label stack upward when it overflows the drawing area bottom', () => {
    const result = createLastDatapointLabelsSvg({
      series: [
        { color: '#FF0000', plots: [{ x: 100, y: 80, value: 10 }] },
        { color: '#00FF00', plots: [{ x: 100, y: 85, value: 20 }] },
        { color: '#0000FF', plots: [{ x: 100, y: 90, value: 30 }] },
      ],
      drawingArea: { top: 0, height: 120 },
      colors,
      formatValue: (value) => `${value}`,
      isDarkMode: false,
    })

    expect(result).toContain('y="45"')
    expect(result).toContain('y="75"')
    expect(result).toContain('y="105"')
  })

  it('uses dark-mode opacity in collision mode', () => {
    const result = createLastDatapointLabelsSvg({
      series: [
        { color: '#FF0000', plots: [{ x: 100, y: 50, value: 10 }] },
        { color: '#00FF00', plots: [{ x: 100, y: 50, value: 20 }] },
      ],
      drawingArea: { top: 0, height: 100 },
      colors,
      formatValue: (value) => `${value}`,
      isDarkMode: true,
    })

    expect(result).toContain('opacity="0.7"')
  })

  it('uses the fallback serie color when no color is provided', () => {
    const result = createLastDatapointLabelsSvg({
      series: [
        { plots: [{ x: 100, y: 50, value: 10 }] },
        { plots: [{ x: 100, y: 50, value: 20 }] },
      ],
      drawingArea: { top: 0, height: 100 },
      colors,
      formatValue: (value) => `${value}`,
      isDarkMode: false,
    })

    expect(result).toContain('stroke="#999999"')
  })

  it('supports null plot values from SSR slot data', () => {
    const result = createLastDatapointLabelsSvg({
      series: [{ plots: [{ x: 10, y: 20, value: null }] }],
      drawingArea: { top: 0, height: 100 },
      colors,
      formatValue: (value) => `formatted:${value}`,
      isDarkMode: false,
    })

    expect(result).toContain('formatted:0')
  })

  it('uses zero defaults when plot coordinates are nullish', () => {
    const result = createLastDatapointLabelsSvg({
      series: [{ plots: [{ x: null, y: null, value: undefined }] }],
      drawingArea: { top: 0, height: 100 },
      colors,
      formatValue: (value) => `value-${value}`,
      isDarkMode: false,
    })

    expect(result).toContain('x="24"')
    expect(result).toContain('y="0"')
    expect(result).toContain('value-0')
  })

  it('uses zero drawing area height when neither height nor bottom is provided', () => {
    const result = createLastDatapointLabelsSvg({
      series: [
        { color: '#FF0000', plots: [{ x: 100, y: 50, value: 10 }] },
        { color: '#00FF00', plots: [{ x: 100, y: 50, value: 20 }] },
      ],
      drawingArea: { top: 20 },
      colors,
      formatValue: (value) => `${value}`,
      isDarkMode: false,
    })

    expect(result).toContain('y="-45"')
    expect(result).toContain('y="-15"')
  })

  it('renders a regular label when serie color is omitted', () => {
    const result = createLastDatapointLabelsSvg({
      series: [{ plots: [{ x: 100, y: 50, value: 10 }] }],
      drawingArea: { top: 0, height: 100 },
      colors,
      formatValue: (value) => `${value}`,
      isDarkMode: false,
    })

    expect(result).toContain('<text')
    expect(result).not.toContain('<path')
    expect(result).toContain('x="124"')
    expect(result).toContain('10')
  })

  it('supports custom labelHeight in collision rack mode', () => {
    const result = createLastDatapointLabelsSvg({
      series: [
        { color: '#FF0000', plots: [{ x: 100, y: 50, value: 10 }] },
        { color: '#00FF00', plots: [{ x: 100, y: 50, value: 20 }] },
      ],
      drawingArea: { top: 10, height: 110 },
      colors,
      formatValue: (value) => `${value}`,
      isDarkMode: false,
      labelHeight: 20,
    })

    expect(result).toContain('y="50"')
    expect(result).toContain('y="70"')
  })
})
