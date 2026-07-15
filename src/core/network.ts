import type { Complex } from './complex'
import { transformImpedance, type CircuitElement } from './elements'
import { gammaFromZ } from './transform'

export function evaluateChain(zLoad: Complex, elements: CircuitElement[], fHz: number): Complex[] {
  const stages = [zLoad]
  let z = zLoad
  for (const el of elements) {
    if (el.enabled) z = transformImpedance(z, el, fHz)
    stages.push(z)
  }
  return stages
}

export function arcPoints(
  zIn: Complex, el: CircuitElement, fHz: number, z0: number, steps = 64,
): Complex[] {
  return Array.from({ length: steps + 1 }, (_, i) => {
    // i=0 computed directly (not via transformImpedance) to dodge tan(0) and value=0 singularities.
    if (i === 0) return gammaFromZ(zIn, z0)
    const t = i / steps
    // seriesC/shuntC sweep capacitance value/t (huge->final), so reactance -1/(wC) ramps 0->final linearly.
    const swept = el.kind === 'seriesC' || el.kind === 'shuntC' ? el.value / t : el.value * t
    return gammaFromZ(transformImpedance(zIn, { ...el, value: swept }, fHz), z0)
  })
}
