import { describe, expect, it } from 'vitest'
import {
  formatDateRange,
  roundToClosestHour,
} from '../../../../shared/utils/dates'

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

describe('roundToClosestHour', () => {
  it.each([
    {
      timestamp: '2026-08-05T06:00:00.000Z',
      expected: '2026-08-05T06:00:00.000Z',
    },
    {
      timestamp: '2026-08-05T06:01:14.000Z',
      expected: '2026-08-05T06:00:00.000Z',
    },
    {
      timestamp: '2026-08-05T06:29:59.999Z',
      expected: '2026-08-05T06:00:00.000Z',
    },
    {
      timestamp: '2026-08-05T06:30:00.000Z',
      expected: '2026-08-05T07:00:00.000Z',
    },
    {
      timestamp: '2026-08-05T06:59:59.999Z',
      expected: '2026-08-05T07:00:00.000Z',
    },
  ])('rounds $timestamp to $expected', ({ timestamp, expected }) => {
    expect(roundToClosestHour(timestamp)).toBe(expected)
  })

  it('rounds across midnight', () => {
    expect(roundToClosestHour('2026-08-05T23:45:00.000Z')).toBe(
      '2026-08-06T00:00:00.000Z',
    )
  })

  it('rounds across the end of a month', () => {
    expect(roundToClosestHour('2026-08-31T23:45:00.000Z')).toBe(
      '2026-09-01T00:00:00.000Z',
    )
  })

  it('rounds across the end of a year', () => {
    expect(roundToClosestHour('2026-12-31T23:45:00.000Z')).toBe(
      '2027-01-01T00:00:00.000Z',
    )
  })

  it('normalizes timestamps with a timezone offset to UTC', () => {
    expect(roundToClosestHour('2026-08-05T08:20:00.000+02:00')).toBe(
      '2026-08-05T06:00:00.000Z',
    )
  })

  it.each(['', 'invalid', 'not-a-timestamp', '2026-99-99T99:99:99.999Z'])(
    'throws for invalid timestamp %j',
    (timestamp) => {
      expect(() => roundToClosestHour(timestamp)).toThrow(TypeError)
      expect(() => roundToClosestHour(timestamp)).toThrow(
        `Invalid timestamp: "${timestamp}"`,
      )
    },
  )
})
