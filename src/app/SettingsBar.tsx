import { useRef } from 'react'
import type { Complex } from '../core/complex'
import type { AppState, Dispatch } from './state'

const BANDS: ReadonlyArray<readonly [string, number]> = [
  ['160 m', 1.9e6], ['80 m', 3.65e6], ['40 m', 7.1e6], ['30 m', 10.12e6], ['20 m', 14.2e6],
  ['17 m', 18.1e6], ['15 m', 21.2e6], ['12 m', 24.94e6], ['10 m', 28.5e6],
  ['6 m', 50.5e6], ['2 m', 145e6], ['70 cm', 435e6],
]
const Z0S = [50, 75, 300, 450]

// numeric field that commits on blur/Enter (typing doesn't fight the reducer)
function NumField({ value, onCommit, label, step }: { value: number; onCommit: (v: number) => void; label: string; step?: number }) {
  return (
    <input
      key={value}
      type="number"
      step={step ?? 'any'}
      defaultValue={value}
      aria-label={label}
      onBlur={(e) => { const v = Number(e.target.value); if (Number.isFinite(v)) onCommit(v) }}
      onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
    />
  )
}

export function SettingsBar({
  state,
  dispatch,
  sweepName,
  sweepWarning,
  importError,
  fileZ,
  onFile,
  onClearFile,
}: {
  state: AppState
  dispatch: Dispatch
  sweepName: string | null
  sweepWarning?: string
  importError: string | null
  fileZ: Complex | null
  onFile: (f: File) => void
  onClearFile: () => void
}) {
  const freqMHz = state.freqHz / 1e6
  const fileRef = useRef<HTMLInputElement>(null)
  return (
    <div className="settings">
      <label>Z₀
        <select value={Z0S.includes(state.z0) ? String(state.z0) : 'custom'}
          onChange={(e) => { if (e.target.value !== 'custom') dispatch({ type: 'setZ0', z0: Number(e.target.value) }) }}
          aria-label="System impedance">
          {Z0S.map((z) => <option key={z} value={z}>{z} Ω</option>)}
          <option value="custom">custom</option>
        </select>
        <NumField value={state.z0} onCommit={(v) => dispatch({ type: 'setZ0', z0: v })} label="Z0 ohms" />
      </label>
      <label>f
        <NumField value={Number(freqMHz.toPrecision(6))} onCommit={(v) => dispatch({ type: 'setFreq', freqHz: v * 1e6 })} label="Frequency MHz" />
        MHz
        <select value="" onChange={(e) => { const f = Number(e.target.value); if (f) dispatch({ type: 'setFreq', freqHz: f }) }} aria-label="Ham band preset">
          <option value="">band…</option>
          {BANDS.map(([name, f]) => <option key={name} value={f}>{name}</option>)}
        </select>
      </label>
      <label>Load
        {sweepName ? (
          <>
            <span className="file-chip">
              {sweepName}
              <button aria-label="Clear imported file" onClick={onClearFile}>✕</button>
            </span>
            <span className="file-z">
              {fileZ ? `${fileZ.re.toFixed(1)} ${fileZ.im < 0 ? '-' : '+'} j${Math.abs(fileZ.im).toFixed(1)} Ω` : 'out of band'}
            </span>
          </>
        ) : (
          <>
            <NumField value={state.loadRe} onCommit={(v) => dispatch({ type: 'setLoad', re: v, im: state.loadIm })} label="Load resistance" />
            +j
            <NumField value={state.loadIm} onCommit={(v) => dispatch({ type: 'setLoad', re: state.loadRe, im: v })} label="Load reactance" />
            Ω
          </>
        )}
        <button onClick={() => fileRef.current?.click()}>Load .s1p</button>
        <input ref={fileRef} type="file" accept=".s1p,.s2p,.snp,.txt" hidden aria-label="Import Touchstone file"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = '' }} />
      </label>
      {importError && <span className="import-error" role="alert">{importError}</span>}
      {sweepWarning && <span className="hint">{sweepWarning}</span>}
      <span className="view-toggles">
        <label><input type="checkbox" checked={state.view.showVswr} onChange={() => dispatch({ type: 'setView', patch: { showVswr: !state.view.showVswr } })} /> VSWR</label>
        <label><input type="checkbox" checked={state.view.showQ} onChange={() => dispatch({ type: 'setView', patch: { showQ: !state.view.showQ } })} /> Q</label>
        <label><input type="checkbox" checked={state.view.showRuler} onChange={() => dispatch({ type: 'setView', patch: { showRuler: !state.view.showRuler } })} /> λ ruler</label>
        <select value={state.view.gridMode} onChange={(e) => dispatch({ type: 'setView', patch: { gridMode: e.target.value as AppState['view']['gridMode'] } })} aria-label="Grid mode">
          <option value="z">Z grid</option>
          <option value="y">Y grid</option>
          <option value="zy">Z+Y</option>
        </select>
      </span>
    </div>
  )
}
