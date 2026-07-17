import { cx, type Complex } from './complex'
import type { CircuitElement } from './elements'
import { evaluateChain } from './network'
import type { SweepPoint } from './touchstone'

const LINE_KINDS = new Set(['line', 'stubOpen', 'stubShort'])

// Physical line length is fixed; electrical length scales with frequency.
export function elementsAtFreq(elements: CircuitElement[], fHz: number, designHz: number): CircuitElement[] {
  return elements.map((el) =>
    LINE_KINDS.has(el.kind) ? { ...el, value: (el.value * fHz) / designHz } : el,
  )
}

export function sweepChain(points: SweepPoint[], elements: CircuitElement[], designHz: number): SweepPoint[] {
  return points.map(({ fHz, z }) => {
    const stages = evaluateChain(z, elementsAtFreq(elements, fHz, designHz), fHz)
    return { fHz, z: stages[stages.length - 1] }
  })
}

export function interpZ(points: SweepPoint[], fHz: number): Complex | null {
  if (points.length === 0 || fHz < points[0].fHz || fHz > points[points.length - 1].fHz) return null
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i], b = points[i + 1]
    if (fHz >= a.fHz && fHz <= b.fHz) {
      const t = b.fHz === a.fHz ? 0 : (fHz - a.fHz) / (b.fHz - a.fHz)
      return cx(a.z.re + t * (b.z.re - a.z.re), a.z.im + t * (b.z.im - a.z.im))
    }
  }
  return points[points.length - 1].z
}

export function nearestIndex(points: SweepPoint[], fHz: number): number {
  let best = -1, bestD = Infinity
  points.forEach((p, i) => {
    const d = Math.abs(p.fHz - fHz)
    if (d < bestD) { bestD = d; best = i }
  })
  return best
}
