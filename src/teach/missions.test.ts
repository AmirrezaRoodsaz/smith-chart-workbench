import { describe, expect, it } from 'vitest'
import { cx } from '../core/complex'
import type { CircuitElement, ElementKind } from '../core/elements'
import { evaluateChain } from '../core/network'
import { gammaFromZ, vswrFromGamma } from '../core/transform'
import { initialState, type AppState } from '../app/state'
import { advance, type TourCtx } from './walkthrough'
import { MISSIONS } from './missions'

function ctxFor(state: AppState): TourCtx {
  const stages = evaluateChain(cx(state.loadRe, state.loadIm), state.elements, state.freqHz)
  const zIn = stages[stages.length - 1]
  return {
    state,
    vswr: vswrFromGamma(gammaFromZ(zIn, state.z0)),
    zInNorm: cx(zIn.re / state.z0, zIn.im / state.z0),
  }
}
const el = (kind: ElementKind, value: number, lineZ0?: number): CircuitElement =>
  ({ id: kind, kind, value, enabled: true, ...(lineZ0 !== undefined ? { lineZ0 } : {}) })

describe('mission list', () => {
  it('is exactly the three spec missions', () => {
    expect(MISSIONS.map((m) => m.id)).toEqual(['reading', 'veritasium', 'stub'])
  })
})

describe('mission 1: reading the chart', () => {
  it('completes when the view toggles are set (stepping over each manual gate)', () => {
    const m = MISSIONS[0]
    const s: AppState = { ...initialState, view: { gridMode: 'zy', showVswr: true, showQ: false, showRuler: true } }
    const c = ctxFor(s)
    let i = advance(1, m, c) // auto step 1 satisfied → parked at manual step 2
    expect(i).toBe(2)
    i = advance(i + 1, m, c) // step 3 satisfied → manual step 4
    i = advance(i + 1, m, c) // step 5 satisfied → final manual step
    expect(i).toBe(m.steps.length - 1)
  })
})

describe('mission 2: the Veritasium match', () => {
  const m = () => MISSIONS[1]
  it('line 54.2° lands the input on the r = 1 circle', () => {
    const c = ctxFor({ ...initialState, elements: [el('line', 54.2, 50)] })
    expect(Math.abs(c.zInNorm.re - 1)).toBeLessThan(0.05)
    expect(c.zInNorm.im).toBeCloseTo(-1.776, 2)
    const rStep = m().steps.find((s) => s.text.includes('r = 1'))!
    expect(rStep.done!(c)).toBe(true)
  })
  it('adding 995 nH series L completes the match', () => {
    const c = ctxFor({ ...initialState, elements: [el('line', 54.2, 50), el('seriesL', 995e-9)] })
    expect(c.vswr).toBeLessThan(1.05)
    expect(advance(1, m(), c)).toBe(m().steps.length - 1) // parked at the final manual step
  })
})

describe('mission 3: stub match on the Y chart', () => {
  it('predicates are reachable with a line + open stub', () => {
    const m = MISSIONS[2]
    let found: AppState | null = null
    outer: for (let d = 1; d < 180; d += 0.5) {
      const lineOnly = ctxFor({ ...initialState, elements: [el('line', d, 50)] })
      const den = lineOnly.zInNorm.re ** 2 + lineOnly.zInNorm.im ** 2
      if (Math.abs(lineOnly.zInNorm.re / den - 1) > 0.04) continue
      for (let l = 1; l < 180; l += 0.5) {
        const s: AppState = {
          ...initialState,
          view: { ...initialState.view, gridMode: 'y' },
          elements: [el('line', d, 50), el('stubOpen', l, 50)],
        }
        if (ctxFor(s).vswr < 1.5) { found = s; break outer }
      }
    }
    expect(found).not.toBeNull()
    expect(advance(1, m, ctxFor(found!))).toBe(m.steps.length - 1)
  })
})
