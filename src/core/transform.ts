import { abs, add, cx, div, scale, sub, type Complex } from './complex'

export const gammaFromZ = (z: Complex, z0: number): Complex =>
  div(sub(z, cx(z0)), add(z, cx(z0)))

export const zFromGamma = (g: Complex, z0: number): Complex =>
  scale(div(add(cx(1), g), sub(cx(1), g)), z0)

export const yFromZ = (z: Complex): Complex => div(cx(1), z)

export const vswrFromGamma = (g: Complex): number => {
  const m = abs(g)
  return m >= 1 ? Infinity : (1 + m) / (1 - m)
}

export const returnLossDb = (g: Complex): number => -20 * Math.log10(abs(g))
export const mismatchLossDb = (g: Complex): number => -10 * Math.log10(1 - abs(g) ** 2)
