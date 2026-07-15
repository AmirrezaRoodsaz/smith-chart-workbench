# Smith Chart Workbench — Plan 1: Math Core + Chart Engine

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A deployed interactive Smith chart web page: crisp SVG chart with zoom/pan and hover-anywhere Z/Y/Γ/VSWR readout, backed by a fully tested pure-TypeScript RF math core.

**Architecture:** Three layers per the spec — `src/core/` (pure math, zero deps, Vitest-tested), `src/chart/` (SVG geometry + React chart components), `src/app/` (page shell, readout panel, theme). This plan implements spec phases 1–2; the workbench (phases 3–5) and teaching layer (6–7) get their own plans.

**Tech Stack:** React 18 + TypeScript (strict) + Vite; Vitest for unit tests; GitHub Actions → GitHub Pages for deploy. No runtime dependencies beyond react/react-dom.

**Spec:** `docs/superpowers/specs/2026-07-15-smith-chart-app-design.md`

## Global Constraints

- TypeScript `strict: true`; no `any` in committed code.
- Runtime deps: only `react`, `react-dom`. Everything else is devDependencies.
- `src/core/` must never import from `src/chart/`, `src/app/`, or React.
- Default normalization impedance Z0 = 50 Ω.
- Angles in the core API are degrees (electrical length); radians only internally.
- SVG chart coordinate convention: x = Re(Γ), y = −Im(Γ) (inductive half on top).
- Tests colocated: `src/**/<module>.test.ts`.
- Vite `base: './'` so the build works on GitHub Pages project sites.
- Commit after every task (conventional-commit style messages).

---

### Task 1: Project scaffold

**Files:**
- Create: Vite scaffold at repo root (`package.json`, `vite.config.ts`, `tsconfig*.json`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/index.css`)
- Create: `src/scaffold.test.ts` (sanity test, deleted in Task 2)

**Interfaces:**
- Consumes: nothing
- Produces: `npm run dev`, `npm test` (vitest run), `npm run build` all working

- [ ] **Step 1: Scaffold Vite app**

```bash
cd /Volumes/SanDiskSSD/Apps/ResumeGrad_Apps_Public_GitHub/Smith_Chart
npm create vite@latest . -- --template react-ts
npm install
npm install -D vitest
```

If `create vite` balks at the non-empty directory, choose "Ignore files and continue" (RESEARCH.md, docs/, .git are ours).

- [ ] **Step 2: Configure Vite + Vitest**

Replace `vite.config.ts`:

```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: './',
  plugins: [react()],
  test: { environment: 'node' },
})
```

Add to `package.json` scripts: `"test": "vitest run"`.

- [ ] **Step 3: Sanity test**

Create `src/scaffold.test.ts`:

```ts
import { expect, test } from 'vitest'
test('vitest runs', () => { expect(1 + 1).toBe(2) })
```

Run: `npm test` → Expected: 1 passed.
Run: `npm run build` → Expected: builds to `dist/` with no type errors.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "chore: scaffold Vite + React + TS + Vitest"
```

---

### Task 2: core/complex.ts

**Files:**
- Create: `src/core/complex.ts`
- Test: `src/core/complex.test.ts`
- Delete: `src/scaffold.test.ts`

**Interfaces:**
- Produces: `interface Complex { re: number; im: number }`; `cx(re, im?)`, `add(a,b)`, `sub(a,b)`, `mul(a,b)`, `div(a,b)`, `scale(a,k)`, `conj(a)`, `abs(a)`, `arg(a)` — all pure, all `Complex` in/out except `abs`/`arg` → `number`.

- [ ] **Step 1: Write failing tests**

Create `src/core/complex.test.ts`:

```ts
import { describe, expect, test } from 'vitest'
import { abs, add, arg, conj, cx, div, mul, scale, sub } from './complex'

describe('complex arithmetic', () => {
  test('cx defaults imaginary part to 0', () => { expect(cx(3)).toEqual({ re: 3, im: 0 }) })
  test('add / sub', () => {
    expect(add(cx(1, 2), cx(3, -5))).toEqual({ re: 4, im: -3 })
    expect(sub(cx(1, 2), cx(3, -5))).toEqual({ re: -2, im: 7 })
  })
  test('mul: (1+2j)(3+4j) = -5+10j', () => { expect(mul(cx(1, 2), cx(3, 4))).toEqual({ re: -5, im: 10 }) })
  test('div: z/z = 1', () => {
    const q = div(cx(2, 7), cx(2, 7))
    expect(q.re).toBeCloseTo(1, 12); expect(q.im).toBeCloseTo(0, 12)
  })
  test('scale, conj', () => {
    expect(scale(cx(1, -2), 3)).toEqual({ re: 3, im: -6 })
    expect(conj(cx(1, -2))).toEqual({ re: 1, im: 2 })
  })
  test('abs, arg of 3+4j', () => {
    expect(abs(cx(3, 4))).toBeCloseTo(5, 12)
    expect(arg(cx(0, 1))).toBeCloseTo(Math.PI / 2, 12)
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test` → Expected: FAIL, cannot resolve `./complex`.

- [ ] **Step 3: Implement**

Create `src/core/complex.ts`:

```ts
export interface Complex { re: number; im: number }

export const cx = (re: number, im = 0): Complex => ({ re, im })
export const add = (a: Complex, b: Complex): Complex => cx(a.re + b.re, a.im + b.im)
export const sub = (a: Complex, b: Complex): Complex => cx(a.re - b.re, a.im - b.im)
export const mul = (a: Complex, b: Complex): Complex =>
  cx(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re)
export const div = (a: Complex, b: Complex): Complex => {
  const d = b.re * b.re + b.im * b.im
  return cx((a.re * b.re + a.im * b.im) / d, (a.im * b.re - a.re * b.im) / d)
}
export const scale = (a: Complex, k: number): Complex => cx(a.re * k, a.im * k)
export const conj = (a: Complex): Complex => cx(a.re, -a.im)
export const abs = (a: Complex): number => Math.hypot(a.re, a.im)
export const arg = (a: Complex): number => Math.atan2(a.im, a.re)
```

Delete `src/scaffold.test.ts`.

- [ ] **Step 4: Run tests** — `npm test` → Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(core): complex arithmetic"
```

---

### Task 3: core/transform.ts (Γ ↔ Z ↔ Y, VSWR, losses)

**Files:**
- Create: `src/core/transform.ts`
- Test: `src/core/transform.test.ts`

**Interfaces:**
- Consumes: `Complex`, ops from `./complex`
- Produces: `gammaFromZ(z: Complex, z0: number): Complex`, `zFromGamma(g: Complex, z0: number): Complex`, `yFromZ(z: Complex): Complex`, `vswrFromGamma(g: Complex): number`, `returnLossDb(g: Complex): number`, `mismatchLossDb(g: Complex): number`

- [ ] **Step 1: Write failing tests**

Create `src/core/transform.test.ts`:

```ts
import { describe, expect, test } from 'vitest'
import { abs, cx } from './complex'
import { gammaFromZ, mismatchLossDb, returnLossDb, vswrFromGamma, yFromZ, zFromGamma } from './transform'

describe('gamma/impedance transforms', () => {
  test('matched load: Z=50 → Γ=0', () => {
    const g = gammaFromZ(cx(50), 50)
    expect(abs(g)).toBeCloseTo(0, 12)
  })
  test('short: Z=0 → Γ=-1; near-open → Γ→+1', () => {
    expect(gammaFromZ(cx(0), 50).re).toBeCloseTo(-1, 12)
    expect(gammaFromZ(cx(1e12), 50).re).toBeCloseTo(1, 6)
  })
  test('Veritasium case: 36+74j @ 50Ω → |Γ|≈0.664', () => {
    const g = gammaFromZ(cx(36, 74), 50)
    expect(abs(g)).toBeCloseTo(0.664, 2)
    expect(vswrFromGamma(g)).toBeCloseTo(4.95, 1)
  })
  test('round trip Z→Γ→Z', () => {
    const z = zFromGamma(gammaFromZ(cx(36, 74), 50), 50)
    expect(z.re).toBeCloseTo(36, 9); expect(z.im).toBeCloseTo(74, 9)
  })
  test('yFromZ round trip', () => {
    const y = yFromZ(cx(36, 74))
    const z = yFromZ(y)
    expect(z.re).toBeCloseTo(36, 9); expect(z.im).toBeCloseTo(74, 9)
  })
  test('VSWR: |Γ|=0.5 → 3; |Γ|≥1 → Infinity', () => {
    expect(vswrFromGamma(cx(0.5, 0))).toBeCloseTo(3, 12)
    expect(vswrFromGamma(cx(1, 0))).toBe(Infinity)
  })
  test('losses: |Γ|=0.5 → RL 6.02 dB, ML 1.25 dB', () => {
    expect(returnLossDb(cx(0.5, 0))).toBeCloseTo(6.02, 2)
    expect(mismatchLossDb(cx(0.5, 0))).toBeCloseTo(1.249, 2)
  })
})
```

- [ ] **Step 2: Run to verify failure** — `npm test` → FAIL, cannot resolve `./transform`.

- [ ] **Step 3: Implement**

Create `src/core/transform.ts`:

```ts
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
```

- [ ] **Step 4: Run tests** — `npm test` → all pass.

- [ ] **Step 5: Commit**

```bash
git add src/core && git commit -m "feat(core): gamma/Z/Y transforms, VSWR, return & mismatch loss"
```

---

### Task 4: core/elements.ts (circuit element transformations)

**Files:**
- Create: `src/core/elements.ts`
- Test: `src/core/elements.test.ts`

**Interfaces:**
- Consumes: `Complex`, ops from `./complex`
- Produces:

```ts
type ElementKind = 'seriesR' | 'seriesL' | 'seriesC' | 'shuntR' | 'shuntL' | 'shuntC'
                 | 'line' | 'stubOpen' | 'stubShort'
interface CircuitElement {
  id: string
  kind: ElementKind
  value: number        // Ω (R), H (L), F (C), electrical degrees (line/stubs)
  lineZ0?: number      // Ω, line/stub only, default 50
  enabled: boolean
}
function transformImpedance(zIn: Complex, el: CircuitElement, fHz: number): Complex
```

- [ ] **Step 1: Write failing tests**

Create `src/core/elements.test.ts`:

```ts
import { describe, expect, test } from 'vitest'
import { cx } from './complex'
import { transformImpedance, type CircuitElement } from './elements'

const el = (kind: CircuitElement['kind'], value: number, lineZ0?: number): CircuitElement =>
  ({ id: 't', kind, value, lineZ0, enabled: true })

describe('element transformations', () => {
  test('seriesR adds resistance', () => {
    expect(transformImpedance(cx(10, 5), el('seriesR', 40), 1e6)).toEqual({ re: 50, im: 5 })
  })
  test('Veritasium: 13.2nH series L at 1085 MHz adds ≈ +90j', () => {
    const z = transformImpedance(cx(10, -90), el('seriesL', 13.2e-9), 1.085e9)
    expect(z.re).toBeCloseTo(10, 6)
    expect(z.im).toBeCloseTo(0, 0) // 89.99Ω cancels -90Ω within 0.5Ω
  })
  test('seriesC subtracts reactance: 1nF @ 1MHz → -159.2j', () => {
    const z = transformImpedance(cx(50, 0), el('seriesC', 1e-9), 1e6)
    expect(z.im).toBeCloseTo(-159.15, 1)
  })
  test('shuntR: 50Ω load ∥ 50Ω → 25Ω', () => {
    const z = transformImpedance(cx(50), el('shuntR', 50), 1e6)
    expect(z.re).toBeCloseTo(25, 9); expect(z.im).toBeCloseTo(0, 9)
  })
  test('shuntL/shuntC are reciprocal reactances', () => {
    const zl = transformImpedance(cx(1e9), el('shuntL', 7.958e-9), 1e9)   // ωL≈50 → ≈ +50j
    expect(zl.im).toBeCloseTo(50, 0)
    const zc = transformImpedance(cx(1e9), el('shuntC', 3.183e-12), 1e9)  // 1/ωC≈50 → ≈ -50j
    expect(zc.im).toBeCloseTo(-50, 0)
  })
  test('quarter-wave line inverts: 25Ω through 90° of 50Ω line → 100Ω', () => {
    const z = transformImpedance(cx(25), el('line', 90, 50), 1e9)
    expect(z.re).toBeCloseTo(100, 3); expect(z.im).toBeCloseTo(0, 3)
  })
  test('half-wave line is identity', () => {
    const z = transformImpedance(cx(36, 74), el('line', 180, 50), 1e9)
    expect(z.re).toBeCloseTo(36, 3); expect(z.im).toBeCloseTo(74, 3)
  })
  test('short stub 45° of 50Ω = +50j in parallel', () => {
    const z = transformImpedance(cx(1e9), el('stubShort', 45, 50), 1e9)
    expect(z.im).toBeCloseTo(50, 0)
  })
  test('open stub 45° of 50Ω = -50j in parallel', () => {
    const z = transformImpedance(cx(1e9), el('stubOpen', 45, 50), 1e9)
    expect(z.im).toBeCloseTo(-50, 0)
  })
})
```

- [ ] **Step 2: Run to verify failure** — `npm test` → FAIL.

- [ ] **Step 3: Implement**

Create `src/core/elements.ts`:

```ts
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
```

- [ ] **Step 4: Run tests** — `npm test` → all pass.

- [ ] **Step 5: Commit**

```bash
git add src/core && git commit -m "feat(core): circuit element impedance transformations"
```

---

### Task 5: core/network.ts (chain evaluation + arc loci)

**Files:**
- Create: `src/core/network.ts`
- Test: `src/core/network.test.ts`

**Interfaces:**
- Consumes: `transformImpedance`, `CircuitElement` from `./elements`; `gammaFromZ` from `./transform`
- Produces:

```ts
function evaluateChain(zLoad: Complex, elements: CircuitElement[], fHz: number): Complex[]
  // returns [zLoad, zAfterEl0, zAfterEl1, ...]; disabled elements pass through unchanged
function arcPoints(zIn: Complex, el: CircuitElement, fHz: number, z0: number, steps?: number): Complex[]
  // Γ-plane locus as el.value sweeps 0 → el.value (steps+1 points, default 64)
```

- [ ] **Step 1: Write failing tests**

Create `src/core/network.test.ts`:

```ts
import { describe, expect, test } from 'vitest'
import { abs, cx, sub } from './complex'
import { transformImpedance, type CircuitElement } from './elements'
import { arcPoints, evaluateChain } from './network'
import { gammaFromZ } from './transform'

const el = (kind: CircuitElement['kind'], value: number, enabled = true): CircuitElement =>
  ({ id: kind + value, kind, value, enabled })

describe('network evaluation', () => {
  test('empty chain returns just the load', () => {
    expect(evaluateChain(cx(36, 74), [], 1e9)).toEqual([cx(36, 74)])
  })
  test('stages accumulate in order', () => {
    const chain = [el('seriesR', 14), el('seriesC', 2e-12)]
    const stages = evaluateChain(cx(36, 74), chain, 1.085e9)
    expect(stages).toHaveLength(3)
    expect(stages[1]).toEqual({ re: 50, im: 74 })
    expect(stages[2].re).toBeCloseTo(50, 9)
  })
  test('disabled element is skipped', () => {
    const stages = evaluateChain(cx(36, 74), [el('seriesR', 14, false)], 1e9)
    expect(stages[1]).toEqual({ re: 36, im: 74 })
  })
  test('arcPoints starts at Γ(zIn) and ends at Γ(transformed z)', () => {
    const e = el('seriesL', 13.2e-9)
    const pts = arcPoints(cx(10, -90), e, 1.085e9, 50)
    expect(pts).toHaveLength(65)
    expect(abs(sub(pts[0], gammaFromZ(cx(10, -90), 50)))).toBeCloseTo(0, 9)
    expect(abs(sub(pts[64], gammaFromZ(transformImpedance(cx(10, -90), e, 1.085e9), 50)))).toBeCloseTo(0, 9)
  })
})
```

- [ ] **Step 2: Run to verify failure** — `npm test` → FAIL.

- [ ] **Step 3: Implement**

Create `src/core/network.ts`:

```ts
import type { Complex } from './complex'
import { transformImpedance, type CircuitElement } from './elements'
import { gammaFromZ } from './transform'

export function evaluateChain(zLoad: Complex, elements: CircuitElement[], fHz: number): Complex[] {
  const stages = [zLoad]
  let z = zLoad
  for (const el of elements) {
    if (el.enabled) z = transformImpedance(z, el, fHz)
    stages.push(z)
  }
  return stages
}

export function arcPoints(
  zIn: Complex, el: CircuitElement, fHz: number, z0: number, steps = 64,
): Complex[] {
  return Array.from({ length: steps + 1 }, (_, i) =>
    gammaFromZ(transformImpedance(zIn, { ...el, value: (el.value * i) / steps }, fHz), z0),
  )
}
```

- [ ] **Step 4: Run tests** — `npm test` → all pass.

- [ ] **Step 5: Commit**

```bash
git add src/core && git commit -m "feat(core): network chain evaluation and arc loci"
```

---

### Task 6: core/units.ts (engineering notation + length conversions)

**Files:**
- Create: `src/core/units.ts`
- Test: `src/core/units.test.ts`

**Interfaces:**
- Produces: `formatEng(value: number, unit: string, digits?: number): string` (SI prefixes f…T, `digits` = significant digits, default 3; `Infinity` → `"∞"`), `degToMeters(deg: number, fHz: number, vf?: number): number`, `metersToDeg(m: number, fHz: number, vf?: number): number` (vf default 1; full wavelength = 360°)

- [ ] **Step 1: Write failing tests**

Create `src/core/units.test.ts`:

```ts
import { describe, expect, test } from 'vitest'
import { degToMeters, formatEng, metersToDeg } from './units'

describe('units', () => {
  test('formatEng picks SI prefix', () => {
    expect(formatEng(13.2e-9, 'H')).toBe('13.2 nH')
    expect(formatEng(1.085e9, 'Hz')).toBe('1.09 GHz')
    expect(formatEng(50, 'Ω')).toBe('50.0 Ω')
    expect(formatEng(0, 'Ω')).toBe('0 Ω')
    expect(formatEng(Infinity, '')).toBe('∞')
  })
  test('degToMeters: 360° at 1085 MHz ≈ 0.2763 m (c/f)', () => {
    expect(degToMeters(360, 1.085e9)).toBeCloseTo(0.2763, 3)
  })
  test('electrical length: 302° at 1085 MHz with vf 0.66 → ≈153 mm; round trip', () => {
    // NOTE: electrical length (360° = 1λ), not Smith-chart rotation angle (360° = λ/2).
    expect(degToMeters(302, 1.085e9, 0.66) * 1000).toBeCloseTo(153, 0)
    expect(metersToDeg(degToMeters(90, 1e9), 1e9)).toBeCloseTo(90, 9)
  })
})
```

- [ ] **Step 2: Run to verify failure** — `npm test` → FAIL.

- [ ] **Step 3: Implement**

Create `src/core/units.ts`:

```ts
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
  return `${scaled.toPrecision(digits)} ${prefix}${unit}`.trim()
}

export function degToMeters(deg: number, fHz: number, vf = 1): number {
  return (deg / 360) * ((C * vf) / fHz)
}

export function metersToDeg(m: number, fHz: number, vf = 1): number {
  return (m / ((C * vf) / fHz)) * 360
}
```

- [ ] **Step 4: Run tests** — `npm test` → all pass. If a `toPrecision` expectation differs by formatting (e.g. `"50.0"` vs `"50"`), fix the implementation to match the test, not vice versa.

- [ ] **Step 5: Commit**

```bash
git add src/core && git commit -m "feat(core): engineering notation and electrical length units"
```

---

### Task 7: chart/geometry.ts (grid path generation)

**Files:**
- Create: `src/chart/geometry.ts`
- Test: `src/chart/geometry.test.ts`

**Interfaces:**
- Consumes: `cx`, `abs`, `Complex` from `../core/complex`; `gammaFromZ` from `../core/transform`
- Produces:

```ts
function pathFrom(points: Complex[]): string          // "M.. L.." SVG path, y = −im
function gridPathR(r: number, samples?: number): string   // constant-resistance circle (normalized r)
function gridPathX(x: number, samples?: number): string   // constant-reactance arc (normalized x, sign matters)
function gridValues(viewW: number): { r: number[]; x: number[] }  // densify as you zoom in
```

All paths live in the Γ-plane unit disk; normalized (z0 = 1).

- [ ] **Step 1: Write failing tests**

Create `src/chart/geometry.test.ts`:

```ts
import { describe, expect, test } from 'vitest'
import { gridPathR, gridPathX, gridValues, pathFrom } from './geometry'
import { cx } from '../core/complex'

describe('chart geometry', () => {
  test('pathFrom flips im to SVG y', () => {
    expect(pathFrom([cx(0.5, 0.5), cx(1, 0)])).toBe('M0.50000 -0.50000L1.00000 0.00000')
  })
  test('r=0 circle points lie on the unit circle', () => {
    const d = gridPathR(0, 16)
    const nums = d.match(/-?\d+\.\d+/g)!.map(Number)
    for (let i = 0; i < nums.length; i += 2) {
      expect(Math.hypot(nums[i], nums[i + 1])).toBeCloseTo(1, 3)
    }
  })
  test('r=1 circle passes through chart center', () => {
    const d = gridPathR(1, 256)
    const nums = d.match(/-?\d+\.\d+/g)!.map(Number)
    const minDist = Math.min(...Array.from({ length: nums.length / 2 },
      (_, i) => Math.hypot(nums[2 * i], nums[2 * i + 1])))
    expect(minDist).toBeLessThan(0.02)
  })
  test('x arcs end at Γ=(1,0); positive x stays in upper half (SVG y ≤ 0)', () => {
    const d = gridPathX(1, 64)
    const nums = d.match(/-?\d+\.\d+/g)!.map(Number)
    expect(nums[nums.length - 2]).toBeCloseTo(1, 3)
    expect(nums[nums.length - 1]).toBeCloseTo(0, 3)
    for (let i = 1; i < nums.length; i += 2) expect(nums[i]).toBeLessThanOrEqual(1e-9)
  })
  test('gridValues densifies when zoomed in', () => {
    const base = gridValues(2.2)
    const fine = gridValues(0.2)
    expect(fine.r.length).toBeGreaterThan(base.r.length)
    expect(base.r).toContain(1)
    expect(base.x.some((v) => v < 0)).toBe(true)
  })
})
```

- [ ] **Step 2: Run to verify failure** — `npm test` → FAIL.

- [ ] **Step 3: Implement**

Create `src/chart/geometry.ts`:

```ts
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
```

- [ ] **Step 4: Run tests** — `npm test` → all pass.

- [ ] **Step 5: Commit**

```bash
git add src/chart && git commit -m "feat(chart): Smith grid path geometry with zoom-tiered density"
```

---

### Task 8: SmithChart component (static render)

**Files:**
- Create: `src/chart/SmithChart.tsx`
- Modify: `src/App.tsx` (replace Vite demo content), `src/index.css` (replace demo styles)

**Interfaces:**
- Consumes: `gridValues`, `gridPathR`, `gridPathX` from `./geometry`
- Produces: `<SmithChart />` React component rendering the full chart; exports `ViewBox` type `{ x: number; y: number; w: number }` and accepts optional `onHoverGamma?: (g: Complex | null) => void` (wired in Task 10)

- [ ] **Step 1: Implement the component**

Create `src/chart/SmithChart.tsx`:

```tsx
import { useMemo, useState } from 'react'
import type { Complex } from '../core/complex'
import { gridPathR, gridPathX, gridValues } from './geometry'

export interface ViewBox { x: number; y: number; w: number }
export const HOME_VIEW: ViewBox = { x: -1.1, y: -1.1, w: 2.2 }

export interface SmithChartProps {
  onHoverGamma?: (g: Complex | null) => void
}

export function SmithChart(_props: SmithChartProps) {
  const [view] = useState<ViewBox>(HOME_VIEW)

  const grid = useMemo(() => {
    const { r, x } = gridValues(view.w)
    return {
      r: r.map((v) => ({ v, d: gridPathR(v) })),
      x: x.map((v) => ({ v, d: gridPathX(v) })),
    }
  }, [view.w])

  return (
    <svg
      className="smith-chart"
      viewBox={`${view.x} ${view.y} ${view.w} ${view.w}`}
      preserveAspectRatio="xMidYMid meet"
    >
      <circle cx={0} cy={0} r={1} className="chart-rim" />
      <line x1={-1} y1={0} x2={1} y2={0} className="grid-line" />
      {grid.r.map(({ v, d }) => (
        <path key={`r${v}`} d={d} className={v === 1 ? 'grid-line grid-emph' : 'grid-line'} />
      ))}
      {grid.x.map(({ v, d }) => (
        <path key={`x${v}`} d={d} className={Math.abs(v) === 1 ? 'grid-line grid-emph' : 'grid-line'} />
      ))}
      <circle cx={0} cy={0} r={0.008} className="chart-center" />
    </svg>
  )
}
```

- [ ] **Step 2: Wire into the app**

Replace `src/App.tsx`:

```tsx
import { SmithChart } from './chart/SmithChart'

export default function App() {
  return (
    <div className="app">
      <header className="app-header"><h1>Smith Chart</h1></header>
      <main className="chart-area"><SmithChart /></main>
    </div>
  )
}
```

Replace `src/index.css`:

```css
:root {
  --bg: #fafafa;
  --fg: #1a1a1a;
  --grid: #b9c4cc;
  --grid-emph: #6b7f8d;
  --rim: #33454f;
  --accent: #c8401a;
}

* { box-sizing: border-box; margin: 0; }
html, body, #root { height: 100%; }
body { background: var(--bg); color: var(--fg); font-family: system-ui, sans-serif; }

.app { display: flex; flex-direction: column; height: 100%; }
.app-header { padding: 0.5rem 1rem; }
.chart-area { flex: 1; min-height: 0; display: flex; justify-content: center; }
.smith-chart { height: 100%; max-width: 100%; touch-action: none; }

.chart-rim { fill: none; stroke: var(--rim); stroke-width: 2px; vector-effect: non-scaling-stroke; }
.grid-line { fill: none; stroke: var(--grid); stroke-width: 1px; vector-effect: non-scaling-stroke; }
.grid-emph { stroke: var(--grid-emph); }
.chart-center { fill: var(--accent); }
```

Delete `src/App.css` and its import if the scaffold created one.

- [ ] **Step 3: Visual check**

Run: `npm run dev`, open the URL.
Expected: a classic Smith chart — unit circle rim, real axis, resistance circles nesting toward the right edge, reactance arcs above (inductive) and below (capacitive), r=1 circle and x=±1 arcs slightly emphasized, red dot at center. `npm test` and `npm run build` still pass.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat(chart): static SVG Smith chart rendering"
```

---

### Task 9: Zoom and pan (wheel, drag, pinch, double-click reset)

**Files:**
- Modify: `src/chart/SmithChart.tsx`

**Interfaces:**
- Consumes: existing `ViewBox` state
- Produces: interactive viewBox; helper `clientToSvg(svg: SVGSVGElement, clientX: number, clientY: number): { x: number; y: number }` exported for Task 10

- [ ] **Step 1: Implement interactions**

Update `src/chart/SmithChart.tsx` — add above the component:

```tsx
export function clientToSvg(svg: SVGSVGElement, clientX: number, clientY: number) {
  const pt = svg.createSVGPoint()
  pt.x = clientX; pt.y = clientY
  const p = pt.matrixTransform(svg.getScreenCTM()!.inverse())
  return { x: p.x, y: p.y }
}

const MIN_W = 0.005
const MAX_W = 4

function zoomAbout(v: ViewBox, px: number, py: number, factor: number): ViewBox {
  const w = Math.min(MAX_W, Math.max(MIN_W, v.w * factor))
  const s = w / v.w
  return { x: px - (px - v.x) * s, y: py - (py - v.y) * s, w }
}
```

Inside the component replace the state line and add handlers:

```tsx
const [view, setView] = useState<ViewBox>(HOME_VIEW)
const svgRef = useRef<SVGSVGElement>(null)
const pointers = useRef(new Map<number, { x: number; y: number }>())

function onWheel(e: React.WheelEvent<SVGSVGElement>) {
  const svg = svgRef.current!
  const p = clientToSvg(svg, e.clientX, e.clientY)
  setView((v) => zoomAbout(v, p.x, p.y, e.deltaY > 0 ? 1.2 : 1 / 1.2))
}

function onPointerDown(e: React.PointerEvent<SVGSVGElement>) {
  e.currentTarget.setPointerCapture(e.pointerId)
  pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
}

function onPointerMove(e: React.PointerEvent<SVGSVGElement>) {
  const svg = svgRef.current!
  const prev = pointers.current.get(e.pointerId)
  if (!prev) return
  const pts = pointers.current

  if (pts.size === 1) {
    // pan: translate by the SVG-space delta
    const a = clientToSvg(svg, prev.x, prev.y)
    const b = clientToSvg(svg, e.clientX, e.clientY)
    setView((v) => ({ ...v, x: v.x - (b.x - a.x), y: v.y - (b.y - a.y) }))
  } else if (pts.size === 2) {
    // pinch: zoom about the midpoint by the distance ratio
    const [idA, idB] = [...pts.keys()]
    const other = pts.get(idA === e.pointerId ? idB : idA)!
    const dPrev = Math.hypot(prev.x - other.x, prev.y - other.y)
    const dNow = Math.hypot(e.clientX - other.x, e.clientY - other.y)
    if (dPrev > 0 && dNow > 0) {
      const mid = clientToSvg(svg, (e.clientX + other.x) / 2, (e.clientY + other.y) / 2)
      setView((v) => zoomAbout(v, mid.x, mid.y, dPrev / dNow))
    }
  }
  pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
}

function onPointerUp(e: React.PointerEvent<SVGSVGElement>) {
  pointers.current.delete(e.pointerId)
}
```

Attach to the `<svg>` element:

```tsx
<svg
  ref={svgRef}
  className="smith-chart"
  viewBox={`${view.x} ${view.y} ${view.w} ${view.w}`}
  preserveAspectRatio="xMidYMid meet"
  onWheel={onWheel}
  onPointerDown={onPointerDown}
  onPointerMove={onPointerMove}
  onPointerUp={onPointerUp}
  onPointerCancel={onPointerUp}
  onDoubleClick={() => setView(HOME_VIEW)}
>
```

Add `import { useMemo, useRef, useState } from 'react'`.

- [ ] **Step 2: Visual check**

Run: `npm run dev`. Expected: wheel zooms about the cursor; grid gets denser past ~2× and denser again past ~6×; drag pans; double-click resets; on a touch device/emulator, pinch zooms. Lines stay 1px at all zooms (`vector-effect: non-scaling-stroke`).

Run: `npm test && npm run build` → pass.

- [ ] **Step 3: Commit**

```bash
git add src/chart && git commit -m "feat(chart): wheel/drag/pinch zoom-pan with tiered grid density"
```

---

### Task 10: Hover/tap readout panel

**Files:**
- Create: `src/app/ReadoutPanel.tsx`, `src/app/format.ts`
- Test: `src/app/format.test.ts`
- Modify: `src/chart/SmithChart.tsx` (emit hover Γ + crosshair marker), `src/App.tsx`, `src/index.css`

**Interfaces:**
- Consumes: core transforms/units; `clientToSvg` from Task 9
- Produces: `formatReadout(gamma: Complex, z0: number): { label: string; value: string }[]`; `<ReadoutPanel gamma={Complex | null} z0={number} />`; `SmithChart` prop `onHoverGamma` now functional

- [ ] **Step 1: Write failing tests for the formatter**

Create `src/app/format.test.ts`:

```ts
import { describe, expect, test } from 'vitest'
import { cx } from '../core/complex'
import { gammaFromZ } from '../core/transform'
import { formatReadout } from './format'

describe('formatReadout', () => {
  test('Veritasium load readout', () => {
    const rows = formatReadout(gammaFromZ(cx(36, 74), 50), 50)
    const get = (label: string) => rows.find((r) => r.label === label)!.value
    expect(get('Z')).toBe('36.0 + j74.0 Ω')
    expect(get('z (norm)')).toBe('0.720 + j1.48')
    expect(get('|Γ|')).toBe('0.664')
    expect(get('VSWR')).toBe('4.95')
    expect(get('Y')).toMatch(/mS/)
  })
  test('handles the open-circuit edge without NaN text', () => {
    const rows = formatReadout(cx(1, 0), 50)
    expect(rows.find((r) => r.label === 'VSWR')!.value).toBe('∞')
  })
})
```

- [ ] **Step 2: Run to verify failure** — `npm test` → FAIL.

- [ ] **Step 3: Implement formatter**

Create `src/app/format.ts`:

```ts
import { abs, arg, type Complex } from '../core/complex'
import { mismatchLossDb, returnLossDb, vswrFromGamma, yFromZ, zFromGamma } from '../core/transform'
import { formatEng } from '../core/units'

const jstr = (c: Complex, digits = 3): string =>
  `${c.re.toPrecision(digits)} ${c.im < 0 ? '−' : '+'} j${Math.abs(c.im).toPrecision(digits)}`

export interface ReadoutRow { label: string; value: string }

export function formatReadout(gamma: Complex, z0: number): ReadoutRow[] {
  const z = zFromGamma(gamma, z0)
  const zn = zFromGamma(gamma, 1)
  const y = yFromZ(z)
  const vswr = vswrFromGamma(gamma)
  const finite = Number.isFinite(z.re) && Number.isFinite(z.im) && abs(gamma) < 0.99999

  return [
    { label: 'Z', value: finite ? `${jstr(z)} Ω`.replace('−', '-') : '∞' },
    { label: 'z (norm)', value: finite ? jstr(zn).replace('−', '-') : '∞' },
    { label: 'Y', value: finite ? `${jstr({ re: y.re * 1e3, im: y.im * 1e3 })} mS`.replace('−', '-') : '0 S' },
    { label: '|Γ|', value: abs(gamma).toPrecision(3) },
    { label: '∠Γ', value: `${((arg(gamma) * 180) / Math.PI).toFixed(1)}°` },
    { label: 'VSWR', value: Number.isFinite(vswr) ? vswr.toPrecision(3) : '∞' },
    { label: 'RL', value: Number.isFinite(returnLossDb(gamma)) ? `${returnLossDb(gamma).toFixed(2)} dB` : '∞' },
    { label: 'ML', value: Number.isFinite(mismatchLossDb(gamma)) ? `${mismatchLossDb(gamma).toFixed(2)} dB` : '∞' },
  ]
}
```

Note: `jstr` uses U+2212 internally then normalizes to ASCII `-` — if tests disagree on the exact sign character, make the tests and implementation both use ASCII `-` and move on.

- [ ] **Step 4: Run tests** — `npm test` → formatter tests pass. Adjust `formatEng`/`toPrecision` expectations only by fixing code, not weakening assertions to `toMatch(/.*/)`.

- [ ] **Step 5: Readout panel + chart wiring**

Create `src/app/ReadoutPanel.tsx`:

```tsx
import type { Complex } from '../core/complex'
import { formatReadout } from './format'

export function ReadoutPanel({ gamma, z0 }: { gamma: Complex | null; z0: number }) {
  if (!gamma) return <aside className="readout readout-empty">Hover the chart</aside>
  return (
    <aside className="readout">
      <table>
        <tbody>
          {formatReadout(gamma, z0).map((r) => (
            <tr key={r.label}><th>{r.label}</th><td>{r.value}</td></tr>
          ))}
        </tbody>
      </table>
    </aside>
  )
}
```

In `SmithChart.tsx`: track hover and render a crosshair. Add state `const [hover, setHover] = useState<Complex | null>(null)`. In `onPointerMove`, after the pan/pinch logic, and also for plain (no-button) moves:

```tsx
function updateHover(e: React.PointerEvent<SVGSVGElement>) {
  const p = clientToSvg(svgRef.current!, e.clientX, e.clientY)
  const g = { re: p.x, im: -p.y }
  const inside = Math.hypot(g.re, g.im) <= 1
  setHover(inside ? g : null)
  _props.onHoverGamma?.(inside ? g : null)
}
```

Call `updateHover(e)` at the top of `onPointerMove` (before the drag branch), rename `_props` to `props`, and render inside the SVG when hovering:

```tsx
{hover && (
  <g className="crosshair">
    {/* radius scales with the viewBox so the dot stays cursor-sized at any zoom */}
    <circle cx={hover.re} cy={-hover.im} r={view.w * 0.006} />
  </g>
)}
```

Update `src/App.tsx`:

```tsx
import { useState } from 'react'
import type { Complex } from './core/complex'
import { SmithChart } from './chart/SmithChart'
import { ReadoutPanel } from './app/ReadoutPanel'

export default function App() {
  const [gamma, setGamma] = useState<Complex | null>(null)
  return (
    <div className="app">
      <header className="app-header"><h1>Smith Chart</h1></header>
      <main className="chart-area">
        <SmithChart onHoverGamma={setGamma} />
        <ReadoutPanel gamma={gamma} z0={50} />
      </main>
    </div>
  )
}
```

Add CSS to `src/index.css`:

```css
.chart-area { gap: 1rem; padding: 0 1rem 1rem; }
.readout { min-width: 14rem; font-variant-numeric: tabular-nums; }
.readout table { border-collapse: collapse; width: 100%; }
.readout th { text-align: left; padding: 0.15rem 0.75rem 0.15rem 0; color: var(--grid-emph); font-weight: 500; }
.readout td { text-align: right; }
.readout-empty { color: var(--grid-emph); }
.crosshair circle { fill: var(--accent); }
@media (max-width: 700px) { .chart-area { flex-direction: column; align-items: center; } }
```

- [ ] **Step 6: Visual check**

Run: `npm run dev`. Expected: moving the pointer over the chart shows a dot under the cursor and a live table (Z, z, Y, |Γ|, ∠Γ, VSWR, RL, ML). Center reads Z = 50 Ω, VSWR 1. Rim reads VSWR ∞ without NaN anywhere. Outside the rim the panel says "Hover the chart". On mobile layout the panel stacks below.

Run: `npm test && npm run build` → pass.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat(app): hover-anywhere readout panel with full impedance data"
```

---

### Task 11: Dark/light theme

**Files:**
- Modify: `src/index.css`, `src/App.tsx`

**Interfaces:**
- Produces: `data-theme="dark"` attribute on `<html>`, toggle button, persisted in `localStorage` key `smith-theme`, defaults to `prefers-color-scheme`.

- [ ] **Step 1: Implement**

Add to `src/index.css`:

```css
[data-theme='dark'] {
  --bg: #12181d;
  --fg: #e8ecef;
  --grid: #33424e;
  --grid-emph: #5d7686;
  --rim: #8fa6b5;
  --accent: #ff6a3d;
}
```

In `src/App.tsx`, add before the component:

```tsx
function initialTheme(): 'light' | 'dark' {
  const saved = localStorage.getItem('smith-theme')
  if (saved === 'light' || saved === 'dark') return saved
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}
```

Inside `App` (extend the react import to `import { useEffect, useState } from 'react'`):

```tsx
const [theme, setTheme] = useState(initialTheme)
useEffect(() => {
  document.documentElement.dataset.theme = theme
  localStorage.setItem('smith-theme', theme)
}, [theme])
```

In the header:

```tsx
<button className="theme-toggle" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
  {theme === 'dark' ? '☀️' : '🌙'}
</button>
```

Header CSS: `.app-header { display: flex; justify-content: space-between; align-items: center; }` and `.theme-toggle { background: none; border: 1px solid var(--grid); border-radius: 6px; padding: 0.25rem 0.5rem; cursor: pointer; }`.

- [ ] **Step 2: Visual check** — `npm run dev`: toggle flips the whole chart between themes; reload preserves choice. `npm test && npm run build` pass.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat(app): persistent dark/light theme"
```

---

### Task 12: GitHub Pages deploy + README

**Files:**
- Create: `.github/workflows/deploy.yml`, `README.md`

**Interfaces:**
- Produces: on push to `main`, CI runs tests + build and publishes `dist/` to GitHub Pages.

- [ ] **Step 1: Workflow**

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
permissions:
  contents: read
  pages: write
  id-token: write
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm test
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with: { path: dist }
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: README**

Create `README.md`:

```markdown
# Smith Chart Workbench

Interactive web Smith chart for ham radio operators, hobbyists, and anyone who
just watched [the Veritasium video](https://www.youtube.com/watch?v=GK2pZ_oVU1o)
and wants to actually play with the thing.

**Current status:** interactive chart — crisp SVG grid with deep zoom/pan and a
hover-anywhere readout (Z, Y, Γ, VSWR, return loss, mismatch loss).
Matching workbench, NanoVNA import, and guided learning mode are in progress
(see `docs/superpowers/specs/`).

## Develop

npm install && npm run dev — tests: npm test — build: npm run build
```

- [ ] **Step 3: Verify and commit**

Run: `npm test && npm run build` → pass.

```bash
git add -A && git commit -m "ci: GitHub Pages deploy workflow + README"
```

- [ ] **Step 4: Publish (needs user's GitHub remote)**

If a GitHub remote exists, push and check the Actions run; otherwise tell the user: create a GitHub repo, `git remote add origin <url> && git push -u origin main`, then enable Pages → "GitHub Actions" as the source in repo settings.

---

## Follow-up plans (not in this document)

- **Plan 2 (spec phases 3–4):** AppState reducer + undo/redo + URL state; element palette, chain list, sliders, arcs on chart; VSWR/Q overlays; Y/immittance grid toggle; wavelength rim ruler; auto-match synthesis panel (`core/synthesis.ts`).
- **Plan 3 (spec phase 5):** `core/touchstone.ts` + `core/sweep.ts`, .s1p import, band curve + frequency marker, VSWR strip chart, PNG/URL export, Playwright smoke suite.
- **Plan 4 (spec phases 6–7):** explain-on-demand registry, conformal morph animation, walk-the-line demo, walkthrough engine + three missions, frontend-design polish pass, touch QA.
