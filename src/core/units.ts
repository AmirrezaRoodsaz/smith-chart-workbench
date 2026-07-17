const C = 299_792_458 // m/s

const PREFIXES: Array<[number, string]> = [
  [1e12, 'T'], [1e9, 'G'], [1e6, 'M'], [1e3, 'k'], [1, ''],
  [1e-3, 'm'], [1e-6, 'µ'], [1e-9, 'n'], [1e-12, 'p'], [1e-15, 'f'],
]

export function formatEng(value: number, unit: string, digits = 3): string {
  if (!Number.isFinite(value)) return '∞'
  if (value === 0) return `0 ${unit}`.trim()
  const mag = Math.abs(value)
  let idx = PREFIXES.findIndex(([f]) => mag >= f)
  if (idx === -1) idx = PREFIXES.length - 1
  let [factor, prefix] = PREFIXES[idx]
  let corrected = (value / factor) * (1 + 1e-14)
  if (Math.abs(Number(corrected.toPrecision(digits))) >= 1000 && idx > 0) {
    ;[factor, prefix] = PREFIXES[idx - 1]
    corrected = (value / factor) * (1 + 1e-14)
  }
  return `${corrected.toPrecision(digits)} ${prefix}${unit}`.trim()
}

export function degToMeters(deg: number, fHz: number, vf = 1): number {
  return (deg / 360) * ((C * vf) / fHz)
}

export function metersToDeg(m: number, fHz: number, vf = 1): number {
  return (m / ((C * vf) / fHz)) * 360
}
