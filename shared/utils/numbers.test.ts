import { describe, expect, it } from 'vitest'
import { formatCompactNumber, median, round } from './numbers'

describe('round', () => {
  it('rounds as it should have natively', () => {
    expect(round(0.33)).toBe(0.33)
    expect(round(0.333)).toBe(0.33)
    expect(round(0.3333)).toBe(0.33)

    expect(round(0.3333, 1)).toBe(0.3)
    expect(round(0.3333, 2)).toBe(0.33)
    expect(round(0.3333, 3)).toBe(0.333)
    expect(round(0.3333, 4)).toBe(0.3333)

    expect(round(0.99, 1)).toBe(1)
    expect(round(-0.99, 1)).toBe(-1)

    expect(round(1)).toBe(1)
    expect(round(1.234, 0)).toBe(1)
    expect(round(1.5, 0)).toBe(2)
    expect(round(-1.5, 0)).toBe(-1)
    expect(round(0, 2)).toBe(0)
  })
})

describe('formatCompactNumber', () => {
  it('keeps small counts as they are', () => {
    expect(formatCompactNumber(0)).toBe('0')
    expect(formatCompactNumber(42)).toBe('42')
    expect(formatCompactNumber(999)).toBe('999')
  })

  it('shortens thousands to a single decimal', () => {
    expect(formatCompactNumber(1000)).toBe('1K')
    expect(formatCompactNumber(1200)).toBe('1.2K')
    expect(formatCompactNumber(1250)).toBe('1.3K')
    expect(formatCompactNumber(12500)).toBe('12.5K')
  })
})

describe('median', () => {
  it('returns null for an empty list', () => {
    expect(median([])).toBeNull()
  })

  it('picks the middle value of an odd-length list', () => {
    expect(median([3, 1, 2])).toBe(2)
    expect(median([5])).toBe(5)
  })

  it('averages the two middle values of an even-length list', () => {
    expect(median([4, 1, 3, 2])).toBe(2.5)
  })

  it('is not pulled by outliers', () => {
    expect(median([10, 12, 11, 1_000_000])).toBe(11.5)
  })

  it('does not mutate the input', () => {
    const values = [3, 1, 2]
    median(values)
    expect(values).toEqual([3, 1, 2])
  })
})
