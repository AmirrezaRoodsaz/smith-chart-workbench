import { describe, expect, test } from 'vitest'
import { degToMeters, formatEng, metersToDeg } from './units'

describe('units', () => {
  test('formatEng picks SI prefix', () => {
    expect(formatEng(13.2e-9, 'H')).toBe('13.2 nH')
    expect(formatEng(1.085e9, 'Hz')).toBe('1.09 GHz')
    expect(formatEng(-1.085e9, 'Hz')).toBe('-1.09 GHz')
    expect(formatEng(50, 'Ω')).toBe('50.0 Ω')
    expect(formatEng(0, 'Ω')).toBe('0 Ω')
    expect(formatEng(Infinity, '')).toBe('∞')
  })
  test('degToMeters: 360° at 1085 MHz ≈ 0.2763 m (c/f)', () => {
    expect(degToMeters(360, 1.085e9)).toBeCloseTo(0.2763, 3)
  })
  test('electrical length: 302° at 1085 MHz with vf 0.66 → ≈153 mm; round trip', () => {
    // NOTE: electrical length (360° = 1λ), not Smith-chart rotation angle (360° = λ/2).
    expect(degToMeters(302, 1.085e9, 0.66) * 1000).toBeCloseTo(153, 0)
    expect(metersToDeg(degToMeters(90, 1e9), 1e9)).toBeCloseTo(90, 9)
  })
  test('formatEng rolls to next prefix when rounding crosses 1000', () => {
    expect(formatEng(999.95e6, 'Hz')).toBe('1.00 GHz')
    expect(formatEng(-999.95e6, 'Hz')).toBe('-1.00 GHz')
    expect(formatEng(999.4e6, 'Hz')).toBe('999 MHz')
  })
})
