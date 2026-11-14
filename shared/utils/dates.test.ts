import { describe, expect, it } from 'vitest'
import { formatDateRange, getCompleteDayRange, getDayKey } from './dates'

describe('formatDateRange', () => {
  it('formats a date range with YYYY-MM-DD inputs', () => {
    expect(
      formatDateRange({
        startDate: '2026-05-26',
        endDate: '2026-05-29',
      }),
    ).toBe('26 May - 29 May 2026')
  })

  it('formats a date range with ISO date-time inputs', () => {
    expect(
      formatDateRange({
        startDate: '2026-05-26T00:00:00.000Z',
        endDate: '2026-05-29T00:00:00.000Z',
      }),
    ).toBe('26 May - 29 May 2026')
  })

  it('can include the year on the start date', () => {
    expect(
      formatDateRange({
        startDate: '2026-05-26',
        endDate: '2026-05-29',
        startYear: true,
      }),
    ).toBe('26 May 2026 - 29 May 2026')
  })

  it('can hide the year on the end date', () => {
    expect(
      formatDateRange({
        startDate: '2026-05-26',
        endDate: '2026-05-29',
        endYear: false,
      }),
    ).toBe('26 May - 29 May')
  })

  it('can include the year on both dates', () => {
    expect(
      formatDateRange({
        startDate: '2026-05-26',
        endDate: '2026-05-29',
        startYear: true,
        endYear: true,
      }),
    ).toBe('26 May 2026 - 29 May 2026')
  })

  it('can hide the year on both dates', () => {
    expect(
      formatDateRange({
        startDate: '2026-05-26',
        endDate: '2026-05-29',
        startYear: false,
        endYear: false,
      }),
    ).toBe('26 May - 29 May')
  })

  it('uses the provided locale', () => {
    expect(
      formatDateRange({
        startDate: '2026-05-26',
        endDate: '2026-05-29',
        locale: 'en-US',
      }),
    ).toBe('May 26 - May 29, 2026')
  })

  it('returns an empty string when the start date is missing', () => {
    expect(
      formatDateRange({
        startDate: undefined,
        endDate: '2026-05-29',
      }),
    ).toBe('')
  })

  it('returns an empty string when the end date is missing', () => {
    expect(
      formatDateRange({
        startDate: '2026-05-26',
        endDate: undefined,
      }),
    ).toBe('')
  })

  it('returns an empty string when both dates are missing', () => {
    expect(
      formatDateRange({
        startDate: undefined,
        endDate: undefined,
      }),
    ).toBe('')
  })

  it('returns an empty string when the start date is invalid', () => {
    expect(
      formatDateRange({
        startDate: 'invalid-date',
        endDate: '2026-05-29',
      }),
    ).toBe('')
  })

  it('returns an empty string when the end date is invalid', () => {
    expect(
      formatDateRange({
        startDate: '2026-05-26',
        endDate: '2026-13-45',
      }),
    ).toBe('')
  })
})

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
