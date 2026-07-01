import { describe, expect, it } from 'vitest'
import { calcLinearProgression } from '../../../../shared/utils/calc-linear-progression'

describe('calcLinearProgression', () => {
  it('returns zero values when the array is empty', () => {
    expect(calcLinearProgression([])).toEqual({
      x1: 0,
      y1: 0,
      x2: 0,
      y2: 0,
      slope: 0,
      trend: 0,
    })
  })

  it('returns zero values when the array contains a single value', () => {
    expect(calcLinearProgression([42])).toEqual({
      x1: 0,
      y1: 0,
      x2: 0,
      y2: 0,
      slope: 0,
      trend: 0,
    })
  })

  it('calculates a positive linear trend', () => {
    expect(calcLinearProgression([10, 20, 30])).toEqual({
      x1: 0,
      y1: 10,
      x2: 2,
      y2: 30,
      slope: 10,
      trend: 20 / 30,
    })
  })

  it('calculates a negative linear trend', () => {
    expect(calcLinearProgression([30, 20, 10])).toEqual({
      x1: 0,
      y1: 30,
      x2: 2,
      y2: 10,
      slope: -10,
      trend: -20 / 30,
    })
  })

  it('calculates a flat trend', () => {
    expect(calcLinearProgression([10, 10, 10])).toEqual({
      x1: 0,
      y1: 10,
      x2: 2,
      y2: 10,
      slope: 0,
      trend: 0,
    })
  })

  it('calculates progression for uneven values', () => {
    const result = calcLinearProgression([10, 30, 20])

    expect(result.x1).toBe(0)
    expect(result.x2).toBe(2)
    expect(result.y1).toBeCloseTo(15)
    expect(result.y2).toBeCloseTo(25)
    expect(result.slope).toBeCloseTo(5)
    expect(result.trend).toBeCloseTo(10 / 25)
  })

  it('treats missing values as zero', () => {
    const result = calcLinearProgression([10, undefined as unknown as number, 30])

    expect(result.x1).toBe(0)
    expect(result.x2).toBe(2)
    expect(result.y1).toBeCloseTo(10 / 3)
    expect(result.y2).toBeCloseTo(70 / 3)
    expect(result.slope).toBeCloseTo(10)
    expect(result.trend).toBeCloseTo(20 / (70 / 3))
  })
})
