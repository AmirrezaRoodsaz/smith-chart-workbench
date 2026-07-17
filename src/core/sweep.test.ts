import { describe, expect, test } from 'vitest'
import { cx } from './complex'
import type { CircuitElement } from './elements'
import { elementsAtFreq, interpZ, nearestIndex, sweepChain } from './sweep'

const line90: CircuitElement = { id: 'l', kind: 'line', value: 90, lineZ0: 50, enabled: true }
const seriesL: CircuitElement = { id: 's', kind: 'seriesL', value: 100e-9, enabled: true }

describe('sweep', () => {
  test('line lengths scale with frequency, lumped elements do not', () => {
    const [l, s] = elementsAtFreq([line90, seriesL], 2e9, 1e9)
    expect(l.value).toBe(180)
    expect(s.value).toBe(100e-9)
  })
  test('quarter-wave inverter at f0 becomes half-wave identity at 2·f0', () => {
    const pts = [{ fHz: 1e9, z: cx(25, 0) }, { fHz: 2e9, z: cx(25, 0) }]
    const out = sweepChain(pts, [line90], 1e9)
    expect(out[0].z.re).toBeCloseTo(100, 3)   // 50²/25 at design freq
    expect(out[1].z.re).toBeCloseTo(25, 3)    // half-wave: back to the load
  })
  test('interpZ midpoint and out-of-range', () => {
    const pts = [{ fHz: 1e6, z: cx(10, -20) }, { fHz: 3e6, z: cx(30, 20) }]
    const mid = interpZ(pts, 2e6)!
    expect(mid.re).toBeCloseTo(20, 9)
    expect(mid.im).toBeCloseTo(0, 9)
    expect(interpZ(pts, 0.5e6)).toBeNull()
    expect(interpZ(pts, 4e6)).toBeNull()
    expect(interpZ([], 1e6)).toBeNull()
  })
  test('interpZ at an exact sample returns that sample', () => {
    const pts = [{ fHz: 1e6, z: cx(10, 0) }, { fHz: 3e6, z: cx(30, 0) }]
    expect(interpZ(pts, 3e6)!.re).toBeCloseTo(30, 12)
  })
  test('nearestIndex', () => {
    const pts = [{ fHz: 1e6, z: cx(1, 0) }, { fHz: 2e6, z: cx(1, 0) }, { fHz: 10e6, z: cx(1, 0) }]
    expect(nearestIndex(pts, 2.4e6)).toBe(1)
    expect(nearestIndex(pts, 9e6)).toBe(2)
    expect(nearestIndex([], 1)).toBe(-1)
  })
})
