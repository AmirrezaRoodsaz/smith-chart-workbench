import type { Complex } from '../core/complex'
import type { AppState } from '../app/state'

export interface TourCtx { state: AppState; vswr: number; zInNorm: Complex }

export interface TourStep {
  text: string
  target?: string // data-tour attribute of the element to highlight
  manual?: boolean // advances with the Next button instead of a predicate
  done?: (c: TourCtx) => boolean
}

export interface Mission { id: string; title: string; blurb: string; steps: TourStep[] }

// Skip forward over satisfied auto steps; stop at manual steps and
// unsatisfied predicates. Monotonic: never moves backward.
export function advance(idx: number, m: Mission, ctx: TourCtx): number {
  let i = idx
  while (i < m.steps.length) {
    const s = m.steps[i]
    if (s.manual || !s.done || !s.done(ctx)) break
    i++
  }
  return i
}
