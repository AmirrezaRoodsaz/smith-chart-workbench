import type { CircuitElement, ElementKind } from '../core/elements'

export interface ViewOptions {
  gridMode: 'z' | 'y' | 'zy'
  showVswr: boolean
  showQ: boolean
  showRuler: boolean
}

export interface AppState {
  z0: number
  freqHz: number
  loadRe: number
  loadIm: number
  elements: CircuitElement[]
  view: ViewOptions
}

export const initialState: AppState = {
  z0: 50,
  freqHz: 14.2e6,
  loadRe: 36,
  loadIm: 74,
  elements: [],
  view: { gridMode: 'z', showVswr: false, showQ: false, showRuler: false },
}

export const ELEMENT_DEFAULTS: Record<ElementKind, { value: number; lineZ0?: number }> = {
  seriesL: { value: 100e-9 }, seriesC: { value: 100e-12 }, seriesR: { value: 50 },
  shuntL: { value: 100e-9 }, shuntC: { value: 100e-12 }, shuntR: { value: 50 },
  line: { value: 45, lineZ0: 50 }, stubOpen: { value: 45, lineZ0: 50 }, stubShort: { value: 45, lineZ0: 50 },
}

export type Action =
  | { type: 'setZ0'; z0: number }
  | { type: 'setFreq'; freqHz: number }
  | { type: 'setLoad'; re: number; im: number }
  | { type: 'addElement'; kind: ElementKind }
  | { type: 'updateElement'; id: string; patch: Partial<Pick<CircuitElement, 'value' | 'lineZ0'>>; coalesce?: string }
  | { type: 'toggleElement'; id: string }
  | { type: 'removeElement'; id: string }
  | { type: 'moveElement'; id: string; dir: -1 | 1 }
  | { type: 'replaceChain'; elements: CircuitElement[] }
  | { type: 'setView'; patch: Partial<ViewOptions> }
  | { type: 'loadState'; state: AppState }

export const newId = (): string => crypto.randomUUID().slice(0, 8)

export function reduce(s: AppState, a: Action): AppState {
  switch (a.type) {
    case 'setZ0':
      return Number.isFinite(a.z0) && a.z0 > 0 ? { ...s, z0: a.z0 } : s
    case 'setFreq':
      return Number.isFinite(a.freqHz) && a.freqHz > 0 ? { ...s, freqHz: a.freqHz } : s
    case 'setLoad':
      return Number.isFinite(a.re) && Number.isFinite(a.im) && a.re >= 0 ? { ...s, loadRe: a.re, loadIm: a.im } : s
    case 'addElement':
      return { ...s, elements: [...s.elements, { id: newId(), kind: a.kind, enabled: true, ...ELEMENT_DEFAULTS[a.kind] }] }
    case 'updateElement':
      return { ...s, elements: s.elements.map((e) => (e.id === a.id ? { ...e, ...a.patch } : e)) }
    case 'toggleElement':
      return { ...s, elements: s.elements.map((e) => (e.id === a.id ? { ...e, enabled: !e.enabled } : e)) }
    case 'removeElement':
      return { ...s, elements: s.elements.filter((e) => e.id !== a.id) }
    case 'moveElement': {
      const i = s.elements.findIndex((e) => e.id === a.id)
      const j = i + a.dir
      if (i < 0 || j < 0 || j >= s.elements.length) return s
      const els = [...s.elements]
      ;[els[i], els[j]] = [els[j], els[i]]
      return { ...s, elements: els }
    }
    case 'replaceChain':
      return { ...s, elements: a.elements }
    case 'setView':
      return { ...s, view: { ...s.view, ...a.patch } }
    case 'loadState':
      return a.state
  }
}
