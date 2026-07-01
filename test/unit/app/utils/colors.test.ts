import { describe, expect, it } from 'vitest'
import {
  clamp,
  hexToRgb,
  rgbToHex,
  interpolate,
  interpolateHexColors,
} from '../../../../app/utils/colors'

describe('clamp', () => {
  it('returns the provided value when in range', () => {
    expect(clamp(1, 0, 2)).toEqual(1)
    expect(clamp(-1, -2, 2)).toEqual(-1)
  })

  it('returns clamp max when the provided value exceeds max', () => {
    expect(clamp(100, 0, 1)).toEqual(1)
    expect(clamp(1.0000000000001, 0, 1)).toEqual(1)
  })

  it('returns clamp min when the provided value is below min', () => {
    expect(clamp(-100, 0, 1)).toEqual(0)
    expect(clamp(-0.000000000001, 0, 1)).toEqual(0)
  })
})

describe('hexToRgb', () => {
  it('returns a RGB color object from a standard hex color', () => {
    expect(hexToRgb('#000000')).toStrictEqual({ r: 0, g: 0, b: 0 })
    expect(hexToRgb('#666666')).toStrictEqual({ r: 102, g: 102, b: 102 })
    expect(hexToRgb('#FFFFFF')).toStrictEqual({ r: 255, g: 255, b: 255 })
    expect(hexToRgb('#FF0000')).toStrictEqual({ r: 255, g: 0, b: 0 })
    expect(hexToRgb('#00FF00')).toStrictEqual({ r: 0, g: 255, b: 0 })
    expect(hexToRgb('#0000FF')).toStrictEqual({ r: 0, g: 0, b: 255 })
  })

  it('returns a RGB color object from a hex color without the hashtag', () => {
    expect(hexToRgb('000000')).toStrictEqual({ r: 0, g: 0, b: 0 })
    expect(hexToRgb('666666')).toStrictEqual({ r: 102, g: 102, b: 102 })
    expect(hexToRgb('FFFFFF')).toStrictEqual({ r: 255, g: 255, b: 255 })
    expect(hexToRgb('FF0000')).toStrictEqual({ r: 255, g: 0, b: 0 })
    expect(hexToRgb('00FF00')).toStrictEqual({ r: 0, g: 255, b: 0 })
    expect(hexToRgb('0000FF')).toStrictEqual({ r: 0, g: 0, b: 255 })
  })

  it('throws for a bad color format', () => {
    expect(() => hexToRgb('awesome blossom')).toThrow()
    expect(() => hexToRgb('red')).toThrow()
    expect(() => hexToRgb('rgb(0,0,0)')).toThrow()
  })

  it('throws for a shorthand hex', () => {
    expect(() => hexToRgb('#FFF')).toThrow()
  })
})

describe('rgbToHex', () => {
  it('returns a HEX color object from a RGB color object', () => {
    expect(rgbToHex({ r: 0, g: 0, b: 0 })).toEqual('#000000')
    expect(rgbToHex({ r: 102, g: 102, b: 102 })).toEqual('#666666')
    expect(rgbToHex({ r: 255, g: 255, b: 255 })).toEqual('#ffffff')
    expect(rgbToHex({ r: 255, g: 0, b: 0 })).toEqual('#ff0000')
    expect(rgbToHex({ r: 0, g: 255, b: 0 })).toEqual('#00ff00')
    expect(rgbToHex({ r: 0, g: 0, b: 255 })).toEqual('#0000ff')
  })
})

describe('interpolate', () => {
  it('interpolates a color object in a color range from a given ratio', () => {
    expect(
      interpolate({ r: 100, g: 100, b: 100 }, { r: 200, g: 200, b: 200 }, 0.5),
    ).toStrictEqual({
      r: 150,
      g: 150,
      b: 150,
    })
  })
})

describe('interpolateHexColors', () => {
  it('interpolates a color from a HEX tuple and a given ratio', () => {
    expect(
      interpolateHexColors({ colors: ['#FF0000', '#0000FF'], ratio: 0.5 }),
    ).toStrictEqual('#800080')
  })
})
