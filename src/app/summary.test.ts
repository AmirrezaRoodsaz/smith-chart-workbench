import { describe, expect, test } from 'vitest'
import { initialState, reduce } from './state'
import { networkSummary } from './summary'

describe('networkSummary', () => {
  test('lists settings, elements in order, and final VSWR', () => {
    let s = reduce(initialState, { type: 'addElement', kind: 'shuntC' })
    s = reduce(s, { type: 'addElement', kind: 'line' })
    const text = networkSummary(s, 1.23, { re: 36, im: 74 })
    expect(text).toContain('Z0 50 Ω')
    expect(text).toContain('14.2 MHz')
    expect(text).toContain('Load 36 + j74 Ω')
    expect(text).toMatch(/1\. Shunt C 100 pF/)
    expect(text).toMatch(/2\. Line 45\.0° \(50 Ω\)/)
    expect(text).toContain('Input VSWR 1.23')
  })

  test('file-sourced load prints the passed load and source name', () => {
    const s = initialState
    const text = networkSummary(s, 1.23, { re: 36, im: 13.3 }, 'antenna.s1p')
    expect(text).toContain('Load 36 + j13.3 Ω (from antenna.s1p)')
  })
})
