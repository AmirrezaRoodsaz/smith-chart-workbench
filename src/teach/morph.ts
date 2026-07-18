import { add, cx, div, scale, sub, type Complex } from '../core/complex'
import { pathFrom } from '../chart/geometry'

// Display scale of the raw impedance plane at t=0 so r,x ∈ [0..5] fits the
// morph viewBox (±1.3). ponytail: straight position-lerp between the scaled
// plane and Γ — mid-morph lines aren't true circles, but at 64 samples the
// polylines are visually identical to the exact Möbius pencil.
export const SHRINK = 0.22

export function morphPoint(z: Complex, t: number): Complex {
  const g = div(sub(z, cx(1)), add(z, cx(1))) // Γ for z0 = 1 (normalized chart)
  const p = scale(z, SHRINK)
  return cx(p.re + (g.re - p.re) * t, p.im + (g.im - p.im) * t)
}

const R_LINES = [0, 0.2, 0.5, 1, 2, 5]
const X_LINES = [0.2, 0.5, 1, 2, 5]
const MAXC = 5
const N = 64

export interface MorphPath { d: string; emph: boolean }

export function morphGridPaths(t: number): MorphPath[] {
  const paths: MorphPath[] = []
  for (const r of R_LINES) {
    const pts: Complex[] = []
    for (let i = 0; i <= N; i++) pts.push(morphPoint(cx(r, -MAXC + (2 * MAXC * i) / N), t))
    paths.push({ d: pathFrom(pts), emph: r === 1 })
  }
  for (const xa of X_LINES)
    for (const sg of [1, -1] as const) {
      const pts: Complex[] = []
      for (let i = 0; i <= N; i++) pts.push(morphPoint(cx((MAXC * i) / N, sg * xa), t))
      paths.push({ d: pathFrom(pts), emph: xa === 1 })
    }
  const axis: Complex[] = []
  for (let i = 0; i <= N; i++) axis.push(morphPoint(cx((MAXC * i) / N, 0), t))
  paths.push({ d: pathFrom(axis), emph: false })
  return paths
}
