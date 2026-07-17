import type { CircuitElement } from '../core/elements'
import { degToMeters, formatEng } from '../core/units'
import type { AppState, Dispatch } from './state'
import { KIND_META, sliderT, valueFromT } from './elementMeta'

const CORE_UNIT: Record<string, string> = { nH: 'H', pF: 'F', 'Ω': 'Ω' }

function Row({ el, index, count, freqHz, dispatch }: { el: CircuitElement; index: number; count: number; freqHz: number; dispatch: Dispatch }) {
  const meta = KIND_META[el.kind]
  const isLine = el.kind === 'line' || el.kind === 'stubOpen' || el.kind === 'stubShort'
  const display = Number((el.value * meta.toDisplay).toPrecision(4))
  const valText = meta.unit === '°' ? `${el.value.toFixed(1)}° (${(el.value / 360).toFixed(3)}λ ≈ ${(degToMeters(el.value, freqHz) * 1000).toFixed(0)} mm)` : formatEng(el.value, CORE_UNIT[meta.unit])
  return (
    <li className={el.enabled ? 'el-row' : 'el-row el-off'}>
      <div className="el-head">
        <span className="el-swatch" aria-hidden="true" style={{ background: `var(--arc-${index % 6})` }} />
        <span className="el-name">{meta.label}</span>
        <span className="el-val">{valText}</span>
        <span className="el-btns">
          <button disabled={index === 0} onClick={() => dispatch({ type: 'moveElement', id: el.id, dir: -1 })} aria-label="Move up">↑</button>
          <button disabled={index === count - 1} onClick={() => dispatch({ type: 'moveElement', id: el.id, dir: 1 })} aria-label="Move down">↓</button>
          <button onClick={() => dispatch({ type: 'toggleElement', id: el.id })} aria-label={el.enabled ? 'Disable' : 'Enable'}>{el.enabled ? '◉' : '○'}</button>
          <button onClick={() => dispatch({ type: 'removeElement', id: el.id })} aria-label="Remove">✕</button>
        </span>
      </div>
      <div className="el-controls">
        <input type="range" min={0} max={1000} value={sliderT(el.value, el.kind)} aria-label={`${meta.label} slider`} aria-valuetext={valText}
          onChange={(e) => dispatch({ type: 'updateElement', id: el.id, patch: { value: valueFromT(Number(e.target.value), el.kind) }, coalesce: `v-${el.id}` })}
          onPointerUp={() => dispatch({ type: 'endCoalesce' })}
          onKeyUp={() => dispatch({ type: 'endCoalesce' })}
          onBlur={() => dispatch({ type: 'endCoalesce' })} />
        <input key={display} type="number" step="any" defaultValue={display} aria-label={`${meta.label} value in ${meta.unit}`}
          onBlur={(e) => {
            const n = Number(e.target.value)
            if (n === Number((el.value * meta.toDisplay).toPrecision(4))) return
            const v = n / meta.toDisplay
            if (Number.isFinite(v) && v > 0) dispatch({ type: 'updateElement', id: el.id, patch: { value: v } })
          }}
          onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }} />
        <span className="el-unit">{meta.unit}</span>
        {isLine && (
          <>
            <input key={el.lineZ0} type="number" className="el-z0" defaultValue={el.lineZ0 ?? 50} aria-label="Line impedance"
              onBlur={(e) => {
                const v = Number(e.target.value)
                if (v === (el.lineZ0 ?? 50)) return
                if (Number.isFinite(v) && v > 0) dispatch({ type: 'updateElement', id: el.id, patch: { lineZ0: v } })
              }}
              onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }} />
            <span className="el-unit">Ω line</span>
          </>
        )}
      </div>
    </li>
  )
}

export function ElementList({ state, dispatch }: { state: AppState; dispatch: Dispatch }) {
  if (state.elements.length === 0) return <section><h2>Network</h2><p className="hint">No elements yet — add one above. Order runs load → source.</p></section>
  return (
    <section>
      <h2>Network (load → source)</h2>
      <ul className="el-list">
        {state.elements.map((el, i) => (
          <Row key={el.id} el={el} index={i} count={state.elements.length} freqHz={state.freqHz} dispatch={dispatch} />
        ))}
      </ul>
    </section>
  )
}
