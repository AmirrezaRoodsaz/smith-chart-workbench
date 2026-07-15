import { abs, arg, cx, sub, type Complex } from '../core/complex'
import { mismatchLossDb, returnLossDb, vswrFromGamma, yFromZ, zFromGamma } from '../core/transform'

const jstr = (c: Complex, digits = 3): string =>
  `${c.re.toPrecision(digits)} ${c.im < 0 ? '-' : '+'} j${Math.abs(c.im).toPrecision(digits)}`

export interface ReadoutRow { label: string; value: string }

export function formatReadout(gamma: Complex, z0: number): ReadoutRow[] {
  const z = zFromGamma(gamma, z0)
  const zn = zFromGamma(gamma, 1)
  const y = yFromZ(z)
  const vswr = vswrFromGamma(gamma)
  const finite = Number.isFinite(z.re) && Number.isFinite(z.im) && abs(sub(cx(1), gamma)) > 1e-6

  return [
    { label: 'Z', value: finite ? `${jstr(z)} Ω` : '∞' },
    { label: 'z (norm)', value: finite ? jstr(zn) : '∞' },
    { label: 'Y', value: finite ? `${jstr({ re: y.re * 1e3, im: y.im * 1e3 })} mS` : '0 S' },
    { label: '|Γ|', value: abs(gamma).toPrecision(3) },
    { label: '∠Γ', value: `${((arg(gamma) * 180) / Math.PI).toFixed(1)}°` },
    { label: 'VSWR', value: Number.isFinite(vswr) ? vswr.toPrecision(3) : '∞' },
    { label: 'RL', value: Number.isFinite(returnLossDb(gamma)) ? `${returnLossDb(gamma).toFixed(2)} dB` : '∞' },
    { label: 'ML', value: Number.isFinite(mismatchLossDb(gamma)) ? `${mismatchLossDb(gamma).toFixed(2)} dB` : '∞' },
  ]
}
