import type { Complex } from './complex'
import { transformImpedance, type CircuitElement, type ElementKind } from './elements'
import { gammaFromZ } from './transform'

// Kinds whose "no effect" state is value→∞ (series impedance ∝ 1/value or shunt admittance ∝ 1/value),
// so sweeping value/t ramps the effect linearly from 0 (t→0) to final (t=1).
const INVERSE_SWEEP: ReadonlySet<ElementKind> = new Set(['seriesC', 'shuntL', 'shuntR'])

// A short stub's susceptance B = -cot(θ)/Z0 has no continuous no-effect limit in
// length (θ→0 is a dead short). Sweep its EQUIVALENT shunt element instead:
// same final admittance, and shuntC/shuntL already sweep effect-linearly.
function equivalentShunt(el: CircuitElement, fHz: number): CircuitElement {
  const w = 2 * Math.PI * fHz
  const t = Math.tan((el.value * Math.PI) / 180)
  const B = -1 / ((el.lineZ0 ?? 50) * t)
  return B >= 0
    ? { ...el, kind: 'shuntC', value: B / w }
    : { ...el, kind: 'shuntL', value: -1 / (w * B) }
}

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
  const swept = el.kind === 'stubShort' ? equivalentShunt(el, fHz) : el
  return Array.from({ length: steps + 1 }, (_, i) => {
    // i=0 computed directly (not via transformImpedance) to dodge tan(0) and value=0 singularities.
    if (i === 0) return gammaFromZ(zIn, z0)
    const t = i / steps
    // Effect-linear sweep: the swept quantity must ramp 0->final linearly in the element's
    // effect (series impedance, or shunt admittance). For series R/L and shunt C, effect ∝ value,
    // so sweep value*t. For series C and shunt L/R, effect ∝ 1/value, so sweep value/t.
    const sweptValue = INVERSE_SWEEP.has(swept.kind) ? swept.value / t : swept.value * t
    return gammaFromZ(transformImpedance(zIn, { ...swept, value: sweptValue }, fHz), z0)
  })
}
