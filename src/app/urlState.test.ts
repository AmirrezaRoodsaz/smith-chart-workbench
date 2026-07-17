import { describe, expect, test } from 'vitest'
import { initialState, reduce } from './state'
import { decodeState, encodeState } from './urlState'

describe('urlState', () => {
  test('round trip preserves state', () => {
    const s = reduce(reduce(initialState, { type: 'addElement', kind: 'seriesL' }), { type: 'setView', patch: { gridMode: 'zy', showVswr: true } })
    expect(decodeState(encodeState(s))).toEqual(s)
  })
  test('encoded string is hash-safe (no +, /, =, #)', () => {
    expect(encodeState(initialState)).toMatch(/^v1\.[A-Za-z0-9_-]+$/)
  })
  test('garbage, wrong version, and empty input return null', () => {
    expect(decodeState('')).toBeNull()
    expect(decodeState('v0.abc')).toBeNull()
    expect(decodeState('v1.!!!not-base64!!!')).toBeNull()
    expect(decodeState('v1.' + btoa('{"z0":"evil"}'))).toBeNull()
  })
  test('invalid element kind rejects the whole payload', () => {
    const s = structuredClone(initialState) as unknown as { elements: unknown[] }
    s.elements = [{ id: 'x', kind: 'flumox', value: 1, enabled: true }]
    const forged = 'v1.' + encodeState(s as never).split('.')[1]
    expect(decodeState(forged)).toBeNull()
  })
  test('missing view fields are defaulted (forward compat)', () => {
    const s = structuredClone(initialState) as unknown as { view: unknown }
    s.view = { gridMode: 'y' }
    const decoded = decodeState(encodeState(s as never))
    expect(decoded?.view.gridMode).toBe('y')
    expect(decoded?.view.showVswr).toBe(false)
  })
})
