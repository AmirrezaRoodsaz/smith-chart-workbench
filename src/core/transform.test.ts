import { describe, expect, test } from 'vitest'
import { abs, cx } from './complex'
import { gammaFromZ, mismatchLossDb, returnLossDb, vswrFromGamma, yFromZ, zFromGamma } from './transform'

describe('gamma/impedance transforms', () => {
  test('matched load: Z=50 → Γ=0', () => {
    const g = gammaFromZ(cx(50), 50)
    expect(abs(g)).toBeCloseTo(0, 12)
  })
  test('short: Z=0 → Γ=-1; near-open → Γ→+1', () => {
    expect(gammaFromZ(cx(0), 50).re).toBeCloseTo(-1, 12)
    expect(gammaFromZ(cx(1e12), 50).re).toBeCloseTo(1, 6)
  })
  test('Veritasium case: 36+74j @ 50Ω → |Γ|≈0.664', () => {
    const g = gammaFromZ(cx(36, 74), 50)
    expect(abs(g)).toBeCloseTo(0.664, 2)
    expect(vswrFromGamma(g)).toBeCloseTo(4.95, 1)
  })
  test('round trip Z→Γ→Z', () => {
    const z = zFromGamma(gammaFromZ(cx(36, 74), 50), 50)
    expect(z.re).toBeCloseTo(36, 9); expect(z.im).toBeCloseTo(74, 9)
  })
  test('yFromZ round trip', () => {
    const y = yFromZ(cx(36, 74))
    const z = yFromZ(y)
    expect(z.re).toBeCloseTo(36, 9); expect(z.im).toBeCloseTo(74, 9)
  })
  test('VSWR: |Γ|=0.5 → 3; |Γ|≥1 → Infinity', () => {
    expect(vswrFromGamma(cx(0.5, 0))).toBeCloseTo(3, 12)
    expect(vswrFromGamma(cx(1, 0))).toBe(Infinity)
  })
  test('losses: |Γ|=0.5 → RL 6.02 dB, ML 1.25 dB', () => {
    expect(returnLossDb(cx(0.5, 0))).toBeCloseTo(6.02, 2)
    expect(mismatchLossDb(cx(0.5, 0))).toBeCloseTo(1.249, 2)
  })
})
