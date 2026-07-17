export interface History<S> { past: S[]; present: S; future: S[]; key?: string }
export type HistoryAction<A> = A | { type: 'undo' } | { type: 'redo' }

const LIMIT = 100

export const initHistory = <S,>(present: S): History<S> => ({ past: [], present, future: [] })

export function withHistory<S, A extends { type: string; coalesce?: string }>(
  reduce: (s: S, a: A) => S,
): (h: History<S>, a: HistoryAction<A>) => History<S> {
  return (h, a) => {
    if (a.type === 'undo') {
      if (h.past.length === 0) return h
      return { past: h.past.slice(0, -1), present: h.past[h.past.length - 1], future: [h.present, ...h.future] }
    }
    if (a.type === 'redo') {
      if (h.future.length === 0) return h
      return { past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1) }
    }
    const act = a as A
    const next = reduce(h.present, act)
    if (next === h.present) return h
    if (act.coalesce !== undefined && act.coalesce === h.key) {
      return { ...h, present: next }                       // continue the same drag: replace, don't push
    }
    return { past: [...h.past, h.present].slice(-LIMIT), present: next, future: [], key: act.coalesce }
  }
}
