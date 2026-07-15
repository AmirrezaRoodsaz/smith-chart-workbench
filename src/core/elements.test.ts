import { describe, expect, test } from 'vitest'
import { cx } from './complex'
import { transformImpedance, type CircuitElement } from './elements'

const el = (kind: CircuitElement['kind'], value: number, lineZ0?: number): CircuitElement =>
  ({ id: 't', kind, value, lineZ0, enabled: true })

describe('element transformations', () => {
  test('seriesR adds resistance', () => {
    expect(transformImpedance(cx(10, 5), el('seriesR', 40), 1e6)).toEqual({ re: 50, im: 5 })
  })
  test('Veritasium: 13.2nH series L at 1085 MHz adds ≈ +90j', () => {
    const z = transformImpedance(cx(10, -90), el('seriesL', 13.2e-9), 1.085e9)
    expect(z.re).toBeCloseTo(10, 6)
    expect(z.im).toBeCloseTo(0, 0) // 89.99Ω cancels -90Ω within 0.5Ω
  })
  test('seriesC subtracts reactance: 1nF @ 1MHz → -159.2j', () => {
    const z = transformImpedance(cx(50, 0), el('seriesC', 1e-9), 1e6)
    expect(z.im).toBeCloseTo(-159.15, 1)
  })
  test('shuntR: 50Ω load ∥ 50Ω → 25Ω', () => {
    const z = transformImpedance(cx(50), el('shuntR', 50), 1e6)
    expect(z.re).toBeCloseTo(25, 9); expect(z.im).toBeCloseTo(0, 9)
  })
  test('shuntL/shuntC are reciprocal reactances', () => {
    const zl = transformImpedance(cx(1e9), el('shuntL', 7.958e-9), 1e9)   // ωL≈50 → ≈ +50j
    expect(zl.im).toBeCloseTo(50, 0)
    const zc = transformImpedance(cx(1e9), el('shuntC', 3.183e-12), 1e9)  // 1/ωC≈50 → ≈ -50j
    expect(zc.im).toBeCloseTo(-50, 0)
  })
  test('quarter-wave line inverts: 25Ω through 90° of 50Ω line → 100Ω', () => {
    const z = transformImpedance(cx(25), el('line', 90, 50), 1e9)
    expect(z.re).toBeCloseTo(100, 3); expect(z.im).toBeCloseTo(0, 3)
  })
  test('half-wave line is identity', () => {
    const z = transformImpedance(cx(36, 74), el('line', 180, 50), 1e9)
    expect(z.re).toBeCloseTo(36, 3); expect(z.im).toBeCloseTo(74, 3)
  })
  test('short stub 45° of 50Ω = +50j in parallel', () => {
    const z = transformImpedance(cx(1e9), el('stubShort', 45, 50), 1e9)
    expect(z.im).toBeCloseTo(50, 0)
  })
  test('open stub 45° of 50Ω = -50j in parallel', () => {
    const z = transformImpedance(cx(1e9), el('stubOpen', 45, 50), 1e9)
    expect(z.im).toBeCloseTo(-50, 0)
  })
})
