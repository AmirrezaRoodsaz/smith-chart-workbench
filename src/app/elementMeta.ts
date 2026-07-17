import type { ElementKind } from '../core/elements'

export const KIND_META: Record<ElementKind, { label: string; unit: string; toDisplay: number }> = {
  seriesL: { label: 'Series L', unit: 'nH', toDisplay: 1e9 },
  seriesC: { label: 'Series C', unit: 'pF', toDisplay: 1e12 },
  seriesR: { label: 'Series R', unit: 'Ω', toDisplay: 1 },
  shuntL: { label: 'Shunt L', unit: 'nH', toDisplay: 1e9 },
  shuntC: { label: 'Shunt C', unit: 'pF', toDisplay: 1e12 },
  shuntR: { label: 'Shunt R', unit: 'Ω', toDisplay: 1 },
  line: { label: 'Line', unit: '°', toDisplay: 1 },
  stubOpen: { label: 'Open stub', unit: '°', toDisplay: 1 },
  stubShort: { label: 'Short stub', unit: '°', toDisplay: 1 },
}

export const RANGES: Record<ElementKind, [number, number]> = {
  seriesL: [1e-10, 1e-5], shuntL: [1e-10, 1e-5],
  seriesC: [1e-13, 1e-7], shuntC: [1e-13, 1e-7],
  seriesR: [0.1, 1e4], shuntR: [0.1, 1e4],
  line: [1, 180], stubOpen: [1, 180], stubShort: [1, 180],
}

export function sliderT(value: number, kind: ElementKind): number {
  const [min, max] = RANGES[kind]
  // ponytail: no Math.round here — rounding to an integer grid quantizes the
  // round trip past the test's tolerance; the <input type="range"> still
  // snaps user drags to integer steps via its default `step`.
  const t = (1000 * Math.log(value / min)) / Math.log(max / min)
  return Math.min(1000, Math.max(0, t))
}

export function valueFromT(t: number, kind: ElementKind): number {
  const [min, max] = RANGES[kind]
  return min * Math.pow(max / min, t / 1000)
}
