import { useCallback, useEffect, useMemo, useReducer, useState } from 'react'
import { cx, type Complex } from './core/complex'
import { evaluateChain, arcPoints } from './core/network'
import { gammaFromZ, vswrFromGamma } from './core/transform'
import { pathFrom } from './chart/geometry'
import { SmithChart, type ChartArc, type ChartMarker, type ChartTrace } from './chart/SmithChart'
import { ReadoutPanel } from './app/ReadoutPanel'
import { VswrStrip, type StripSeries } from './app/VswrStrip'
import { SettingsBar } from './app/SettingsBar'
import { ElementPalette } from './app/ElementPalette'
import { ElementList } from './app/ElementList'
import { AutoMatchPanel } from './app/AutoMatchPanel'
import { initHistory, withHistory } from './app/history'
import { initialState, reduce, type Action, type AppState } from './app/state'
import { decodeState, encodeState } from './app/urlState'
import { exportChartPng } from './app/exportPng'
import { networkSummary } from './app/summary'
import { parseTouchstone, TouchstoneError, type TouchstoneData, type SweepPoint } from './core/touchstone'
import { sweepChain, interpZ, nearestIndex } from './core/sweep'
import { MorphView } from './teach/MorphView'
import { WalkLine } from './teach/WalkLineView'
import { ExplainLayer } from './teach/ExplainLayer'

function initialTheme(): 'light' | 'dark' {
  const saved = localStorage.getItem('smith-theme')
  if (saved === 'light' || saved === 'dark') return saved
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

const historyReducer = withHistory<AppState, Action>(reduce)

export default function App() {
  const [theme, setTheme] = useState(initialTheme)
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('smith-theme', theme)
  }, [theme])

  const [hist, dispatch] = useReducer(historyReducer, undefined, () =>
    initHistory(decodeState(location.hash.slice(1)) ?? initialState),
  )
  const state = hist.present

  // keep the URL hash in sync (debounced, replaceState: no history spam)
  useEffect(() => {
    const t = setTimeout(() => window.history.replaceState(null, '', '#' + encodeState(state)), 300)
    return () => clearTimeout(t)
  }, [state])

  // pasting a share link into a running tab: load the new state (replaceState above doesn't fire hashchange, so no loop)
  useEffect(() => {
    const h = () => {
      const s = decodeState(location.hash.slice(1))
      if (s) dispatch({ type: 'loadState', state: s })
    }
    window.addEventListener('hashchange', h)
    return () => window.removeEventListener('hashchange', h)
  }, [])

  // Ctrl/Cmd+Z undo, +Shift+Z / +Y redo (not while typing in inputs)
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (e.key.toLowerCase() === 'z') { e.preventDefault(); dispatch({ type: e.shiftKey ? 'redo' : 'undo' }) }
      if (e.key.toLowerCase() === 'y') { e.preventDefault(); dispatch({ type: 'redo' }) }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  const [hoverGamma, setHoverGamma] = useState<Complex | null>(null)
  const [modal, setModal] = useState<'morph' | 'walkline' | null>(null)
  const [explain, setExplain] = useState(false)

  const exitExplain = useCallback(() => setExplain(false), [])

  const [sweep, setSweep] = useState<{ name: string; data: TouchstoneData } | null>(null)
  const [importError, setImportError] = useState<string | null>(null)

  async function handleFile(f: File) {
    try {
      const data = parseTouchstone(await f.text())
      setSweep({ name: f.name, data })
      setImportError(null)
      const mid = data.points[Math.floor(data.points.length / 2)]
      dispatch({ type: 'setFreq', freqHz: mid.fHz })
    } catch (err) {
      setImportError(err instanceof TouchstoneError ? err.message : 'Could not read that file')
    }
  }

  function handleClearFile() {
    setSweep(null)
    setImportError(null)
  }

  const derived = useMemo(() => {
    const zLoad = sweep
      ? (interpZ(sweep.data.points, state.freqHz) ?? sweep.data.points[nearestIndex(sweep.data.points, state.freqHz)].z)
      : cx(state.loadRe, state.loadIm)
    const stages = evaluateChain(zLoad, state.elements, state.freqHz)
    const arcs: ChartArc[] = []
    state.elements.forEach((el, i) => {
      if (el.enabled) arcs.push({ id: el.id, d: pathFrom(arcPoints(stages[i], el, state.freqHz, state.z0)), colorIndex: i % 6 })
    })
    const gLoad = gammaFromZ(zLoad, state.z0)
    const gIn = gammaFromZ(stages[stages.length - 1], state.z0)
    const markers: ChartMarker[] = [{ gamma: gLoad, kind: 'load' }, { gamma: gIn, kind: 'input' }]

    let traces: ChartTrace[] = []
    let freqMarker: Complex | null = null
    let matchedSweep: SweepPoint[] | null = null
    let stripRaw: StripSeries[] = []
    let stripMatched: StripSeries[] = []
    if (sweep) {
      const raw = sweep.data.points
      const matched = sweepChain(raw, state.elements, state.freqHz)
      matchedSweep = matched
      traces = [
        { id: 'raw', d: pathFrom(raw.map((p) => gammaFromZ(p.z, state.z0))), className: 'trace-raw' },
        { id: 'matched', d: pathFrom(matched.map((p) => gammaFromZ(p.z, state.z0))), className: 'trace-matched' },
      ]
      const zm = interpZ(matched, state.freqHz)
      if (zm) freqMarker = gammaFromZ(zm, state.z0)
      stripRaw = raw.map((p) => ({ fHz: p.fHz, s: vswrFromGamma(gammaFromZ(p.z, state.z0)) }))
      stripMatched = matched.map((p) => ({ fHz: p.fHz, s: vswrFromGamma(gammaFromZ(p.z, state.z0)) }))
    }

    return { zLoad, gLoad, arcs, markers, vswr: vswrFromGamma(gIn), traces, freqMarker, matchedSweep, stripRaw, stripMatched }
  }, [state, sweep])

  const fileZ = sweep ? interpZ(sweep.data.points, state.freqHz) : null

  const vswrClass = derived.vswr < 1.5 ? 'good' : derived.vswr < 2 ? 'ok' : 'bad'

  return (
    <div className="app">
      <header className="app-header">
        <h1>Smith Chart</h1>
        <div className="header-tools">
          <details className="learn-menu">
            <summary>Learn</summary>
            <div className="learn-items"
              onClick={(e) => ((e.currentTarget.closest('details') as HTMLDetailsElement).open = false)}>
              <button onClick={() => setModal('morph')}>Why does it look like this?</button>
              <button onClick={() => setModal('walkline')}>Walk the line</button>
            </div>
          </details>
          <button aria-label="Explain mode" aria-pressed={explain} className={explain ? 'explain-btn on' : 'explain-btn'}
            onClick={() => setExplain(!explain)}>?</button>
          <span className={`vswr-badge ${vswrClass}`} title="VSWR at the input after all elements" data-explain="vswr-badge">
            VSWR {Number.isFinite(derived.vswr) ? derived.vswr.toFixed(2) : '∞'}
          </span>
          <button onClick={() => dispatch({ type: 'undo' })} disabled={hist.past.length === 0} aria-label="Undo">↶</button>
          <button onClick={() => dispatch({ type: 'redo' })} disabled={hist.future.length === 0} aria-label="Redo">↷</button>
          <button onClick={() => navigator.clipboard.writeText(location.href)} aria-label="Copy share link">🔗</button>
          <button aria-label="Export chart as PNG" onClick={() => {
            const svg = document.querySelector<SVGSVGElement>('svg.smith-chart')
            if (svg) void exportChartPng(svg, getComputedStyle(document.body).backgroundColor)
          }}>📷</button>
          <button aria-label="Copy network summary" onClick={() => navigator.clipboard.writeText(networkSummary(state, derived.vswr, derived.zLoad, sweep?.name))}>📋</button>
          <button className="theme-toggle" aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </header>
      <SettingsBar
        state={state}
        dispatch={dispatch}
        sweepName={sweep?.name ?? null}
        sweepWarning={sweep?.data.warning}
        importError={importError}
        fileZ={fileZ}
        onFile={handleFile}
        onClearFile={handleClearFile}
      />
      <main className="workbench">
        <aside className="sidebar">
          <ElementPalette dispatch={dispatch} />
          <ElementList state={state} dispatch={dispatch} />
          <AutoMatchPanel state={state} dispatch={dispatch} zRe={derived.zLoad.re} zIm={derived.zLoad.im} />
        </aside>
        <div className="chart-area">
          <div className="chart-col">
            <SmithChart
              onHoverGamma={setHoverGamma}
              gridMode={state.view.gridMode}
              showVswr={state.view.showVswr}
              showQ={state.view.showQ}
              showRuler={state.view.showRuler}
              arcs={derived.arcs}
              markers={derived.markers}
              traces={derived.traces}
              freqMarker={derived.freqMarker}
            />
            {sweep && (
              <div data-explain="strip">
                <VswrStrip raw={derived.stripRaw} matched={derived.stripMatched} freqHz={state.freqHz} dispatch={dispatch} />
              </div>
            )}
          </div>
          <ReadoutPanel gamma={hoverGamma} z0={state.z0} />
        </div>
      </main>
      {modal === 'morph' && <MorphView onClose={() => setModal(null)} />}
      {modal === 'walkline' && <WalkLine gLoad={derived.gLoad} onClose={() => setModal(null)} />}
      <ExplainLayer active={explain} onExit={exitExplain} />
    </div>
  )
}
