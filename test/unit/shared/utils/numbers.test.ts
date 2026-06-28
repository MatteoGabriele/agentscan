import { describe, expect, it } from 'vitest'
import { round } from '../../../../shared/utils/numbers'

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
