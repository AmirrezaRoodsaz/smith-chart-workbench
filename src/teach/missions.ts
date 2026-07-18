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
