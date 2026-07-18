import { abs, add, cx, mul, type Complex } from '../core/complex'

// Γ seen looking toward the load from a point lWl wavelengths toward the
// generator: Γ(l) = Γ_L · e^(−j4πl). A full lap every half wavelength.
export const gammaAtDist = (gL: Complex, lWl: number): Complex =>
  mul(gL, cx(Math.cos(-4 * Math.PI * lWl), Math.sin(-4 * Math.PI * lWl)))

// Standing-wave voltage envelope |1 + Γ(l)| with forward amplitude 1.
export const envelopeAt = (gL: Complex, lWl: number): number =>
  abs(add(cx(1), gammaAtDist(gL, lWl)))
