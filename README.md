# Smith Chart Workbench

Interactive web Smith chart for ham radio operators, hobbyists, and anyone who
just watched [the Veritasium video](https://www.youtube.com/watch?v=GK2pZ_oVU1o)
and wants to actually play with the thing.

**Current status:** matching workbench — element palette (L/C/R, lines, stubs) with
live arcs and slider tuning, undo/redo, shareable URL state, VSWR/Q circle overlays,
impedance/admittance grids, wavelength ruler, and one-click auto-match (all L-network
and single-stub solutions). NanoVNA/Touchstone import and guided learning mode are next
(see `docs/superpowers/specs/`).

## Develop

npm install && npm run dev — tests: npm test — build: npm run build
