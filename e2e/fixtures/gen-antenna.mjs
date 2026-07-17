// Series-RLC antenna model: R 36 Ω, L 1.5 µH, C 85 pF → resonant ≈ 14.1 MHz.
const R = 36, L = 1.5e-6, C = 85e-12, Z0 = 50
let out = '! synthetic dipole-like antenna for e2e tests\n# MHz S MA R 50\n'
for (let i = 0; i <= 50; i++) {
  const f = (13 + (2.5 * i) / 50) * 1e6
  const w = 2 * Math.PI * f
  const X = w * L - 1 / (w * C)
  const d = (R + Z0) ** 2 + X * X
  const gr = (R * R + X * X - Z0 * Z0) / d
  const gi = (2 * Z0 * X) / d
  out += `${(f / 1e6).toFixed(3)} ${Math.hypot(gr, gi).toFixed(6)} ${((Math.atan2(gi, gr) * 180) / Math.PI).toFixed(3)}\n`
}
process.stdout.write(out)
