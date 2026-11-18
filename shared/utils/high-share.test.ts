import { describe, expect, it } from 'vitest'
import {
  applyClassificationPercentages,
  createEmptyClassificationStats,
  type ClassificationStats,
} from './count-classification-by-date'
import { findHighShares, formatHighShare } from './high-share'

function createStats(
  organic: number,
  mixed: number,
  automation: number,
): ClassificationStats {
  const stats = createEmptyClassificationStats()
  stats.organic.count = organic
  stats.mixed.count = mixed
  stats.automation.count = automation
  return applyClassificationPercentages(stats)
}

const ceilings = { automation: 30, mixed: 10 }

describe('findHighShares', () => {
  it('flags shares at or above their ceiling', () => {
    expect(findHighShares(createStats(60, 10, 30), ceilings)).toEqual([
      { category: 'automation', share: 30, ceiling: 30 },
      { category: 'mixed', share: 10, ceiling: 10 },
    ])
  })

  it('ignores shares below their ceiling', () => {
    expect(findHighShares(createStats(71, 9, 20), ceilings)).toEqual([])
  })

  it('never flags a category without a ceiling', () => {
    expect(
      findHighShares(createStats(60, 10, 30), { ...ceilings, mixed: null }),
    ).toEqual([{ category: 'automation', share: 30, ceiling: 30 }])
  })
})

describe('formatHighShare', () => {
  it('describes the share against its ceiling', () => {
    expect(
      formatHighShare({ category: 'automation', share: 40.39, ceiling: 36 }),
    ).toBe('Automation share above 36%: 40.4%')
  })
})
