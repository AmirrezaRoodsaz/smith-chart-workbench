import { useMemo } from 'react'
import { abs, cx } from '../core/complex'
import { lNetworkSolutions, stubMatchSolutions } from '../core/synthesis'
import { gammaFromZ } from '../core/transform'
import { newId, type AppState, type Dispatch } from './state'

export function AutoMatchPanel({ state, dispatch, zRe, zIm }: { state: AppState; dispatch: Dispatch; zRe: number; zIm: number }) {
  const { z0, freqHz } = state
  const sols = useMemo(() => {
    const zl = cx(zRe, zIm)
    return [...lNetworkSolutions(zl, z0, freqHz), ...stubMatchSolutions(zl, z0, freqHz)]
  }, [zRe, zIm, z0, freqHz])
  const matched = abs(gammaFromZ(cx(zRe, zIm), z0)) < 0.01

  return (
    <section className="automatch" data-explain="automatch">
      <h2>Auto-match</h2>
      {matched && <p className="hint">Load is already matched.</p>}
      {!matched && sols.length === 0 && <p className="hint">No closed-form solution for this load.</p>}
      <ul>
        {sols.map((s) => (
          <li key={s.elements[0]?.id ?? s.label}>
            <button
              title="Replaces the current network"
              onClick={() => dispatch({ type: 'replaceChain', elements: s.elements.map((e) => ({ ...e, id: newId() })) })}>
              {s.label}
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
