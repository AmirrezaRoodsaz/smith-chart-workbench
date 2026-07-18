import { describe, expect, it } from 'vitest'
import { cx } from '../core/complex'
import { envelopeAt, gammaAtDist } from './walkline'

describe('gammaAtDist', () => {
  it('at the load it is Γ_L', () => {
    const g = gammaAtDist(cx(0.3, 0.4), 0)
    expect(g.re).toBeCloseTo(0.3, 12)
    expect(g.im).toBeCloseTo(0.4, 12)
  })
  it('a quarter wave toward the generator negates Γ', () => {
    const g = gammaAtDist(cx(0.3, 0.4), 0.25)
    expect(g.re).toBeCloseTo(-0.3, 12)
    expect(g.im).toBeCloseTo(-0.4, 12)
  })
  it('a half wave is a full lap', () => {
    const g = gammaAtDist(cx(0.3, 0.4), 0.5)
    expect(g.re).toBeCloseTo(0.3, 12)
    expect(g.im).toBeCloseTo(0.4, 12)
  })
})

describe('envelopeAt', () => {
  it('extremes are 1±|Γ| for a real positive Γ', () => {
    expect(envelopeAt(cx(0.5, 0), 0)).toBeCloseTo(1.5, 12)
    expect(envelopeAt(cx(0.5, 0), 0.25)).toBeCloseTo(0.5, 12)
  })
  it('matched load has a flat envelope of 1', () => {
    expect(envelopeAt(cx(0, 0), 0.123)).toBeCloseTo(1, 12)
  })
})
