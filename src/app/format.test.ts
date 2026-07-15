import { describe, expect, test } from 'vitest'
import { cx } from '../core/complex'
import { gammaFromZ } from '../core/transform'
import { formatReadout } from './format'

describe('formatReadout', () => {
  test('Veritasium load readout', () => {
    const rows = formatReadout(gammaFromZ(cx(36, 74), 50), 50)
    const get = (label: string) => rows.find((r) => r.label === label)!.value
    expect(get('Z')).toBe('36.0 + j74.0 Ω')
    expect(get('z (norm)')).toBe('0.720 + j1.48')
    expect(get('|Γ|')).toBe('0.664')
    expect(get('VSWR')).toBe('4.95')
    expect(get('Y')).toMatch(/mS/)
  })
  test('handles the open-circuit edge without NaN text', () => {
    const rows = formatReadout(cx(1, 0), 50)
    expect(rows.find((r) => r.label === 'VSWR')!.value).toBe('∞')
  })
  test('short circuit reads 0 Ω, not ∞', () => {
    const rows = formatReadout(cx(-1, 0), 50)
    expect(rows.find((r) => r.label === 'Z')!.value.startsWith('0.00')).toBe(true)
    expect(rows.find((r) => r.label === 'VSWR')!.value).toBe('∞')
  })
  test('pure reactance on the rim reads a finite Z, not ∞', () => {
    const rows = formatReadout(cx(0, 1), 50)
    expect(rows.find((r) => r.label === 'Z')!.value).toContain('j50')
  })
})
