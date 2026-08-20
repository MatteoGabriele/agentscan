import { describe, expect, it } from 'vitest'
import type { EcosystemHealthItem } from '../types/ecosystem-health'
import {
  classifyByScore,
  formatTrend,
  getHealthStats,
  formatProgressionPoints,
  INSUFFICIENT_DATA_SCORE,
} from './health-stats'
import { MOCK_ECOSYSTEM_HEALTH_ITEMS } from '../../test/unit/mocks/ecosystem-health-items'

describe('formatTrend', () => {
  it('formats a ratio to a signed and rounded percentage string', () => {
    expect(formatTrend(-1.5)).toEqual('-150%')
    expect(formatTrend(-1)).toEqual('-100%')
    expect(formatTrend(-0.5)).toEqual('-50%')
    expect(formatTrend(-0.33)).toEqual('-33%')
    expect(formatTrend(-0.339)).toEqual('-33.9%')
    expect(formatTrend(-0.333)).toEqual('-33.3%')
    expect(formatTrend(0)).toEqual('0%')
    expect(formatTrend(0.333)).toEqual('+33.3%')
    expect(formatTrend(0.339)).toEqual('+33.9%')
    expect(formatTrend(0.33)).toEqual('+33%')
    expect(formatTrend(0.5)).toEqual('+50%')
    expect(formatTrend(1)).toEqual('+100%')
    expect(formatTrend(1.5)).toEqual('+150%')
  })
})

describe('classifyByScore', () => {
  it('classifies the sentinel score as insufficient-data', () => {
    expect(classifyByScore(INSUFFICIENT_DATA_SCORE)).toBe('insufficient-data')
    expect(classifyByScore(0)).toBe('automation')
    expect(classifyByScore(100)).toBe('organic')
  })
})

describe('getHealthStats', () => {
  it('returns a classified dataset from ecosystem data', () => {
    const result = getHealthStats(MOCK_ECOSYSTEM_HEALTH_ITEMS)
    expect(result).not.toBeNull()
    Object.values(result!).forEach((value) => {
      expect(value).toEqual(
        expect.objectContaining({
          count: expect.any(Number),
          percentage: expect.any(String),
        }),
      )
    })
  })

  it('excludes insufficient-data entries from counts and percentages', () => {
    const items = [
      { score: 100 },
      { score: 0 },
      { score: INSUFFICIENT_DATA_SCORE },
    ] as EcosystemHealthItem[]

    const result = getHealthStats(items)

    expect(result!.organic).toEqual({ count: 1, percentage: '50.0' })
    expect(result!.automation).toEqual({ count: 1, percentage: '50.0' })
    expect(result!.mixed).toEqual({ count: 0, percentage: '0.0' })
  })

  it('returns null when every entry is insufficient-data', () => {
    const items = [
      { score: INSUFFICIENT_DATA_SCORE },
      { score: INSUFFICIENT_DATA_SCORE },
    ] as EcosystemHealthItem[]

    expect(getHealthStats(items)).toBeNull()
  })
})

describe('formatProgressionPoints', () => {
  it('formats a value into a signed string with a suffix', () => {
    expect(formatProgressionPoints(0)).toBe('0pts')
    expect(formatProgressionPoints(-1)).toBe('-1pt')
    expect(formatProgressionPoints(1)).toBe('+1pt')
    expect(formatProgressionPoints(-1.49)).toBe('-1.5pts')
    expect(formatProgressionPoints(1.49)).toBe('+1.5pts')
    expect(formatProgressionPoints(1.99)).toBe('+2pts')
    expect(formatProgressionPoints(-1.99)).toBe('-2pts')
  })
})
