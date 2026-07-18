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
