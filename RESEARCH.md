# Smith Chart App — Research Notes

## Context: Veritasium video "The Scariest Chart In Electrical Engineering" (GK2pZ_oVU1o)

Narrative: Philip Smith at Bell Labs (1928) fights reflections on a 2 km transmission line feeding
an antenna array. Slinky demos → standing waves → why resistance-only matching fails →
impedance Z = R + jX on the complex plane → the plane is infinite (short=0, open=∞) →
conformal map (Möbius transform, à la 3Blue1Brown 1/z) bends the right-half impedance plane
into the finite reflection-coefficient (Γ) plane, |Γ| ≤ 1.

Key ideas the video makes visual (and our app should too):
- Every point is TWO things at once: an impedance AND a reflection coefficient.
- Distance from center = |Γ|; center = perfect match (Γ=0, Z=Z0).
- Moving along the line = rotating on a constant-|Γ| circle; 360° = λ/2.
- Constant-resistance lines → circles; constant-reactance lines → arcs.
- Live matching demo: load 36+j74 Ω, normalize /50 → 0.7+j1.5; add 28 mm line (rotate to r=1
  circle), cancel −j1.8 with 13.2 nH series L → no reflections, max power.
- t≈32:36 (user's timestamp): stub matching — open-circuit stub trimmed to length (302° around
  rim from open point → 77 mm) synthesizes any reactance. Leads to the admittance chart
  (parallel elements add in Y = 1/Z; Y-chart is the mirrored version).
- Charts are single-frequency; real signals trace a curve over the band → pull the curve
  toward center.
- History: Mizuhashi (Japan 1937), Volpert (USSR 1939) independent inventions; WWII radar
  drove adoption; today it's in every VNA because it encodes intuition ("it's a map").

## Competitor landscape (per-tool)

- **SimSmith/SimNEC (AE6TY)** — free Java desktop. Power-user benchmark: arbitrary (non-ladder)
  topologies, real lossy components/coax by name, V/I/power at every node, generator types,
  impedance-file import (EZNEC/VNA), scripting, SWR/power/wave companion charts.
- **Smith V4.1 (Dellsperger)** — Windows, paid. Academic benchmark: full circle set (stability,
  noise, gain, VSWR, Q), Tuning Cockpit sliders, Touchstone/CITI import, undo/redo, printing,
  S-Plot module (s11–s22, MAG/MSG/k/µ, param conversion S↔H/Z/Y/A).
- **Will Kelsey web tool** — most complete free web tool: big component palette incl. ESR,
  bulk freq/R/X paste, Z/Y toggle, circle overlays, S11/S21 plots, shareable URL state, cloud save.
- **QuickSmith** — open source web: drag-drop 12 elements, sweeps (freq or element value),
  markers, session save/load, examples library.
- **28raining/smith-chart (React)** — hover Z readout, sliders, URL state, NF/gain/stability
  circles, .s1p/.s2p import, tolerance analysis (rare), custom polar markers.
- **Keysight ADS / AWR iMatch** — wizard matching, up to 9 constant circles, auto network
  synthesis (L/Pi/Tee catalogs), export as schematic subcircuit.
- **Mobile**: Smith Charts (iOS: pinch zoom, draggable λ ruler, multi-chart tabs), iSmith
  (all 8 L-network auto-solutions, learning mode, T/Pi pad calc), iSmith Chart (Android:
  ZY immittance chart, drag-on-chart tuning).
- **Others**: QUCS (marker → auto 2-element match, conjugate 2-port match), scikit-rf
  (chart radius >1 for |Γ|>1), 3D Smith Chart (Riemann sphere, active devices),
  rftools.io (interactive tutorial page), telestrian, rfmentor jSmith, microwaves101.

## Merged master feature list

### Chart display
- Z grid / Y grid / combined ZY immittance chart
- Settable normalization Z0
- Expanded radius |Γ|>1 for active devices; 3D (Riemann sphere) variant
- Constant circles: VSWR, Q, gain (operating/available), noise figure, stability (in/out),
  admittance overlay, R/X grid highlighting; multiple simultaneous circles + numeric listing
- Zoom/pan, pinch zoom; color schemes; per-trace color/width; multiple named charts/tabs
- Input/output plane switching for 2-ports
- Companion rectangular charts: SWR, power, waves, S-params vs freq

### Point entry & readouts
- Enter Z, Y, Γ (mag∠ang), VSWR — normalized or absolute
- Click/hover/tap anywhere → full readout; drag the point directly
- Marker readouts: Z, Y, Γ (rect+polar), VSWR, return loss, mismatch loss, Q
- Custom markers (incl. polar placement)
- Wavelengths-toward-generator ruler; distance to Vmax/Vmin in λ
- Bulk paste of freq/R/X data (interpolate or S&H)
- Terminations: fixed Z, equivalent circuit, or S/Z/Y file
- V/I/power at every node (SimSmith-unique)

### Matching network design
- Palette: series/shunt R/L/C, series & parallel RLC, transformers, lossy lines,
  open/short stubs, ESR/finite-Q parts, custom Z block, named real coax
- Live arc drawing per element; real-time replot while tuning
- Sliders + exact entry; drag-on-chart tuning; mouse-wheel tuning
- Edit/reorder/delete after insertion; arbitrary topologies (SimSmith-unique)
- Auto-synthesis: all 8 L-networks, Pi/Tee catalogs, conjugate 2-port match, Q-constrained
- T & Pi pad calculator; amplifier design mode (MAG/MSG, k, µ, circle-based)
- Freq + velocity factor/permittivity; TL length in in/mm/deg/λ
- Export network as netlist/EDA subcircuit

### Sweeps / S-parameters
- Touchstone .s1p/.s2p (+CITI, EZNEC, VNA) import
- Sweep vs frequency OR vs component value; band trace on chart with freq markers
- Rectangular S-plots with cursor; lin/log axes
- S ↔ H/Z/Y/ABCD conversion & export
- Tolerance/what-if analysis (rare); scripting/automation (SimSmith)

### Annotation / export
- Rulers, drawn circles/loci, labels; print/capture chart+schematic+data
- Save/load projects; shareable URL state (killer web feature); cloud save
- Image export; CSV/ASCII export of points & circles

### Education
- Interactive step-by-step tutorial (rftools); learning mode (iSmith); examples library;
  manuals/videos/forum (SimSmith); GeoGebra-style geometric demos

### UI
- Touch support, PWA/mobile-friendly, undo/redo (rare!), real-time everything,
  freemium vs free

### Market gaps (opportunities)
1. No web tool combines: full circle set + arbitrary topology + 2-port Touchstone +
   touch-first UI + undo/redo + dark mode
2. Dark mode: essentially absent everywhere
3. Deep/infinite zoom: only basic zoom exists
4. Keyboard shortcuts: absent in web tools
5. |Γ|>1 / 3D chart: academic only
6. Auto-synthesis missing from leading web tools
7. Animated/educational matching step-through underserved — the Veritasium-style
   "why it looks this way" conformal-map morph exists nowhere
