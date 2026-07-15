import { add, cx, div, mul, type Complex } from './complex'

export type ElementKind =
  | 'seriesR' | 'seriesL' | 'seriesC'
  | 'shuntR' | 'shuntL' | 'shuntC'
  | 'line' | 'stubOpen' | 'stubShort'

export interface CircuitElement {
  id: string
  kind: ElementKind
  value: number        // Ω (R), H (L), F (C), electrical degrees (line/stubs)
  lineZ0?: number      // Ω, line/stub elements only
  enabled: boolean
}

const parallel = (a: Complex, b: Complex): Complex => div(mul(a, b), add(a, b))

export function transformImpedance(zIn: Complex, el: CircuitElement, fHz: number): Complex {
  const w = 2 * Math.PI * fHz
  const z0l = el.lineZ0 ?? 50
  switch (el.kind) {
    case 'seriesR': return add(zIn, cx(el.value))
    case 'seriesL': return add(zIn, cx(0, w * el.value))
    case 'seriesC': return add(zIn, cx(0, -1 / (w * el.value)))
    case 'shuntR': return parallel(zIn, cx(el.value))
    case 'shuntL': return parallel(zIn, cx(0, w * el.value))
    case 'shuntC': return parallel(zIn, cx(0, -1 / (w * el.value)))
    case 'line': {
      // lossless line: Zin = Z0 (ZL + jZ0 tanθ) / (Z0 + jZL tanθ)
      const t = Math.tan((el.value * Math.PI) / 180)
      const z0 = cx(z0l)
      return mul(z0, div(add(zIn, mul(cx(0, t), z0)), add(z0, mul(cx(0, t), zIn))))
    }
    case 'stubOpen': {
      const t = Math.tan((el.value * Math.PI) / 180)
      return parallel(zIn, cx(0, -z0l / t)) // -jZ0·cotθ shunt
    }
    case 'stubShort': {
      const t = Math.tan((el.value * Math.PI) / 180)
      return parallel(zIn, cx(0, z0l * t)) // +jZ0·tanθ shunt
    }
  }
}
