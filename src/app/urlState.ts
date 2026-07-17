import type { CircuitElement } from '../core/elements'
import { initialState, type AppState, type ViewOptions } from './state'

const VERSION = 'v1'
const KINDS = new Set(['seriesR', 'seriesL', 'seriesC', 'shuntR', 'shuntL', 'shuntC', 'line', 'stubOpen', 'stubShort'])
const GRID_MODES = new Set(['z', 'y', 'zy'])
const MAX_ELEMENTS = 64

export function encodeState(s: AppState): string {
  const bytes = new TextEncoder().encode(JSON.stringify(s))
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return `${VERSION}.${btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}`
}

const posNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0
const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

function validElement(e: unknown): e is CircuitElement {
  if (typeof e !== 'object' || e === null) return false
  const o = e as Record<string, unknown>
  return (
    typeof o.id === 'string' &&
    typeof o.kind === 'string' && KINDS.has(o.kind) &&
    posNum(o.value) &&
    (o.lineZ0 === undefined || posNum(o.lineZ0)) &&
    typeof o.enabled === 'boolean'
  )
}

export function decodeState(hash: string): AppState | null {
  try {
    const dot = hash.indexOf('.')
    if (dot < 0 || hash.slice(0, dot) !== VERSION) return null
    const b64 = hash.slice(dot + 1).replace(/-/g, '+').replace(/_/g, '/')
    const bin = atob(b64)
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0))
    const raw = JSON.parse(new TextDecoder().decode(bytes)) as Record<string, unknown>
    if (!posNum(raw.z0) || !posNum(raw.freqHz) || !num(raw.loadRe) || raw.loadRe < 0 || !num(raw.loadIm)) return null
    if (!Array.isArray(raw.elements) || !raw.elements.every(validElement)) return null
    const rv = (typeof raw.view === 'object' && raw.view !== null ? raw.view : {}) as Record<string, unknown>
    const view: ViewOptions = {
      gridMode: typeof rv.gridMode === 'string' && GRID_MODES.has(rv.gridMode) ? (rv.gridMode as ViewOptions['gridMode']) : initialState.view.gridMode,
      showVswr: typeof rv.showVswr === 'boolean' ? rv.showVswr : initialState.view.showVswr,
      showQ: typeof rv.showQ === 'boolean' ? rv.showQ : initialState.view.showQ,
      showRuler: typeof rv.showRuler === 'boolean' ? rv.showRuler : initialState.view.showRuler,
    }
    const elements: CircuitElement[] = (raw.elements as CircuitElement[]).slice(0, MAX_ELEMENTS).map((e) => ({
      id: e.id, kind: e.kind, value: e.value, enabled: e.enabled,
      ...(e.lineZ0 !== undefined ? { lineZ0: e.lineZ0 } : {}),
    }))
    return { z0: raw.z0, freqHz: raw.freqHz, loadRe: raw.loadRe, loadIm: raw.loadIm, elements, view }
  } catch {
    return null
  }
}
