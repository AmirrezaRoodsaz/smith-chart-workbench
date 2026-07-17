import { useEffect, useMemo, useReducer, useState } from 'react'
import { cx, type Complex } from './core/complex'
import { evaluateChain, arcPoints } from './core/network'
import { gammaFromZ, vswrFromGamma } from './core/transform'
import { pathFrom } from './chart/geometry'
import { SmithChart, type ChartArc, type ChartMarker } from './chart/SmithChart'
import { ReadoutPanel } from './app/ReadoutPanel'
import { SettingsBar } from './app/SettingsBar'
import { ElementPalette } from './app/ElementPalette'
import { ElementList } from './app/ElementList'
import { AutoMatchPanel } from './app/AutoMatchPanel'
import { initHistory, withHistory, type HistoryAction } from './app/history'
import { initialState, reduce, type Action, type AppState } from './app/state'
import { decodeState, encodeState } from './app/urlState'

function initialTheme(): 'light' | 'dark' {
  const saved = localStorage.getItem('smith-theme')
  if (saved === 'light' || saved === 'dark') return saved
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

const historyReducer = withHistory<AppState, Action>(reduce)

export type Dispatch = (a: HistoryAction<Action>) => void

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

  const derived = useMemo(() => {
    const zLoad = cx(state.loadRe, state.loadIm)
    const stages = evaluateChain(zLoad, state.elements, state.freqHz)
    const arcs: ChartArc[] = []
    state.elements.forEach((el, i) => {
      if (el.enabled) arcs.push({ id: el.id, d: pathFrom(arcPoints(stages[i], el, state.freqHz, state.z0)), colorIndex: i % 6 })
    })
    const gLoad = gammaFromZ(zLoad, state.z0)
    const gIn = gammaFromZ(stages[stages.length - 1], state.z0)
    const markers: ChartMarker[] = [{ gamma: gLoad, kind: 'load' }, { gamma: gIn, kind: 'input' }]
    return { arcs, markers, vswr: vswrFromGamma(gIn), gIn }
  }, [state])

  const vswrClass = derived.vswr < 1.5 ? 'good' : derived.vswr < 2 ? 'ok' : 'bad'

  return (
    <div className="app">
      <header className="app-header">
        <h1>Smith Chart</h1>
        <div className="header-tools">
          <span className={`vswr-badge ${vswrClass}`} title="VSWR at the input after all elements">
            VSWR {Number.isFinite(derived.vswr) ? derived.vswr.toFixed(2) : '∞'}
          </span>
          <button onClick={() => dispatch({ type: 'undo' })} disabled={hist.past.length === 0} aria-label="Undo">↶</button>
          <button onClick={() => dispatch({ type: 'redo' })} disabled={hist.future.length === 0} aria-label="Redo">↷</button>
          <button onClick={() => navigator.clipboard.writeText(location.href)} aria-label="Copy share link">🔗</button>
          <button className="theme-toggle" aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </header>
      <SettingsBar state={state} dispatch={dispatch} />
      <main className="workbench">
        <aside className="sidebar">
          <ElementPalette dispatch={dispatch} />
          <ElementList state={state} dispatch={dispatch} />
          <AutoMatchPanel state={state} dispatch={dispatch} />
        </aside>
        <div className="chart-area">
          <SmithChart
            onHoverGamma={setHoverGamma}
            gridMode={state.view.gridMode}
            showVswr={state.view.showVswr}
            showQ={state.view.showQ}
            showRuler={state.view.showRuler}
            arcs={derived.arcs}
            markers={derived.markers}
          />
          <ReadoutPanel gamma={hoverGamma} z0={state.z0} />
        </div>
      </main>
    </div>
  )
}
