# Smith Chart Workbench — Design Spec

Date: 2026-07-15
Status: Approved by user (brainstorming session)
Companion research: ../../../RESEARCH.md

## 1. Product definition

An interactive web Smith chart app: a **single matching workbench with teaching woven in**.
Primary audience: **ham radio operators and hobbyists**; secondary: students arriving from
the Veritasium video. Success = both a polished portfolio showpiece (live GitHub Pages demo)
and a tool hams genuinely adopt. Desktop-first layout, fully responsive and touch-capable.
No backend; all state client-side, shareable via URL.

### V1 scope (all must-have, user-confirmed)
Tool: core matching workbench; VSWR/Q circles + Y-chart toggle + wavelength ruler;
NanoVNA/Touchstone import with band curves; auto-match suggestions (L-networks + stubs).
Teaching: explain-on-demand everywhere; conformal-map morph animation; walk-the-line
standing-wave demo; guided matching walkthroughs driving the real workbench.

### Explicit non-goals for v1
Two-port amplifier design (stability/gain/noise circles), S21 plots, arbitrary non-ladder
topologies, tolerance analysis, scripting, cloud accounts, |Γ|>1 chart. These are the
post-v1 backlog, informed by RESEARCH.md gaps.

## 2. Stack

React + TypeScript + Vite. Chart rendered as SVG. No UI framework lock-in for math:
all RF computation in a pure dependency-free TypeScript core. Deploy: static build to
GitHub Pages. Tests: Vitest (core), Playwright (smoke flows).

## 3. Architecture

```
src/core/        Pure TS, zero deps, no DOM — the ONLY place RF math exists
  complex.ts       complex arithmetic
  transform.ts     Γ ↔ Z ↔ Y, normalization to Z0
  elements.ts      series/shunt L C R, series transmission line, open/short shunt stub;
                   each maps (Zin, f) → Zout
  network.ts       ordered element chain evaluation; arc path point generation
  sweep.ts         evaluate chain across a frequency band
  touchstone.ts    .s1p/.s2p parser (RI/MA/DB formats, unit prefixes, comments)
  synthesis.ts     all valid L-network solutions (≤8) + two shortest stub solutions
  units.ts         Hz–GHz, mm/in/λ/deg, engineering notation, velocity factor

src/chart/       SVG Smith chart engine (React components, logic-thin)
  grid (Z/Y/immittance), overlay circles, element arcs, markers, band traces, zoom/pan

src/app/         Workbench UI (React)
  palette, element list, sliders, readout panel, auto-match panel, file import,
  VSWR strip chart, walkthrough engine + overlays, explain popovers, undo/redo,
  URL state, theming
```

**State**: single serializable `AppState` (Z0, design frequency/band, load definition,
element chain, view options: grid mode, overlays, theme, zoom). All mutations via a
reducer. Undo/redo = state stack. Shareable URL = compressed AppState in the hash
fragment; loading a URL restores the session exactly.

## 4. Chart engine

- SVG viewBox zoom/pan: wheel, drag, pinch, double-tap. Grid labels re-densify with
  zoom depth (map-tile style: finer R/X circles appear as you zoom).
- Hover (desktop) / tap-marker (touch) anywhere → readout: Z (normalized + Ω), Y,
  Γ (rect + polar), VSWR, return loss, mismatch loss.
- Toggleable overlays: constant-VSWR circles, constant-Q arcs, admittance grid
  (Z / Y / both), wavelength ruler on rim (toward generator/load).
- Element arcs color-coded per element, redrawn live during tuning.
- Light + dark themes via CSS variables from day one.

## 5. Matching workbench

- Load entry: R+jX (Ω or normalized), Γ (mag∠ang), or VSWR∠angle; or imported file;
  or manual freq/R/X table paste.
- Settings: Z0 (default 50; presets 75/300/450; free entry), design frequency with
  ham band presets (160 m–70 cm), velocity factor for line elements.
- Palette: series/shunt L, C, R; series transmission line; open/short shunt stubs.
  Elements append to a chain; arcs appear immediately.
- Tuning: log-scaled slider + exact numeric entry + unit dropdown per element.
  Line lengths displayed simultaneously in deg / λ / mm / in.
- Element list: reorder, enable/disable (A/B compare), delete. Undo/redo
  (buttons + Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z).
- Auto-match panel: synthesis results for current load+frequency as mini-cards
  (topology icon + values); tap → loads into the chain for manual tweaking.
- Live goal indicator: input VSWR, color-graded (e.g. green <1.5, yellow <2, red ≥2).

## 6. Real data / band view

- Import .s1p (drag-drop or picker); .s2p accepted, S11 used. Decimate above ~2000 pts.
- Measured data renders as a band curve with a draggable frequency marker; readouts
  follow the marker; design frequency snaps to it.
- Matching network is applied to every sweep point: whole curve moves as you tune.
- Companion VSWR-vs-frequency strip chart below the Smith chart.
- Export: PNG snapshot (chart + schematic strip), copyable component list, share URL.

## 7. Teaching layer

- **Explain-on-demand**: global "?" mode; every circle family, rim, readout value, and
  palette component becomes tappable → popover (2–4 plain sentences + micro-diagram).
  Content in a markdown/JSON registry, decoupled from app code.
- **Conformal map morph**: scrub-able animation interpolating the Möbius transform —
  right-half impedance plane bends into the Γ disk; R-lines → circles, X-lines → arcs,
  ∞ collapses to the right edge. Entry points: chart "why does it look like this?" link
  and walkthrough chapter 1.
- **Walk-the-line**: transmission-line graphic with draggable probe; chart point rotates
  on its |Γ| circle (360° = λ/2) while forward/reflected/sum waves animate (standing
  wave). Readout: distance in λ and degrees.
- **Guided walkthroughs**: step engine driving the real workbench
  (highlight → instruct → await user action → verify state → next). Scripts are data.
  V1 missions: (1) Reading the chart; (2) Match 36+j74 Ω with line + series L
  (the Veritasium demo); (3) Shunt-stub match on the Y-chart.

## 8. Error handling

- Core guards: reject non-physical inputs (R<0, f≤0) at entry; clamp display near
  singularities (Γ→1 shows "∞" rather than blow-ups).
- Touchstone: tolerant parsing (RI/MA/DB, comments, prefixes); clear user-facing
  messages for malformed files; never crash on bad input.
- URL state: version field in the serialized payload; unknown versions fall back to a
  fresh session with a notice rather than a broken load.

## 9. Testing

- Vitest on core: textbook values, the video's 36+j74 Ω @ 50 Ω case, round-trip
  identities (Z→Γ→Z, Z→Y→Z), edges (short/open/pure reactance), synthesis verified by
  evaluating each solution to the chart center.
- Playwright smoke: add element → arc appears; import .s1p → curve appears;
  URL round-trip restores state; undo/redo; walkthrough mission 2 completable.

## 10. Build order (each phase leaves a working, deployable app)

1. Core math + tests
2. Chart engine (grid, zoom/pan, hover readout)
3. Workbench (palette, arcs, tuning, undo, URL state)
4. Overlays + Y/immittance grid + auto-match
5. Touchstone import + band view + VSWR strip
6. Teaching layer (explain registry, morph, walk-the-line, walkthroughs)
7. Polish (frontend-design pass, dark-mode QA, touch QA, GitHub Pages deploy)
