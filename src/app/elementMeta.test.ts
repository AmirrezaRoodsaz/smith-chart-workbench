import { describe, expect, test } from 'vitest'
import { RANGES, sliderT, valueFromT } from './elementMeta'

describe('log slider mapping', () => {
  test('round trip within 0.1%', () => {
    for (const v of [1e-9, 47e-9, 3.3e-6]) {
      expect(valueFromT(sliderT(v, 'seriesL'), 'seriesL')).toBeCloseTo(v, 12)
    }
  })
  test('endpoints map to range bounds', () => {
    const [min, max] = RANGES.seriesC
    expect(valueFromT(0, 'seriesC')).toBeCloseTo(min, 15)
    expect(valueFromT(1000, 'seriesC')).toBeCloseTo(max, 9)
  })
  test('out-of-range values clamp', () => {
    expect(sliderT(1e-15, 'seriesC')).toBe(0)
    expect(sliderT(1, 'seriesC')).toBe(1000)
  })
})
