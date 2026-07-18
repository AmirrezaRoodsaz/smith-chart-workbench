# Smith Chart Workbench

Interactive web Smith chart for ham radio operators, hobbyists, and anyone who
just watched [the Veritasium video](https://www.youtube.com/watch?v=GK2pZ_oVU1o)
and wants to actually play with the thing.

**New here?** Read the [User Guide](docs/USER_GUIDE.md) — a plain-language tour
from first click to matching your own antenna.

**Current status:** matching workbench — element palette (L/C/R, lines, stubs) with
live arcs and slider tuning, undo/redo, shareable URL state, VSWR/Q circle overlays,
impedance/admittance grids, wavelength ruler, and one-click auto-match (all L-network
and single-stub solutions). Direct Γ/VSWR or R±jX load entry, plus drag-drop
NanoVNA/Touchstone import, band curves, a VSWR strip chart, and PNG export have
shipped. A teaching layer now sits on top: explain-on-demand "?" mode (click any
control for a plain-English popover instead of activating it), a conformal-map morph
showing how the Z-plane bends into the Smith chart, a walk-the-line standing-wave
animation, and three guided missions ("Reading the chart", "Match the Veritasium
antenna", "Shunt-stub match on the Y chart"). Playwright-gated CI covers all of it.

## Develop

npm install && npm run dev — tests: npm test (128 unit) — e2e: npm run e2e (11 specs) — build: npm run build
