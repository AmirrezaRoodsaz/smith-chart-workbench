import { describe, expect, test } from 'vitest'
import { parseTouchstone, TouchstoneError } from './touchstone'

const MA_FILE = `! test antenna
# MHz S MA R 50
14.0 0.5 90
14.2 0.2 45
14.4 0.1 0
`

describe('parseTouchstone', () => {
  test('MA format: 0.2∠45° at 50Ω converts to the right impedance', () => {
    const { points, refOhms } = parseTouchstone(MA_FILE)
    expect(refOhms).toBe(50)
    expect(points).toHaveLength(3)
    expect(points[1].fHz).toBe(14.2e6)
    // Γ = 0.2∠45° = 0.141421+j0.141421 → z = 50(1+Γ)/(1−Γ) ≈ 63.4+j18.7
    expect(points[1].z.re).toBeCloseTo(63.4, 0)
    expect(points[1].z.im).toBeCloseTo(18.7, 0)
  })
  test('RI format and kHz unit', () => {
    const { points } = parseTouchstone('# kHz S RI R 75\n7100 0.0 0.0\n')
    expect(points[0].fHz).toBe(7.1e6)
    expect(points[0].z.re).toBeCloseTo(75, 6)   // Γ=0 at 75Ω reference
  })
  test('DB format: -6.02 dB ≈ |Γ| 0.5', () => {
    const { points } = parseTouchstone('# MHz S DB R 50\n14.0 -6.0206 0\n')
    // Γ = +0.5 real → z = 50·1.5/0.5 = 150
    expect(points[0].z.re).toBeCloseTo(150, 1)
  })
  test('defaults: no option line → GHz, MA, 50Ω', () => {
    const { points, refOhms } = parseTouchstone('1.085 0.68 60\n')
    expect(points[0].fHz).toBe(1.085e9)
    expect(refOhms).toBe(50)
  })
  test('s2p rows: S11 taken from 9-column lines', () => {
    const { points } = parseTouchstone('# MHz S MA R 50\n14.0 0.5 90 0.1 0 0.1 0 0.5 -90\n')
    expect(points).toHaveLength(1)
    expect(points[0].z.im).toBeGreaterThan(0)   // 0.5∠90° is inductive side
  })
  test('comments stripped, frequencies sorted, duplicates deduped', () => {
    const { points } = parseTouchstone('# MHz S MA R 50\n14.4 0.1 0 ! tail\n14.0 0.5 90\n14.0 0.4 80\n')
    expect(points.map((p) => p.fHz)).toEqual([14.0e6, 14.4e6])
  })
  test('decimation above 2001 points with warning', () => {
    let body = '# Hz S RI R 50\n'
    for (let i = 0; i < 4000; i++) body += `${1e6 + i} 0.1 0\n`
    const { points, warning } = parseTouchstone(body)
    expect(points.length).toBeLessThanOrEqual(2001)
    expect(warning).toMatch(/Decimated/)
  })
  test('Γ=+1 (open) does not produce Infinity impedance', () => {
    const { points } = parseTouchstone('# MHz S MA R 50\n14.0 1.0 0\n')
    expect(Number.isFinite(points[0].z.re)).toBe(true)
  })
  test('extreme values that overflow to non-finite impedance are rejected', () => {
    expect(() => parseTouchstone('# Hz S RI R 50\n1e6 1e200 0\n')).toThrow(TouchstoneError)
    expect(() => parseTouchstone('# Hz S DB R 50\n1e6 7000 0\n')).toThrow(TouchstoneError)
  })
  test('rejects non-positive frequencies', () => {
    expect(() => parseTouchstone('# Hz S RI R 50\n0 0.1 0\n')).toThrow(TouchstoneError)
    expect(() => parseTouchstone('# MHz S MA R 50\n-14 0.5 0\n')).toThrow(TouchstoneError)
  })
  test('rejects non-S files and garbage with friendly errors', () => {
    expect(() => parseTouchstone('# MHz Z MA R 50\n14 1 0\n')).toThrow(TouchstoneError)
    expect(() => parseTouchstone('# MHz S MA R 50\n14 banana 0\n')).toThrow(TouchstoneError)
    expect(() => parseTouchstone('')).toThrow(TouchstoneError)
    expect(() => parseTouchstone('# MHz S MA R 50\n14 0.5\n')).toThrow(TouchstoneError)
  })
})
