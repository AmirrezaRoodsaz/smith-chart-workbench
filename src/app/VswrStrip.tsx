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
  const mx = Math.min(X1, Math.max(X0, X0 + ((freqHz - fMin) / (fMax - fMin)) * (X1 - X0)))
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
        onPointerDown={(e) => {
          if (e.pointerType === 'mouse' && e.button !== 0) return
          e.currentTarget.setPointerCapture(e.pointerId); pick(e.clientX)
        }}
        onPointerMove={(e) => { if (e.buttons) pick(e.clientX) }}
        onPointerUp={() => dispatch({ type: 'endCoalesce' })}
        onPointerCancel={() => dispatch({ type: 'endCoalesce' })}
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
        <text x={Math.min(mx + 5, 480)} y={14} className="strip-label">
          {(freqHz / 1e6).toFixed(3)} MHz · VSWR {Number.isFinite(cur.s) ? cur.s.toFixed(2) : '∞'}
        </text>
        <text x={X0} y={128} className="strip-label">{(fMin / 1e6).toFixed(2)} MHz</text>
        <text x={X1} y={128} textAnchor="end" className="strip-label">{(fMax / 1e6).toFixed(2)} MHz</text>
      </svg>
    </div>
  )
}
