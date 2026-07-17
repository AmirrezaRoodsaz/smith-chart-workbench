# Smith Chart Workbench — Plan 3: Touchstone Import, Band View, Export, E2E

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Design matches against real measured antennas: import NanoVNA/Touchstone .s1p/.s2p files, see the whole band as curves that move while you tune, judge the match on a VSWR-vs-frequency strip chart, export results — with a Playwright smoke suite guarding the seams unit tests can't reach.

**Architecture:** Spec phase 5. New core: `touchstone.ts` (parser → impedance sweep points), `sweep.ts` (chain evaluation across a band, with frequency-scaled line lengths). Sweep data lives in React state OUTSIDE the undo history and OUTSIDE the URL hash (the `v1` hash stays settings+chain only — decided in P2 final review). Chart gains trace/marker props; a new `VswrStrip` component owns frequency scrubbing. Task 1 clears the P2 review backlog first.

**Tech Stack:** unchanged + `@playwright/test` (devDependency) for e2e.

**Spec:** `docs/superpowers/specs/2026-07-15-smith-chart-app-design.md` §6, §9. Prior plans: plan1, plan2.

**Deliberate deferrals:** manual load entry stays R+jX; Γ/VSWR/Y entry forms move to Plan 4. File import is picker-only (drag-drop in Plan 4's polish). The hover readout keeps following the pointer; marker values surface in the strip chart text and the settings-bar file readout.

## Global Constraints

- TypeScript `strict: true`; no `any`. Runtime deps still only react/react-dom.
- `src/core/` React-free. Angles = electrical degrees. SVG coords x=Re(Γ), y=−Im(Γ).
- Sweep cap: decimate imported files above 2001 points. Element cap in URLs: 64.
- Line/stub electrical lengths scale with frequency in sweeps: θ(f) = θ_design·f/f_design.
- Imported sweep data: never in the URL hash, never in undo history.
- Unit tests `src/**/*.test.ts` (Vitest); e2e `e2e/*.spec.ts` (@playwright/test) — extensions must not collide.
- Commit after every task.

---

### Task 1: P2 review backlog cleanup

**Files:**
- Modify: `src/app/urlState.ts` (+test), `src/core/synthesis.ts` (+test), `src/app/state.ts`, `src/App.tsx`, `src/app/SettingsBar.tsx`, `src/app/ElementList.tsx`, `src/app/ElementPalette.tsx`, `src/app/AutoMatchPanel.tsx`

**Interfaces:**
- Produces: `Dispatch` type moves from `App.tsx` to `app/state.ts` (`export type Dispatch = (a: HistoryAction<Action>) => void`, importing `HistoryAction` from `./history`); all panels import it from there; App no longer exports it.

- [ ] **Step 1: urlState hardening (TDD)**

Add to `src/app/urlState.test.ts`:

```ts
test('decoded elements are normalized to known fields only', () => {
  const s = structuredClone(initialState) as unknown as { elements: unknown[] }
  s.elements = [{ id: 'x', kind: 'seriesL', value: 1e-9, enabled: true, evil: 'payload', lineZ0: undefined }]
  const decoded = decodeState(encodeState(s as never))!
  expect(Object.keys(decoded.elements[0]).sort()).toEqual(['enabled', 'id', 'kind', 'value'])
})
test('element count capped at 64', () => {
  const s = structuredClone(initialState) as unknown as { elements: unknown[] }
  s.elements = Array.from({ length: 100 }, (_, i) => ({ id: `e${i}`, kind: 'seriesR', value: 1, enabled: true }))
  expect(decodeState(encodeState(s as never))!.elements).toHaveLength(64)
})
```

RED, then in `decodeState` replace the returned `elements: raw.elements` with:

```ts
const MAX_ELEMENTS = 64  // module const
const elements: CircuitElement[] = (raw.elements as CircuitElement[]).slice(0, MAX_ELEMENTS).map((e) => ({
  id: e.id, kind: e.kind, value: e.value, enabled: e.enabled,
  ...(e.lineZ0 !== undefined ? { lineZ0: e.lineZ0 } : {}),
}))
```

GREEN.

- [ ] **Step 2: synthesis degenerate-stub fix (TDD)**

Add to `src/core/synthesis.test.ts`:

```ts
test('load already on the g=1 circle (25+25j) still yields stub solutions', () => {
  const sols = stubMatchSolutions(cx(25, 25), 50, 14.2e6)
  expect(sols.length).toBeGreaterThanOrEqual(1)
  for (const s of sols) {
    expect(matches(s, cx(25, 25), 50, 14.2e6)).toBeLessThan(1e-4)
    for (const e of s.elements) expect(e.value).toBeGreaterThanOrEqual(0.01)
  }
})
test('already-matched 50Ω load yields the half-wave line-only solution', () => {
  const sols = stubMatchSolutions(cx(50, 0), 50, 14.2e6)
  expect(sols.length).toBeGreaterThanOrEqual(1)
  expect(sols[0].elements).toHaveLength(1)
  expect(sols[0].elements[0].kind).toBe('line')
})
```

RED, then in `stubMatchSolutions` after computing `dDeg`/`lDeg`:

```ts
if (dDeg < 0.01) dDeg = 180                       // zero-length line → half-wave (identity)
const els = lDeg < 0.01
  ? [mk('line', dDeg, z0)]                        // no stub needed
  : [mk('line', dDeg, z0), mk('stubOpen', lDeg, z0)]
const s = verified(els, zLoad, z0, fHz)
```

GREEN.

- [ ] **Step 3: Dispatch move + aria + cosmetics** (no test — mechanical)

1. Add to `src/app/state.ts`: `import type { HistoryAction } from './history'` and `export type Dispatch = (a: HistoryAction<Action>) => void`. Remove the export from `App.tsx`; update all `import type { Dispatch } from '../App'` to `from './state'` (SettingsBar, ElementList, ElementPalette, AutoMatchPanel).
2. `ElementList.tsx`: range input gets `aria-valuetext={meta.unit === '°' ? `${el.value.toFixed(1)} degrees` : formatEng(el.value, CORE_UNIT[el.kind === 'seriesR' || el.kind === 'shuntR' ? 'Ω' : meta.unit])}` — simplest correct form: reuse the same string already shown in `.el-val`; extract it to a local `const valText = ...` used by both. Swatch span gets `aria-hidden="true"`.
3. `App.tsx`: remove `gIn` from the `derived` return object (used only internally for `vswr`).
4. `src/core/synthesis.ts`: add above the Topology A block: `// X1/B1 are the NEGATED post-element reactance/susceptance; the call sites negate again. Intentional — do not "fix" the double negation.` Add `// ponytail: uid grows for the process lifetime; it's only an id counter` at `let uid = 0`.
5. `ElementList.tsx`: drop the dead `'°': '°'` entry from `CORE_UNIT` (the `°` branch never reaches `formatEng`).

- [ ] **Step 4: Verify + commit** — `npm test` (all passing: 78 + 4 new = 82) + `npm run build` clean.

```bash
git add -A && git commit -m "chore: P2 review backlog — URL hardening, degenerate stubs, Dispatch move, aria"
```

---

### Task 2: core/touchstone.ts — .s1p/.s2p parser

**Files:**
- Create: `src/core/touchstone.ts`
- Test: `src/core/touchstone.test.ts`

**Interfaces:**
- Consumes: `cx`, `abs`, `sub`, `Complex` from `./complex`; `zFromGamma` from `./transform`
- Produces:

```ts
interface SweepPoint { fHz: number; z: Complex }
interface TouchstoneData { points: SweepPoint[]; refOhms: number; warning?: string }
class TouchstoneError extends Error {}
function parseTouchstone(text: string): TouchstoneData   // throws TouchstoneError with a user-facing message
```

Behavior: option line `# <unit> S <RI|MA|DB> R <n>` (any order, case-insensitive, defaults GHz/S/MA/50, later option lines ignored); `!` comments anywhere; 3-column rows = 1-port, 9-column = 2-port (S11 used); frequencies sorted ascending, duplicate frequencies deduped (first wins); >2001 points decimated by stride with a `warning`; Y/Z/H/G parameter files rejected; unreadable numbers rejected; Γ within 1e-9 of +1 nudged so z stays finite.

- [ ] **Step 1: Write failing tests**

Create `src/core/touchstone.test.ts`:

```ts
import { describe, expect, test } from 'vitest'
import { parseTouchstone, TouchstoneError } from './touchstone'

const MA_FILE = `! test antenna
# MHz S MA R 50
14.0 0.5 90
14.2 0.2 45
14.4 0.1 0
`

describe('parseTouchstone', () => {
  test('MA format: 0.2∠45° at 50Ω converts to the right impedance', () => {
    const { points, refOhms } = parseTouchstone(MA_FILE)
    expect(refOhms).toBe(50)
    expect(points).toHaveLength(3)
    expect(points[1].fHz).toBe(14.2e6)
    // Γ = 0.2∠45° → z = 50(1+Γ)/(1−Γ); cross-check via magnitude sanity
    expect(points[1].z.re).toBeCloseTo(59.1, 0)
    expect(points[1].z.im).toBeCloseTo(21.7, 0)
  })
  test('RI format and kHz unit', () => {
    const { points } = parseTouchstone('# kHz S RI R 75\n7100 0.0 0.0\n')
    expect(points[0].fHz).toBe(7.1e6)
    expect(points[0].z.re).toBeCloseTo(75, 6)   // Γ=0 at 75Ω reference
  })
  test('DB format: -6.02 dB ≈ |Γ| 0.5', () => {
    const { points } = parseTouchstone('# MHz S DB R 50\n14.0 -6.0206 0\n')
    // Γ = +0.5 real → z = 50·1.5/0.5 = 150
    expect(points[0].z.re).toBeCloseTo(150, 1)
  })
  test('defaults: no option line → GHz, MA, 50Ω', () => {
    const { points, refOhms } = parseTouchstone('1.085 0.68 60\n')
    expect(points[0].fHz).toBe(1.085e9)
    expect(refOhms).toBe(50)
  })
  test('s2p rows: S11 taken from 9-column lines', () => {
    const { points } = parseTouchstone('# MHz S MA R 50\n14.0 0.5 90 0.1 0 0.1 0 0.5 -90\n')
    expect(points).toHaveLength(1)
    expect(points[0].z.im).toBeGreaterThan(0)   // 0.5∠90° is inductive side
  })
  test('comments stripped, frequencies sorted, duplicates deduped', () => {
    const { points } = parseTouchstone('# MHz S MA R 50\n14.4 0.1 0 ! tail\n14.0 0.5 90\n14.0 0.4 80\n')
    expect(points.map((p) => p.fHz)).toEqual([14.0e6, 14.4e6])
  })
  test('decimation above 2001 points with warning', () => {
    let body = '# Hz S RI R 50\n'
    for (let i = 0; i < 4000; i++) body += `${1e6 + i} 0.1 0\n`
    const { points, warning } = parseTouchstone(body)
    expect(points.length).toBeLessThanOrEqual(2001)
    expect(warning).toMatch(/Decimated/)
  })
  test('Γ=+1 (open) does not produce Infinity impedance', () => {
    const { points } = parseTouchstone('# MHz S MA R 50\n14.0 1.0 0\n')
    expect(Number.isFinite(points[0].z.re)).toBe(true)
  })
  test('rejects non-S files and garbage with friendly errors', () => {
    expect(() => parseTouchstone('# MHz Z MA R 50\n14 1 0\n')).toThrow(TouchstoneError)
    expect(() => parseTouchstone('# MHz S MA R 50\n14 banana 0\n')).toThrow(TouchstoneError)
    expect(() => parseTouchstone('')).toThrow(TouchstoneError)
    expect(() => parseTouchstone('# MHz S MA R 50\n14 0.5\n')).toThrow(TouchstoneError)
  })
})
```

- [ ] **Step 2: RED** — module not found.

- [ ] **Step 3: Implement**

Create `src/core/touchstone.ts`:

```ts
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
    return { fHz: r[0] * unit, z: zFromGamma(g, refOhms) }
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
```

- [ ] **Step 4: GREEN** — `npm test` all pass. (Cross-check the MA expectation by hand if it fails: Γ=0.2∠45° = 0.1414+0.1414j → z = 50(1.1414+0.1414j)/(0.8586−0.1414j); if the plan's 59.1/21.7 rounding is off by >0.5 Ω, recompute and fix the TEST value, noting it in the report.)

- [ ] **Step 5: Commit**

```bash
git add src/core && git commit -m "feat(core): Touchstone s1p/s2p parser with validation and decimation"
```

---

### Task 3: core/sweep.ts — band evaluation with frequency-scaled lines

**Files:**
- Create: `src/core/sweep.ts`
- Test: `src/core/sweep.test.ts`

**Interfaces:**
- Consumes: `evaluateChain`, `CircuitElement`, `SweepPoint`, `Complex`
- Produces:

```ts
function elementsAtFreq(elements: CircuitElement[], fHz: number, designHz: number): CircuitElement[]
  // line/stubOpen/stubShort values scale by fHz/designHz (physical length fixed); others unchanged
function sweepChain(points: SweepPoint[], elements: CircuitElement[], designHz: number): SweepPoint[]
  // input impedance after the (frequency-corrected) chain at every sweep point
function interpZ(points: SweepPoint[], fHz: number): Complex | null
  // linear interpolation between neighbors; null when outside the sweep range or empty
function nearestIndex(points: SweepPoint[], fHz: number): number   // -1 when empty
```

- [ ] **Step 1: Write failing tests**

Create `src/core/sweep.test.ts`:

```ts
import { describe, expect, test } from 'vitest'
import { cx } from './complex'
import type { CircuitElement } from './elements'
import { elementsAtFreq, interpZ, nearestIndex, sweepChain } from './sweep'

const line90: CircuitElement = { id: 'l', kind: 'line', value: 90, lineZ0: 50, enabled: true }
const seriesL: CircuitElement = { id: 's', kind: 'seriesL', value: 100e-9, enabled: true }

describe('sweep', () => {
  test('line lengths scale with frequency, lumped elements do not', () => {
    const [l, s] = elementsAtFreq([line90, seriesL], 2e9, 1e9)
    expect(l.value).toBe(180)
    expect(s.value).toBe(100e-9)
  })
  test('quarter-wave inverter at f0 becomes half-wave identity at 2·f0', () => {
    const pts = [{ fHz: 1e9, z: cx(25, 0) }, { fHz: 2e9, z: cx(25, 0) }]
    const out = sweepChain(pts, [line90], 1e9)
    expect(out[0].z.re).toBeCloseTo(100, 3)   // 50²/25 at design freq
    expect(out[1].z.re).toBeCloseTo(25, 3)    // half-wave: back to the load
  })
  test('interpZ midpoint and out-of-range', () => {
    const pts = [{ fHz: 1e6, z: cx(10, -20) }, { fHz: 3e6, z: cx(30, 20) }]
    const mid = interpZ(pts, 2e6)!
    expect(mid.re).toBeCloseTo(20, 9)
    expect(mid.im).toBeCloseTo(0, 9)
    expect(interpZ(pts, 0.5e6)).toBeNull()
    expect(interpZ(pts, 4e6)).toBeNull()
    expect(interpZ([], 1e6)).toBeNull()
  })
  test('interpZ at an exact sample returns that sample', () => {
    const pts = [{ fHz: 1e6, z: cx(10, 0) }, { fHz: 3e6, z: cx(30, 0) }]
    expect(interpZ(pts, 3e6)!.re).toBeCloseTo(30, 12)
  })
  test('nearestIndex', () => {
    const pts = [{ fHz: 1e6, z: cx(1, 0) }, { fHz: 2e6, z: cx(1, 0) }, { fHz: 10e6, z: cx(1, 0) }]
    expect(nearestIndex(pts, 2.4e6)).toBe(1)
    expect(nearestIndex(pts, 9e6)).toBe(2)
    expect(nearestIndex([], 1)).toBe(-1)
  })
})
```

- [ ] **Step 2: RED.**

- [ ] **Step 3: Implement**

Create `src/core/sweep.ts`:

```ts
import { cx, type Complex } from './complex'
import type { CircuitElement } from './elements'
import { evaluateChain } from './network'
import type { SweepPoint } from './touchstone'

const LINE_KINDS = new Set(['line', 'stubOpen', 'stubShort'])

// Physical line length is fixed; electrical length scales with frequency.
export function elementsAtFreq(elements: CircuitElement[], fHz: number, designHz: number): CircuitElement[] {
  return elements.map((el) =>
    LINE_KINDS.has(el.kind) ? { ...el, value: (el.value * fHz) / designHz } : el,
  )
}

export function sweepChain(points: SweepPoint[], elements: CircuitElement[], designHz: number): SweepPoint[] {
  return points.map(({ fHz, z }) => {
    const stages = evaluateChain(z, elementsAtFreq(elements, fHz, designHz), fHz)
    return { fHz, z: stages[stages.length - 1] }
  })
}

export function interpZ(points: SweepPoint[], fHz: number): Complex | null {
  if (points.length === 0 || fHz < points[0].fHz || fHz > points[points.length - 1].fHz) return null
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i], b = points[i + 1]
    if (fHz >= a.fHz && fHz <= b.fHz) {
      const t = b.fHz === a.fHz ? 0 : (fHz - a.fHz) / (b.fHz - a.fHz)
      return cx(a.z.re + t * (b.z.re - a.z.re), a.z.im + t * (b.z.im - a.z.im))
    }
  }
  return points[points.length - 1].z
}

export function nearestIndex(points: SweepPoint[], fHz: number): number {
  let best = -1, bestD = Infinity
  points.forEach((p, i) => {
    const d = Math.abs(p.fHz - fHz)
    if (d < bestD) { bestD = d; best = i }
  })
  return best
}
```

- [ ] **Step 4: GREEN** — `npm test` all pass.

- [ ] **Step 5: Commit**

```bash
git add src/core && git commit -m "feat(core): band sweep evaluation with frequency-scaled line lengths"
```

---

### Task 4: SmithChart traces + frequency marker props

**Files:**
- Modify: `src/chart/SmithChart.tsx`, `src/index.css`

**Interfaces:**
- Produces (optional props, defaults keep current behavior):

```ts
export interface ChartTrace { id: string; d: string; className: string }
// added to SmithChartProps:
traces?: ChartTrace[]            // rendered after grid/overlays, before element arcs
freqMarker?: Complex | null      // Γ position; ring marker, r = view.w * 0.011
```

- [ ] **Step 1: Implement**

In `SmithChart.tsx`: add `ChartTrace` interface; destructure `traces = []`, `freqMarker = null`. Render between the overlays and `arcs`:

```tsx
{traces.map((t) => <path key={t.id} d={t.d} className={`trace ${t.className}`} />)}
```

and after the markers:

```tsx
{freqMarker && <circle cx={freqMarker.re} cy={-freqMarker.im} r={view.w * 0.011} className="freq-marker" />}
```

CSS in `src/index.css`:

```css
.trace { fill: none; stroke-width: 2px; vector-effect: non-scaling-stroke; stroke-linecap: round; }
.trace-raw { stroke: var(--grid-emph); opacity: 0.5; }
.trace-matched { stroke: var(--accent); }
.freq-marker { fill: none; stroke: var(--fg); stroke-width: 2.5px; vector-effect: non-scaling-stroke; }
```

- [ ] **Step 2: Verify** — `npm test` (unchanged count) + `npm run build` clean. Visuals verified by controller after Task 5 wiring.

- [ ] **Step 3: Commit**

```bash
git add src/chart src/index.css && git commit -m "feat(chart): band trace and frequency marker props"
```

---

### Task 5: File import + band wiring in the app

**Files:**
- Modify: `src/App.tsx`, `src/app/SettingsBar.tsx`, `src/index.css`

**Interfaces:**
- Produces: App holds `const [sweep, setSweep] = useState<{ name: string; data: TouchstoneData } | null>(null)` and `const [importError, setImportError] = useState<string | null>(null)`. SettingsBar gains props `{ sweepName: string | null; sweepWarning?: string; importError: string | null; fileZ: Complex | null; onFile: (f: File) => void; onClearFile: () => void }`.

Behavior:
- Hidden `<input type="file" accept=".s1p,.s2p,.snp,.txt" aria-label="Import Touchstone file">` opened by a "Load .s1p" button; on change → `file.text()` → `parseTouchstone` → `setSweep({ name, data })`, `setImportError(null)`, and `dispatch({ type: 'setFreq', freqHz: <center point of sweep> })` so the design frequency snaps into band. `TouchstoneError` → `setImportError(message)` (shown inline, red); other errors → generic message.
- While a file is loaded: load R/X NumFields are replaced by a read-out of the interpolated file impedance at the design frequency (`fileZ`), plus a chip `{name} ✕` (clear button, aria-label "Clear imported file").
- App derived memo (deps `[state, sweep]`): when sweep present, `zLoad = interpZ(sweep.data.points, state.freqHz) ?? sweep.data.points[nearestIndex(...)].z`; traces built via `pathFrom(points.map(p => gammaFromZ(p.z, state.z0)))` for the raw sweep and `sweepChain(points, state.elements, state.freqHz)` for the matched sweep (classNames `trace-raw` / `trace-matched`); `freqMarker` = Γ of the matched interpolated point at `state.freqHz`; element arcs and markers keep working off `zLoad`.
- Auto-match panel keeps working: it must now receive the effective `zLoad` (pass `loadRe={zLoad.re} loadIm={zLoad.im}` — change `AutoMatchPanel` props from reading `state.loadRe/loadIm` to accepting `zRe: number; zIm: number` explicitly, keeping z0/freqHz from state).

- [ ] **Step 1: Implement** — SettingsBar file-UI block (replaces the Load label's contents when a file is loaded):

```tsx
<label>Load
  {sweepName ? (
    <>
      <span className="file-chip">
        {sweepName}
        <button aria-label="Clear imported file" onClick={onClearFile}>✕</button>
      </span>
      <span className="file-z">
        {fileZ ? `${fileZ.re.toFixed(1)} ${fileZ.im < 0 ? '-' : '+'} j${Math.abs(fileZ.im).toFixed(1)} Ω` : 'out of band'}
      </span>
    </>
  ) : (
    <>
      <NumField value={state.loadRe} onCommit={(v) => dispatch({ type: 'setLoad', re: v, im: state.loadIm })} label="Load resistance" />
      +j
      <NumField value={state.loadIm} onCommit={(v) => dispatch({ type: 'setLoad', re: state.loadRe, im: v })} label="Load reactance" />
      Ω
    </>
  )}
  <button onClick={() => fileRef.current?.click()}>Load .s1p</button>
  <input ref={fileRef} type="file" accept=".s1p,.s2p,.snp,.txt" hidden aria-label="Import Touchstone file"
    onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = '' }} />
</label>
{importError && <span className="import-error" role="alert">{importError}</span>}
{sweepWarning && <span className="hint">{sweepWarning}</span>}
```

(`const fileRef = useRef<HTMLInputElement>(null)`; CSS: `.file-chip { border: 1px solid var(--grid); border-radius: 999px; padding: 0.1rem 0.5rem; } .file-chip button { border: none; background: none; cursor: pointer; color: var(--fg); } .import-error { color: #c8401a; font-size: 0.8rem; } .file-z { font-variant-numeric: tabular-nums; color: var(--grid-emph); }`. NOTE: the hidden input must stay in the DOM — `hidden` attribute is fine for Playwright's `setInputFiles`.)

Key App additions:

```tsx
const [sweep, setSweep] = useState<{ name: string; data: TouchstoneData } | null>(null)
const [importError, setImportError] = useState<string | null>(null)

async function handleFile(f: File) {
  try {
    const data = parseTouchstone(await f.text())
    setSweep({ name: f.name, data })
    setImportError(null)
    const mid = data.points[Math.floor(data.points.length / 2)]
    dispatch({ type: 'setFreq', freqHz: mid.fHz })
  } catch (err) {
    setImportError(err instanceof TouchstoneError ? err.message : 'Could not read that file')
  }
}
```

Derived block replaces its `zLoad` line with the sweep-aware version and adds:

```tsx
let traces: ChartTrace[] = []
let freqMarker: Complex | null = null
if (sweep) {
  const raw = sweep.data.points
  const matched = sweepChain(raw, state.elements, state.freqHz)
  traces = [
    { id: 'raw', d: pathFrom(raw.map((p) => gammaFromZ(p.z, state.z0))), className: 'trace-raw' },
    { id: 'matched', d: pathFrom(matched.map((p) => gammaFromZ(p.z, state.z0))), className: 'trace-matched' },
  ]
  const zm = interpZ(matched, state.freqHz)
  if (zm) freqMarker = gammaFromZ(zm, state.z0)
}
```

(also return `matchedSweep: matched` from the memo for Task 6's strip chart — compute once).

- [ ] **Step 2: Verify** — `npm test` + `npm run build` clean. Controller browser-checks import with a real file after Task 6 (strip) lands; a temporary manual check with any .s1p is fine but not required.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat(app): Touchstone import with band traces and design-freq snap"
```

---

### Task 6: VSWR-vs-frequency strip chart with draggable marker

**Files:**
- Create: `src/app/VswrStrip.tsx`
- Modify: `src/App.tsx` (render under chart when sweep present), `src/index.css`

**Interfaces:**
- Produces:

```ts
interface StripSeries { fHz: number; s: number }   // s = VSWR, may be Infinity
function VswrStrip({ raw, matched, freqHz, dispatch }: {
  raw: StripSeries[]; matched: StripSeries[]; freqHz: number; dispatch: Dispatch
})
```

PREREQUISITE type change in `src/app/state.ts`: the `setFreq` action variant gains an optional coalesce field — `{ type: 'setFreq'; freqHz: number; coalesce?: string }` — so strip-marker scrubbing coalesces into one undo step (the history wrapper already reads `coalesce` generically).

Rendering: fixed viewBox `0 0 600 130`; x linear over the sweep range mapped to [45, 590]; y log₁₀ scale mapping VSWR 1 → y=115 and VSWR ≥20 → y=10 (`y = 115 - 105 * Math.min(1, Math.log10(s) / Math.log10(20))`); dashed horizontal guides at VSWR 1.5/2/3/5/10 with labels; raw series in `--grid-emph` at 50% opacity, matched in `--accent`; draggable vertical marker line at freqHz (pointer events on the svg: down/move → x → f clamped to range → `onPickFreq`, dispatched by App as `{ type: 'setFreq', freqHz, coalesce: 'freq-strip' }` and `{ type: 'endCoalesce' }` on pointerup); MHz labels at both ends; current VSWR text near the marker. Class `vswr-strip` on the wrapper.

- [ ] **Step 1: Implement**

```tsx
import { useRef } from 'react'
import type { Dispatch } from './state'

export interface StripSeries { fHz: number; s: number }

const X0 = 45, X1 = 590, Y_BOT = 115, Y_SPAN = 105
const yOf = (s: number) => Y_BOT - Y_SPAN * Math.min(1, Math.log10(Math.max(1, s)) / Math.log10(20))

function poly(series: StripSeries[], fMin: number, fMax: number): string {
  return series
    .map((p, i) => {
      const x = X0 + ((p.fHz - fMin) / (fMax - fMin)) * (X1 - X0)
      return `${i ? 'L' : 'M'}${x.toFixed(1)} ${yOf(p.s).toFixed(1)}`
    })
    .join('')
}

export function VswrStrip({ raw, matched, freqHz, dispatch }: {
  raw: StripSeries[]; matched: StripSeries[]; freqHz: number; dispatch: Dispatch
}) {
  const svgRef = useRef<SVGSVGElement>(null)
  if (raw.length < 2) return null
  const fMin = raw[0].fHz, fMax = raw[raw.length - 1].fHz
  const mx = X0 + ((freqHz - fMin) / (fMax - fMin)) * (X1 - X0)
  const cur = matched.reduce((b, p) => (Math.abs(p.fHz - freqHz) < Math.abs(b.fHz - freqHz) ? p : b), matched[0])

  function pick(clientX: number) {
    const svg = svgRef.current!
    const r = svg.getBoundingClientRect()
    const x = ((clientX - r.left) / r.width) * 600
    const t = Math.min(1, Math.max(0, (x - X0) / (X1 - X0)))
    dispatch({ type: 'setFreq', freqHz: fMin + t * (fMax - fMin), coalesce: 'freq-strip' })
  }

  return (
    <div className="vswr-strip">
      <svg
        ref={svgRef}
        viewBox="0 0 600 130"
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); pick(e.clientX) }}
        onPointerMove={(e) => { if (e.buttons) pick(e.clientX) }}
        onPointerUp={() => dispatch({ type: 'endCoalesce' })}
      >
        {[1.5, 2, 3, 5, 10].map((s) => (
          <g key={s}>
            <line x1={X0} y1={yOf(s)} x2={X1} y2={yOf(s)} className="strip-guide" />
            <text x={X0 - 6} y={yOf(s) + 3} textAnchor="end" className="strip-label">{s}</text>
          </g>
        ))}
        <path d={poly(raw, fMin, fMax)} className="strip-raw" />
        <path d={poly(matched, fMin, fMax)} className="strip-matched" />
        <line x1={mx} y1={5} x2={mx} y2={Y_BOT} className="strip-marker" />
        <text x={mx + 5} y={14} className="strip-label">
          {(freqHz / 1e6).toFixed(3)} MHz · VSWR {Number.isFinite(cur.s) ? cur.s.toFixed(2) : '∞'}
        </text>
        <text x={X0} y={128} className="strip-label">{(fMin / 1e6).toFixed(2)} MHz</text>
        <text x={X1} y={128} textAnchor="end" className="strip-label">{(fMax / 1e6).toFixed(2)} MHz</text>
      </svg>
    </div>
  )
}
```

App: build `raw`/`matched` StripSeries via `vswrFromGamma(gammaFromZ(p.z, state.z0))` from the memo's sweeps and render `<VswrStrip …/>` below the SmithChart inside `.chart-area`'s chart column (wrap chart+strip in a `<div className="chart-col">`). CSS:

```css
.chart-col { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0.4rem; }
.vswr-strip svg { width: 100%; height: auto; touch-action: none; cursor: crosshair; }
.strip-guide { stroke: var(--grid); stroke-dasharray: 4 4; }
.strip-label { fill: var(--grid-emph); font-size: 10px; }
.strip-raw { fill: none; stroke: var(--grid-emph); opacity: 0.5; stroke-width: 1.5; }
.strip-matched { fill: none; stroke: var(--accent); stroke-width: 2; }
.strip-marker { stroke: var(--fg); stroke-width: 1; }
```

- [ ] **Step 2: Verify** — `npm test` + `npm run build`. Controller live-checks the full import flow now.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat(app): VSWR-vs-frequency strip chart with draggable frequency marker"
```

---

### Task 7: Export — PNG snapshot + copyable network summary

**Files:**
- Create: `src/app/exportPng.ts`, `src/app/summary.ts`
- Modify: `src/App.tsx` (two header buttons), `src/app/summary.test.ts` (TDD for the summary text)

**Interfaces:**

```ts
// summary.ts
function networkSummary(state: AppState, vswr: number): string
// exportPng.ts
async function exportChartPng(svg: SVGSVGElement, background: string, scale?: number): Promise<void>  // triggers a download 'smith-chart.png'
```

- [ ] **Step 1: TDD summary.ts**

`src/app/summary.test.ts`:

```ts
import { describe, expect, test } from 'vitest'
import { initialState, reduce } from './state'
import { networkSummary } from './summary'

describe('networkSummary', () => {
  test('lists settings, elements in order, and final VSWR', () => {
    let s = reduce(initialState, { type: 'addElement', kind: 'shuntC' })
    s = reduce(s, { type: 'addElement', kind: 'line' })
    const text = networkSummary(s, 1.23)
    expect(text).toContain('Z0 50 Ω')
    expect(text).toContain('14.2 MHz')
    expect(text).toContain('Load 36 + j74 Ω')
    expect(text).toMatch(/1\. Shunt C 100 pF/)
    expect(text).toMatch(/2\. Line 45\.0° \(50 Ω\)/)
    expect(text).toContain('Input VSWR 1.23')
  })
})
```

RED, then `src/app/summary.ts`:

```ts
import { formatEng } from '../core/units'
import { KIND_META } from './elementMeta'
import type { AppState } from './state'

const CORE_UNIT: Record<string, string> = { nH: 'H', pF: 'F' }

export function networkSummary(state: AppState, vswr: number): string {
  const lines = [
    `Smith Chart Workbench — matching network`,
    `Z0 ${state.z0} Ω · f ${formatEng(state.freqHz, 'Hz')} · Load ${state.loadRe} ${state.loadIm < 0 ? '-' : '+'} j${Math.abs(state.loadIm)} Ω`,
    ...state.elements.map((el, i) => {
      const meta = KIND_META[el.kind]
      const val = meta.unit === '°'
        ? `${el.value.toFixed(1)}° (${el.lineZ0 ?? 50} Ω)`
        : meta.unit === 'Ω' ? `${el.value} Ω` : formatEng(el.value, CORE_UNIT[meta.unit])
      return `${i + 1}. ${meta.label} ${val}${el.enabled ? '' : ' (disabled)'}`
    }),
    `Input VSWR ${Number.isFinite(vswr) ? vswr.toFixed(2) : '∞'}`,
  ]
  return lines.join('\n')
}
```

GREEN. (`formatEng(14.2e6,'Hz')` → `14.2 MHz` ✓.)

- [ ] **Step 2: exportPng.ts** (no unit test — DOM/canvas; e2e covers the click path)

```ts
// Clone the SVG with computed styles inlined so CSS variables survive standalone rendering.
export async function exportChartPng(svg: SVGSVGElement, background: string, scale = 2): Promise<void> {
  const clone = svg.cloneNode(true) as SVGSVGElement
  const src = svg.querySelectorAll<SVGElement>('*')
  const dst = clone.querySelectorAll<SVGElement>('*')
  const PROPS = ['stroke', 'fill', 'stroke-width', 'stroke-dasharray', 'opacity', 'font-size', 'text-anchor'] as const
  src.forEach((el, i) => {
    const cs = getComputedStyle(el)
    for (const p of PROPS) dst[i].setAttribute(p, cs.getPropertyValue(p))
    dst[i].removeAttribute('class')
  })
  const rect = svg.getBoundingClientRect()
  clone.setAttribute('width', String(rect.width * scale))
  clone.setAttribute('height', String(rect.height * scale))
  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml' }))
  try {
    const img = new Image()
    await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(new Error('render failed')); img.src = url })
    const canvas = document.createElement('canvas')
    canvas.width = rect.width * scale
    canvas.height = rect.height * scale
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = background
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0)
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'))
    if (!blob) throw new Error('png failed')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'smith-chart.png'
    a.click()
    URL.revokeObjectURL(a.href)
  } finally {
    URL.revokeObjectURL(url)
  }
}
```

- [ ] **Step 3: Header buttons in App.tsx** (next to the copy-link button):

```tsx
<button aria-label="Export chart as PNG" onClick={() => {
  const svg = document.querySelector<SVGSVGElement>('svg.smith-chart')
  if (svg) void exportChartPng(svg, getComputedStyle(document.body).backgroundColor)
}}>📷</button>
<button aria-label="Copy network summary" onClick={() => navigator.clipboard.writeText(networkSummary(state, derived.vswr))}>📋</button>
```

- [ ] **Step 4: Verify + commit** — `npm test` + `npm run build`.

```bash
git add -A && git commit -m "feat(app): PNG chart export and copyable network summary"
```

---

### Task 8: Playwright smoke suite

**Files:**
- Create: `playwright.config.ts`, `e2e/workbench.spec.ts`, `e2e/import.spec.ts`, `e2e/fixtures/antenna.s1p`, `e2e/fixtures/gen-antenna.mjs`
- Modify: `package.json` (devDep `@playwright/test`, script `"e2e": "playwright test"`), `.gitignore` (add `test-results/`, `playwright-report/`)

- [ ] **Step 1: Setup**

```bash
npm i -D @playwright/test
npx playwright install chromium
```

`playwright.config.ts`:

```ts
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: 'e2e',
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  use: { baseURL: 'http://localhost:4173' },
  webServer: {
    command: 'npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
  },
})
```

(`npm run build` must run before `npm run e2e`; CI already builds first.)

- [ ] **Step 2: Fixture**

`e2e/fixtures/gen-antenna.mjs` (committed for reproducibility; run once: `node e2e/fixtures/gen-antenna.mjs > e2e/fixtures/antenna.s1p`):

```js
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
```

- [ ] **Step 3: Specs**

`e2e/workbench.spec.ts`:

```ts
import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => { await page.goto('/') })

async function dragSlider(page: import('@playwright/test').Page, dx: number) {
  const slider = page.getByLabel('Series L slider')
  const box = (await slider.boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2 + dx, box.y + box.height / 2, { steps: 5 })
  await page.mouse.up()
}

test('add element draws an arc; slider tunes the value', async ({ page }) => {
  await page.getByRole('button', { name: 'Series L', exact: true }).click()
  await expect(page.locator('.el-arc')).toHaveCount(1)
  await dragSlider(page, 60)
  await expect(page.locator('.el-val')).not.toHaveText('100 nH')
})

test('two separate drags are two undo steps', async ({ page }) => {
  await page.getByRole('button', { name: 'Series L', exact: true }).click()
  await dragSlider(page, 60)
  const afterFirst = await page.locator('.el-val').textContent()
  await dragSlider(page, 60)
  await expect(page.locator('.el-val')).not.toHaveText(afterFirst!)
  await page.getByLabel('Undo').click()
  await expect(page.locator('.el-val')).toHaveText(afterFirst!)
  await page.getByLabel('Undo').click()
  await expect(page.locator('.el-val')).toHaveText('100 nH')
})

test('tabbing through settings adds no undo steps', async ({ page }) => {
  await expect(page.getByLabel('Undo')).toBeDisabled()
  await page.getByLabel('Z0 ohms').click()
  for (let i = 0; i < 5; i++) await page.keyboard.press('Tab')
  await expect(page.getByLabel('Undo')).toBeDisabled()
})

test('URL hash round-trips through a fresh load', async ({ page }) => {
  await page.getByRole('button', { name: 'Shunt C', exact: true }).click()
  await page.waitForFunction(() => location.hash.startsWith('#v1.'))
  const hash = await page.evaluate(() => location.hash)
  await page.goto('/' + hash)
  await expect(page.locator('.el-name')).toHaveText(['Shunt C'])
})

test('pasting a hash into a running tab loads it (undoably)', async ({ page }) => {
  await page.getByRole('button', { name: 'Shunt C', exact: true }).click()
  await page.waitForFunction(() => location.hash.startsWith('#v1.'))
  const hash = await page.evaluate(() => location.hash)
  await page.goto('/')
  await expect(page.locator('.el-row')).toHaveCount(0)
  await page.evaluate((h) => { window.location.hash = h }, hash)
  await expect(page.locator('.el-name')).toHaveText(['Shunt C'])
  await page.getByLabel('Undo').click()
  await expect(page.locator('.el-row')).toHaveCount(0)
})

test('auto-match centers the demo load', async ({ page }) => {
  await page.locator('.automatch button').first().click()
  await expect(page.locator('.vswr-badge')).toHaveClass(/good/)
})
```

`e2e/import.spec.ts`:

```ts
import { expect, test } from '@playwright/test'

test('s1p import: curves, strip, marker drag, auto-match over the band, export', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Import Touchstone file').setInputFiles('e2e/fixtures/antenna.s1p')
  await expect(page.locator('.trace-matched')).toBeVisible()
  await expect(page.locator('.vswr-strip')).toBeVisible()

  const before = await page.getByLabel('Frequency MHz').inputValue()
  const strip = page.locator('.vswr-strip svg')
  const box = (await strip.boundingBox())!
  await page.mouse.click(box.x + box.width * 0.75, box.y + box.height / 2)
  await expect(page.getByLabel('Frequency MHz')).not.toHaveValue(before)

  await page.locator('.automatch button').first().click()
  await expect(page.locator('.vswr-badge')).toHaveClass(/good/)

  const download = page.waitForEvent('download')
  await page.getByLabel('Export chart as PNG').click()
  expect((await download).suggestedFilename()).toBe('smith-chart.png')

  await page.getByLabel('Clear imported file').click()
  await expect(page.locator('.vswr-strip')).toHaveCount(0)
})
```

- [ ] **Step 4: Run locally**

```bash
npm run build && npm run e2e
```

Expected: all specs pass. Debug selectors against the real DOM if any locator drifts from the implemented markup — fix the SPEC selectors, not the app, unless the app is genuinely missing an aria-label the plan mandates.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "test(e2e): Playwright smoke suite with synthetic antenna fixture"
```

---

### Task 9: CI e2e + deploy + live verify

**Files:**
- Modify: `.github/workflows/deploy.yml`

- [ ] **Step 1:** in the build job, after the existing `npm run build` step (order: test → build → e2e, since e2e's `vite preview` serves the just-built `dist/`):

```yaml
      - run: npx playwright install --with-deps chromium
      - run: npm run e2e
```

- [ ] **Step 2:** `npm test && npm run build && npm run e2e` locally one final time; commit `ci: run Playwright smoke suite before deploy`; push `origin main`; watch `gh run list` until green.
- [ ] **Step 3:** Controller verifies the live site: import flow with the fixture file, strip scrubbing, export, and no regressions.

---

## Deviation log

(append entries here during execution)
