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
  return Array.from({ length: steps + 1 }, (_, i) =>
    gammaFromZ(transformImpedance(zIn, { ...el, value: (el.value * i) / steps }, fHz), z0),
  )
}
