import { abs, cx, sub, type Complex } from './complex'
import { zFromGamma } from './transform'

export interface SweepPoint { fHz: number; z: Complex }
export interface TouchstoneData { points: SweepPoint[]; refOhms: number; warning?: string }

export class TouchstoneError extends Error {}

const FREQ_MULT: Record<string, number> = { hz: 1, khz: 1e3, mhz: 1e6, ghz: 1e9 }
const MAX_POINTS = 2001

export function parseTouchstone(text: string): TouchstoneData {
  let unit = 1e9
  let format: 'ri' | 'ma' | 'db' = 'ma'
  let refOhms = 50
  let sawOption = false
  const rows: number[][] = []

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/!.*/, '').trim()
    if (!line) continue
    if (line.startsWith('#')) {
      if (sawOption) continue
      sawOption = true
      const tok = line.slice(1).trim().toLowerCase().split(/\s+/)
      for (let i = 0; i < tok.length; i++) {
        const t = tok[i]
        if (t in FREQ_MULT) unit = FREQ_MULT[t]
        else if (t === 'ri' || t === 'ma' || t === 'db') format = t
        else if (t === 'r' && i + 1 < tok.length) refOhms = Number(tok[++i])
        else if (['y', 'z', 'h', 'g'].includes(t))
          throw new TouchstoneError(`Only S-parameter files are supported (this one declares ${t.toUpperCase()}-parameters)`)
      }
      if (!Number.isFinite(refOhms) || refOhms <= 0) throw new TouchstoneError('Invalid reference impedance in option line')
      continue
    }
    const nums = line.split(/\s+/).map(Number)
    if (nums.some((n) => !Number.isFinite(n)))
      throw new TouchstoneError(`Unreadable data line: "${rawLine.trim().slice(0, 40)}"`)
    rows.push(nums)
  }
  if (rows.length === 0) throw new TouchstoneError('No data points found in file')

  const points: SweepPoint[] = rows.map((r) => {
    if (r.length !== 3 && r.length !== 9)
      throw new TouchstoneError(`Expected 1-port (3 columns) or 2-port (9 columns) data, got ${r.length} columns`)
    if (!(r[0] > 0)) throw new TouchstoneError('Frequencies must be positive')
    const [a, b] = [r[1], r[2]]
    let g: Complex
    if (format === 'ri') g = cx(a, b)
    else {
      const mag = format === 'db' ? Math.pow(10, a / 20) : a
      const rad = (b * Math.PI) / 180
      g = cx(mag * Math.cos(rad), mag * Math.sin(rad))
    }
    // Γ at the open-circuit pole would map to infinite z — nudge inside the rim
    if (abs(sub(cx(1), g)) < 1e-9) g = cx(1 - 1e-9, g.im)
    const z = zFromGamma(g, refOhms)
    if (!Number.isFinite(z.re) || !Number.isFinite(z.im))
      throw new TouchstoneError('File contains values outside the representable range')
    return { fHz: r[0] * unit, z }
  })

  points.sort((x, y) => x.fHz - y.fHz)
  const dedup = points.filter((p, i) => i === 0 || p.fHz !== points[i - 1].fHz)

  if (dedup.length > MAX_POINTS) {
    const stride = Math.ceil(dedup.length / MAX_POINTS)
    const out = dedup.filter((_, i) => i % stride === 0 || i === dedup.length - 1)
    return { points: out, refOhms, warning: `Decimated ${dedup.length} points to ${out.length}` }
  }
  return { points: dedup, refOhms }
}
