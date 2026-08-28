import { describe, expect, it } from 'vitest'
import { formatCompactNumber, round } from './numbers'

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
