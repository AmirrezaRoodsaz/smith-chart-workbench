import { describe, expect, test } from 'vitest'
import { initialState, reduce, type Action } from './state'

const run = (...actions: Action[]) => actions.reduce(reduce, initialState)

describe('reducer', () => {
  test('initial state: 50Ω, 14.2 MHz, demo load, empty chain', () => {
    expect(initialState.z0).toBe(50)
    expect(initialState.freqHz).toBe(14.2e6)
    expect(initialState.elements).toEqual([])
  })
  test('addElement appends with defaults and unique ids', () => {
    const s = run({ type: 'addElement', kind: 'seriesL' }, { type: 'addElement', kind: 'line' })
    expect(s.elements).toHaveLength(2)
    expect(s.elements[0].kind).toBe('seriesL')
    expect(s.elements[1].lineZ0).toBe(50)
    expect(s.elements[0].id).not.toBe(s.elements[1].id)
  })
  test('updateElement patches value; toggle flips enabled; remove deletes', () => {
    let s = run({ type: 'addElement', kind: 'seriesC' })
    const id = s.elements[0].id
    s = reduce(s, { type: 'updateElement', id, patch: { value: 5e-12 } })
    expect(s.elements[0].value).toBe(5e-12)
    s = reduce(s, { type: 'toggleElement', id })
    expect(s.elements[0].enabled).toBe(false)
    s = reduce(s, { type: 'removeElement', id })
    expect(s.elements).toHaveLength(0)
  })
  test('moveElement swaps neighbors and clamps at ends', () => {
    let s = run({ type: 'addElement', kind: 'seriesL' }, { type: 'addElement', kind: 'seriesC' })
    const [a, b] = s.elements.map((e) => e.id)
    s = reduce(s, { type: 'moveElement', id: b, dir: -1 })
    expect(s.elements.map((e) => e.id)).toEqual([b, a])
    expect(reduce(s, { type: 'moveElement', id: b, dir: -1 })).toBe(s)
  })
  test('invalid setZ0/setFreq/setLoad are ignored', () => {
    expect(reduce(initialState, { type: 'setZ0', z0: -5 })).toBe(initialState)
    expect(reduce(initialState, { type: 'setFreq', freqHz: 0 })).toBe(initialState)
    expect(reduce(initialState, { type: 'setLoad', re: NaN, im: 0 })).toBe(initialState)
  })
  test('setView merges partial view options', () => {
    const s = reduce(initialState, { type: 'setView', patch: { gridMode: 'y', showVswr: true } })
    expect(s.view.gridMode).toBe('y')
    expect(s.view.showVswr).toBe(true)
    expect(s.view.showQ).toBe(false)
  })
  test('no-op actions return the same reference', () => {
    expect(reduce(initialState, { type: 'setZ0', z0: initialState.z0 })).toBe(initialState)
    expect(reduce(initialState, { type: 'setLoad', re: initialState.loadRe, im: initialState.loadIm })).toBe(initialState)
    expect(reduce(initialState, { type: 'setFreq', freqHz: initialState.freqHz })).toBe(initialState)
    let s = run({ type: 'addElement', kind: 'seriesL' })
    const id = s.elements[0].id
    expect(reduce(s, { type: 'updateElement', id, patch: { value: s.elements[0].value } })).toBe(s)
    expect(reduce(s, { type: 'updateElement', id: 'missing', patch: { value: 1 } })).toBe(s)
    expect(reduce(s, { type: 'setView', patch: { gridMode: s.view.gridMode } })).toBe(s)
  })
})
