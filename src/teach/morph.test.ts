import { describe, expect, it } from 'vitest'
import { cx } from '../core/complex'
import { gammaFromZ } from '../core/transform'
import { morphGridPaths, morphPoint, SHRINK } from './morph'

describe('morphPoint', () => {
  it('t=0 is the shrunk impedance plane', () => {
    const p = morphPoint(cx(1, 1), 0)
    expect(p.re).toBeCloseTo(SHRINK, 12)
    expect(p.im).toBeCloseTo(SHRINK, 12)
  })
  it('t=1 is the reflection coefficient (z0=1)', () => {
    const z = cx(0.72, 1.48)
    const got = morphPoint(z, 1)
    const want = gammaFromZ(z, 1)
    expect(got.re).toBeCloseTo(want.re, 12)
    expect(got.im).toBeCloseTo(want.im, 12)
  })
  it('t=0.5 is the midpoint of the two endpoints', () => {
    const z = cx(2, -1)
    const a = morphPoint(z, 0), b = morphPoint(z, 1), m = morphPoint(z, 0.5)
    expect(m.re).toBeCloseTo((a.re + b.re) / 2, 12)
    expect(m.im).toBeCloseTo((a.im + b.im) / 2, 12)
  })
})

describe('morphGridPaths', () => {
  it('renders 17 paths at any t (6 r-lines, 10 x-lines, 1 axis)', () => {
    expect(morphGridPaths(0)).toHaveLength(17)
    expect(morphGridPaths(1)).toHaveLength(17)
  })
  it('emphasizes r=1 and |x|=1', () => {
    expect(morphGridPaths(1).filter((p) => p.emph)).toHaveLength(3)
  })
  it('all sampled points are finite for all t', () => {
    for (const t of [0, 0.25, 0.5, 0.75, 1])
      for (const p of morphGridPaths(t)) expect(p.d).not.toMatch(/NaN|Infinity/)
  })
})
