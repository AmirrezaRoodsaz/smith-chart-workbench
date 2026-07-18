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
