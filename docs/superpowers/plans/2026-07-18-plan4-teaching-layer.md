# Plan 4 — Teaching Layer & Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the spec's teaching layer (explain-on-demand, conformal-map morph, walk-the-line demo, guided walkthroughs), Γ/VSWR load entry, drag-drop import, robustness fixes, and a polish pass — completing v1.

**Architecture:** All new teaching code lives in `src/teach/`. Pure math/data files (`morph.ts`, `walkline.ts`, `walkthrough.ts`, `missions.ts`, `explain.ts`) have zero DOM access and are unit-tested with Vitest (node environment). UI components (`MorphView.tsx`, `WalkLine.tsx`, `ExplainLayer.tsx`, `WalkthroughPanel.tsx`) are thin React wrappers verified by Playwright. Teaching UI state (open dialogs, explain mode, mission progress) is plain React state — deliberately OUTSIDE undo history and the URL hash.

**Tech Stack:** React 19 + TypeScript (strict) + Vite + SVG. Vitest (node env) for pure code, Playwright for flows. No new dependencies.

## Global Constraints

- TypeScript `strict: true`; **no new runtime dependencies** (React only). Native `<dialog>` and `<details>` for modals/menus.
- All RF math stays in `src/core/` (pure, no DOM). Teach `.ts` files are pure too — components import from them, never the reverse.
- Explain content: 2–4 plain sentences per entry, in a registry decoupled from app code (spec §7).
- Exactly the 3 missions from spec §7: (1) Reading the chart; (2) Match 36+j74 Ω with line + series L; (3) Shunt-stub match on the Y-chart.
- Teaching state (modals, explain mode, mission progress) must NOT enter undo history or the URL hash.
- Default scenario stays: Z₀=50 Ω, f=14.2 MHz, load 36+j74 Ω. Mission 2 reference match: **line ≈ 54.2° → z_in ≈ 1.00 − j1.78 normalized; series L ≈ 995 nH → VSWR < 1.05.**
- Vitest runs in the **node** environment: unit tests must not touch the DOM. Component behavior is tested in `e2e/`.
- Both themes (light + `[data-theme='dark']`) must be styled via the existing CSS variables.
- All 100 existing unit tests and 7 existing e2e specs keep passing.
- `Dispatch` type is `(a: HistoryAction<Action>) => void` from `src/app/state.ts`; slider-style continuous updates use `coalesce` keys and `endCoalesce` (see `ElementList.tsx` for the pattern).

---

### Task 1: Teach math core — morph + walk-the-line helpers

**Files:**
- Create: `src/teach/morph.ts`, `src/teach/morph.test.ts`
- Create: `src/teach/walkline.ts`, `src/teach/walkline.test.ts`

**Interfaces:**
- Consumes: `cx, add, sub, div, mul, scale, abs, type Complex` from `src/core/complex.ts`; `pathFrom` from `src/chart/geometry.ts` (maps `Complex[]` → SVG path, flipping im sign).
- Produces:
  - `SHRINK: number` (0.22), `morphPoint(z: Complex, t: number): Complex`
  - `morphGridPaths(t: number): { d: string; emph: boolean }[]` (always 17 paths)
  - `gammaAtDist(gL: Complex, lWl: number): Complex`
  - `envelopeAt(gL: Complex, lWl: number): number`

- [ ] **Step 1: Write the failing tests**

`src/teach/morph.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { cx } from '../core/complex'
import { gammaFromZ } from '../core/transform'
import { morphGridPaths, morphPoint, SHRINK } from './morph'

describe('morphPoint', () => {
  it('t=0 is the shrunk impedance plane', () => {
    const p = morphPoint(cx(1, 1), 0)
    expect(p.re).toBeCloseTo(SHRINK, 12)
    expect(p.im).toBeCloseTo(SHRINK, 12)
  })
  it('t=1 is the reflection coefficient (z0=1)', () => {
    const z = cx(0.72, 1.48)
    const got = morphPoint(z, 1)
    const want = gammaFromZ(z, 1)
    expect(got.re).toBeCloseTo(want.re, 12)
    expect(got.im).toBeCloseTo(want.im, 12)
  })
  it('t=0.5 is the midpoint of the two endpoints', () => {
    const z = cx(2, -1)
    const a = morphPoint(z, 0), b = morphPoint(z, 1), m = morphPoint(z, 0.5)
    expect(m.re).toBeCloseTo((a.re + b.re) / 2, 12)
    expect(m.im).toBeCloseTo((a.im + b.im) / 2, 12)
  })
})

describe('morphGridPaths', () => {
  it('renders 17 paths at any t (6 r-lines, 10 x-lines, 1 axis)', () => {
    expect(morphGridPaths(0)).toHaveLength(17)
    expect(morphGridPaths(1)).toHaveLength(17)
  })
  it('emphasizes r=1 and |x|=1', () => {
    expect(morphGridPaths(1).filter((p) => p.emph)).toHaveLength(3)
  })
  it('all sampled points are finite for all t', () => {
    for (const t of [0, 0.25, 0.5, 0.75, 1])
      for (const p of morphGridPaths(t)) expect(p.d).not.toMatch(/NaN|Infinity/)
  })
})
```

`src/teach/walkline.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { cx } from '../core/complex'
import { envelopeAt, gammaAtDist } from './walkline'

describe('gammaAtDist', () => {
  it('at the load it is Γ_L', () => {
    const g = gammaAtDist(cx(0.3, 0.4), 0)
    expect(g.re).toBeCloseTo(0.3, 12)
    expect(g.im).toBeCloseTo(0.4, 12)
  })
  it('a quarter wave toward the generator negates Γ', () => {
    const g = gammaAtDist(cx(0.3, 0.4), 0.25)
    expect(g.re).toBeCloseTo(-0.3, 12)
    expect(g.im).toBeCloseTo(-0.4, 12)
  })
  it('a half wave is a full lap', () => {
    const g = gammaAtDist(cx(0.3, 0.4), 0.5)
    expect(g.re).toBeCloseTo(0.3, 12)
    expect(g.im).toBeCloseTo(0.4, 12)
  })
})

describe('envelopeAt', () => {
  it('extremes are 1±|Γ| for a real positive Γ', () => {
    expect(envelopeAt(cx(0.5, 0), 0)).toBeCloseTo(1.5, 12)
    expect(envelopeAt(cx(0.5, 0), 0.25)).toBeCloseTo(0.5, 12)
  })
  it('matched load has a flat envelope of 1', () => {
    expect(envelopeAt(cx(0, 0), 0.123)).toBeCloseTo(1, 12)
  })
})
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `npx vitest run src/teach` — Expected: FAIL (modules don't exist).

- [ ] **Step 3: Implement**

`src/teach/morph.ts`:

```ts
import { add, cx, div, scale, sub, type Complex } from '../core/complex'
import { pathFrom } from '../chart/geometry'

// Display scale of the raw impedance plane at t=0 so r,x ∈ [0..5] fits the
// morph viewBox (±1.3). ponytail: straight position-lerp between the scaled
// plane and Γ — mid-morph lines aren't true circles, but at 64 samples the
// polylines are visually identical to the exact Möbius pencil.
export const SHRINK = 0.22

export function morphPoint(z: Complex, t: number): Complex {
  const g = div(sub(z, cx(1)), add(z, cx(1))) // Γ for z0 = 1 (normalized chart)
  const p = scale(z, SHRINK)
  return cx(p.re + (g.re - p.re) * t, p.im + (g.im - p.im) * t)
}

const R_LINES = [0, 0.2, 0.5, 1, 2, 5]
const X_LINES = [0.2, 0.5, 1, 2, 5]
const MAXC = 5
const N = 64

export interface MorphPath { d: string; emph: boolean }

export function morphGridPaths(t: number): MorphPath[] {
  const paths: MorphPath[] = []
  for (const r of R_LINES) {
    const pts: Complex[] = []
    for (let i = 0; i <= N; i++) pts.push(morphPoint(cx(r, -MAXC + (2 * MAXC * i) / N), t))
    paths.push({ d: pathFrom(pts), emph: r === 1 })
  }
  for (const xa of X_LINES)
    for (const sg of [1, -1] as const) {
      const pts: Complex[] = []
      for (let i = 0; i <= N; i++) pts.push(morphPoint(cx((MAXC * i) / N, sg * xa), t))
      paths.push({ d: pathFrom(pts), emph: xa === 1 })
    }
  const axis: Complex[] = []
  for (let i = 0; i <= N; i++) axis.push(morphPoint(cx((MAXC * i) / N, 0), t))
  paths.push({ d: pathFrom(axis), emph: false })
  return paths
}
```

Note: `emph` counts 3 because |x|=1 gives two emphasized paths (+1 and −1) plus r=1.

`src/teach/walkline.ts`:

```ts
import { abs, add, cx, mul, type Complex } from '../core/complex'

// Γ seen looking toward the load from a point lWl wavelengths toward the
// generator: Γ(l) = Γ_L · e^(−j4πl). A full lap every half wavelength.
export const gammaAtDist = (gL: Complex, lWl: number): Complex =>
  mul(gL, cx(Math.cos(-4 * Math.PI * lWl), Math.sin(-4 * Math.PI * lWl)))

// Standing-wave voltage envelope |1 + Γ(l)| with forward amplitude 1.
export const envelopeAt = (gL: Complex, lWl: number): number =>
  abs(add(cx(1), gammaAtDist(gL, lWl)))
```

- [ ] **Step 4: Run tests, verify pass**

Run: `npx vitest run src/teach` — Expected: PASS. Then `npx vitest run` — full suite still green.

- [ ] **Step 5: Commit**

```bash
git add src/teach
git commit -m "feat: pure teach math - conformal morph grid and walk-the-line helpers"
```

---

### Task 2: Learn menu + conformal-map morph dialog

**Files:**
- Create: `src/teach/MorphView.tsx`
- Modify: `src/App.tsx` (Learn menu in header, modal state)
- Modify: `src/index.css` (dialog + learn-menu styles)

**Interfaces:**
- Consumes: `morphGridPaths` from Task 1.
- Produces: `MorphView({ onClose }: { onClose: () => void })`; App state `const [modal, setModal] = useState<'morph' | 'walkline' | null>(null)` (Task 3 fills in `'walkline'`).

- [ ] **Step 1: Create `src/teach/MorphView.tsx`**

```tsx
import { useEffect, useRef, useState } from 'react'
import { morphGridPaths } from './morph'

export function MorphView({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => { ref.current?.showModal() }, [])
  const [t, setT] = useState(0)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    if (!playing) return
    let start: number | null = null
    let id = 0
    const tick = (ts: number) => {
      if (start === null) start = ts
      const nt = Math.min(1, (ts - start) / 4000)
      setT(nt)
      if (nt < 1) id = requestAnimationFrame(tick)
      else setPlaying(false)
    }
    id = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(id)
  }, [playing])

  const ease = t * t * (3 - 2 * t) // smoothstep
  const paths = morphGridPaths(ease)

  return (
    <dialog ref={ref} className="teach-dialog" onClose={onClose}>
      <div className="dialog-head">
        <h2>Why does it look like this?</h2>
        <button onClick={onClose} aria-label="Close">✕</button>
      </div>
      <p className="teach-blurb">
        Impedances live on an infinite half-plane: resistance runs right forever, reactance up and
        down forever. The Smith chart bends that whole half-plane into the disk of reflection
        coefficients — constant-resistance lines become circles, constant-reactance lines become
        arcs, and the point at infinity lands on the right edge of the rim.
      </p>
      <svg viewBox="-1.3 -1.3 2.6 2.6" className="morph-svg" aria-label="Conformal map morph">
        <circle cx={0} cy={0} r={1} className="chart-rim" style={{ opacity: ease }} />
        {paths.map((p, i) => (
          <path key={i} d={p.d} className={p.emph ? 'grid-line grid-emph' : 'grid-line'} />
        ))}
      </svg>
      <div className="morph-controls">
        <button onClick={() => { setT(0); setPlaying(true) }} disabled={playing}>▶ Morph</button>
        <input type="range" min={0} max={1000} value={Math.round(t * 1000)} aria-label="Morph progress"
          onChange={(e) => { setPlaying(false); setT(Number(e.target.value) / 1000) }} />
        <span className="morph-caption">{t < 0.5 ? 'impedance plane (z = r + jx)' : 'reflection plane (Γ)'}</span>
      </div>
    </dialog>
  )
}
```

- [ ] **Step 2: Wire into `src/App.tsx`**

Add imports and state:

```tsx
import { MorphView } from './teach/MorphView'
// inside App():
const [modal, setModal] = useState<'morph' | 'walkline' | null>(null)
```

In the header, insert as the FIRST child of `<div className="header-tools">`:

```tsx
<details className="learn-menu">
  <summary>Learn</summary>
  <div className="learn-items"
    onClick={(e) => ((e.currentTarget.closest('details') as HTMLDetailsElement).open = false)}>
    <button onClick={() => setModal('morph')}>Why does it look like this?</button>
  </div>
</details>
```

At the end of the returned `<div className="app">` (after `</main>`):

```tsx
{modal === 'morph' && <MorphView onClose={() => setModal(null)} />}
```

- [ ] **Step 3: Add CSS to `src/index.css`** (append)

```css
/* teach dialogs + learn menu */
.teach-dialog { border: 1px solid var(--grid); border-radius: 12px; background: var(--bg); color: var(--fg); padding: 1rem 1.25rem; max-width: min(680px, 92vw); }
.teach-dialog::backdrop { background: rgb(0 0 0 / 45%); }
.dialog-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
.dialog-head button { background: none; border: none; color: var(--fg); cursor: pointer; font-size: 1rem; }
.teach-blurb { color: var(--grid-emph); font-size: 0.9rem; margin-bottom: 0.75rem; max-width: 62ch; }
.morph-svg { width: 100%; height: auto; }
.morph-controls { display: flex; gap: 0.75rem; align-items: center; }
.morph-controls input[type='range'] { flex: 1; }
.morph-caption { font-size: 0.85rem; color: var(--grid-emph); min-width: 13rem; text-align: right; }
.learn-menu { position: relative; }
.learn-menu summary { list-style: none; cursor: pointer; border: 1px solid var(--grid); border-radius: 6px; padding: 0.25rem 0.6rem; }
.learn-menu summary::-webkit-details-marker { display: none; }
.learn-menu[open] summary { border-color: var(--accent); }
.learn-items { position: absolute; right: 0; top: calc(100% + 4px); z-index: 30; display: flex; flex-direction: column; gap: 2px; background: var(--bg); border: 1px solid var(--grid); border-radius: 8px; padding: 0.4rem; min-width: 15rem; box-shadow: 0 8px 24px rgb(0 0 0 / 20%); }
.learn-items button { text-align: left; background: none; border: none; color: var(--fg); padding: 0.35rem 0.5rem; border-radius: 6px; cursor: pointer; font-size: 0.9rem; }
.learn-items button:hover { background: color-mix(in srgb, var(--accent) 12%, transparent); }
.learn-items hr { border: none; border-top: 1px solid var(--grid); margin: 0.25rem 0; }
```

- [ ] **Step 4: Verify build + unit suite**

Run: `npm run build && npx vitest run` — Expected: build succeeds, tests pass. (Playwright coverage lands in Task 10.)

- [ ] **Step 5: Commit**

```bash
git add src/teach/MorphView.tsx src/App.tsx src/index.css
git commit -m "feat: Learn menu and scrub-able conformal-map morph dialog"
```

---

### Task 3: Walk-the-line standing-wave demo

**Files:**
- Create: `src/teach/WalkLine.tsx`
- Modify: `src/App.tsx` (expose `derived.gLoad`, menu item, render dialog)
- Modify: `src/index.css`

**Interfaces:**
- Consumes: `gammaAtDist`, `envelopeAt` (Task 1); `abs`, `arg` from core/complex.
- Produces: `WalkLine({ gLoad, onClose }: { gLoad: Complex; onClose: () => void })`; `derived.gLoad: Complex` in App's derived memo (the load's Γ — already computed there as `gLoad`, just add to the returned object).

- [ ] **Step 1: Create `src/teach/WalkLine.tsx`**

```tsx
import { useEffect, useRef, useState } from 'react'
import { abs, arg, type Complex } from '../core/complex'
import { envelopeAt, gammaAtDist } from './walkline'

const X0 = 40, X1 = 560, MID = 130 // px: generator left, load right
const PX_PER_WL = 1040             // 520 px of line = 0.5 λ
const AMP = 40

export function WalkLine({ gLoad, onClose }: { gLoad: Complex; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => { ref.current?.showModal() }, [])
  const [lWl, setLWl] = useState(0.125) // probe distance from the load, in λ
  const [tau, setTau] = useState(0)
  const dragging = useRef(false)

  useEffect(() => {
    let id = 0
    const tick = (ts: number) => { setTau((ts / 1000) * Math.PI); id = requestAnimationFrame(tick) }
    id = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(id)
  }, [])

  const m = abs(gLoad)
  const phi = arg(gLoad)
  const wave = (kind: 'fwd' | 'ref' | 'sum'): string => {
    const pts: string[] = []
    for (let x = X0; x <= X1; x += 6) {
      const beta = (2 * Math.PI * x) / PX_PER_WL
      const fwd = Math.cos(tau - beta)
      const refl = m * Math.cos(tau + beta + phi - (4 * Math.PI * X1) / PX_PER_WL)
      const v = kind === 'fwd' ? fwd : kind === 'ref' ? refl : fwd + refl
      pts.push(`${pts.length ? 'L' : 'M'}${x} ${(MID - v * AMP).toFixed(2)}`)
    }
    return pts.join('')
  }
  const envelope = (sign: 1 | -1): string => {
    const pts: string[] = []
    for (let x = X0; x <= X1; x += 6) {
      const d = (X1 - x) / PX_PER_WL
      pts.push(`${pts.length ? 'L' : 'M'}${x} ${(MID - sign * envelopeAt(gLoad, d) * AMP).toFixed(2)}`)
    }
    return pts.join('')
  }

  const probeX = X1 - lWl * PX_PER_WL
  const g = gammaAtDist(gLoad, lWl)

  function moveProbe(e: React.PointerEvent<SVGSVGElement>) {
    if (!dragging.current) return
    const r = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - r.left) / r.width) * 600
    setLWl(Math.min(0.5, Math.max(0, (X1 - x) / PX_PER_WL)))
  }

  return (
    <dialog ref={ref} className="teach-dialog" onClose={onClose}>
      <div className="dialog-head">
        <h2>Walk the line</h2>
        <button onClick={onClose} aria-label="Close">✕</button>
      </div>
      <p className="teach-blurb">
        Drag the probe. Moving toward the generator rotates your impedance clockwise around a
        constant-|Γ| circle — a full lap every half wavelength, because the wave travels the
        distance twice. The dashed envelope is the standing wave the reflection creates.
      </p>
      <div className="walkline-row">
        <svg viewBox="0 0 600 260" className="walkline-svg" aria-label="Standing wave demo"
          onPointerDown={(e) => { dragging.current = true; e.currentTarget.setPointerCapture(e.pointerId); moveProbe(e) }}
          onPointerMove={moveProbe}
          onPointerUp={() => { dragging.current = false }}
          onPointerCancel={() => { dragging.current = false }}>
          <line x1={X0} y1={MID} x2={X1} y2={MID} className="wl-line" />
          <path d={envelope(1)} className="wl-env" />
          <path d={envelope(-1)} className="wl-env" />
          <path d={wave('fwd')} className="wl-fwd" />
          <path d={wave('ref')} className="wl-ref" />
          <path d={wave('sum')} className="wl-sum" />
          <text x={X0} y={252} className="wl-label">generator</text>
          <text x={X1} y={252} className="wl-label" textAnchor="end">load</text>
          <line x1={probeX} y1={MID - 55} x2={probeX} y2={MID + 55} className="wl-probe" />
          <circle cx={probeX} cy={MID - 62} r={8} className="wl-probe-knob" />
        </svg>
        <svg viewBox="-1.15 -1.15 2.3 2.3" className="walkline-mini" aria-label="Rotation on the chart">
          <circle cx={0} cy={0} r={1} className="chart-rim" />
          <line x1={-1} y1={0} x2={1} y2={0} className="grid-line" />
          {m > 0.001 && <circle cx={0} cy={0} r={m} className="overlay-vswr" />}
          <circle cx={g.re} cy={-g.im} r={0.05} className="marker-input" />
        </svg>
      </div>
      <p className="wl-readout">
        probe: {lWl.toFixed(3)} λ = {(lWl * 360).toFixed(0)}° (electrical) from the load · |Γ| = {m.toFixed(3)}
      </p>
    </dialog>
  )
}
```

- [ ] **Step 2: Wire into `src/App.tsx`**

- In the `derived` useMemo, the load reflection coefficient `gLoad` is already computed — add `gLoad` to the returned object.
- Add `<button onClick={() => setModal('walkline')}>Walk the line</button>` to `.learn-items` after the morph button.
- Render after the MorphView line: `{modal === 'walkline' && <WalkLine gLoad={derived.gLoad} onClose={() => setModal(null)} />}`

- [ ] **Step 3: Add CSS** (append to `src/index.css`)

```css
.walkline-row { display: flex; gap: 1rem; align-items: center; }
.walkline-svg { flex: 1; min-width: 0; touch-action: none; }
.walkline-mini { width: 130px; flex: none; }
.wl-line { stroke: var(--grid-emph); stroke-width: 3; }
.wl-env { fill: none; stroke: var(--grid); stroke-dasharray: 4 3; }
.wl-fwd { fill: none; stroke: var(--arc-1); opacity: 0.6; stroke-width: 1.5; }
.wl-ref { fill: none; stroke: var(--arc-2); opacity: 0.6; stroke-width: 1.5; }
.wl-sum { fill: none; stroke: var(--accent); stroke-width: 2.5; }
.wl-probe { stroke: var(--fg); stroke-dasharray: 3 3; }
.wl-probe-knob { fill: var(--accent); cursor: ew-resize; }
.wl-label { fill: var(--grid-emph); font-size: 12px; }
.wl-readout { font-variant-numeric: tabular-nums; color: var(--grid-emph); margin-top: 0.5rem; font-size: 0.85rem; }
@media (max-width: 700px) { .walkline-row { flex-direction: column; } }
```

- [ ] **Step 4: Verify** `npm run build && npx vitest run` — Expected: green.

- [ ] **Step 5: Commit**

```bash
git add src/teach/WalkLine.tsx src/App.tsx src/index.css
git commit -m "feat: walk-the-line standing-wave demo with rotating chart point"
```

---

### Task 4: Explain-on-demand — registry + "?" mode

**Files:**
- Create: `src/teach/explain.ts`, `src/teach/explain.test.ts`, `src/teach/ExplainLayer.tsx`
- Modify: `src/App.tsx`, `src/app/SettingsBar.tsx`, `src/app/ElementPalette.tsx`, `src/app/ReadoutPanel.tsx`, `src/app/AutoMatchPanel.tsx`, `src/chart/SmithChart.tsx` (add `data-explain` attributes), `src/index.css`

**Interfaces:**
- Produces: `EXPLAIN: Record<string, ExplainEntry>` with `ExplainEntry { title: string; body: string; diagram?: string }` (diagram = trusted inline-SVG innerHTML for a `viewBox="-1.2 -1.2 2.4 2.4"` svg); `ExplainLayer({ active, onExit })`.

- [ ] **Step 1: Write the failing test**

`src/teach/explain.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { EXPLAIN } from './explain'

const KINDS = ['seriesL', 'seriesC', 'seriesR', 'shuntL', 'shuntC', 'shuntR', 'line', 'stubOpen', 'stubShort']

describe('explain registry', () => {
  it('covers every palette element', () => {
    for (const k of KINDS) expect(EXPLAIN[`el-${k}`], `el-${k}`).toBeDefined()
  })
  it('covers the core UI surfaces', () => {
    for (const id of ['chart', 'vswr-badge', 'toggle-vswr', 'toggle-q', 'toggle-ruler', 'grid-mode',
      'settings-load', 'settings-freq', 'settings-z0', 'automatch', 'strip', 'readout'])
      expect(EXPLAIN[id], id).toBeDefined()
  })
  it('every entry has a title and a real body (2+ sentences)', () => {
    for (const [id, e] of Object.entries(EXPLAIN)) {
      expect(e.title.length, id).toBeGreaterThan(2)
      expect(e.body.length, id).toBeGreaterThan(80)
      expect((e.body.match(/\./g) ?? []).length, id).toBeGreaterThanOrEqual(2)
    }
  })
})
```

- [ ] **Step 2: Run it, verify fail** — `npx vitest run src/teach/explain.test.ts` → FAIL.

- [ ] **Step 3: Create `src/teach/explain.ts`**

```ts
export interface ExplainEntry { title: string; body: string; diagram?: string }

// Content registry for "?" mode. Plain language for hams; 2–4 sentences each.
// diagram: optional trusted SVG innerHTML for a viewBox="-1.2 -1.2 2.4 2.4" svg.
export const EXPLAIN: Record<string, ExplainEntry> = {
  chart: {
    title: 'The Smith chart',
    body: 'Every point here is two things at once: an impedance R + jX and a reflection coefficient Γ. Distance from the center is |Γ| — the center is a perfect match, the rim is total reflection. Matching is just moving your input point toward the center.',
  },
  'vswr-badge': {
    title: 'VSWR',
    body: 'The voltage standing wave ratio is the classic mismatch number: 1.0 is perfect, and hams usually aim for under 1.5, or 2 at the band edges. It is the ratio of the standing wave’s voltage peaks to its troughs on the feed line, and it depends only on |Γ|.',
  },
  'toggle-vswr': {
    title: 'Constant-VSWR circles',
    body: 'Every point on one of these circles has the same mismatch severity — the same |Γ| and VSWR. A lossless piece of feed line moves your impedance around such a circle without crossing it. Only actual components can move you inward toward the match.',
    diagram: '<circle cx="0" cy="0" r="1" class="chart-rim"/><circle cx="0" cy="0" r="0.6" class="overlay-vswr"/><circle cx="0" cy="0" r="0.3" class="overlay-vswr"/><circle cx="0" cy="0" r="0.02" class="chart-center"/>',
  },
  'toggle-q': {
    title: 'Constant-Q arcs',
    body: 'Points on one of these arcs share the same ratio |X|/R, the loaded Q. A matching path that stays in the low-Q region keeps its bandwidth wide; a high-Q path gives a match at one frequency that falls apart nearby.',
  },
  'toggle-ruler': {
    title: 'Wavelength ruler',
    body: 'The rim scale reads distance along your feed line in wavelengths. Moving toward the generator rotates you clockwise, and one full lap is only half a wavelength — the wave travels the line twice, out and back.',
    diagram: '<circle cx="0" cy="0" r="1" class="chart-rim"/><line x1="0" y1="-1" x2="0" y2="-1.12" class="ruler-tick"/><line x1="1" y1="0" x2="1.12" y2="0" class="ruler-tick"/><line x1="-1" y1="0" x2="-1.12" y2="0" class="ruler-tick"/><line x1="0" y1="1" x2="0" y2="1.12" class="ruler-tick"/>',
  },
  'grid-mode': {
    title: 'Z, Y, and Z+Y grids',
    body: 'The Z grid reads impedance, which is natural for series elements. The Y grid is the same chart rotated 180° and reads admittance — parallel (shunt) elements add simply there. Z+Y overlays both, the classic immittance chart.',
  },
  'settings-load': {
    title: 'The load',
    body: 'Your antenna or other load — the thing to be matched. Enter it as R + jX in ohms, as a reflection coefficient magnitude and angle, or as a VSWR and angle: they are three descriptions of the exact same point on the chart.',
  },
  'settings-freq': {
    title: 'Design frequency',
    body: 'Reactances, line lengths in degrees, and your load’s position on the chart all depend on frequency. A match is always a match at a frequency — the band presets jump to common ham allocations.',
  },
  'settings-z0': {
    title: 'System impedance Z₀',
    body: 'The reference impedance the chart is normalized to — the chart’s center is exactly Z₀. 50 Ω is the usual radio value; 75 Ω for TV coax, 300 or 450 Ω for ladder line.',
  },
  'el-seriesL': {
    title: 'Series inductor',
    body: 'A series inductor adds positive reactance. On the chart it moves you clockwise along a constant-resistance circle, up into the inductive half. Its reactance X = 2πfL grows with frequency.',
  },
  'el-seriesC': {
    title: 'Series capacitor',
    body: 'A series capacitor adds negative reactance, moving you counter-clockwise along a constant-resistance circle into the capacitive half. Its reactance shrinks as frequency rises.',
  },
  'el-seriesR': {
    title: 'Series resistor',
    body: 'A series resistor adds resistance, sliding you along a constant-reactance arc toward the right of the chart. It also burns transmit power, so it is a last resort for matching.',
  },
  'el-shuntL': {
    title: 'Shunt inductor',
    body: 'An inductor in parallel adds negative susceptance. It moves you along a constant-conductance circle — a circle of the Y grid. Switch the grid to Y or Z+Y to watch it move naturally.',
  },
  'el-shuntC': {
    title: 'Shunt capacitor',
    body: 'A capacitor in parallel adds positive susceptance, the mirror image of the shunt inductor. It moves you the other way along a constant-conductance circle of the Y grid.',
  },
  'el-shuntR': {
    title: 'Shunt resistor',
    body: 'A resistor in parallel adds conductance, moving you along a constant-susceptance arc of the Y grid. Like its series cousin it dissipates power, so it is rarely used in a matching network.',
  },
  'el-line': {
    title: 'Transmission line',
    body: 'A series line rotates your impedance clockwise ("toward the generator") around a constant-|Γ| circle — half a wavelength is a full lap. It changes the phase of the reflection, not its size, which is exactly what makes stub matching work.',
    diagram: '<circle cx="0" cy="0" r="1" class="chart-rim"/><circle cx="0" cy="0" r="0.55" class="overlay-vswr"/><circle cx="0.39" cy="-0.39" r="0.06" class="marker-input"/><circle cx="0.55" cy="0" r="0.06" class="chart-center"/>',
  },
  'el-stubOpen': {
    title: 'Open stub',
    body: 'An open-ended stub in parallel is a trimmable reactance made of wire: short lengths look capacitive. Its length sets the susceptance it adds, so you can cancel whatever reactance remains.',
  },
  'el-stubShort': {
    title: 'Shorted stub',
    body: 'A shorted stub in parallel looks inductive for short lengths — the DC-grounded cousin of the open stub. Hams like it on antennas because it also bleeds static charge to ground.',
  },
  automatch: {
    title: 'Auto-match',
    body: 'Computed matching networks for the current load and frequency: the classic two-element L-networks plus single-stub solutions. Click one to load it into your chain, then fine-tune by hand.',
  },
  strip: {
    title: 'VSWR across the band',
    body: 'VSWR versus frequency for the imported measurement. The gray curve is your raw antenna; the colored one includes your matching network. Pulling the dip deeper and wider is the whole game.',
  },
  readout: {
    title: 'Point readout',
    body: 'Numbers for the point under your cursor: impedance (normalized and in Ω), admittance, reflection coefficient, VSWR, return loss, and mismatch loss. They are all equivalent readings of the same chart point.',
  },
}
```

- [ ] **Step 4: Run the test, verify pass** — `npx vitest run src/teach/explain.test.ts` → PASS.

- [ ] **Step 5: Create `src/teach/ExplainLayer.tsx`**

```tsx
import { useEffect, useState } from 'react'
import { EXPLAIN } from './explain'

// "?" mode: while active, any click on a [data-explain] element opens a
// popover instead of activating the control (capture-phase intercept).
export function ExplainLayer({ active, onExit }: { active: boolean; onExit: () => void }) {
  const [pop, setPop] = useState<{ id: string; x: number; y: number } | null>(null)

  useEffect(() => {
    document.body.classList.toggle('explain-on', active)
    if (!active) { setPop(null); return }
    const click = (e: MouseEvent) => {
      const t = (e.target as HTMLElement).closest?.('[data-explain]') as HTMLElement | null
      if (t && EXPLAIN[t.dataset.explain!]) {
        e.preventDefault()
        e.stopPropagation()
        setPop({ id: t.dataset.explain!, x: e.clientX, y: e.clientY })
      } else setPop(null)
    }
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onExit() }
    document.addEventListener('click', click, true)
    document.addEventListener('keydown', key)
    return () => {
      document.removeEventListener('click', click, true)
      document.removeEventListener('keydown', key)
      document.body.classList.remove('explain-on')
    }
  }, [active, onExit])

  if (!active || !pop) return null
  const entry = EXPLAIN[pop.id]
  const left = Math.max(8, Math.min(pop.x, window.innerWidth - 340))
  const top = Math.max(8, Math.min(pop.y + 12, window.innerHeight - 220))
  return (
    <div className="explain-pop" role="dialog" aria-label={entry.title} style={{ left, top }}>
      <h3>{entry.title}</h3>
      {entry.diagram && (
        <svg viewBox="-1.2 -1.2 2.4 2.4" className="explain-diagram" aria-hidden="true"
          dangerouslySetInnerHTML={{ __html: entry.diagram }} />
      )}
      <p>{entry.body}</p>
    </div>
  )
}
```

- [ ] **Step 6: Wire into `src/App.tsx`**

```tsx
import { ExplainLayer } from './teach/ExplainLayer'
// state:
const [explain, setExplain] = useState(false)
```

Header: after the Learn menu, add:

```tsx
<button aria-label="Explain mode" aria-pressed={explain} className={explain ? 'explain-btn on' : 'explain-btn'}
  onClick={() => setExplain(!explain)}>?</button>
```

Add `data-explain="vswr-badge"` to the VSWR badge `<span>`. Wrap the `<VswrStrip … />` render in `<div data-explain="strip">…</div>`. After the modals render: `<ExplainLayer active={explain} onExit={() => setExplain(false)} />`

- [ ] **Step 7: Add `data-explain` attributes to components**

- `SettingsBar.tsx`: `data-explain="settings-z0"` on the Z₀ `<label>`, `"settings-freq"` on the f `<label>`, `"settings-load"` on the Load `<label>`, `"toggle-vswr"` / `"toggle-q"` / `"toggle-ruler"` on the three checkbox `<label>`s, `"grid-mode"` on the grid `<select>`.
- `ElementPalette.tsx`: on each button, `data-explain={`el-${k}`}`.
- `ReadoutPanel.tsx`: `data-explain="readout"` on the root element.
- `AutoMatchPanel.tsx`: `data-explain="automatch"` on the root `<section>`.
- `SmithChart.tsx`: `data-explain="chart"` on the root `<svg>`.

- [ ] **Step 8: CSS** (append)

```css
/* explain mode */
.explain-btn { font-weight: 700; }
.explain-btn.on { border-color: var(--accent) !important; color: var(--accent); }
body.explain-on [data-explain] { outline: 1.5px dashed var(--accent); outline-offset: 2px; cursor: help; }
.explain-pop { position: fixed; z-index: 40; width: 330px; max-width: calc(100vw - 16px); background: var(--bg); border: 1px solid var(--accent); border-radius: 10px; padding: 0.7rem 0.9rem; box-shadow: 0 8px 24px rgb(0 0 0 / 25%); }
.explain-pop h3 { font-size: 0.9rem; margin-bottom: 0.3rem; }
.explain-pop p { font-size: 0.85rem; line-height: 1.45; }
.explain-diagram { width: 84px; float: right; margin: 0 0 0.3rem 0.5rem; }
.explain-diagram .ruler-tick { stroke: var(--grid-emph); stroke-width: 0.04; }
```

- [ ] **Step 9: Verify** `npm run build && npx vitest run` — green.

- [ ] **Step 10: Commit**

```bash
git add src/teach src/App.tsx src/app src/chart/SmithChart.tsx src/index.css
git commit -m "feat: explain-on-demand ? mode with content registry and popovers"
```

---

### Task 5: Walkthrough engine + the 3 missions (pure)

**Files:**
- Create: `src/teach/walkthrough.ts`, `src/teach/walkthrough.test.ts`
- Create: `src/teach/missions.ts`, `src/teach/missions.test.ts`

**Interfaces:**
- Consumes: `AppState` from `src/app/state.ts`; `Complex` from core.
- Produces:

```ts
export interface TourCtx { state: AppState; vswr: number; zInNorm: Complex }
export interface TourStep { text: string; target?: string; manual?: boolean; done?: (c: TourCtx) => boolean }
export interface Mission { id: string; title: string; blurb: string; steps: TourStep[] }
export function advance(idx: number, m: Mission, ctx: TourCtx): number
export const MISSIONS: Mission[]  // ids: 'reading', 'veritasium', 'stub'
```

`target` values refer to `data-tour` attributes added in Task 6: `pal-<kind>`, `settings-load`, `settings-freq`, `grid-mode`, `toggle-vswr`, `toggle-ruler`, `vswr-badge`.

- [ ] **Step 1: Write the failing tests**

`src/teach/walkthrough.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { cx } from '../core/complex'
import { initialState } from '../app/state'
import { advance, type Mission, type TourCtx } from './walkthrough'

const ctx: TourCtx = { state: initialState, vswr: 5, zInNorm: cx(0.72, 1.48) }
const mission: Mission = {
  id: 't', title: 't', blurb: '',
  steps: [
    { text: 'intro', manual: true },
    { text: 'auto-satisfied', done: () => true },
    { text: 'auto-satisfied 2', done: () => true },
    { text: 'not yet', done: (c) => c.vswr < 1.5 },
    { text: 'end', manual: true },
  ],
}

describe('advance', () => {
  it('stops at a manual step even when later steps are satisfied', () => {
    expect(advance(0, mission, ctx)).toBe(0)
  })
  it('skips consecutive satisfied auto steps', () => {
    expect(advance(1, mission, ctx)).toBe(3)
  })
  it('runs to the next manual step once the predicate passes', () => {
    expect(advance(1, mission, { ...ctx, vswr: 1.1 })).toBe(4)
  })
  it('never runs past the end', () => {
    expect(advance(5, mission, ctx)).toBe(5)
  })
})
```

`src/teach/missions.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { cx } from '../core/complex'
import type { CircuitElement, ElementKind } from '../core/elements'
import { evaluateChain } from '../core/network'
import { gammaFromZ, vswrFromGamma } from '../core/transform'
import { initialState, type AppState } from '../app/state'
import { advance, type TourCtx } from './walkthrough'
import { MISSIONS } from './missions'

function ctxFor(state: AppState): TourCtx {
  const stages = evaluateChain(cx(state.loadRe, state.loadIm), state.elements, state.freqHz)
  const zIn = stages[stages.length - 1]
  return {
    state,
    vswr: vswrFromGamma(gammaFromZ(zIn, state.z0)),
    zInNorm: cx(zIn.re / state.z0, zIn.im / state.z0),
  }
}
const el = (kind: ElementKind, value: number, lineZ0?: number): CircuitElement =>
  ({ id: kind, kind, value, enabled: true, ...(lineZ0 !== undefined ? { lineZ0 } : {}) })

describe('mission list', () => {
  it('is exactly the three spec missions', () => {
    expect(MISSIONS.map((m) => m.id)).toEqual(['reading', 'veritasium', 'stub'])
  })
})

describe('mission 1: reading the chart', () => {
  it('completes when the view toggles are set (stepping over each manual gate)', () => {
    const m = MISSIONS[0]
    const s: AppState = { ...initialState, view: { gridMode: 'zy', showVswr: true, showQ: false, showRuler: true } }
    const c = ctxFor(s)
    let i = advance(1, m, c) // auto step 1 satisfied → parked at manual step 2
    expect(i).toBe(2)
    i = advance(i + 1, m, c) // step 3 satisfied → manual step 4
    i = advance(i + 1, m, c) // step 5 satisfied → final manual step
    expect(i).toBe(m.steps.length - 1)
  })
})

describe('mission 2: the Veritasium match', () => {
  const m = () => MISSIONS[1]
  it('line 54.2° lands the input on the r = 1 circle', () => {
    const c = ctxFor({ ...initialState, elements: [el('line', 54.2, 50)] })
    expect(Math.abs(c.zInNorm.re - 1)).toBeLessThan(0.05)
    expect(c.zInNorm.im).toBeCloseTo(-1.776, 2)
    const rStep = m().steps.find((s) => s.text.includes('r = 1'))!
    expect(rStep.done!(c)).toBe(true)
  })
  it('adding 995 nH series L completes the match', () => {
    const c = ctxFor({ ...initialState, elements: [el('line', 54.2, 50), el('seriesL', 995e-9)] })
    expect(c.vswr).toBeLessThan(1.05)
    expect(advance(1, m(), c)).toBe(m().steps.length - 1) // parked at the final manual step
  })
})

describe('mission 3: stub match on the Y chart', () => {
  it('predicates are reachable with a line + open stub', () => {
    const m = MISSIONS[2]
    let found: AppState | null = null
    outer: for (let d = 1; d < 180; d += 0.5) {
      const lineOnly = ctxFor({ ...initialState, elements: [el('line', d, 50)] })
      const den = lineOnly.zInNorm.re ** 2 + lineOnly.zInNorm.im ** 2
      if (Math.abs(lineOnly.zInNorm.re / den - 1) > 0.04) continue
      for (let l = 1; l < 180; l += 0.5) {
        const s: AppState = {
          ...initialState,
          view: { ...initialState.view, gridMode: 'y' },
          elements: [el('line', d, 50), el('stubOpen', l, 50)],
        }
        if (ctxFor(s).vswr < 1.5) { found = s; break outer }
      }
    }
    expect(found).not.toBeNull()
    expect(advance(1, m, ctxFor(found!))).toBe(m.steps.length - 1)
  })
})
```

- [ ] **Step 2: Run tests, verify fail** — `npx vitest run src/teach/walkthrough.test.ts src/teach/missions.test.ts` → FAIL.

- [ ] **Step 3: Implement `src/teach/walkthrough.ts`**

```ts
import type { Complex } from '../core/complex'
import type { AppState } from '../app/state'

export interface TourCtx { state: AppState; vswr: number; zInNorm: Complex }

export interface TourStep {
  text: string
  target?: string // data-tour attribute of the element to highlight
  manual?: boolean // advances with the Next button instead of a predicate
  done?: (c: TourCtx) => boolean
}

export interface Mission { id: string; title: string; blurb: string; steps: TourStep[] }

// Skip forward over satisfied auto steps; stop at manual steps and
// unsatisfied predicates. Monotonic: never moves backward.
export function advance(idx: number, m: Mission, ctx: TourCtx): number {
  let i = idx
  while (i < m.steps.length) {
    const s = m.steps[i]
    if (s.manual || !s.done || !s.done(ctx)) break
    i++
  }
  return i
}
```

- [ ] **Step 4: Implement `src/teach/missions.ts`**

```ts
import type { Mission, TourCtx } from './walkthrough'

const hasKind = (c: TourCtx, kind: string) =>
  c.state.elements.some((e) => e.kind === kind && e.enabled)

export const MISSIONS: Mission[] = [
  {
    id: 'reading',
    title: 'Reading the chart',
    blurb: 'What the circles, the center, and the rim actually mean.',
    steps: [
      { text: 'Every point on this chart is two things at once: an impedance R + jX, and a reflection coefficient Γ. The center is a perfect match (Z = Z₀, no reflection); the rim is total reflection.', manual: true },
      { text: 'Turn on the VSWR circles (checkbox in the settings bar).', target: 'toggle-vswr', done: (c) => c.state.view.showVswr },
      { text: 'Those rings are lines of constant mismatch. Your goal in any matching problem is to walk the input point inward across them, to the center.', manual: true },
      { text: 'Now turn on the λ ruler.', target: 'toggle-ruler', done: (c) => c.state.view.showRuler },
      { text: 'The rim scale is distance along your feed line in wavelengths. Adding line rotates a point clockwise around the center — a full lap every half wavelength.', manual: true },
      { text: 'Switch the grid to Z+Y.', target: 'grid-mode', done: (c) => c.state.view.gridMode === 'zy' },
      { text: 'The second grid is the admittance (Y) chart — the same chart rotated 180°. Series parts move along the Z grid; parallel parts move along the Y grid. That is the whole trick to reading matching networks.', manual: true },
    ],
  },
  {
    id: 'veritasium',
    title: 'Match the Veritasium antenna',
    blurb: 'The video demo: 36 + j74 Ω matched with a line and a series inductor.',
    steps: [
      { text: 'We will recreate the video’s demo: match a 36 + j74 Ω antenna to 50 Ω at 14.2 MHz using a length of line plus one series inductor.', manual: true },
      { text: 'Set the load to 36 + j74 Ω.', target: 'settings-load', done: (c) => Math.abs(c.state.loadRe - 36) < 0.5 && Math.abs(c.state.loadIm - 74) < 0.5 },
      { text: 'Set the frequency to 14.2 MHz (the 20 m band preset).', target: 'settings-freq', done: (c) => Math.abs(c.state.freqHz - 14.2e6) < 0.05e6 },
      { text: 'Add a series transmission line from the palette.', target: 'pal-line', done: (c) => hasKind(c, 'line') },
      { text: 'Tune the line length until the input marker lands on the r = 1 circle in the lower (capacitive) half — about 54°. Watch it swing around a constant-|Γ| circle as you drag.', done: (c) => Math.abs(c.zInNorm.re - 1) < 0.05 && c.zInNorm.im < 0.05 },
      { text: 'On the r = 1 circle only reactance is left. Add a series inductor to cancel it.', target: 'pal-seriesL', done: (c) => hasKind(c, 'seriesL') },
      { text: 'Tune the inductor (about 995 nH) until the VSWR badge drops below 1.2.', target: 'vswr-badge', done: (c) => c.vswr < 1.2 },
      { text: 'Matched! The reflection is gone and all the power reaches the antenna. This line-plus-inductor recipe is exactly what the video builds — and what an antenna tuner does for you.', manual: true },
    ],
  },
  {
    id: 'stub',
    title: 'Shunt-stub match on the Y chart',
    blurb: 'Match with nothing but two pieces of transmission line.',
    steps: [
      { text: 'Stubs let you match with wire alone. A parallel stub adds susceptance, and parallel things add simply in admittance — so we work on the Y chart.', manual: true },
      { text: 'Switch the grid to Y.', target: 'grid-mode', done: (c) => c.state.view.gridMode === 'y' },
      { text: 'Add a series transmission line.', target: 'pal-line', done: (c) => hasKind(c, 'line') },
      { text: 'Tune the line until the input sits on the g = 1 circle (the circle through the center of the Y grid).', done: (c) => { const d = c.zInNorm.re ** 2 + c.zInNorm.im ** 2; return d > 0 && Math.abs(c.zInNorm.re / d - 1) < 0.05 } },
      { text: 'Add an open stub.', target: 'pal-stubOpen', done: (c) => hasKind(c, 'stubOpen') },
      { text: 'Tune the stub length until VSWR drops below 1.5. The stub’s susceptance cancels what is left.', target: 'vswr-badge', done: (c) => c.vswr < 1.5 },
      { text: 'Done — a match built from nothing but transmission line. This is the trick from the last part of the video: any reactance can be synthesized by trimming a stub.', manual: true },
    ],
  },
]
```

- [ ] **Step 5: Run tests, verify pass** — `npx vitest run src/teach` → PASS; full `npx vitest run` green.

- [ ] **Step 6: Commit**

```bash
git add src/teach/walkthrough.ts src/teach/walkthrough.test.ts src/teach/missions.ts src/teach/missions.test.ts
git commit -m "feat: walkthrough engine and the three guided missions (pure, tested)"
```

---

### Task 6: Walkthrough panel UI + integration

**Files:**
- Create: `src/teach/WalkthroughPanel.tsx`
- Modify: `src/App.tsx` (mission state, tour ctx, menu items), `src/app/SettingsBar.tsx` + `src/app/ElementPalette.tsx` (`data-tour` attributes), `src/index.css`

**Interfaces:**
- Consumes: `advance`, `Mission`, `TourCtx`, `MISSIONS` from Task 5; `derived` memo in App.
- Produces: `WalkthroughPanel({ mission, ctx, onExit })`; App's `derived.zInNorm: Complex` (input impedance normalized to Z₀).

- [ ] **Step 1: Create `src/teach/WalkthroughPanel.tsx`**

```tsx
import { useEffect, useState } from 'react'
import { advance, type Mission, type TourCtx } from './walkthrough'

export function WalkthroughPanel({ mission, ctx, onExit }: { mission: Mission; ctx: TourCtx; onExit: () => void }) {
  const [idx, setIdx] = useState(0)
  useEffect(() => { setIdx(0) }, [mission.id])
  useEffect(() => { setIdx((i) => advance(i, mission, ctx)) }, [mission, ctx])
  const step = mission.steps[idx]

  useEffect(() => {
    if (!step?.target) return
    const el = document.querySelector(`[data-tour="${step.target}"]`)
    el?.classList.add('tour-hi')
    return () => el?.classList.remove('tour-hi')
  }, [step?.target])

  return (
    <aside className="tour-card" aria-label="Guided walkthrough">
      <h3>{mission.title}</h3>
      <span className="tour-step-n">step {Math.min(idx + 1, mission.steps.length)} of {mission.steps.length}</span>
      <p>{step ? step.text : 'Mission complete — nice match!'}</p>
      <div className="tour-btns">
        <button onClick={onExit}>Exit</button>
        {step?.manual && (
          <button className="primary" onClick={() => setIdx(advance(idx + 1, mission, ctx))}>Next</button>
        )}
        {!step && <button className="primary" onClick={onExit}>Done</button>}
      </div>
    </aside>
  )
}
```

Note the Next handler calls `advance(idx + 1, …)` — auto steps already satisfied (e.g. the default load) must be skipped immediately, and the ctx effect alone won't re-run since ctx didn't change.

- [ ] **Step 2: Wire into `src/App.tsx`**

```tsx
import { WalkthroughPanel } from './teach/WalkthroughPanel'
import { MISSIONS } from './teach/missions'
import type { Mission } from './teach/walkthrough'
// state:
const [mission, setMission] = useState<Mission | null>(null)
```

In the `derived` memo: after `const gIn = …`, add `const zIn = stages[stages.length - 1]` (reuse if already named) and include in the return: `zInNorm: cx(zIn.re / state.z0, zIn.im / state.z0)`.

Below `derived`:

```tsx
const tourCtx = useMemo(
  () => ({ state, vswr: derived.vswr, zInNorm: derived.zInNorm }),
  [state, derived],
)
```

In `.learn-items`, after the walk-the-line button:

```tsx
<hr />
{MISSIONS.map((m) => (
  <button key={m.id} onClick={() => setMission(m)} title={m.blurb}>{m.title}</button>
))}
```

After the modal renders:

```tsx
{mission && <WalkthroughPanel mission={mission} ctx={tourCtx} onExit={() => setMission(null)} />}
```

- [ ] **Step 3: Add `data-tour` attributes**

- `ElementPalette.tsx`: each button gets `data-tour={`pal-${k}`}`.
- `SettingsBar.tsx`: `data-tour="settings-load"` on the Load `<label>`, `"settings-freq"` on the f `<label>`, `"grid-mode"` on the grid `<select>`, `"toggle-vswr"` / `"toggle-ruler"` on those two checkbox `<label>`s.
- `App.tsx`: `data-tour="vswr-badge"` on the VSWR badge span.

- [ ] **Step 4: CSS** (append)

```css
/* guided walkthrough */
.tour-hi { outline: 2px solid var(--accent) !important; outline-offset: 3px; border-radius: 4px; animation: tour-pulse 1.2s ease-in-out infinite; }
@keyframes tour-pulse { 50% { outline-offset: 6px; } }
.tour-card { position: fixed; right: 1rem; bottom: 1rem; z-index: 30; width: min(340px, calc(100vw - 2rem)); background: var(--bg); border: 1px solid var(--accent); border-radius: 12px; padding: 0.8rem 1rem; box-shadow: 0 8px 24px rgb(0 0 0 / 25%); }
.tour-card h3 { font-size: 0.95rem; margin-bottom: 0.1rem; }
.tour-step-n { color: var(--grid-emph); font-size: 0.75rem; }
.tour-card p { font-size: 0.88rem; line-height: 1.45; margin: 0.4rem 0 0.6rem; }
.tour-btns { display: flex; gap: 0.5rem; justify-content: flex-end; }
.tour-btns button { border: 1px solid var(--grid); background: none; color: var(--fg); border-radius: 6px; padding: 0.3rem 0.7rem; cursor: pointer; }
.tour-btns .primary { border-color: var(--accent); color: var(--accent); font-weight: 600; }
```

- [ ] **Step 5: Verify** `npm run build && npx vitest run` — green.

- [ ] **Step 6: Commit**

```bash
git add src/teach/WalkthroughPanel.tsx src/App.tsx src/app/SettingsBar.tsx src/app/ElementPalette.tsx src/index.css
git commit -m "feat: guided walkthrough panel driving the live workbench"
```

---

### Task 7: Load entry as Γ (mag∠ang) and VSWR∠angle

**Files:**
- Modify: `src/core/transform.ts` + `src/core/transform.test.ts`
- Modify: `src/app/SettingsBar.tsx`

**Interfaces:**
- Produces (in transform.ts): `gammaFromPolar(mag: number, angDeg: number): Complex`, `gammaMagFromVswr(s: number): number`.
- The store is untouched: all entry modes convert to R+jX ohms and dispatch the existing `setLoad`.

- [ ] **Step 1: Write the failing tests** (append to `src/core/transform.test.ts`)

```ts
import { gammaFromPolar, gammaMagFromVswr, zFromGamma } from './transform' // merge with existing imports

describe('gammaFromPolar / gammaMagFromVswr', () => {
  it('round-trips the video load through polar Γ', () => {
    const g = gammaFromZ(cx(36, 74), 50)
    const back = zFromGamma(gammaFromPolar(abs(g), (arg(g) * 180) / Math.PI), 50)
    expect(back.re).toBeCloseTo(36, 9)
    expect(back.im).toBeCloseTo(74, 9)
  })
  it('gammaFromPolar at 0° and 90°', () => {
    expect(gammaFromPolar(0.5, 0).re).toBeCloseTo(0.5, 12)
    expect(gammaFromPolar(0.5, 90).im).toBeCloseTo(0.5, 12)
    expect(gammaFromPolar(0.5, 90).re).toBeCloseTo(0, 12)
  })
  it('VSWR to |Γ|: 1 → 0, 3 → 0.5, ∞-ish → →1', () => {
    expect(gammaMagFromVswr(1)).toBe(0)
    expect(gammaMagFromVswr(3)).toBeCloseTo(0.5, 12)
    expect(gammaMagFromVswr(199)).toBeCloseTo(0.99, 12)
  })
})
```

(Use the existing imports of `abs`, `arg`, `cx` in that test file — add them if absent.)

- [ ] **Step 2: Run, verify fail** — `npx vitest run src/core/transform.test.ts` → FAIL.

- [ ] **Step 3: Implement** (append to `src/core/transform.ts`)

```ts
export const gammaFromPolar = (mag: number, angDeg: number): Complex => {
  const rad = (angDeg * Math.PI) / 180
  return cx(mag * Math.cos(rad), mag * Math.sin(rad))
}

// |Γ| = (S − 1) / (S + 1)
export const gammaMagFromVswr = (s: number): number => (s - 1) / (s + 1)
```

(Extend the top import from `./complex` with anything now needed.)

- [ ] **Step 4: Run, verify pass** — `npx vitest run src/core/transform.test.ts` → PASS.

- [ ] **Step 5: Add entry modes to `src/app/SettingsBar.tsx`**

Add imports and a mode state:

```tsx
import { useRef, useState } from 'react'
import { abs, arg, cx, type Complex } from '../core/complex'
import { gammaFromPolar, gammaFromZ, gammaMagFromVswr, vswrFromGamma, zFromGamma } from '../core/transform'

type LoadMode = 'z' | 'gamma' | 'vswr'
```

Inside the component:

```tsx
const [loadMode, setLoadMode] = useState<LoadMode>('z')
const gL = gammaFromZ(cx(state.loadRe, state.loadIm), state.z0)
const gMag = abs(gL)
const gAng = (arg(gL) * 180) / Math.PI
const sL = vswrFromGamma(gL)
const sDisp = Number.isFinite(sL) ? Number(sL.toPrecision(4)) : 999

function commitPolar(mag: number, angDeg: number) {
  if (!(mag >= 0 && mag < 1)) return // rim/outside is non-physical for a passive load
  const z = zFromGamma(gammaFromPolar(mag, angDeg), state.z0)
  dispatch({ type: 'setLoad', re: z.re, im: z.im })
}
```

Replace the manual-entry branch (the `<>` holding the two load NumFields) with:

```tsx
<>
  <select value={loadMode} onChange={(e) => setLoadMode(e.target.value as LoadMode)} aria-label="Load entry mode">
    <option value="z">R+jX</option>
    <option value="gamma">Γ</option>
    <option value="vswr">VSWR</option>
  </select>
  {loadMode === 'z' && (
    <>
      <NumField value={state.loadRe} onCommit={(v) => dispatch({ type: 'setLoad', re: v, im: state.loadIm })} label="Load resistance" />
      +j
      <NumField value={state.loadIm} onCommit={(v) => dispatch({ type: 'setLoad', re: state.loadRe, im: v })} label="Load reactance" />
      Ω
    </>
  )}
  {loadMode === 'gamma' && (
    <>
      <NumField value={Number(gMag.toPrecision(4))} onCommit={(v) => commitPolar(v, gAng)} label="Gamma magnitude" />
      ∠
      <NumField value={Number(gAng.toPrecision(4))} onCommit={(v) => commitPolar(gMag, v)} label="Gamma angle degrees" />
      °
    </>
  )}
  {loadMode === 'vswr' && (
    <>
      <NumField value={sDisp} onCommit={(v) => { if (v >= 1) commitPolar(gammaMagFromVswr(v), gAng) }} label="Load VSWR" />
      ∠
      <NumField value={Number(gAng.toPrecision(4))} onCommit={(v) => commitPolar(gMag, v)} label="VSWR angle degrees" />
      °
    </>
  )}
</>
```

Keep the aria-labels exactly as written (`Load resistance` and `Load reactance` are asserted by existing e2e).

- [ ] **Step 6: Verify** `npm run build && npx vitest run` — green.

- [ ] **Step 7: Commit**

```bash
git add src/core/transform.ts src/core/transform.test.ts src/app/SettingsBar.tsx
git commit -m "feat: enter the load as reflection coefficient or VSWR with angle"
```

---

### Task 8: Import robustness + small fixes

**Files:**
- Modify: `src/core/touchstone.ts` + `src/core/touchstone.test.ts`
- Modify: `src/App.tsx`

**Interfaces:** unchanged public APIs; `derived.fileZ: Complex | null` replaces App's standalone `fileZ` const.

- [ ] **Step 1: Write the failing parser tests** (append to `src/core/touchstone.test.ts`)

```ts
it('stops at an s2p noise-parameter section instead of rejecting the file', () => {
  const text = ['# MHz S MA R 50',
    '100 0.5 45 0.1 20 0.1 20 0.5 45',
    '200 0.4 40 0.1 20 0.1 20 0.4 40',
    '2 1.5 0.9 30 0.4', // noise data: 5 columns
    '4 1.2 0.8 60 0.5',
  ].join('\n')
  const d = parseTouchstone(text)
  expect(d.points).toHaveLength(2)
})

it('still rejects a file whose first data line has a bogus column count', () => {
  expect(() => parseTouchstone('# MHz S MA R 50\n100 0.5 45 9 9')).toThrow(TouchstoneError)
})
```

- [ ] **Step 2: Run, verify fail** — the noise-section test currently throws "Expected 1-port (3 columns) or 2-port (9 columns)…".

- [ ] **Step 3: Implement in `src/core/touchstone.ts`**

In the line loop, establish the column count from the first data row and stop at the first row that deviates (that's where s2p noise parameters begin):

```ts
let cols = 0 // declared beside `const rows`
// …in the loop, replace the current `const nums…rows.push(nums)` block with:
const nums = line.split(/\s+/).map(Number)
if (cols && nums.length !== cols) break // s2p noise section (or trailing junk): S-data is over
if (nums.some((n) => !Number.isFinite(n)))
  throw new TouchstoneError(`Unreadable data line: "${rawLine.trim().slice(0, 40)}"`)
if (!cols) {
  if (nums.length !== 3 && nums.length !== 9)
    throw new TouchstoneError(`Expected 1-port (3 columns) or 2-port (9 columns) data, got ${nums.length} columns`)
  cols = nums.length
}
rows.push(nums)
```

Remove the now-redundant `r.length` check inside the `rows.map`.

- [ ] **Step 4: Run, verify pass** — `npx vitest run src/core/touchstone.test.ts` → PASS (all existing cases too).

- [ ] **Step 5: App fixes (`src/App.tsx`)**

1. **File-size guard** — first line of `handleFile`:

```ts
if (f.size > 2_000_000) { setImportError('File too large (2 MB max) — is that really a Touchstone file?'); return }
```

2. **Drag-and-drop import** — on the root `<div className="app">`:

```tsx
onDragOver={(e) => { if (e.dataTransfer.types.includes('Files')) e.preventDefault() }}
onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) void handleFile(f) }}
```

3. **fileZ into the derived memo** — delete the standalone `const fileZ = …` line; inside the memo add to the returned object: `fileZ: sweep ? interpZ(sweep.data.points, state.freqHz) : null`, and pass `fileZ={derived.fileZ}` to SettingsBar.

4. **Clipboard feedback** — add:

```tsx
const [flash, setFlash] = useState<string | null>(null)
function copyText(text: string) {
  navigator.clipboard.writeText(text).then(() => setFlash('Copied ✓'), () => setFlash('Copy failed'))
  window.setTimeout(() => setFlash(null), 1500)
}
```

Use `copyText(location.href)` and `copyText(networkSummary(…))` in the two copy buttons, and render `{flash && <span className="flash" role="status">{flash}</span>}` as the first child of `.header-tools`. CSS (append): `.flash { font-size: 0.8rem; color: var(--grid-emph); }`

- [ ] **Step 6: Verify** `npm run build && npx vitest run` and `npm run e2e` — all green (import spec must still pass).

- [ ] **Step 7: Commit**

```bash
git add src/core/touchstone.ts src/core/touchstone.test.ts src/App.tsx src/index.css
git commit -m "fix: tolerate s2p noise sections, drag-drop import, size guard, copy feedback"
```

---

### Task 9: Polish pass — theme-consistent controls, responsive, focus

**Files:**
- Modify: `src/index.css`, `src/App.tsx` (title only)

- [ ] **Step 1: Native controls follow the theme** (append to `src/index.css`)

```css
/* polish: native controls follow the theme */
:root { color-scheme: light; }
[data-theme='dark'] { color-scheme: dark; }
input, select, button { font: inherit; accent-color: var(--accent); }
input[type='number'], select { background: var(--bg); color: var(--fg); border: 1px solid var(--grid); border-radius: 4px; padding: 0.15rem 0.3rem; }
:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
```

- [ ] **Step 2: Touch + small screens** (append)

```css
/* polish: touch + small screens */
.el-controls input[type='range'] { min-height: 28px; }
@media (max-width: 900px) {
  .app-header h1 { font-size: 1.1rem; }
  .header-tools { flex-wrap: wrap; justify-content: flex-end; }
  .settings { gap: 0.5rem; }
  .view-toggles { margin-left: 0; }
  .sidebar { max-height: 40vh; }
  .tour-card { right: 0.5rem; bottom: 0.5rem; left: 0.5rem; width: auto; }
}
```

- [ ] **Step 3: Header title** — in `App.tsx` change `<h1>Smith Chart</h1>` to `<h1>Smith Chart Workbench</h1>`.

- [ ] **Step 4: Verify** `npm run build && npx vitest run && npm run e2e` — all green (e2e uses labels, not the title).

- [ ] **Step 5: Commit**

```bash
git add src/index.css src/App.tsx
git commit -m "polish: theme-consistent native controls, focus rings, small-screen layout"
```

---

### Task 10: E2E coverage for the teaching layer + README refresh

**Files:**
- Create: `e2e/teach.spec.ts`
- Modify: `README.md`

**Interfaces:** relies on UI landmarks from Tasks 2–6: `.learn-menu summary`, buttons named `Why does it look like this?`, `Walk the line`, mission titles; `.tour-card`; `Morph progress` range; `Explain mode` button; `.explain-pop`; element inputs labeled `Line value in °` and `Series L value in nH`.

- [ ] **Step 1: Write `e2e/teach.spec.ts`**

```ts
import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => { await page.goto('/') })

test('explain mode shows a popover instead of activating the control', async ({ page }) => {
  await page.getByRole('button', { name: 'Explain mode' }).click()
  await page.locator('.vswr-badge').click()
  await expect(page.locator('.explain-pop')).toBeVisible()
  await expect(page.locator('.explain-pop')).toContainText('VSWR')
  // clicking a control in explain mode must NOT activate it
  await page.getByLabel('Grid mode').click()
  await expect(page.locator('.explain-pop')).toContainText('grids')
  await expect(page.locator('.grid-y')).toHaveCount(0)
})

test('morph dialog opens and scrubbing changes the grid', async ({ page }) => {
  await page.locator('.learn-menu summary').click()
  await page.getByRole('button', { name: 'Why does it look like this?' }).click()
  const path = page.locator('.morph-svg path').first()
  const d0 = await path.getAttribute('d')
  await page.getByLabel('Morph progress').fill('1000')
  expect(await path.getAttribute('d')).not.toBe(d0)
  await page.getByRole('button', { name: 'Close' }).click()
  await expect(page.locator('.morph-svg')).toHaveCount(0)
})

test('walk the line animates the standing wave', async ({ page }) => {
  await page.locator('.learn-menu summary').click()
  await page.getByRole('button', { name: 'Walk the line' }).click()
  await expect(page.locator('.walkline-svg')).toBeVisible()
  const d0 = await page.locator('.wl-sum').getAttribute('d')
  await page.waitForTimeout(300)
  expect(await page.locator('.wl-sum').getAttribute('d')).not.toBe(d0)
})

test('mission 2: the Veritasium match is completable', async ({ page }) => {
  await page.locator('.learn-menu summary').click()
  await page.getByRole('button', { name: 'Match the Veritasium antenna' }).click()
  const card = page.locator('.tour-card')
  await expect(card).toBeVisible()
  await card.getByRole('button', { name: 'Next' }).click() // intro; default load+freq auto-pass
  await expect(card).toContainText('transmission line')
  await page.getByRole('button', { name: 'Line', exact: true }).click()
  await expect(card).toContainText('r = 1')
  await page.getByLabel('Line value in °').fill('54.2')
  await page.getByLabel('Line value in °').press('Enter')
  await expect(card).toContainText('inductor')
  await page.getByRole('button', { name: 'Series L', exact: true }).click()
  await page.getByLabel('Series L value in nH').fill('995')
  await page.getByLabel('Series L value in nH').press('Enter')
  await expect(card).toContainText('Matched!')
  await expect(page.locator('.vswr-badge')).toHaveClass(/good/)
})
```

- [ ] **Step 2: Run** `npm run build && npm run e2e` — Expected: all specs pass (existing 7 + new 4). Fix any selector drift by adjusting the app landmarks, not by weakening assertions.

- [ ] **Step 3: Refresh `README.md`** — update the feature list to include: explain-on-demand "?" mode, conformal-map morph, walk-the-line demo, three guided missions, Γ/VSWR load entry, drag-drop import. Keep the existing structure and tone; update test counts.

- [ ] **Step 4: Commit**

```bash
git add e2e/teach.spec.ts README.md
git commit -m "test: e2e coverage for explain mode, morph, walk-the-line, mission 2; README"
```

---

## Deliberately skipped (post-v1 / noted for final review)

- Export via `<style>`-block instead of per-property allowlist; App derived-memo split — working as shipped, refactor only.
- interpZ dead tail, pole-nudge active-device flip, silent unknown option-line tokens — cosmetic parser internals.
- Bulk freq/R/X table paste (spec §5 lists it; deferred: the Touchstone path covers the real workflow — revisit post-v1 if requested).
