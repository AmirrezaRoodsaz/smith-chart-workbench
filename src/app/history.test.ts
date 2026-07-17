import { describe, expect, test } from 'vitest'
import { initHistory, withHistory, type HistoryAction } from './history'

type S = { n: number }
type A = { type: 'set'; n: number; coalesce?: string }
const red = withHistory<S, A>((s, a) => (a.n === s.n ? s : { n: a.n }))
const run = (...as: HistoryAction<A>[]) => as.reduce(red, initHistory<S>({ n: 0 }))

describe('withHistory', () => {
  test('actions push history; undo/redo walk it', () => {
    let h = run({ type: 'set', n: 1 }, { type: 'set', n: 2 })
    expect(h.present.n).toBe(2)
    h = red(h, { type: 'undo' })
    expect(h.present.n).toBe(1)
    h = red(h, { type: 'redo' })
    expect(h.present.n).toBe(2)
  })
  test('undo at empty past and redo at empty future are no-ops', () => {
    const h0 = initHistory<S>({ n: 0 })
    expect(red(h0, { type: 'undo' })).toBe(h0)
    expect(red(h0, { type: 'redo' })).toBe(h0)
  })
  test('new action clears future', () => {
    let h = run({ type: 'set', n: 1 }, { type: 'set', n: 2 })
    h = red(h, { type: 'undo' })
    h = red(h, { type: 'set', n: 9 })
    expect(h.future).toHaveLength(0)
    expect(red(h, { type: 'undo' }).present.n).toBe(1)
  })
  test('coalesced actions collapse into one undo step', () => {
    let h = run(
      { type: 'set', n: 1 },
      { type: 'set', n: 2, coalesce: 'drag' },
      { type: 'set', n: 3, coalesce: 'drag' },
      { type: 'set', n: 4, coalesce: 'drag' },
    )
    expect(h.present.n).toBe(4)
    h = red(h, { type: 'undo' })
    expect(h.present.n).toBe(1)   // whole drag undone as one step
  })
  test('no-op reduction leaves history untouched', () => {
    const h = run({ type: 'set', n: 1 })
    expect(red(h, { type: 'set', n: 1 })).toBe(h)
  })
  test('past capped at 100', () => {
    let h = initHistory<S>({ n: 0 })
    for (let i = 1; i <= 150; i++) h = red(h, { type: 'set', n: i })
    expect(h.past.length).toBe(100)
  })
})
