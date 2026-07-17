import { describe, expect, test } from 'vitest'
import { abs, cx } from './complex'
import { evaluateChain } from './network'
import { lNetworkSolutions, stubMatchSolutions } from './synthesis'
import { gammaFromZ } from './transform'

const matches = (sol: { elements: import('./elements').CircuitElement[] }, zl: ReturnType<typeof cx>, z0: number, f: number) => {
  const stages = evaluateChain(zl, sol.elements, f)
  return abs(gammaFromZ(stages[stages.length - 1], z0))
}

describe('lNetworkSolutions', () => {
  test('Veritasium load 36+74j @ 50Ω, 1085 MHz: every solution really matches', () => {
    const sols = lNetworkSolutions(cx(36, 74), 50, 1.085e9)
    expect(sols.length).toBeGreaterThanOrEqual(2)
    for (const s of sols) expect(matches(s, cx(36, 74), 50, 1.085e9)).toBeLessThan(1e-4)
  })
  test('RL < Z0 load offers both topologies (up to 4 solutions)', () => {
    const sols = lNetworkSolutions(cx(20, -30), 50, 14.2e6)
    expect(sols.length).toBeGreaterThanOrEqual(3)
    for (const s of sols) expect(matches(s, cx(20, -30), 50, 14.2e6)).toBeLessThan(1e-4)
  })
  test('pure 100Ω resistive load matches', () => {
    const sols = lNetworkSolutions(cx(100, 0), 50, 14.2e6)
    expect(sols.length).toBeGreaterThanOrEqual(2)
    for (const s of sols) expect(matches(s, cx(100, 0), 50, 14.2e6)).toBeLessThan(1e-4)
  })
  test('every element has finite positive value and a label', () => {
    for (const s of lNetworkSolutions(cx(36, 74), 50, 1.085e9)) {
      expect(s.label.length).toBeGreaterThan(0)
      for (const e of s.elements) { expect(Number.isFinite(e.value)).toBe(true); expect(e.value).toBeGreaterThan(0) }
    }
  })
})

describe('stubMatchSolutions', () => {
  test('36+74j @ 50Ω: two line+open-stub solutions that really match', () => {
    const sols = stubMatchSolutions(cx(36, 74), 50, 1.085e9)
    expect(sols).toHaveLength(2)
    for (const s of sols) {
      expect(s.elements[0].kind).toBe('line')
      expect(s.elements[1].kind).toBe('stubOpen')
      expect(matches(s, cx(36, 74), 50, 1.085e9)).toBeLessThan(1e-4)
    }
  })
  test('RL = Z0 special case (50+80j) still yields verifying solutions', () => {
    const sols = stubMatchSolutions(cx(50, 80), 50, 14.2e6)
    expect(sols.length).toBeGreaterThanOrEqual(1)
    for (const s of sols) expect(matches(s, cx(50, 80), 50, 14.2e6)).toBeLessThan(1e-4)
  })
  test('load already on the g=1 circle (25+25j) still yields stub solutions', () => {
    const sols = stubMatchSolutions(cx(25, 25), 50, 14.2e6)
    expect(sols.length).toBeGreaterThanOrEqual(1)
    for (const s of sols) {
      expect(matches(s, cx(25, 25), 50, 14.2e6)).toBeLessThan(1e-4)
      for (const e of s.elements) expect(e.value).toBeGreaterThanOrEqual(0.01)
    }
  })
  test('already-matched 50Ω load yields the half-wave line-only solution', () => {
    const sols = stubMatchSolutions(cx(50, 0), 50, 14.2e6)
    expect(sols.length).toBeGreaterThanOrEqual(1)
    expect(sols[0].elements).toHaveLength(1)
    expect(sols[0].elements[0].kind).toBe('line')
  })
})
