# Smith Chart Workbench — User Guide

**Live app:** https://amirrezaroodsaz.github.io/smith-chart-workbench/

No install, no account. Everything runs in your browser, and nothing you enter
leaves your computer.

---

## What is this?

A tool for solving one classic radio problem: **your antenna isn't 50 Ω, and
your radio wants 50 Ω.** The mismatch reflects power back instead of radiating
it. The Smith chart is the map for fixing that — this app lets you drag, tune,
and watch the fix happen live. If you're new to the chart, the built-in
missions (see [Learn mode](#learn-mode)) teach it from zero.

---

## The 60-second tour

1. Open the app. The red dot on the chart is the example antenna
   (36 + j74 Ω — the one from the Veritasium video).
2. The **VSWR badge** at the top right shows 4.95 in red. That's a bad match.
   Your goal is to make it green (below 1.5).
3. In the **Auto-match** list on the left, click any suggestion —
   for example "shunt C 222 pF → series L 931 nH".
4. The badge turns green: **VSWR 1.00**. The colored arcs on the chart show
   exactly how each component walked the antenna to the center.

That's the whole idea. Everything else is detail.

---

## Reading the chart

- **Every point is an impedance.** Hover anywhere (tap on a phone) and the
  readout panel shows R + jX, admittance, reflection coefficient Γ, VSWR,
  return loss, and mismatch loss for that point.
- **The center is perfect.** Distance from the center = how badly matched you
  are. The outer rim = total reflection.
- **The round dot** is your load (antenna). **The filled dot** is what your
  radio sees after your matching network. Matching means moving the filled dot
  to the center.
- **Zoom** with the mouse wheel or pinch, **pan** by dragging,
  **double-click** to reset the view.

Optional overlays (checkboxes in the top bar):

| Overlay | What it shows |
|---|---|
| **VSWR** | Rings of equal mismatch — cross them inward to improve |
| **Q** | Arcs of equal Q — stay low for wider bandwidth |
| **λ ruler** | Distance along your feed line, in wavelengths, on the rim |
| **Z / Y / Z+Y grid** | Impedance grid, admittance grid (for parallel parts), or both |

---

## Setting up your problem

All in the bar under the header:

- **Z₀** — your system impedance. Usually 50 Ω; presets for 75/300/450 or type
  your own.
- **f** — the design frequency in MHz, or pick a ham band from the **band…**
  menu (160 m through 70 cm).
- **Load** — your antenna. Enter it whichever way you know it:
  - **R+jX** — resistance and reactance in ohms (from a manual, model, or VNA)
  - **Γ** — reflection coefficient as magnitude ∠ angle
  - **VSWR** — VSWR ∠ angle
  
  All three are the same point on the chart — pick the numbers you have.

---

## Building a matching network by hand

1. Click a component in **Add element**: series/shunt L, C, R, a length of
   transmission line, or an open/short stub.
2. It appears in the **Network** list and draws a colored arc on the chart.
   Elements run **load → source** (top of the list is closest to the antenna).
3. Tune with the **slider** (coarse) or type an exact value and press Enter
   (fine). Line lengths are in degrees; the row also shows λ and millimeters.
4. Watch the arc and the VSWR badge move as you tune.

Useful row buttons: **↑ ↓** reorder, **◉** temporarily disable (great for
A/B comparisons), **✕** delete.

**Undo/redo:** the ↶ ↷ buttons, or Ctrl+Z / Ctrl+Y (Cmd on Mac). One slider
drag counts as one undo step.

---

## Auto-match

The **Auto-match** panel always shows every textbook solution for your current
load and frequency: the two-element L-networks and the shortest single-stub
tuners. Click one to load it into your network, then fine-tune by hand. It's a
starting point, not a verdict — real parts come in standard values.

---

## Using real antenna data (NanoVNA / VNA files)

1. Export a **.s1p** (or .s2p) Touchstone file from your NanoVNA or analyzer.
2. Click **Load .s1p** — or just drag the file onto the page.
3. Your whole measured band appears as a curve on the chart, and a
   **VSWR-vs-frequency strip chart** opens below it.
4. Drag the marker on the strip (or type a frequency) to move along the band.
5. Now tune your matching network and watch the **entire curve** move — you're
   matching the whole band, not one point. Try to pull the strip-chart dip
   deep *and* wide.

Click the ✕ on the file chip to go back to manual load entry.

---

## Learn mode

Everything educational lives under the **Learn** menu (top right):

- **Why does it look like this?** — drag the slider and watch the infinite
  impedance plane bend into the Smith chart. This is the one thing to show
  someone who asks what the chart even is.
- **Walk the line** — drag a probe along a transmission line and watch the
  standing wave and the chart point rotating together.
- **Three missions** — guided, step-by-step, using the real app:
  1. *Reading the chart* — what the circles and the rim mean
  2. *Match the Veritasium antenna* — recreate the video's line + inductor match
  3. *Shunt-stub match on the Y chart* — match with nothing but wire
  
  The mission card sits in the corner and advances automatically as you do
  each step. **Exit** any time.

And the **?** button turns on **explain mode**: while it's on, clicking any
control or overlay shows a plain-English explanation instead of activating it.
Press **Esc** or click **?** again to leave.

---

## Saving and sharing

- **🔗 Copy link** — the URL contains your whole session (load, frequency,
  network, settings). Paste it anywhere; opening it restores everything.
- **📷 Export PNG** — snapshot of the chart, good for forum posts and notes.
- **📋 Copy summary** — your network as text (components, values, VSWR),
  ready to paste.
- **🌙 / ☀️** — dark or light theme.

---

## Troubleshooting

- **VSWR shows ∞** — your input is on the rim (pure reactance or a short/open
  somewhere). Check element values and the load.
- **"File too large" or a parse error on import** — the app reads standard
  Touchstone .s1p/.s2p files up to 2 MB. Re-export from your VNA software;
  S-parameter files only (not Z/Y/H).
- **"out of band" next to the file chip** — your design frequency is outside
  the measured sweep. Drag the strip-chart marker back into the band.
- **A mission step won't advance** — do exactly what the highlighted control
  suggests; steps check the app's real state. For mission 2, the target values
  are about 54° of line and about 995 nH.
- **Clicks show popovers instead of doing things** — explain mode is on.
  Press Esc.
