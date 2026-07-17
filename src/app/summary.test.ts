import { describe, expect, test } from 'vitest'
import { initialState, reduce } from './state'
import { networkSummary } from './summary'

describe('networkSummary', () => {
  test('lists settings, elements in order, and final VSWR', () => {
    let s = reduce(initialState, { type: 'addElement', kind: 'shuntC' })
    s = reduce(s, { type: 'addElement', kind: 'line' })
    const text = networkSummary(s, 1.23)
    expect(text).toContain('Z0 50 Ω')
    expect(text).toContain('14.2 MHz')
    expect(text).toContain('Load 36 + j74 Ω')
    expect(text).toMatch(/1\. Shunt C 100 pF/)
    expect(text).toMatch(/2\. Line 45\.0° \(50 Ω\)/)
    expect(text).toContain('Input VSWR 1.23')
  })
})
