import { cx, type Complex } from '../core/complex'
import { gammaFromZ } from '../core/transform'
import { pathFrom } from './geometry'

export const VSWR_VALUES = [1.5, 2, 3, 5, 10]
export const Q_VALUES = [1, 2, 5]

export const vswrRadius = (s: number): number => (s - 1) / (s + 1)

// Constant-Q locus: z = r(1 ± jQ), r ∈ (0, ∞), tan-spaced like the grid paths.
export function qArcPath(q: number, sign: 1 | -1, samples = 96): string {
  const pts: Complex[] = [cx(-1, 0)]
  for (let i = 1; i < samples; i++) {
    const t = ((Math.PI / 2) * i) / samples
    const r = Math.tan(Math.min(t, 1.5607))
    pts.push(gammaFromZ(cx(r, sign * q * r), 1))
  }
  pts.push(cx(1, 0))
  return pathFrom(pts)
}

export interface RulerTick { x1: number; y1: number; x2: number; y2: number; label?: string; lx: number; ly: number }

// Wavelengths-toward-generator: 0λ at the short (Γ=-1), one lap = 0.5λ, clockwise
// on screen (Γ rotates e^{-2jβl}). φ(l) = π − 4πl in the im-up Γ plane; SVG y = −sin φ.
export function rulerTicks(): RulerTick[] {
  const out: RulerTick[] = []
  for (let i = 0; i < 50; i++) {
    const l = i / 100
    const phi = Math.PI - 4 * Math.PI * l
    const major = i % 5 === 0
    const c = Math.cos(phi)
    const s = Math.sin(phi)
    const r2 = major ? 1.055 : 1.035
    out.push({
      x1: c, y1: -s,
      x2: r2 * c, y2: -r2 * s,
      label: major ? l.toFixed(2) : undefined,
      lx: 1.085 * c, ly: -1.085 * s,
    })
  }
  return out
}
