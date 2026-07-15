import type { Complex } from './complex'
import { transformImpedance, type CircuitElement, type ElementKind } from './elements'
import { gammaFromZ } from './transform'

// Kinds whose "no effect" state is value→∞ (series impedance ∝ 1/value or shunt admittance ∝ 1/value),
// so sweeping value/t ramps the effect linearly from 0 (t→0) to final (t=1).
const INVERSE_SWEEP: ReadonlySet<ElementKind> = new Set(['seriesC', 'shuntL', 'shuntR'])

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
    // Effect-linear sweep: the swept quantity must ramp 0->final linearly in the element's
    // effect (series impedance, or shunt admittance). For series R/L and shunt C, effect ∝ value,
    // so sweep value*t. For series C and shunt L/R, effect ∝ 1/value, so sweep value/t.
    // ponytail: stubShort arc jumps at t→0 — a zero-length short stub is physically a short;
    // revisit if arc rendering needs a susceptance sweep.
    const swept = INVERSE_SWEEP.has(el.kind) ? el.value / t : el.value * t
    return gammaFromZ(transformImpedance(zIn, { ...el, value: swept }, fHz), z0)
  })
}
