import { describe, expect, it } from 'vitest'
import { getCompleteDayRange, getDayKey } from './charts'

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
