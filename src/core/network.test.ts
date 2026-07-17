import { describe, expect, test } from 'vitest'
import { abs, cx, sub } from './complex'
import { transformImpedance, type CircuitElement } from './elements'
import { arcPoints, evaluateChain } from './network'
import { gammaFromZ } from './transform'

const el = (kind: CircuitElement['kind'], value: number, enabled = true): CircuitElement =>
  ({ id: kind + value, kind, value, enabled })

describe('network evaluation', () => {
  test('empty chain returns just the load', () => {
    expect(evaluateChain(cx(36, 74), [], 1e9)).toEqual([cx(36, 74)])
  })
  test('stages accumulate in order', () => {
    const chain = [el('seriesR', 14), el('seriesC', 2e-12)]
    const stages = evaluateChain(cx(36, 74), chain, 1.085e9)
    expect(stages).toHaveLength(3)
    expect(stages[1]).toEqual({ re: 50, im: 74 })
    expect(stages[2].re).toBeCloseTo(50, 9)
  })
  test('disabled element is skipped', () => {
    const stages = evaluateChain(cx(36, 74), [el('seriesR', 14, false)], 1e9)
    expect(stages[1]).toEqual({ re: 36, im: 74 })
  })
  test('arcPoints starts at Γ(zIn) and ends at Γ(transformed z)', () => {
    const e = el('seriesL', 13.2e-9)
    const pts = arcPoints(cx(10, -90), e, 1.085e9, 50)
    expect(pts).toHaveLength(65)
    expect(abs(sub(pts[0], gammaFromZ(cx(10, -90), 50)))).toBeCloseTo(0, 9)
    expect(abs(sub(pts[64], gammaFromZ(transformImpedance(cx(10, -90), e, 1.085e9), 50)))).toBeCloseTo(0, 9)
  })
  test('arcPoints for seriesC stays finite and starts/ends correctly', () => {
    const e = el('seriesC', 2e-12)
    const zIn = cx(50, 74)
    const pts = arcPoints(zIn, e, 1.085e9, 50)
    expect(abs(sub(pts[0], gammaFromZ(zIn, 50)))).toBeCloseTo(0, 9)
    expect(abs(sub(pts[64], gammaFromZ(transformImpedance(zIn, e, 1.085e9), 50)))).toBeCloseTo(0, 9)
    for (const p of pts) {
      expect(Number.isFinite(p.re)).toBe(true)
      expect(Number.isFinite(p.im)).toBe(true)
    }
  })
  test('arcPoints for stubOpen stays finite and starts/ends correctly', () => {
    const e: CircuitElement = { id: 'stubOpen45', kind: 'stubOpen', value: 45, lineZ0: 50, enabled: true }
    const zIn = cx(50, 74)
    const pts = arcPoints(zIn, e, 1.085e9, 50)
    expect(abs(sub(pts[0], gammaFromZ(zIn, 50)))).toBeCloseTo(0, 9)
    expect(abs(sub(pts[64], gammaFromZ(transformImpedance(zIn, e, 1.085e9), 50)))).toBeCloseTo(0, 9)
    for (const p of pts) {
      expect(Number.isFinite(p.re)).toBe(true)
      expect(Number.isFinite(p.im)).toBe(true)
    }
  })
  test('arcPoints for shuntC is continuous (no jump at i=1) and starts/ends correctly', () => {
    const e = el('shuntC', 2e-12)
    const zIn = cx(50, 74)
    const pts = arcPoints(zIn, e, 1.085e9, 50)
    const first = gammaFromZ(zIn, 50)
    expect(abs(sub(pts[0], first))).toBeCloseTo(0, 9)
    expect(abs(sub(pts[1], first))).toBeLessThan(0.1)
    expect(abs(sub(pts[64], gammaFromZ(transformImpedance(zIn, e, 1.085e9), 50)))).toBeCloseTo(0, 9)
    for (const p of pts) {
      expect(Number.isFinite(p.re)).toBe(true)
      expect(Number.isFinite(p.im)).toBe(true)
    }
  })
  test('arcPoints for shuntL is continuous (no jump at i=1) and starts/ends correctly', () => {
    const e = el('shuntL', 13.2e-9)
    const zIn = cx(50, 74)
    const pts = arcPoints(zIn, e, 1.085e9, 50)
    const first = gammaFromZ(zIn, 50)
    expect(abs(sub(pts[0], first))).toBeCloseTo(0, 9)
    expect(abs(sub(pts[1], first))).toBeLessThan(0.1)
    expect(abs(sub(pts[64], gammaFromZ(transformImpedance(zIn, e, 1.085e9), 50)))).toBeCloseTo(0, 9)
    for (const p of pts) {
      expect(Number.isFinite(p.re)).toBe(true)
      expect(Number.isFinite(p.im)).toBe(true)
    }
  })
  test('stubShort arc is continuous via equivalent-shunt sweep (45°, inductive)', () => {
    const stub: CircuitElement = { id: 's1', kind: 'stubShort', value: 45, lineZ0: 50, enabled: true }
    const pts = arcPoints(cx(50, 74), stub, 1.085e9, 50)
    expect(abs(sub(pts[0], gammaFromZ(cx(50, 74), 50)))).toBeCloseTo(0, 9)
    expect(abs(sub(pts[1], pts[0]))).toBeLessThan(0.1)
    expect(abs(sub(pts[64], gammaFromZ(transformImpedance(cx(50, 74), stub, 1.085e9), 50)))).toBeCloseTo(0, 6)
    for (const p of pts) { expect(Number.isFinite(p.re)).toBe(true); expect(Number.isFinite(p.im)).toBe(true) }
  })
  test('stubShort arc continuous for θ>90° (135°, capacitive equivalent)', () => {
    const stub: CircuitElement = { id: 's2', kind: 'stubShort', value: 135, lineZ0: 50, enabled: true }
    const pts = arcPoints(cx(50, 74), stub, 1.085e9, 50)
    expect(abs(sub(pts[1], pts[0]))).toBeLessThan(0.1)
    expect(abs(sub(pts[64], gammaFromZ(transformImpedance(cx(50, 74), stub, 1.085e9), 50)))).toBeCloseTo(0, 6)
  })
})
