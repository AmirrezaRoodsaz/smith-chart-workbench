import { useRef, useState } from 'react'
import { abs, arg, cx, type Complex } from '../core/complex'
import { gammaFromPolar, gammaFromZ, gammaMagFromVswr, vswrFromGamma, zFromGamma } from '../core/transform'
import type { AppState, Dispatch } from './state'

type LoadMode = 'z' | 'gamma' | 'vswr'

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
  const [loadMode, setLoadMode] = useState<LoadMode>('z')
  const gL = gammaFromZ(cx(state.loadRe, state.loadIm), state.z0)
  const gMag = abs(gL)
  const gAng = (arg(gL) * 180) / Math.PI
  const sL = vswrFromGamma(gL)
  const sDisp = Number.isFinite(sL) ? Number(sL.toPrecision(4)) : 999

  function commitPolar(mag: number, angDeg: number) {
    if (!(mag >= 0 && mag < 1)) return // rim/outside is non-physical for a passive load
    const z = zFromGamma(gammaFromPolar(mag, angDeg), state.z0)
    dispatch({ type: 'setLoad', re: z.re, im: z.im })
  }
  return (
    <div className="settings">
      <label data-explain="settings-z0">Z₀
        <select value={Z0S.includes(state.z0) ? String(state.z0) : 'custom'}
          onChange={(e) => { if (e.target.value !== 'custom') dispatch({ type: 'setZ0', z0: Number(e.target.value) }) }}
          aria-label="System impedance">
          {Z0S.map((z) => <option key={z} value={z}>{z} Ω</option>)}
          <option value="custom">custom</option>
        </select>
        <NumField value={state.z0} onCommit={(v) => dispatch({ type: 'setZ0', z0: v })} label="Z0 ohms" />
      </label>
      <label data-explain="settings-freq" data-tour="settings-freq">f
        <NumField value={Number(freqMHz.toPrecision(6))} onCommit={(v) => dispatch({ type: 'setFreq', freqHz: v * 1e6 })} label="Frequency MHz" />
        MHz
        <select value="" onChange={(e) => { const f = Number(e.target.value); if (f) dispatch({ type: 'setFreq', freqHz: f }) }} aria-label="Ham band preset">
          <option value="">band…</option>
          {BANDS.map(([name, f]) => <option key={name} value={f}>{name}</option>)}
        </select>
      </label>
      <label data-explain="settings-load" data-tour="settings-load">Load
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
            <select value={loadMode} onChange={(e) => setLoadMode(e.target.value as LoadMode)} aria-label="Load entry mode">
              <option value="z">R+jX</option>
              <option value="gamma">Γ</option>
              <option value="vswr">VSWR</option>
            </select>
            {loadMode === 'z' && (
              <>
                <NumField value={state.loadRe} onCommit={(v) => dispatch({ type: 'setLoad', re: v, im: state.loadIm })} label="Load resistance" />
                +j
                <NumField value={state.loadIm} onCommit={(v) => dispatch({ type: 'setLoad', re: state.loadRe, im: v })} label="Load reactance" />
                Ω
              </>
            )}
            {loadMode === 'gamma' && (
              <>
                <NumField value={Number(gMag.toPrecision(4))} onCommit={(v) => commitPolar(v, gAng)} label="Gamma magnitude" />
                ∠
                <NumField value={Number(gAng.toPrecision(4))} onCommit={(v) => commitPolar(gMag, v)} label="Gamma angle degrees" />
                °
              </>
            )}
            {loadMode === 'vswr' && (
              <>
                <NumField value={sDisp} onCommit={(v) => { if (v >= 1) commitPolar(gammaMagFromVswr(v), gAng) }} label="Load VSWR" />
                ∠
                <NumField value={Number(gAng.toPrecision(4))} onCommit={(v) => commitPolar(gMag, v)} label="VSWR angle degrees" />
                °
              </>
            )}
          </>
        )}
        <button onClick={() => fileRef.current?.click()}>Load .s1p</button>
        <input ref={fileRef} type="file" accept=".s1p,.s2p,.snp,.txt" hidden aria-label="Import Touchstone file"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = '' }} />
      </label>
      {importError && <span className="import-error" role="alert">{importError}</span>}
      {sweepWarning && <span className="hint">{sweepWarning}</span>}
      <span className="view-toggles">
        <label data-explain="toggle-vswr" data-tour="toggle-vswr"><input type="checkbox" checked={state.view.showVswr} onChange={() => dispatch({ type: 'setView', patch: { showVswr: !state.view.showVswr } })} /> VSWR</label>
        <label data-explain="toggle-q"><input type="checkbox" checked={state.view.showQ} onChange={() => dispatch({ type: 'setView', patch: { showQ: !state.view.showQ } })} /> Q</label>
        <label data-explain="toggle-ruler" data-tour="toggle-ruler"><input type="checkbox" checked={state.view.showRuler} onChange={() => dispatch({ type: 'setView', patch: { showRuler: !state.view.showRuler } })} /> λ ruler</label>
        <select data-explain="grid-mode" data-tour="grid-mode" value={state.view.gridMode} onChange={(e) => dispatch({ type: 'setView', patch: { gridMode: e.target.value as AppState['view']['gridMode'] } })} aria-label="Grid mode">
          <option value="z">Z grid</option>
          <option value="y">Y grid</option>
          <option value="zy">Z+Y</option>
        </select>
      </span>
    </div>
  )
}
