import { abs, type Complex } from './complex'
import type { CircuitElement, ElementKind } from './elements'
import { evaluateChain } from './network'
import { gammaFromZ } from './transform'
import { formatEng } from './units'

export interface MatchSolution { label: string; elements: CircuitElement[] }

// ponytail: uid grows for the process lifetime; it's only an id counter
let uid = 0
const mk = (kind: ElementKind, value: number, lineZ0?: number): CircuitElement =>
  ({ id: `m${uid++}`, kind, value, lineZ0, enabled: true })

const seriesFromX = (x: number, w: number): CircuitElement =>
  x >= 0 ? mk('seriesL', x / w) : mk('seriesC', -1 / (w * x))
const shuntFromB = (b: number, w: number): CircuitElement =>
  b >= 0 ? mk('shuntC', b / w) : mk('shuntL', -1 / (w * b))

const NAME: Record<ElementKind, string> = {
  seriesL: 'series L', seriesC: 'series C', seriesR: 'series R',
  shuntL: 'shunt L', shuntC: 'shunt C', shuntR: 'shunt R',
  line: 'line', stubOpen: 'open stub', stubShort: 'short stub',
}
const UNIT: Partial<Record<ElementKind, string>> = { seriesL: 'H', shuntL: 'H', seriesC: 'F', shuntC: 'F' }

function label(elements: CircuitElement[]): string {
  return elements
    .map((e) => `${NAME[e.kind]} ${UNIT[e.kind] ? formatEng(e.value, UNIT[e.kind]!) : `${e.value.toFixed(1)}°`}`)
    .join(' → ')
}

function verified(elements: CircuitElement[], zLoad: Complex, z0: number, fHz: number): MatchSolution | null {
  // ponytail: near-degenerate components (X or B ≈ 0) produce value 0/Infinity — drop those solutions
  for (const e of elements) if (!Number.isFinite(e.value) || e.value <= 0) return null
  const stages = evaluateChain(zLoad, elements, fHz)
  if (abs(gammaFromZ(stages[stages.length - 1], z0)) >= 1e-4) return null
  return { label: label(elements), elements }
}

// Two-element L-networks. Chain order is load-first.
// Topology A: shunt jB at the load, then series jX. Re{1/(YL + jB)} = z0 requires G ≤ 1/z0.
// Topology B: series jX at the load, then shunt jB. Re{1/(ZL + jX)} = 1/z0 requires R ≤ z0.
export function lNetworkSolutions(zLoad: Complex, z0: number, fHz: number): MatchSolution[] {
  const w = 2 * Math.PI * fHz
  const { re: R, im: X } = zLoad
  const out: MatchSolution[] = []
  const d = R * R + X * X
  const G = R / d
  const BL = -X / d

  // X1/B1 are the NEGATED post-element reactance/susceptance; the call sites negate again. Intentional — do not "fix" the double negation.
  const dA = G / z0 - G * G
  if (dA >= 0) {
    for (const sgn of [1, -1] as const) {
      const Btot = sgn * Math.sqrt(dA)                       // BL + Bshunt
      const X1 = -Btot / (G * G + Btot * Btot)               // reactance seen after the shunt
      const s = verified([shuntFromB(Btot - BL, w), seriesFromX(-X1, w)], zLoad, z0, fHz)
      if (s) out.push(s)
    }
  }
  const dB = R * (z0 - R)
  if (dB >= 0) {
    for (const sgn of [1, -1] as const) {
      const Xtot = sgn * Math.sqrt(dB)                       // X + Xseries
      const B1 = -Xtot / (R * R + Xtot * Xtot)               // susceptance seen after the series el
      const s = verified([seriesFromX(Xtot - X, w), shuntFromB(-B1, w)], zLoad, z0, fHz)
      if (s) out.push(s)
    }
  }
  // dedupe identical labels (degenerate ± roots when discriminant ≈ 0)
  return out.filter((s, i) => out.findIndex((o) => o.label === s.label) === i)
}

// Single-stub tuner (Pozar §5.2): series line of length d, then a shunt open stub of length l.
export function stubMatchSolutions(zLoad: Complex, z0: number, fHz: number): MatchSolution[] {
  const { re: RL, im: XL } = zLoad
  const ts: number[] = []
  if (Math.abs(RL - z0) < 1e-9) {
    ts.push(-XL / (2 * z0))
  } else {
    const root = Math.sqrt((RL * ((z0 - RL) ** 2 + XL ** 2)) / z0)
    ts.push((XL + root) / (RL - z0), (XL - root) / (RL - z0))
  }
  const out: MatchSolution[] = []
  for (const t of ts) {
    let dDeg = (Math.atan(t) * 180) / Math.PI
    if (dDeg < 0) dDeg += 180                                 // + λ/2
    const B =
      (RL * RL * t - (z0 - XL * t) * (XL + z0 * t)) /
      (z0 * (RL * RL + (XL + z0 * t) ** 2))
    let lDeg = (Math.atan(-B * z0) * 180) / Math.PI           // open stub: tan(βl) = -B·z0
    if (lDeg < 0) lDeg += 180
    if (dDeg < 0.01) dDeg = 180                                // zero-length line → half-wave (identity)
    const els = lDeg < 0.01
      ? [mk('line', dDeg, z0)]                                 // no stub needed
      : [mk('line', dDeg, z0), mk('stubOpen', lDeg, z0)]
    const s = verified(els, zLoad, z0, fHz)
    if (s) out.push(s)
  }
  return out
}
