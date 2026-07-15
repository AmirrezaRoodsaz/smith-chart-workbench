const C = 299_792_458 // m/s

const PREFIXES: Array<[number, string]> = [
  [1e12, 'T'], [1e9, 'G'], [1e6, 'M'], [1e3, 'k'], [1, ''],
  [1e-3, 'm'], [1e-6, 'µ'], [1e-9, 'n'], [1e-12, 'p'], [1e-15, 'f'],
]

export function formatEng(value: number, unit: string, digits = 3): string {
  if (!Number.isFinite(value)) return '∞'
  if (value === 0) return `0 ${unit}`.trim()
  const mag = Math.abs(value)
  const [factor, prefix] = PREFIXES.find(([f]) => mag >= f) ?? PREFIXES[PREFIXES.length - 1]
  const scaled = value / factor
  // Add tiny epsilon to handle floating-point rounding edge cases
  const epsilon = 1e-14 * Math.abs(scaled)
  return `${(scaled + epsilon).toPrecision(digits)} ${prefix}${unit}`.trim()
}

export function degToMeters(deg: number, fHz: number, vf = 1): number {
  return (deg / 360) * ((C * vf) / fHz)
}

export function metersToDeg(m: number, fHz: number, vf = 1): number {
  return (m / ((C * vf) / fHz)) * 360
}
