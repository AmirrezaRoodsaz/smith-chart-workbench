# Smith Chart Workbench — Plan 2: Matching Workbench, Overlays, Auto-Match

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the interactive chart into a matching workbench: element chain with live arcs, sliders, undo/redo, shareable URL state, VSWR/Q/Y-grid/ruler overlays, and one-click auto-match (L-networks + single-stub).

**Architecture:** Spec phases 3–4. New pure modules: `core/synthesis.ts` (matching math), `app/state.ts` (AppState + reducer), `app/history.ts` (undo/redo wrapper), `app/urlState.ts` (versioned hash serialization), `chart/overlays.ts` (overlay geometry). `SmithChart` grows display-only props (gridMode, overlays, arcs, markers). App shell wires reducer + history + URL + keyboard.

**Tech Stack:** unchanged — React + TS strict + Vite + Vitest, runtime deps only react/react-dom. No jsdom; UI verified live by the controller (Playwright smoke tests come in Plan 3).

**Spec:** `docs/superpowers/specs/2026-07-15-smith-chart-app-design.md` §3–§5. Prior plan: `2026-07-15-phase1-core-and-chart.md`.

**Deliberate deferral:** the spec's alternate load-entry forms (enter Γ mag∠ang or VSWR∠angle) wait for Plan 3, where load entry is reworked for file import anyway; Plan 2 loads are R+jX only.

## Global Constraints

- TypeScript `strict: true`; no `any` in committed code.
- Runtime deps: only `react`, `react-dom`.
- `src/core/` never imports from `src/chart/`, `src/app/`, or React. `src/chart/` may import core. `src/app/` may import both.
- Angles in core API are electrical degrees (360° = 1λ); radians internal only.
- SVG chart coords: x = Re(Γ), y = −Im(Γ).
- Z0 default 50 Ω. Default design frequency 14.2 MHz (20 m band — ham audience).
- Undo/redo limit: 100 states. URL hash format: `v1.<base64url JSON>`.
- Tests colocated `src/**/<module>.test.ts`. TDD for every pure module.
- Commit after every task (conventional-commit messages).

---

### Task 1: Core fixes — stubShort arc sweep + formatEng prefix bucketing

**Files:**
- Modify: `src/core/network.ts` (arcPoints), `src/core/units.ts` (formatEng)
- Test: `src/core/network.test.ts`, `src/core/units.test.ts`

**Interfaces:**
- Consumes: existing `arcPoints`, `formatEng`
- Produces: same signatures, corrected behavior. No API change.

- [ ] **Step 1: Write failing tests**

Add to `src/core/network.test.ts`:

```ts
test('stubShort arc is continuous via equivalent-shunt sweep (45°, inductive)', () => {
  const stub: CircuitElement = { id: 's1', kind: 'stubShort', value: 45, lineZ0: 50, enabled: true }
  const pts = arcPoints(cx(50, 74), stub, 1.085e9, 50)
  expect(abs(sub(pts[0], gammaFromZ(cx(50, 74), 50)))).toBeCloseTo(0, 9)
  expect(abs(sub(pts[1], pts[0]))).toBeLessThan(0.1)
  expect(abs(sub(pts[64], gammaFromZ(transformImpedance(cx(50, 74), stub, 1.085e9), 50)))).toBeCloseTo(0, 6)
  for (const p of pts) { expect(Number.isFinite(p.re)).toBe(true); expect(Number.isFinite(p.im)).toBe(true) }
})
test('stubShort arc continuous for θ>90° (135°, capacitive equivalent)', () => {
  const stub: CircuitElement = { id: 's2', kind: 'stubShort', value: 135, lineZ0: 50, enabled: true }
  const pts = arcPoints(cx(50, 74), stub, 1.085e9, 50)
  expect(abs(sub(pts[1], pts[0]))).toBeLessThan(0.1)
  expect(abs(sub(pts[64], gammaFromZ(transformImpedance(cx(50, 74), stub, 1.085e9), 50)))).toBeCloseTo(0, 6)
})
```

Add to `src/core/units.test.ts`:

```ts
test('formatEng rolls to next prefix when rounding crosses 1000', () => {
  expect(formatEng(999.95e6, 'Hz')).toBe('1.00 GHz')
  expect(formatEng(-999.95e6, 'Hz')).toBe('-1.00 GHz')
  expect(formatEng(999.4e6, 'Hz')).toBe('999 MHz')
})
```

- [ ] **Step 2: Run to verify failures**

Run: `npx vitest run src/core` → Expected: stubShort tests FAIL (discontinuity ≈1.4), formatEng test FAILS (`1.00e+3 MHz`).

- [ ] **Step 3: Implement**

In `src/core/network.ts`, replace the stubShort handling: convert a stubShort to its equivalent shunt element before sweeping (a short stub of susceptance B ≡ shuntC if B>0 else shuntL; both already sweep effect-linearly). Replace the `ponytail:` comment.

```ts
// A short stub's susceptance B = -cot(θ)/Z0 has no continuous no-effect limit in
// length (θ→0 is a dead short). Sweep its EQUIVALENT shunt element instead:
// same final admittance, and shuntC/shuntL already sweep effect-linearly.
function equivalentShunt(el: CircuitElement, fHz: number): CircuitElement {
  const w = 2 * Math.PI * fHz
  const t = Math.tan((el.value * Math.PI) / 180)
  const B = -1 / ((el.lineZ0 ?? 50) * t)
  return B >= 0
    ? { ...el, kind: 'shuntC', value: B / w }
    : { ...el, kind: 'shuntL', value: -1 / (w * B) }
}
```

In `arcPoints`, before the loop: `const swept = el.kind === 'stubShort' ? equivalentShunt(el, fHz) : el` and sweep `swept` instead of `el` (the i=0 direct point and INVERSE_SWEEP logic stay as they are).

In `src/core/units.ts` `formatEng`: after computing the corrected/rounded value, roll to the next prefix if rounding crossed 1000:

```ts
let idx = PREFIXES.findIndex(([f]) => mag >= f)
if (idx === -1) idx = PREFIXES.length - 1
let [factor, prefix] = PREFIXES[idx]
let corrected = (value / factor) * (1 + 1e-14)
if (Math.abs(Number(corrected.toPrecision(digits))) >= 1000 && idx > 0) {
  ;[factor, prefix] = PREFIXES[idx - 1]
  corrected = (value / factor) * (1 + 1e-14)
}
return `${corrected.toPrecision(digits)} ${prefix}${unit}`.trim()
```

- [ ] **Step 4: Run tests** — `npm test` → all pass (42 + 3 new = 45).

- [ ] **Step 5: Commit**

```bash
git add src/core && git commit -m "fix(core): stubShort equivalent-shunt arc sweep; formatEng prefix rollover"
```

---

### Task 2: core/synthesis.ts — L-network and single-stub matching

**Files:**
- Create: `src/core/synthesis.ts`
- Test: `src/core/synthesis.test.ts`

**Interfaces:**
- Consumes: `Complex`, `cx`, `abs` from `./complex`; `gammaFromZ` from `./transform`; `CircuitElement` from `./elements`; `evaluateChain` from `./network`; `formatEng` from `./units`
- Produces:

```ts
interface MatchSolution { label: string; elements: CircuitElement[] }  // elements in chain order (load-first)
function lNetworkSolutions(zLoad: Complex, z0: number, fHz: number): MatchSolution[]  // up to 4
function stubMatchSolutions(zLoad: Complex, z0: number, fHz: number): MatchSolution[] // up to 2 (line + open stub)
```

Every returned solution is self-verified: evaluating its chain lands within |Γ| < 1e-4 of center.

- [ ] **Step 1: Write failing tests**

Create `src/core/synthesis.test.ts`:

```ts
import { describe, expect, test } from 'vitest'
import { abs, cx } from './complex'
import { evaluateChain } from './network'
import { lNetworkSolutions, stubMatchSolutions } from './synthesis'
import { gammaFromZ } from './transform'

const matches = (sol: { elements: import('./elements').CircuitElement[] }, zl: ReturnType<typeof cx>, z0: number, f: number) => {
  const stages = evaluateChain(zl, sol.elements, f)
  return abs(gammaFromZ(stages[stages.length - 1], z0))
}

describe('lNetworkSolutions', () => {
  test('Veritasium load 36+74j @ 50Ω, 1085 MHz: every solution really matches', () => {
    const sols = lNetworkSolutions(cx(36, 74), 50, 1.085e9)
    expect(sols.length).toBeGreaterThanOrEqual(2)
    for (const s of sols) expect(matches(s, cx(36, 74), 50, 1.085e9)).toBeLessThan(1e-4)
  })
  test('RL < Z0 load offers both topologies (up to 4 solutions)', () => {
    const sols = lNetworkSolutions(cx(20, -30), 50, 14.2e6)
    expect(sols.length).toBeGreaterThanOrEqual(3)
    for (const s of sols) expect(matches(s, cx(20, -30), 50, 14.2e6)).toBeLessThan(1e-4)
  })
  test('pure 100Ω resistive load matches', () => {
    const sols = lNetworkSolutions(cx(100, 0), 50, 14.2e6)
    expect(sols.length).toBeGreaterThanOrEqual(2)
    for (const s of sols) expect(matches(s, cx(100, 0), 50, 14.2e6)).toBeLessThan(1e-4)
  })
  test('every element has finite positive value and a label', () => {
    for (const s of lNetworkSolutions(cx(36, 74), 50, 1.085e9)) {
      expect(s.label.length).toBeGreaterThan(0)
      for (const e of s.elements) { expect(Number.isFinite(e.value)).toBe(true); expect(e.value).toBeGreaterThan(0) }
    }
  })
})

describe('stubMatchSolutions', () => {
  test('36+74j @ 50Ω: two line+open-stub solutions that really match', () => {
    const sols = stubMatchSolutions(cx(36, 74), 50, 1.085e9)
    expect(sols).toHaveLength(2)
    for (const s of sols) {
      expect(s.elements[0].kind).toBe('line')
      expect(s.elements[1].kind).toBe('stubOpen')
      expect(matches(s, cx(36, 74), 50, 1.085e9)).toBeLessThan(1e-4)
    }
  })
  test('RL = Z0 special case (50+80j) still yields verifying solutions', () => {
    const sols = stubMatchSolutions(cx(50, 80), 50, 14.2e6)
    expect(sols.length).toBeGreaterThanOrEqual(1)
    for (const s of sols) expect(matches(s, cx(50, 80), 50, 14.2e6)).toBeLessThan(1e-4)
  })
})
```

- [ ] **Step 2: Run to verify failure** — `npx vitest run src/core/synthesis.test.ts` → FAIL, module not found.

- [ ] **Step 3: Implement**

Create `src/core/synthesis.ts`:

```ts
import { abs, type Complex } from './complex'
import type { CircuitElement, ElementKind } from './elements'
import { evaluateChain } from './network'
import { gammaFromZ } from './transform'
import { formatEng } from './units'

export interface MatchSolution { label: string; elements: CircuitElement[] }

let uid = 0
const mk = (kind: ElementKind, value: number, lineZ0?: number): CircuitElement =>
  ({ id: `m${uid++}`, kind, value, lineZ0, enabled: true })

const seriesFromX = (x: number, w: number): CircuitElement =>
  x >= 0 ? mk('seriesL', x / w) : mk('seriesC', -1 / (w * x))
const shuntFromB = (b: number, w: number): CircuitElement =>
  b >= 0 ? mk('shuntC', b / w) : mk('shuntL', -1 / (w * b))

const NAME: Record<ElementKind, string> = {
  seriesL: 'series L', seriesC: 'series C', seriesR: 'series R',
  shuntL: 'shunt L', shuntC: 'shunt C', shuntR: 'shunt R',
  line: 'line', stubOpen: 'open stub', stubShort: 'short stub',
}
const UNIT: Partial<Record<ElementKind, string>> = { seriesL: 'H', shuntL: 'H', seriesC: 'F', shuntC: 'F' }

function label(elements: CircuitElement[]): string {
  return elements
    .map((e) => `${NAME[e.kind]} ${UNIT[e.kind] ? formatEng(e.value, UNIT[e.kind]!) : `${e.value.toFixed(1)}°`}`)
    .join(' → ')
}

function verified(elements: CircuitElement[], zLoad: Complex, z0: number, fHz: number): MatchSolution | null {
  // ponytail: near-degenerate components (X or B ≈ 0) produce value 0/Infinity — drop those solutions
  for (const e of elements) if (!Number.isFinite(e.value) || e.value <= 0) return null
  const stages = evaluateChain(zLoad, elements, fHz)
  if (abs(gammaFromZ(stages[stages.length - 1], z0)) >= 1e-4) return null
  return { label: label(elements), elements }
}

// Two-element L-networks. Chain order is load-first.
// Topology A: shunt jB at the load, then series jX. Re{1/(YL + jB)} = z0 requires G ≤ 1/z0.
// Topology B: series jX at the load, then shunt jB. Re{1/(ZL + jX)} = 1/z0 requires R ≤ z0.
export function lNetworkSolutions(zLoad: Complex, z0: number, fHz: number): MatchSolution[] {
  const w = 2 * Math.PI * fHz
  const { re: R, im: X } = zLoad
  const out: MatchSolution[] = []
  const d = R * R + X * X
  const G = R / d
  const BL = -X / d

  const dA = G / z0 - G * G
  if (dA >= 0) {
    for (const sgn of [1, -1] as const) {
      const Btot = sgn * Math.sqrt(dA)                       // BL + Bshunt
      const X1 = -Btot / (G * G + Btot * Btot)               // reactance seen after the shunt
      const s = verified([shuntFromB(Btot - BL, w), seriesFromX(-X1, w)], zLoad, z0, fHz)
      if (s) out.push(s)
    }
  }
  const dB = R * (z0 - R)
  if (dB >= 0) {
    for (const sgn of [1, -1] as const) {
      const Xtot = sgn * Math.sqrt(dB)                       // X + Xseries
      const B1 = -Xtot / (R * R + Xtot * Xtot)               // susceptance seen after the series el
      const s = verified([seriesFromX(Xtot - X, w), shuntFromB(-B1, w)], zLoad, z0, fHz)
      if (s) out.push(s)
    }
  }
  // dedupe identical labels (degenerate ± roots when discriminant ≈ 0)
  return out.filter((s, i) => out.findIndex((o) => o.label === s.label) === i)
}

// Single-stub tuner (Pozar §5.2): series line of length d, then a shunt open stub of length l.
export function stubMatchSolutions(zLoad: Complex, z0: number, fHz: number): MatchSolution[] {
  const { re: RL, im: XL } = zLoad
  const ts: number[] = []
  if (Math.abs(RL - z0) < 1e-9) {
    ts.push(-XL / (2 * z0))
  } else {
    const root = Math.sqrt((RL * ((z0 - RL) ** 2 + XL ** 2)) / z0)
    ts.push((XL + root) / (RL - z0), (XL - root) / (RL - z0))
  }
  const out: MatchSolution[] = []
  for (const t of ts) {
    let dDeg = (Math.atan(t) * 180) / Math.PI
    if (dDeg < 0) dDeg += 180                                 // + λ/2
    const B =
      (RL * RL * t - (z0 - XL * t) * (XL + z0 * t)) /
      (z0 * (RL * RL + (XL + z0 * t) ** 2))
    let lDeg = (Math.atan(-B * z0) * 180) / Math.PI           // open stub: tan(βl) = -B·z0
    if (lDeg < 0) lDeg += 180
    const s = verified([mk('line', dDeg, z0), mk('stubOpen', lDeg, z0)], zLoad, z0, fHz)
    if (s) out.push(s)
  }
  return out
}
```

- [ ] **Step 4: Run tests** — `npm test` → all pass. If the stub RL=Z0 case fails on the `lDeg`/`dDeg` λ/2 wrap, debug by printing the evaluated |Γ| per solution — the formulas above are the fix target, the tests govern.

- [ ] **Step 5: Commit**

```bash
git add src/core && git commit -m "feat(core): L-network and single-stub auto-match synthesis"
```

---

### Task 3: app/state.ts — AppState + reducer

**Files:**
- Create: `src/app/state.ts`
- Test: `src/app/state.test.ts`

**Interfaces:**
- Consumes: `CircuitElement`, `ElementKind` from `../core/elements`
- Produces:

```ts
interface ViewOptions { gridMode: 'z' | 'y' | 'zy'; showVswr: boolean; showQ: boolean; showRuler: boolean }
interface AppState { z0: number; freqHz: number; loadRe: number; loadIm: number; elements: CircuitElement[]; view: ViewOptions }
const initialState: AppState   // z0 50, 14.2 MHz, load 36+74j (the Veritasium demo load), no elements, z grid, overlays off
type Action = setZ0 | setFreq | setLoad | addElement | updateElement | toggleElement | removeElement | moveElement | replaceChain | setView | loadState  (see code)
function reduce(s: AppState, a: Action): AppState   // pure; invalid inputs (z0≤0, freq≤0, NaN) return s unchanged
const ELEMENT_DEFAULTS: Record<ElementKind, { value: number; lineZ0?: number }>
```

- [ ] **Step 1: Write failing tests**

Create `src/app/state.test.ts`:

```ts
import { describe, expect, test } from 'vitest'
import { initialState, reduce, type Action } from './state'

const run = (...actions: Action[]) => actions.reduce(reduce, initialState)

describe('reducer', () => {
  test('initial state: 50Ω, 14.2 MHz, demo load, empty chain', () => {
    expect(initialState.z0).toBe(50)
    expect(initialState.freqHz).toBe(14.2e6)
    expect(initialState.elements).toEqual([])
  })
  test('addElement appends with defaults and unique ids', () => {
    const s = run({ type: 'addElement', kind: 'seriesL' }, { type: 'addElement', kind: 'line' })
    expect(s.elements).toHaveLength(2)
    expect(s.elements[0].kind).toBe('seriesL')
    expect(s.elements[1].lineZ0).toBe(50)
    expect(s.elements[0].id).not.toBe(s.elements[1].id)
  })
  test('updateElement patches value; toggle flips enabled; remove deletes', () => {
    let s = run({ type: 'addElement', kind: 'seriesC' })
    const id = s.elements[0].id
    s = reduce(s, { type: 'updateElement', id, patch: { value: 5e-12 } })
    expect(s.elements[0].value).toBe(5e-12)
    s = reduce(s, { type: 'toggleElement', id })
    expect(s.elements[0].enabled).toBe(false)
    s = reduce(s, { type: 'removeElement', id })
    expect(s.elements).toHaveLength(0)
  })
  test('moveElement swaps neighbors and clamps at ends', () => {
    let s = run({ type: 'addElement', kind: 'seriesL' }, { type: 'addElement', kind: 'seriesC' })
    const [a, b] = s.elements.map((e) => e.id)
    s = reduce(s, { type: 'moveElement', id: b, dir: -1 })
    expect(s.elements.map((e) => e.id)).toEqual([b, a])
    expect(reduce(s, { type: 'moveElement', id: b, dir: -1 })).toBe(s)
  })
  test('invalid setZ0/setFreq/setLoad are ignored', () => {
    expect(reduce(initialState, { type: 'setZ0', z0: -5 })).toBe(initialState)
    expect(reduce(initialState, { type: 'setFreq', freqHz: 0 })).toBe(initialState)
    expect(reduce(initialState, { type: 'setLoad', re: NaN, im: 0 })).toBe(initialState)
  })
  test('setView merges partial view options', () => {
    const s = reduce(initialState, { type: 'setView', patch: { gridMode: 'y', showVswr: true } })
    expect(s.view.gridMode).toBe('y')
    expect(s.view.showVswr).toBe(true)
    expect(s.view.showQ).toBe(false)
  })
})
```

- [ ] **Step 2: Run to verify failure** — FAIL, module not found.

- [ ] **Step 3: Implement**

Create `src/app/state.ts`:

```ts
import type { CircuitElement, ElementKind } from '../core/elements'

export interface ViewOptions {
  gridMode: 'z' | 'y' | 'zy'
  showVswr: boolean
  showQ: boolean
  showRuler: boolean
}

export interface AppState {
  z0: number
  freqHz: number
  loadRe: number
  loadIm: number
  elements: CircuitElement[]
  view: ViewOptions
}

export const initialState: AppState = {
  z0: 50,
  freqHz: 14.2e6,
  loadRe: 36,
  loadIm: 74,
  elements: [],
  view: { gridMode: 'z', showVswr: false, showQ: false, showRuler: false },
}

export const ELEMENT_DEFAULTS: Record<ElementKind, { value: number; lineZ0?: number }> = {
  seriesL: { value: 100e-9 }, seriesC: { value: 100e-12 }, seriesR: { value: 50 },
  shuntL: { value: 100e-9 }, shuntC: { value: 100e-12 }, shuntR: { value: 50 },
  line: { value: 45, lineZ0: 50 }, stubOpen: { value: 45, lineZ0: 50 }, stubShort: { value: 45, lineZ0: 50 },
}

export type Action =
  | { type: 'setZ0'; z0: number }
  | { type: 'setFreq'; freqHz: number }
  | { type: 'setLoad'; re: number; im: number }
  | { type: 'addElement'; kind: ElementKind }
  | { type: 'updateElement'; id: string; patch: Partial<Pick<CircuitElement, 'value' | 'lineZ0'>>; coalesce?: string }
  | { type: 'toggleElement'; id: string }
  | { type: 'removeElement'; id: string }
  | { type: 'moveElement'; id: string; dir: -1 | 1 }
  | { type: 'replaceChain'; elements: CircuitElement[] }
  | { type: 'setView'; patch: Partial<ViewOptions> }
  | { type: 'loadState'; state: AppState }

export const newId = (): string => crypto.randomUUID().slice(0, 8)

export function reduce(s: AppState, a: Action): AppState {
  switch (a.type) {
    case 'setZ0':
      return Number.isFinite(a.z0) && a.z0 > 0 ? { ...s, z0: a.z0 } : s
    case 'setFreq':
      return Number.isFinite(a.freqHz) && a.freqHz > 0 ? { ...s, freqHz: a.freqHz } : s
    case 'setLoad':
      return Number.isFinite(a.re) && Number.isFinite(a.im) && a.re >= 0 ? { ...s, loadRe: a.re, loadIm: a.im } : s
    case 'addElement':
      return { ...s, elements: [...s.elements, { id: newId(), kind: a.kind, enabled: true, ...ELEMENT_DEFAULTS[a.kind] }] }
    case 'updateElement':
      return { ...s, elements: s.elements.map((e) => (e.id === a.id ? { ...e, ...a.patch } : e)) }
    case 'toggleElement':
      return { ...s, elements: s.elements.map((e) => (e.id === a.id ? { ...e, enabled: !e.enabled } : e)) }
    case 'removeElement':
      return { ...s, elements: s.elements.filter((e) => e.id !== a.id) }
    case 'moveElement': {
      const i = s.elements.findIndex((e) => e.id === a.id)
      const j = i + a.dir
      if (i < 0 || j < 0 || j >= s.elements.length) return s
      const els = [...s.elements]
      ;[els[i], els[j]] = [els[j], els[i]]
      return { ...s, elements: els }
    }
    case 'replaceChain':
      return { ...s, elements: a.elements }
    case 'setView':
      return { ...s, view: { ...s.view, ...a.patch } }
    case 'loadState':
      return a.state
  }
}
```

- [ ] **Step 4: Run tests** — pass. (`crypto.randomUUID` is global in Node 20 and all target browsers.)

- [ ] **Step 5: Commit**

```bash
git add src/app && git commit -m "feat(app): AppState reducer with element chain and view options"
```

---

### Task 4: app/history.ts — undo/redo with slider coalescing

**Files:**
- Create: `src/app/history.ts`
- Test: `src/app/history.test.ts`

**Interfaces:**
- Produces:

```ts
interface History<S> { past: S[]; present: S; future: S[]; key?: string }
type HistoryAction<A> = A | { type: 'undo' } | { type: 'redo' }
function withHistory<S, A extends { type: string; coalesce?: string }>(reduce: (s: S, a: A) => S): (h: History<S>, a: HistoryAction<A>) => History<S>
function initHistory<S>(present: S): History<S>
```

Semantics: normal action pushes present onto past (cap 100), clears future. Action with `coalesce` equal to the previous action's `coalesce` REPLACES present without pushing (a slider drag = one undo step). No-op reductions (`next === present`) return `h` unchanged. undo/redo shuttle between stacks; empty stack = no-op.

- [ ] **Step 1: Write failing tests**

Create `src/app/history.test.ts`:

```ts
import { describe, expect, test } from 'vitest'
import { initHistory, withHistory, type HistoryAction } from './history'

type S = { n: number }
type A = { type: 'set'; n: number; coalesce?: string }
const red = withHistory<S, A>((s, a) => (a.n === s.n ? s : { n: a.n }))
const run = (...as: HistoryAction<A>[]) => as.reduce(red, initHistory<S>({ n: 0 }))

describe('withHistory', () => {
  test('actions push history; undo/redo walk it', () => {
    let h = run({ type: 'set', n: 1 }, { type: 'set', n: 2 })
    expect(h.present.n).toBe(2)
    h = red(h, { type: 'undo' })
    expect(h.present.n).toBe(1)
    h = red(h, { type: 'redo' })
    expect(h.present.n).toBe(2)
  })
  test('undo at empty past and redo at empty future are no-ops', () => {
    const h0 = initHistory<S>({ n: 0 })
    expect(red(h0, { type: 'undo' })).toBe(h0)
    expect(red(h0, { type: 'redo' })).toBe(h0)
  })
  test('new action clears future', () => {
    let h = run({ type: 'set', n: 1 }, { type: 'set', n: 2 })
    h = red(h, { type: 'undo' })
    h = red(h, { type: 'set', n: 9 })
    expect(h.future).toHaveLength(0)
    expect(red(h, { type: 'undo' }).present.n).toBe(1)
  })
  test('coalesced actions collapse into one undo step', () => {
    let h = run(
      { type: 'set', n: 1 },
      { type: 'set', n: 2, coalesce: 'drag' },
      { type: 'set', n: 3, coalesce: 'drag' },
      { type: 'set', n: 4, coalesce: 'drag' },
    )
    expect(h.present.n).toBe(4)
    h = red(h, { type: 'undo' })
    expect(h.present.n).toBe(1)   // whole drag undone as one step
  })
  test('no-op reduction leaves history untouched', () => {
    const h = run({ type: 'set', n: 1 })
    expect(red(h, { type: 'set', n: 1 })).toBe(h)
  })
  test('past capped at 100', () => {
    let h = initHistory<S>({ n: 0 })
    for (let i = 1; i <= 150; i++) h = red(h, { type: 'set', n: i })
    expect(h.past.length).toBe(100)
  })
})
```

- [ ] **Step 2: Run to verify failure** — FAIL, module not found.

- [ ] **Step 3: Implement**

Create `src/app/history.ts`:

```ts
export interface History<S> { past: S[]; present: S; future: S[]; key?: string }
export type HistoryAction<A> = A | { type: 'undo' } | { type: 'redo' }

const LIMIT = 100

export const initHistory = <S,>(present: S): History<S> => ({ past: [], present, future: [] })

export function withHistory<S, A extends { type: string; coalesce?: string }>(
  reduce: (s: S, a: A) => S,
): (h: History<S>, a: HistoryAction<A>) => History<S> {
  return (h, a) => {
    if (a.type === 'undo') {
      if (h.past.length === 0) return h
      return { past: h.past.slice(0, -1), present: h.past[h.past.length - 1], future: [h.present, ...h.future] }
    }
    if (a.type === 'redo') {
      if (h.future.length === 0) return h
      return { past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1) }
    }
    const act = a as A
    const next = reduce(h.present, act)
    if (next === h.present) return h
    if (act.coalesce !== undefined && act.coalesce === h.key) {
      return { ...h, present: next }                       // continue the same drag: replace, don't push
    }
    return { past: [...h.past, h.present].slice(-LIMIT), present: next, future: [], key: act.coalesce }
  }
}
```

- [ ] **Step 4: Run tests** — pass.

- [ ] **Step 5: Commit**

```bash
git add src/app && git commit -m "feat(app): undo/redo history wrapper with drag coalescing"
```

---

### Task 5: app/urlState.ts — shareable URL state

**Files:**
- Create: `src/app/urlState.ts`
- Test: `src/app/urlState.test.ts`

**Interfaces:**
- Consumes: `AppState`, `initialState` from `./state`
- Produces:

```ts
function encodeState(s: AppState): string          // "v1." + base64url(JSON)
function decodeState(hash: string): AppState | null  // null on wrong version, corrupt data, or invalid shape
```

Validation: z0/freqHz finite & > 0; loadRe finite ≥ 0; loadIm finite; elements is an array whose entries have string id, known kind, finite value > 0 (lineZ0 finite > 0 when present), boolean enabled; view merged over `initialState.view` (unknown fields dropped, missing fields defaulted).

- [ ] **Step 1: Write failing tests**

Create `src/app/urlState.test.ts`:

```ts
import { describe, expect, test } from 'vitest'
import { initialState, reduce } from './state'
import { decodeState, encodeState } from './urlState'

describe('urlState', () => {
  test('round trip preserves state', () => {
    const s = reduce(reduce(initialState, { type: 'addElement', kind: 'seriesL' }), { type: 'setView', patch: { gridMode: 'zy', showVswr: true } })
    expect(decodeState(encodeState(s))).toEqual(s)
  })
  test('encoded string is hash-safe (no +, /, =, #)', () => {
    expect(encodeState(initialState)).toMatch(/^v1\.[A-Za-z0-9_-]+$/)
  })
  test('garbage, wrong version, and empty input return null', () => {
    expect(decodeState('')).toBeNull()
    expect(decodeState('v0.abc')).toBeNull()
    expect(decodeState('v1.!!!not-base64!!!')).toBeNull()
    expect(decodeState('v1.' + btoa('{"z0":"evil"}'))).toBeNull()
  })
  test('invalid element kind rejects the whole payload', () => {
    const s = structuredClone(initialState) as unknown as { elements: unknown[] }
    s.elements = [{ id: 'x', kind: 'flumox', value: 1, enabled: true }]
    const forged = 'v1.' + encodeState(s as never).split('.')[1]
    expect(decodeState(forged)).toBeNull()
  })
  test('missing view fields are defaulted (forward compat)', () => {
    const s = structuredClone(initialState) as unknown as { view: unknown }
    s.view = { gridMode: 'y' }
    const decoded = decodeState(encodeState(s as never))
    expect(decoded?.view.gridMode).toBe('y')
    expect(decoded?.view.showVswr).toBe(false)
  })
})
```

- [ ] **Step 2: Run to verify failure** — FAIL, module not found.

- [ ] **Step 3: Implement**

Create `src/app/urlState.ts`:

```ts
import type { CircuitElement } from '../core/elements'
import { initialState, type AppState, type ViewOptions } from './state'

const VERSION = 'v1'
const KINDS = new Set(['seriesR', 'seriesL', 'seriesC', 'shuntR', 'shuntL', 'shuntC', 'line', 'stubOpen', 'stubShort'])
const GRID_MODES = new Set(['z', 'y', 'zy'])

export function encodeState(s: AppState): string {
  const bytes = new TextEncoder().encode(JSON.stringify(s))
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return `${VERSION}.${btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}`
}

const posNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0
const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

function validElement(e: unknown): e is CircuitElement {
  if (typeof e !== 'object' || e === null) return false
  const o = e as Record<string, unknown>
  return (
    typeof o.id === 'string' &&
    typeof o.kind === 'string' && KINDS.has(o.kind) &&
    posNum(o.value) &&
    (o.lineZ0 === undefined || posNum(o.lineZ0)) &&
    typeof o.enabled === 'boolean'
  )
}

export function decodeState(hash: string): AppState | null {
  try {
    const dot = hash.indexOf('.')
    if (dot < 0 || hash.slice(0, dot) !== VERSION) return null
    const b64 = hash.slice(dot + 1).replace(/-/g, '+').replace(/_/g, '/')
    const bin = atob(b64)
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0))
    const raw = JSON.parse(new TextDecoder().decode(bytes)) as Record<string, unknown>
    if (!posNum(raw.z0) || !posNum(raw.freqHz) || !num(raw.loadRe) || raw.loadRe < 0 || !num(raw.loadIm)) return null
    if (!Array.isArray(raw.elements) || !raw.elements.every(validElement)) return null
    const rv = (typeof raw.view === 'object' && raw.view !== null ? raw.view : {}) as Record<string, unknown>
    const view: ViewOptions = {
      gridMode: typeof rv.gridMode === 'string' && GRID_MODES.has(rv.gridMode) ? (rv.gridMode as ViewOptions['gridMode']) : initialState.view.gridMode,
      showVswr: typeof rv.showVswr === 'boolean' ? rv.showVswr : initialState.view.showVswr,
      showQ: typeof rv.showQ === 'boolean' ? rv.showQ : initialState.view.showQ,
      showRuler: typeof rv.showRuler === 'boolean' ? rv.showRuler : initialState.view.showRuler,
    }
    return { z0: raw.z0, freqHz: raw.freqHz, loadRe: raw.loadRe, loadIm: raw.loadIm, elements: raw.elements, view }
  } catch {
    return null
  }
}
```

- [ ] **Step 4: Run tests** — pass. (`btoa`/`atob`/`structuredClone` are global in Node 20.)

- [ ] **Step 5: Commit**

```bash
git add src/app && git commit -m "feat(app): versioned URL-hash state encoding with validation"
```

---

### Task 6: chart/overlays.ts — VSWR circles, Q arcs, wavelength ruler

**Files:**
- Create: `src/chart/overlays.ts`
- Test: `src/chart/overlays.test.ts`

**Interfaces:**
- Consumes: `cx` from `../core/complex`; `gammaFromZ` from `../core/transform`; `pathFrom` from `./geometry`
- Produces:

```ts
function vswrRadius(s: number): number                       // (s-1)/(s+1)
function qArcPath(q: number, sign: 1 | -1, samples?: number): string  // constant-Q arc from Γ=-1 to Γ=+1
interface RulerTick { x1: number; y1: number; x2: number; y2: number; label?: string; lx: number; ly: number }
function rulerTicks(): RulerTick[]  // WTG scale: 0λ at Γ=-1, clockwise, 0.5λ per lap; minor every 0.01λ, major+label every 0.05λ
const VSWR_VALUES: number[]   // [1.5, 2, 3, 5, 10]
const Q_VALUES: number[]      // [1, 2, 5]
```

Ruler geometry: for l ∈ [0, 0.5), rim angle φ = π − 4πl (Γ-plane, im-up); tick from r=1.0 to 1.035 (minor) or 1.055 (major); label at r=1.085. SVG y = −sin.

- [ ] **Step 1: Write failing tests**

Create `src/chart/overlays.test.ts`:

```ts
import { describe, expect, test } from 'vitest'
import { qArcPath, rulerTicks, vswrRadius, Q_VALUES, VSWR_VALUES } from './overlays'

describe('overlays', () => {
  test('vswrRadius: S=1 → 0 (center), S=3 → 0.5, S→∞ → →1', () => {
    expect(vswrRadius(1)).toBe(0)
    expect(vswrRadius(3)).toBeCloseTo(0.5, 12)
    expect(vswrRadius(1e9)).toBeCloseTo(1, 6)
  })
  test('constant value lists', () => {
    expect(VSWR_VALUES).toContain(2)
    expect(Q_VALUES).toContain(1)
  })
  test('Q arc starts at Γ=-1 and ends at Γ=+1; sign selects half-plane', () => {
    const d = qArcPath(1, 1, 32)
    const nums = d.match(/-?\d+\.\d+/g)!.map(Number)
    expect(nums[0]).toBeCloseTo(-1, 3); expect(nums[1]).toBeCloseTo(0, 3)
    expect(nums[nums.length - 2]).toBeCloseTo(1, 3); expect(nums[nums.length - 1]).toBeCloseTo(0, 3)
    for (let i = 1; i < nums.length; i += 2) expect(nums[i]).toBeLessThanOrEqual(1e-9)   // upper half in SVG y
    const dn = qArcPath(1, -1, 32)
    const numsN = dn.match(/-?\d+\.\d+/g)!.map(Number)
    for (let i = 1; i < numsN.length; i += 2) expect(numsN[i]).toBeGreaterThanOrEqual(-1e-9)
  })
  test('ruler: 50 ticks, 0λ at (-1,0), 0.25λ at (+1,0), labels every 0.05λ', () => {
    const ticks = rulerTicks()
    expect(ticks).toHaveLength(50)
    expect(ticks[0].x1).toBeCloseTo(-1, 9); expect(ticks[0].y1).toBeCloseTo(0, 9)
    expect(ticks[0].label).toBe('0.00')
    const quarter = ticks[25]
    expect(quarter.x1).toBeCloseTo(1, 9); expect(quarter.y1).toBeCloseTo(0, 9)
    expect(quarter.label).toBe('0.25')
    expect(ticks.filter((t) => t.label).length).toBe(10)
    // clockwise: 0.125λ is at the top (SVG y negative)
    expect(ticks[12].y1).toBeLessThan(0)   // ticks[12] = 0.12λ, near top
  })
})
```

- [ ] **Step 2: Run to verify failure** — FAIL, module not found.

- [ ] **Step 3: Implement**

Create `src/chart/overlays.ts`:

```ts
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
```

- [ ] **Step 4: Run tests** — pass.

- [ ] **Step 5: Commit**

```bash
git add src/chart && git commit -m "feat(chart): VSWR circle, Q arc, and wavelength ruler geometry"
```

---

### Task 7: SmithChart display props — grid modes, overlays, arcs, markers

**Files:**
- Modify: `src/chart/SmithChart.tsx`, `src/index.css`

**Interfaces:**
- Consumes: `overlays.ts` (Task 6), existing geometry
- Produces (all props optional; existing `<SmithChart onHoverGamma={...}/>` usage keeps working):

```ts
export interface ChartArc { id: string; d: string; colorIndex: number }
export interface ChartMarker { gamma: Complex; kind: 'load' | 'input' }
export interface SmithChartProps {
  onHoverGamma?: (g: Complex | null) => void
  gridMode?: 'z' | 'y' | 'zy'          // default 'z'
  showVswr?: boolean; showQ?: boolean; showRuler?: boolean
  arcs?: ChartArc[]; markers?: ChartMarker[]
}
export const HOME_VIEW: ViewBox        // widened to { x: -1.15, y: -1.15, w: 2.3 } for the ruler
```

- [ ] **Step 1: Implement**

In `src/chart/SmithChart.tsx`:

1. Change `HOME_VIEW` to `{ x: -1.15, y: -1.15, w: 2.3 }`.
2. Add the `ChartArc`/`ChartMarker` interfaces and new props (destructure with defaults: `gridMode = 'z'`, `showVswr = false`, `showQ = false`, `showRuler = false`, `arcs = []`, `markers = []`).
3. Wrap the existing grid path rendering in a fragment-producing helper so it can be rendered twice:

```tsx
const gridEls = (
  <>
    <line x1={-1} y1={0} x2={1} y2={0} className="grid-line" />
    {grid.r.map(({ v, d }) => (
      <path key={`r${v}`} d={d} className={v === 1 ? 'grid-line grid-emph' : 'grid-line'} />
    ))}
    {grid.x.map(({ v, d }) => (
      <path key={`x${v}`} d={d} className={Math.abs(v) === 1 ? 'grid-line grid-emph' : 'grid-line'} />
    ))}
  </>
)
```

4. Render inside the `<svg>`, in this order (grid → overlays → arcs → markers → crosshair):

```tsx
<circle cx={0} cy={0} r={1} className="chart-rim" />
{(gridMode === 'z' || gridMode === 'zy') && <g className="grid-z">{gridEls}</g>}
{(gridMode === 'y' || gridMode === 'zy') && <g className={gridMode === 'zy' ? 'grid-y grid-faint' : 'grid-y'} transform="rotate(180)">{gridEls}</g>}
{showVswr && VSWR_VALUES.map((s) => <circle key={`v${s}`} cx={0} cy={0} r={vswrRadius(s)} className="overlay-vswr" />)}
{showQ && Q_VALUES.flatMap((q) => ([1, -1] as const).map((sg) => <path key={`q${q}${sg}`} d={qArcPath(q, sg)} className="overlay-q" />))}
{showRuler && (
  <g className="ruler">
    {rulerTicks().map((t, i) => (
      <g key={i}>
        <line x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} />
        {t.label && <text x={t.lx} y={t.ly} fontSize={0.028} textAnchor="middle" dominantBaseline="middle">{t.label}</text>}
      </g>
    ))}
  </g>
)}
{arcs.map((a) => <path key={a.id} d={a.d} className="el-arc" style={{ stroke: `var(--arc-${a.colorIndex})` }} />)}
{markers.map((m, i) => (
  <circle key={i} cx={m.gamma.re} cy={-m.gamma.im} r={view.w * 0.009} className={m.kind === 'load' ? 'marker-load' : 'marker-input'} />
))}
<circle cx={0} cy={0} r={0.008} className="chart-center" />
{hover && ( ...existing crosshair... )}
```

Imports: `import { qArcPath, rulerTicks, vswrRadius, Q_VALUES, VSWR_VALUES } from './overlays'`.

5. Add CSS to `src/index.css`:

```css
:root {
  --grid-y: #caa06a;
  --arc-0: #c8401a; --arc-1: #1a6ec8; --arc-2: #1a9e50;
  --arc-3: #a53ac0; --arc-4: #c07a1a; --arc-5: #0e9aa7;
}
[data-theme='dark'] {
  --grid-y: #8a6d3f;
  --arc-0: #ff6a3d; --arc-1: #5da2f0; --arc-2: #3fce7f;
  --arc-3: #cf7fe0; --arc-4: #e0a44e; --arc-5: #38c4d0;
}
.grid-y .grid-line { stroke: var(--grid-y); }
.grid-faint { opacity: 0.45; }
.overlay-vswr { fill: none; stroke: var(--accent); stroke-width: 1px; vector-effect: non-scaling-stroke; opacity: 0.5; stroke-dasharray: 4 3; }
.overlay-q { fill: none; stroke: var(--grid-emph); stroke-width: 1px; vector-effect: non-scaling-stroke; opacity: 0.6; stroke-dasharray: 2 3; }
.ruler line { stroke: var(--grid-emph); stroke-width: 1px; vector-effect: non-scaling-stroke; }
.ruler text { fill: var(--grid-emph); }
.el-arc { fill: none; stroke-width: 2.5px; vector-effect: non-scaling-stroke; stroke-linecap: round; }
.marker-load { fill: none; stroke: var(--fg); stroke-width: 2px; vector-effect: non-scaling-stroke; }
.marker-input { fill: var(--accent); }
```

- [ ] **Step 2: Verify** — `npm test` (unchanged count) + `npm run build` clean. Controller does the visual check (all overlays on, zy mode, arcs once Task 8 wires them).

- [ ] **Step 3: Commit**

```bash
git add src/chart src/index.css && git commit -m "feat(chart): grid modes, VSWR/Q/ruler overlays, element arcs, markers"
```

---

### Task 8: Workbench wiring — reducer, URL sync, keyboard, header, settings

**Files:**
- Create: `src/app/SettingsBar.tsx`
- Modify: `src/App.tsx`, `src/index.css`

**Interfaces:**
- Consumes: state/history/urlState (Tasks 3-5), SmithChart props (Task 7), core evaluateChain/arcPoints/pathFrom/transform
- Produces: `App` owns `const [hist, dispatch] = useReducer(withHistory(reduce), ...)`; children get `state: AppState` and `dispatch: (a: HistoryAction<Action>) => void`. `SettingsBar` renders Z0 / frequency+band / load inputs. Header gains VSWR badge, undo/redo buttons, copy-link button. Layout becomes sidebar + chart + readout.

- [ ] **Step 1: Implement App state core**

Replace `src/App.tsx`:

```tsx
import { useEffect, useMemo, useReducer, useState } from 'react'
import { cx, type Complex } from './core/complex'
import { evaluateChain, arcPoints } from './core/network'
import { gammaFromZ, vswrFromGamma } from './core/transform'
import { pathFrom } from './chart/geometry'
import { SmithChart, type ChartArc, type ChartMarker } from './chart/SmithChart'
import { ReadoutPanel } from './app/ReadoutPanel'
import { SettingsBar } from './app/SettingsBar'
import { initHistory, withHistory, type HistoryAction } from './app/history'
import { initialState, reduce, type Action, type AppState } from './app/state'
import { decodeState, encodeState } from './app/urlState'

function initialTheme(): 'light' | 'dark' {
  const saved = localStorage.getItem('smith-theme')
  if (saved === 'light' || saved === 'dark') return saved
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

const historyReducer = withHistory<AppState, Action>(reduce)

export type Dispatch = (a: HistoryAction<Action>) => void

export default function App() {
  const [theme, setTheme] = useState(initialTheme)
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('smith-theme', theme)
  }, [theme])

  const [hist, dispatch] = useReducer(historyReducer, undefined, () =>
    initHistory(decodeState(location.hash.slice(1)) ?? initialState),
  )
  const state = hist.present

  // keep the URL hash in sync (debounced, replaceState: no history spam)
  useEffect(() => {
    const t = setTimeout(() => window.history.replaceState(null, '', '#' + encodeState(state)), 300)
    return () => clearTimeout(t)
  }, [state])

  // Ctrl/Cmd+Z undo, +Shift+Z / +Y redo (not while typing in inputs)
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (e.key.toLowerCase() === 'z') { e.preventDefault(); dispatch({ type: e.shiftKey ? 'redo' : 'undo' }) }
      if (e.key.toLowerCase() === 'y') { e.preventDefault(); dispatch({ type: 'redo' }) }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  const [hoverGamma, setHoverGamma] = useState<Complex | null>(null)

  const derived = useMemo(() => {
    const zLoad = cx(state.loadRe, state.loadIm)
    const stages = evaluateChain(zLoad, state.elements, state.freqHz)
    const arcs: ChartArc[] = []
    state.elements.forEach((el, i) => {
      if (el.enabled) arcs.push({ id: el.id, d: pathFrom(arcPoints(stages[i], el, state.freqHz, state.z0)), colorIndex: i % 6 })
    })
    const gLoad = gammaFromZ(zLoad, state.z0)
    const gIn = gammaFromZ(stages[stages.length - 1], state.z0)
    const markers: ChartMarker[] = [{ gamma: gLoad, kind: 'load' }, { gamma: gIn, kind: 'input' }]
    return { arcs, markers, vswr: vswrFromGamma(gIn), gIn }
  }, [state])

  const vswrClass = derived.vswr < 1.5 ? 'good' : derived.vswr < 2 ? 'ok' : 'bad'

  return (
    <div className="app">
      <header className="app-header">
        <h1>Smith Chart</h1>
        <div className="header-tools">
          <span className={`vswr-badge ${vswrClass}`} title="VSWR at the input after all elements">
            VSWR {Number.isFinite(derived.vswr) ? derived.vswr.toFixed(2) : '∞'}
          </span>
          <button onClick={() => dispatch({ type: 'undo' })} disabled={hist.past.length === 0} aria-label="Undo">↶</button>
          <button onClick={() => dispatch({ type: 'redo' })} disabled={hist.future.length === 0} aria-label="Redo">↷</button>
          <button onClick={() => navigator.clipboard.writeText(location.href)} aria-label="Copy share link">🔗</button>
          <button className="theme-toggle" aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </header>
      <SettingsBar state={state} dispatch={dispatch} />
      <main className="workbench">
        <aside className="sidebar" id="sidebar-slot" />
        <div className="chart-area">
          <SmithChart
            onHoverGamma={setHoverGamma}
            gridMode={state.view.gridMode}
            showVswr={state.view.showVswr}
            showQ={state.view.showQ}
            showRuler={state.view.showRuler}
            arcs={derived.arcs}
            markers={derived.markers}
          />
          <ReadoutPanel gamma={hoverGamma} z0={state.z0} />
        </div>
      </main>
    </div>
  )
}
```

(The `sidebar` renders palette/list/auto-match in Tasks 9-10; the placeholder `<aside id="sidebar-slot"/>` keeps layout stable and is replaced then.)

- [ ] **Step 2: SettingsBar**

Create `src/app/SettingsBar.tsx`:

```tsx
import type { Dispatch } from '../App'
import type { AppState } from './state'

const BANDS: ReadonlyArray<readonly [string, number]> = [
  ['160 m', 1.9e6], ['80 m', 3.65e6], ['40 m', 7.1e6], ['30 m', 10.12e6], ['20 m', 14.2e6],
  ['17 m', 18.1e6], ['15 m', 21.2e6], ['12 m', 24.94e6], ['10 m', 28.5e6],
  ['6 m', 50.5e6], ['2 m', 145e6], ['70 cm', 435e6],
]
const Z0S = [50, 75, 300, 450]

// numeric field that commits on blur/Enter (typing doesn't fight the reducer)
function NumField({ value, onCommit, label, step }: { value: number; onCommit: (v: number) => void; label: string; step?: number }) {
  return (
    <input
      key={value}
      type="number"
      step={step ?? 'any'}
      defaultValue={value}
      aria-label={label}
      onBlur={(e) => { const v = Number(e.target.value); if (Number.isFinite(v)) onCommit(v) }}
      onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
    />
  )
}

export function SettingsBar({ state, dispatch }: { state: AppState; dispatch: Dispatch }) {
  const freqMHz = state.freqHz / 1e6
  return (
    <div className="settings">
      <label>Z₀
        <select value={Z0S.includes(state.z0) ? String(state.z0) : 'custom'}
          onChange={(e) => { if (e.target.value !== 'custom') dispatch({ type: 'setZ0', z0: Number(e.target.value) }) }}
          aria-label="System impedance">
          {Z0S.map((z) => <option key={z} value={z}>{z} Ω</option>)}
          <option value="custom">custom</option>
        </select>
        <NumField value={state.z0} onCommit={(v) => dispatch({ type: 'setZ0', z0: v })} label="Z0 ohms" />
      </label>
      <label>f
        <NumField value={Number(freqMHz.toPrecision(6))} onCommit={(v) => dispatch({ type: 'setFreq', freqHz: v * 1e6 })} label="Frequency MHz" />
        MHz
        <select value="" onChange={(e) => { const f = Number(e.target.value); if (f) dispatch({ type: 'setFreq', freqHz: f }) }} aria-label="Ham band preset">
          <option value="">band…</option>
          {BANDS.map(([name, f]) => <option key={name} value={f}>{name}</option>)}
        </select>
      </label>
      <label>Load
        <NumField value={state.loadRe} onCommit={(v) => dispatch({ type: 'setLoad', re: v, im: state.loadIm })} label="Load resistance" />
        +j
        <NumField value={state.loadIm} onCommit={(v) => dispatch({ type: 'setLoad', re: state.loadRe, im: v })} label="Load reactance" />
        Ω
      </label>
      <span className="view-toggles">
        <label><input type="checkbox" checked={state.view.showVswr} onChange={() => dispatch({ type: 'setView', patch: { showVswr: !state.view.showVswr } })} /> VSWR</label>
        <label><input type="checkbox" checked={state.view.showQ} onChange={() => dispatch({ type: 'setView', patch: { showQ: !state.view.showQ } })} /> Q</label>
        <label><input type="checkbox" checked={state.view.showRuler} onChange={() => dispatch({ type: 'setView', patch: { showRuler: !state.view.showRuler } })} /> λ ruler</label>
        <select value={state.view.gridMode} onChange={(e) => dispatch({ type: 'setView', patch: { gridMode: e.target.value as AppState['view']['gridMode'] } })} aria-label="Grid mode">
          <option value="z">Z grid</option>
          <option value="y">Y grid</option>
          <option value="zy">Z+Y</option>
        </select>
      </span>
    </div>
  )
}
```

- [ ] **Step 3: Layout CSS** — replace the old `.chart-area` rules in `src/index.css` (merge the duplicate blocks while here):

```css
.settings { display: flex; flex-wrap: wrap; gap: 1rem; align-items: center; padding: 0.4rem 1rem; border-block: 1px solid var(--grid); font-size: 0.9rem; }
.settings label { display: inline-flex; align-items: center; gap: 0.35rem; }
.settings input[type='number'] { width: 5.5rem; }
.view-toggles { display: inline-flex; gap: 0.8rem; margin-left: auto; align-items: center; }
.workbench { flex: 1; min-height: 0; display: flex; gap: 1rem; padding: 0 1rem 1rem; }
.sidebar { width: 21rem; overflow-y: auto; display: flex; flex-direction: column; gap: 1rem; }
.chart-area { flex: 1; min-height: 0; display: flex; justify-content: center; gap: 1rem; }
.header-tools { display: flex; gap: 0.5rem; align-items: center; }
.header-tools button { background: none; border: 1px solid var(--grid); border-radius: 6px; padding: 0.25rem 0.5rem; cursor: pointer; color: var(--fg); }
.header-tools button:disabled { opacity: 0.4; cursor: default; }
.vswr-badge { padding: 0.2rem 0.6rem; border-radius: 999px; font-variant-numeric: tabular-nums; font-weight: 600; }
.vswr-badge.good { background: #1a9e5033; color: #1a9e50; }
.vswr-badge.ok { background: #c07a1a33; color: #c07a1a; }
.vswr-badge.bad { background: #c8401a33; color: #c8401a; }
input, select { background: var(--bg); color: var(--fg); border: 1px solid var(--grid); border-radius: 4px; padding: 0.15rem 0.3rem; }
@media (max-width: 900px) { .workbench { flex-direction: column; } .sidebar { width: auto; } .chart-area { flex-direction: column; align-items: center; } }
```

- [ ] **Step 4: Verify** — `npm test` + `npm run build` clean. Controller live-checks: demo load markers + VSWR badge (load 36+74j → VSWR 4.95 red), settings edits, band preset, undo/redo buttons, URL round-trip (copy hash, reload).

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(app): workbench shell with reducer, URL sync, undo/redo, settings bar"
```

---

### Task 9: Element palette and chain list

**Files:**
- Create: `src/app/elementMeta.ts`, `src/app/ElementPalette.tsx`, `src/app/ElementList.tsx`
- Modify: `src/App.tsx` (replace sidebar placeholder), `src/index.css`
- Test: `src/app/elementMeta.test.ts`

**Interfaces:**
- Consumes: state Action/dispatch (Task 8 `Dispatch` type), `CircuitElement`, `formatEng`, `degToMeters`
- Produces:

```ts
// elementMeta.ts
const KIND_META: Record<ElementKind, { label: string; unit: string; toDisplay: number }>
const RANGES: Record<ElementKind, [number, number]>          // slider min/max in core units
function sliderT(value: number, kind: ElementKind): number    // value → 0..1000 log position
function valueFromT(t: number, kind: ElementKind): number     // inverse
```

- [ ] **Step 1: TDD the slider math**

Create `src/app/elementMeta.test.ts`:

```ts
import { describe, expect, test } from 'vitest'
import { RANGES, sliderT, valueFromT } from './elementMeta'

describe('log slider mapping', () => {
  test('round trip within 0.1%', () => {
    for (const v of [1e-9, 47e-9, 3.3e-6]) {
      expect(valueFromT(sliderT(v, 'seriesL'), 'seriesL')).toBeCloseTo(v, 12)
    }
  })
  test('endpoints map to range bounds', () => {
    const [min, max] = RANGES.seriesC
    expect(valueFromT(0, 'seriesC')).toBeCloseTo(min, 15)
    expect(valueFromT(1000, 'seriesC')).toBeCloseTo(max, 9)
  })
  test('out-of-range values clamp', () => {
    expect(sliderT(1e-15, 'seriesC')).toBe(0)
    expect(sliderT(1, 'seriesC')).toBe(1000)
  })
})
```

Run → FAIL. Create `src/app/elementMeta.ts`:

```ts
import type { ElementKind } from '../core/elements'

export const KIND_META: Record<ElementKind, { label: string; unit: string; toDisplay: number }> = {
  seriesL: { label: 'Series L', unit: 'nH', toDisplay: 1e9 },
  seriesC: { label: 'Series C', unit: 'pF', toDisplay: 1e12 },
  seriesR: { label: 'Series R', unit: 'Ω', toDisplay: 1 },
  shuntL: { label: 'Shunt L', unit: 'nH', toDisplay: 1e9 },
  shuntC: { label: 'Shunt C', unit: 'pF', toDisplay: 1e12 },
  shuntR: { label: 'Shunt R', unit: 'Ω', toDisplay: 1 },
  line: { label: 'Line', unit: '°', toDisplay: 1 },
  stubOpen: { label: 'Open stub', unit: '°', toDisplay: 1 },
  stubShort: { label: 'Short stub', unit: '°', toDisplay: 1 },
}

export const RANGES: Record<ElementKind, [number, number]> = {
  seriesL: [1e-10, 1e-5], shuntL: [1e-10, 1e-5],
  seriesC: [1e-13, 1e-7], shuntC: [1e-13, 1e-7],
  seriesR: [0.1, 1e4], shuntR: [0.1, 1e4],
  line: [1, 180], stubOpen: [1, 180], stubShort: [1, 180],
}

export function sliderT(value: number, kind: ElementKind): number {
  const [min, max] = RANGES[kind]
  const t = Math.round((1000 * Math.log(value / min)) / Math.log(max / min))
  return Math.min(1000, Math.max(0, t))
}

export function valueFromT(t: number, kind: ElementKind): number {
  const [min, max] = RANGES[kind]
  return min * Math.pow(max / min, t / 1000)
}
```

Run → PASS.

- [ ] **Step 2: Palette + list components**

Create `src/app/ElementPalette.tsx`:

```tsx
import type { ElementKind } from '../core/elements'
import type { Dispatch } from '../App'
import { KIND_META } from './elementMeta'

const ORDER: ElementKind[] = ['seriesL', 'seriesC', 'seriesR', 'shuntL', 'shuntC', 'shuntR', 'line', 'stubOpen', 'stubShort']

export function ElementPalette({ dispatch }: { dispatch: Dispatch }) {
  return (
    <section className="palette">
      <h2>Add element</h2>
      <div className="palette-grid">
        {ORDER.map((k) => (
          <button key={k} onClick={() => dispatch({ type: 'addElement', kind: k })}>{KIND_META[k].label}</button>
        ))}
      </div>
    </section>
  )
}
```

Create `src/app/ElementList.tsx`:

```tsx
import type { CircuitElement } from '../core/elements'
import { degToMeters, formatEng } from '../core/units'
import type { Dispatch } from '../App'
import type { AppState } from './state'
import { KIND_META, sliderT, valueFromT } from './elementMeta'

const CORE_UNIT: Record<string, string> = { nH: 'H', pF: 'F', 'Ω': 'Ω', '°': '°' }

function Row({ el, index, count, freqHz, dispatch }: { el: CircuitElement; index: number; count: number; freqHz: number; dispatch: Dispatch }) {
  const meta = KIND_META[el.kind]
  const isLine = el.kind === 'line' || el.kind === 'stubOpen' || el.kind === 'stubShort'
  const display = Number((el.value * meta.toDisplay).toPrecision(4))
  return (
    <li className={el.enabled ? 'el-row' : 'el-row el-off'}>
      <div className="el-head">
        <span className="el-swatch" style={{ background: `var(--arc-${index % 6})` }} />
        <span className="el-name">{meta.label}</span>
        <span className="el-val">
          {meta.unit === '°' ? `${el.value.toFixed(1)}° (${(el.value / 360).toFixed(3)}λ ≈ ${(degToMeters(el.value, freqHz) * 1000).toFixed(0)} mm)` : formatEng(el.value, CORE_UNIT[meta.unit])}
        </span>
        <span className="el-btns">
          <button disabled={index === 0} onClick={() => dispatch({ type: 'moveElement', id: el.id, dir: -1 })} aria-label="Move up">↑</button>
          <button disabled={index === count - 1} onClick={() => dispatch({ type: 'moveElement', id: el.id, dir: 1 })} aria-label="Move down">↓</button>
          <button onClick={() => dispatch({ type: 'toggleElement', id: el.id })} aria-label={el.enabled ? 'Disable' : 'Enable'}>{el.enabled ? '◉' : '○'}</button>
          <button onClick={() => dispatch({ type: 'removeElement', id: el.id })} aria-label="Remove">✕</button>
        </span>
      </div>
      <div className="el-controls">
        <input type="range" min={0} max={1000} value={sliderT(el.value, el.kind)} aria-label={`${meta.label} slider`}
          onChange={(e) => dispatch({ type: 'updateElement', id: el.id, patch: { value: valueFromT(Number(e.target.value), el.kind) }, coalesce: `v-${el.id}` })} />
        <input key={display} type="number" step="any" defaultValue={display} aria-label={`${meta.label} value in ${meta.unit}`}
          onBlur={(e) => { const v = Number(e.target.value) / meta.toDisplay; if (Number.isFinite(v) && v > 0) dispatch({ type: 'updateElement', id: el.id, patch: { value: v } }) }}
          onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }} />
        <span className="el-unit">{meta.unit}</span>
        {isLine && (
          <>
            <input key={el.lineZ0} type="number" className="el-z0" defaultValue={el.lineZ0 ?? 50} aria-label="Line impedance"
              onBlur={(e) => { const v = Number(e.target.value); if (Number.isFinite(v) && v > 0) dispatch({ type: 'updateElement', id: el.id, patch: { lineZ0: v } }) }}
              onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }} />
            <span className="el-unit">Ω line</span>
          </>
        )}
      </div>
    </li>
  )
}

export function ElementList({ state, dispatch }: { state: AppState; dispatch: Dispatch }) {
  if (state.elements.length === 0) return <section><h2>Network</h2><p className="hint">No elements yet — add one above. Order runs load → source.</p></section>
  return (
    <section>
      <h2>Network (load → source)</h2>
      <ul className="el-list">
        {state.elements.map((el, i) => (
          <Row key={el.id} el={el} index={i} count={state.elements.length} freqHz={state.freqHz} dispatch={dispatch} />
        ))}
      </ul>
    </section>
  )
}
```

- [ ] **Step 3: Wire into App sidebar** — in `src/App.tsx` replace `<aside className="sidebar" id="sidebar-slot" />` with:

```tsx
<aside className="sidebar">
  <ElementPalette dispatch={dispatch} />
  <ElementList state={state} dispatch={dispatch} />
</aside>
```

(imports accordingly). Add CSS:

```css
.sidebar h2 { font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--grid-emph); margin-bottom: 0.4rem; }
.palette-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.35rem; }
.palette-grid button { border: 1px solid var(--grid); background: none; color: var(--fg); border-radius: 6px; padding: 0.35rem 0.2rem; cursor: pointer; font-size: 0.8rem; }
.palette-grid button:hover { border-color: var(--accent); }
.el-list { list-style: none; display: flex; flex-direction: column; gap: 0.5rem; }
.el-row { border: 1px solid var(--grid); border-radius: 8px; padding: 0.45rem 0.6rem; }
.el-off { opacity: 0.45; }
.el-head { display: flex; align-items: center; gap: 0.4rem; }
.el-swatch { width: 0.7rem; height: 0.7rem; border-radius: 2px; flex-shrink: 0; }
.el-name { font-weight: 600; font-size: 0.85rem; }
.el-val { font-size: 0.75rem; color: var(--grid-emph); margin-left: auto; }
.el-btns { display: flex; gap: 0.15rem; }
.el-btns button { border: none; background: none; cursor: pointer; color: var(--fg); padding: 0.1rem 0.25rem; }
.el-btns button:disabled { opacity: 0.3; }
.el-controls { display: flex; align-items: center; gap: 0.4rem; margin-top: 0.35rem; }
.el-controls input[type='range'] { flex: 1; }
.el-controls input[type='number'] { width: 4.6rem; }
.el-z0 { width: 3.4rem; }
.el-unit { font-size: 0.75rem; color: var(--grid-emph); }
.hint { font-size: 0.8rem; color: var(--grid-emph); }
```

- [ ] **Step 4: Verify** — `npm test` + `npm run build` clean. Controller live-checks: add series L → arc appears and slider moves it live; add line → second arc in a different color; reorder/disable/delete; numeric entry commits on Enter; undo steps back through it; a full slider drag = ONE undo step.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(app): element palette and chain list with live arc tuning"
```

---

### Task 10: Auto-match panel

**Files:**
- Create: `src/app/AutoMatchPanel.tsx`
- Modify: `src/App.tsx` (sidebar), `src/index.css`

**Interfaces:**
- Consumes: `lNetworkSolutions`, `stubMatchSolutions` (Task 2), state/dispatch, `newId` from './state'
- Produces: panel listing solutions for the RAW load at current f/Z0; clicking one replaces the chain (fresh ids).

- [ ] **Step 1: Implement**

Create `src/app/AutoMatchPanel.tsx`:

```tsx
import { useMemo } from 'react'
import { abs, cx } from '../core/complex'
import { lNetworkSolutions, stubMatchSolutions } from '../core/synthesis'
import { gammaFromZ } from '../core/transform'
import type { Dispatch } from '../App'
import { newId, type AppState } from './state'

export function AutoMatchPanel({ state, dispatch }: { state: AppState; dispatch: Dispatch }) {
  const { loadRe, loadIm, z0, freqHz } = state
  const sols = useMemo(() => {
    const zl = cx(loadRe, loadIm)
    return [...lNetworkSolutions(zl, z0, freqHz), ...stubMatchSolutions(zl, z0, freqHz)]
  }, [loadRe, loadIm, z0, freqHz])
  const matched = abs(gammaFromZ(cx(loadRe, loadIm), z0)) < 0.01

  return (
    <section className="automatch">
      <h2>Auto-match</h2>
      {matched && <p className="hint">Load is already matched.</p>}
      {!matched && sols.length === 0 && <p className="hint">No closed-form solution for this load.</p>}
      <ul>
        {sols.map((s) => (
          <li key={s.label}>
            <button
              title="Replaces the current network"
              onClick={() => dispatch({ type: 'replaceChain', elements: s.elements.map((e) => ({ ...e, id: newId() })) })}>
              {s.label}
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
```

Add `<AutoMatchPanel state={state} dispatch={dispatch} />` at the bottom of the sidebar in `src/App.tsx`. CSS:

```css
.automatch ul { list-style: none; display: flex; flex-direction: column; gap: 0.3rem; }
.automatch button { width: 100%; text-align: left; border: 1px solid var(--grid); background: none; color: var(--fg); border-radius: 6px; padding: 0.4rem 0.6rem; cursor: pointer; font-size: 0.78rem; }
.automatch button:hover { border-color: var(--accent); }
```

- [ ] **Step 2: Verify** — `npm test` + `npm run build`. Controller live-checks: with the demo load, panel lists ≥4 solutions; clicking one loads elements and the VSWR badge goes green (≈1.00); undo restores the previous chain.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat(app): one-click auto-match panel (L-networks and single-stub)"
```

---

### Task 11: Polish and hardening

**Files:**
- Modify: `index.html`, `src/chart/SmithChart.tsx`, `.github/workflows/deploy.yml`, `README.md`
- Create: `LICENSE`
- Include: the pending `.gitignore` change (already in working tree)

- [ ] **Step 1: Theme flash fix** — in `index.html`, first child of `<body>` (before `#root`):

```html
<script>
  try {
    var t = localStorage.getItem('smith-theme')
    if (t !== 'light' && t !== 'dark') t = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    document.documentElement.dataset.theme = t
  } catch (e) { /* no-op */ }
</script>
```

- [ ] **Step 2: Native non-passive wheel listener** — in `SmithChart.tsx`, remove the `onWheel` prop and add:

```tsx
useEffect(() => {
  const svg = svgRef.current
  if (!svg) return
  const h = (e: WheelEvent) => {
    e.preventDefault()
    const p = clientToSvg(svg, e.clientX, e.clientY)
    setView((v) => zoomAbout(v, p.x, p.y, e.deltaY > 0 ? 1.2 : 1 / 1.2))
  }
  svg.addEventListener('wheel', h, { passive: false })
  return () => svg.removeEventListener('wheel', h)
}, [])
```

Delete the now-unused `onWheel` function (keep `zoomAbout`).

- [ ] **Step 3: Pan button guard** — first line of `onPointerDown`: `if (e.pointerType === 'mouse' && e.button !== 0) return`

- [ ] **Step 4: Workflow concurrency** — add to `.github/workflows/deploy.yml` top level (after `permissions:`):

```yaml
concurrency:
  group: pages
  cancel-in-progress: false
```

- [ ] **Step 5: LICENSE + README** — create `LICENSE` with the standard MIT license text, copyright `2026 Amirreza Roodsaz`. Update README's "Current status" paragraph:

```markdown
**Current status:** matching workbench — element palette (L/C/R, lines, stubs) with
live arcs and slider tuning, undo/redo, shareable URL state, VSWR/Q circle overlays,
impedance/admittance grids, wavelength ruler, and one-click auto-match (all L-network
and single-stub solutions). NanoVNA/Touchstone import and guided learning mode are next
(see `docs/superpowers/specs/`).
```

- [ ] **Step 6: Verify + commit** — `npm test` + `npm run build` clean.

```bash
git add -A && git commit -m "chore: theme flash fix, wheel/pan hardening, CI concurrency, MIT license, README"
```

---

### Task 12: Deploy + live verification

- [ ] **Step 1:** `git push origin main`; watch `gh run list --limit 1` until success.
- [ ] **Step 2:** Controller verifies the live site: workbench renders, auto-match works, URL restore from a shared link, dark mode, no console errors.
- [ ] **Step 3:** No commit (push-only task).

---

## Deviation log

(append entries here during execution if reality diverges from the plan)
