import { cx, type Complex } from '../core/complex'
import { gammaFromZ } from '../core/transform'

export function pathFrom(points: Complex[]): string {
  return points
    .map((g, i) => `${i === 0 ? 'M' : 'L'}${g.re.toFixed(5)} ${(-g.im).toFixed(5)}`)
    .join('')
}

// Constant-resistance circle: sample x = tan(t), t ∈ (−π/2, π/2), so points
// concentrate near the real axis and the path closes toward Γ=(1,0).
export function gridPathR(r: number, samples = 128): string {
  const pts: Complex[] = []
  for (let i = 0; i <= samples; i++) {
    const t = -Math.PI / 2 + (Math.PI * i) / samples
    const x = Math.tan(Math.min(Math.max(t, -1.5607), 1.5607)) // clamp: |x| ≤ ~100
    pts.push(gammaFromZ(cx(r, x), 1))
  }
  pts.push(cx(1, 0))
  pts.unshift(cx(1, 0))
  return pathFrom(pts)
}

// Constant-reactance arc: sample r = tan(t), t ∈ [0, π/2), ending at Γ=(1,0).
export function gridPathX(x: number, samples = 128): string {
  const pts: Complex[] = []
  for (let i = 0; i < samples; i++) {
    const t = ((Math.PI / 2) * i) / samples
    const r = Math.tan(Math.min(t, 1.5607))
    pts.push(gammaFromZ(cx(r, x), 1))
  }
  pts.push(cx(1, 0))
  return pathFrom(pts)
}

const R_BASE = [0, 0.2, 0.5, 1, 2, 5, 10]
const R_MID = [0.1, 0.3, 0.4, 0.7, 1.5, 3, 4, 7, 20]
const R_FINE = [0.05, 0.15, 0.25, 0.35, 0.45, 0.6, 0.8, 0.9, 1.2, 1.4, 1.6, 1.8, 2.5, 3.5, 4.5, 6, 8, 15, 30, 50]

function xFrom(rs: number[]): number[] {
  const pos = rs.filter((v) => v > 0)
  return [...pos.map((v) => -v), ...pos]
}

// viewW is the SVG viewBox width: 2.2 = whole chart, smaller = zoomed in.
export function gridValues(viewW: number): { r: number[]; x: number[] } {
  let r = R_BASE
  if (viewW <= 1.1) r = [...R_BASE, ...R_MID].sort((a, b) => a - b)
  if (viewW <= 0.35) r = [...R_BASE, ...R_MID, ...R_FINE].sort((a, b) => a - b)
  return { r, x: xFrom(r) }
}
