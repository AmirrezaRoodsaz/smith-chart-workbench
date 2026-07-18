import { describe, expect, it } from 'vitest'
import { cx } from '../core/complex'
import { initialState } from '../app/state'
import { advance, type Mission, type TourCtx } from './walkthrough'

const ctx: TourCtx = { state: initialState, vswr: 5, zInNorm: cx(0.72, 1.48) }
const mission: Mission = {
  id: 't', title: 't', blurb: '',
  steps: [
    { text: 'intro', manual: true },
    { text: 'auto-satisfied', done: () => true },
    { text: 'auto-satisfied 2', done: () => true },
    { text: 'not yet', done: (c) => c.vswr < 1.5 },
    { text: 'end', manual: true },
  ],
}

describe('advance', () => {
  it('stops at a manual step even when later steps are satisfied', () => {
    expect(advance(0, mission, ctx)).toBe(0)
  })
  it('skips consecutive satisfied auto steps', () => {
    expect(advance(1, mission, ctx)).toBe(3)
  })
  it('runs to the next manual step once the predicate passes', () => {
    expect(advance(1, mission, { ...ctx, vswr: 1.1 })).toBe(4)
  })
  it('never runs past the end', () => {
    expect(advance(5, mission, ctx)).toBe(5)
  })
})
