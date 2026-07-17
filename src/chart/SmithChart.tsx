import { useEffect, useMemo, useRef, useState } from 'react'
import type { Complex } from '../core/complex'
import { gridPathR, gridPathX, gridValues } from './geometry'
import { qArcPath, rulerTicks, vswrRadius, Q_VALUES, VSWR_VALUES } from './overlays'

export interface ViewBox { x: number; y: number; w: number }
export const HOME_VIEW: ViewBox = { x: -1.15, y: -1.15, w: 2.3 }

export interface ChartArc { id: string; d: string; colorIndex: number }
export interface ChartMarker { gamma: Complex; kind: 'load' | 'input' }
export interface ChartTrace { id: string; d: string; className: string }

export interface SmithChartProps {
  onHoverGamma?: (g: Complex | null) => void
  gridMode?: 'z' | 'y' | 'zy'
  showVswr?: boolean
  showQ?: boolean
  showRuler?: boolean
  arcs?: ChartArc[]
  markers?: ChartMarker[]
  traces?: ChartTrace[]
  freqMarker?: Complex | null
}

export function clientToSvg(svg: SVGSVGElement, clientX: number, clientY: number) {
  const pt = svg.createSVGPoint()
  pt.x = clientX; pt.y = clientY
  const p = pt.matrixTransform(svg.getScreenCTM()!.inverse())
  return { x: p.x, y: p.y }
}

const MIN_W = 0.005
const MAX_W = 4

function zoomAbout(v: ViewBox, px: number, py: number, factor: number): ViewBox {
  const w = Math.min(MAX_W, Math.max(MIN_W, v.w * factor))
  const s = w / v.w
  return { x: px - (px - v.x) * s, y: py - (py - v.y) * s, w }
}

export function SmithChart({
  gridMode = 'z',
  showVswr = false,
  showQ = false,
  showRuler = false,
  arcs = [],
  markers = [],
  traces = [],
  freqMarker = null,
  ...props
}: SmithChartProps) {
  const [view, setView] = useState<ViewBox>(HOME_VIEW)
  const [hover, setHover] = useState<Complex | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const pointers = useRef(new Map<number, { x: number; y: number }>())

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const h = (e: WheelEvent) => {
      e.preventDefault()
      const p = clientToSvg(svg, e.clientX, e.clientY)
      setView((v) => zoomAbout(v, p.x, p.y, e.deltaY > 0 ? 1.2 : 1 / 1.2))
    }
    svg.addEventListener('wheel', h, { passive: false })
    return () => svg.removeEventListener('wheel', h)
  }, [])

  function onPointerDown(e: React.PointerEvent<SVGSVGElement>) {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
  }

  function updateHover(e: React.PointerEvent<SVGSVGElement>) {
    const p = clientToSvg(svgRef.current!, e.clientX, e.clientY)
    const g = { re: p.x, im: -p.y }
    const inside = Math.hypot(g.re, g.im) <= 1
    setHover(inside ? g : null)
    props.onHoverGamma?.(inside ? g : null)
  }

  function onPointerMove(e: React.PointerEvent<SVGSVGElement>) {
    updateHover(e)
    const svg = svgRef.current!
    const prev = pointers.current.get(e.pointerId)
    if (!prev) return
    const pts = pointers.current

    if (pts.size === 1) {
      // pan: translate by the SVG-space delta
      const a = clientToSvg(svg, prev.x, prev.y)
      const b = clientToSvg(svg, e.clientX, e.clientY)
      setView((v) => ({ ...v, x: v.x - (b.x - a.x), y: v.y - (b.y - a.y) }))
    } else if (pts.size === 2) {
      // pinch: zoom about the midpoint by the distance ratio
      const [idA, idB] = [...pts.keys()]
      const other = pts.get(idA === e.pointerId ? idB : idA)!
      const dPrev = Math.hypot(prev.x - other.x, prev.y - other.y)
      const dNow = Math.hypot(e.clientX - other.x, e.clientY - other.y)
      if (dPrev > 0 && dNow > 0) {
        const mid = clientToSvg(svg, (e.clientX + other.x) / 2, (e.clientY + other.y) / 2)
        setView((v) => zoomAbout(v, mid.x, mid.y, dPrev / dNow))
      }
    }
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
  }

  function onPointerUp(e: React.PointerEvent<SVGSVGElement>) {
    pointers.current.delete(e.pointerId)
  }

  const grid = useMemo(() => {
    const { r, x } = gridValues(view.w)
    return {
      r: r.map((v) => ({ v, d: gridPathR(v) })),
      x: x.map((v) => ({ v, d: gridPathX(v) })),
    }
  }, [view.w])

  const gridEls = (
    <>
      <line x1={-1} y1={0} x2={1} y2={0} className="grid-line" />
      {grid.r.map(({ v, d }) => (
        <path key={`r${v}`} d={d} className={v === 1 ? 'grid-line grid-emph' : 'grid-line'} />
      ))}
      {grid.x.map(({ v, d }) => (
        <path key={`x${v}`} d={d} className={Math.abs(v) === 1 ? 'grid-line grid-emph' : 'grid-line'} />
      ))}
    </>
  )

  return (
    <svg
      ref={svgRef}
      className="smith-chart"
      viewBox={`${view.x} ${view.y} ${view.w} ${view.w}`}
      preserveAspectRatio="xMidYMid meet"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onPointerLeave={() => {
        setHover(null)
        props.onHoverGamma?.(null)
      }}
      onDoubleClick={() => setView(HOME_VIEW)}
    >
      <circle cx={0} cy={0} r={1} className="chart-rim" />
      {(gridMode === 'z' || gridMode === 'zy') && <g className="grid-z">{gridEls}</g>}
      {(gridMode === 'y' || gridMode === 'zy') && (
        <g className={gridMode === 'zy' ? 'grid-y grid-faint' : 'grid-y'} transform="rotate(180)">
          {gridEls}
        </g>
      )}
      {showVswr &&
        VSWR_VALUES.map((s) => <circle key={`v${s}`} cx={0} cy={0} r={vswrRadius(s)} className="overlay-vswr" />)}
      {showQ &&
        Q_VALUES.flatMap((q) =>
          ([1, -1] as const).map((sg) => <path key={`q${q}${sg}`} d={qArcPath(q, sg)} className="overlay-q" />)
        )}
      {showRuler && (
        <g className="ruler">
          {rulerTicks().map((t, i) => (
            <g key={i}>
              <line x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} />
              {t.label && (
                <text x={t.lx} y={t.ly} fontSize={0.028} textAnchor="middle" dominantBaseline="middle">
                  {t.label}
                </text>
              )}
            </g>
          ))}
        </g>
      )}
      {traces.map((t) => <path key={t.id} d={t.d} className={`trace ${t.className}`} />)}
      {arcs.map((a) => (
        <path key={a.id} d={a.d} className="el-arc" style={{ stroke: `var(--arc-${a.colorIndex})` }} />
      ))}
      {markers.map((m, i) => (
        <circle
          key={i}
          cx={m.gamma.re}
          cy={-m.gamma.im}
          r={view.w * 0.009}
          className={m.kind === 'load' ? 'marker-load' : 'marker-input'}
        />
      ))}
      {freqMarker && <circle cx={freqMarker.re} cy={-freqMarker.im} r={view.w * 0.011} className="freq-marker" />}
      <circle cx={0} cy={0} r={0.008} className="chart-center" />
      {hover && (
        <g className="crosshair">
          {/* radius scales with the viewBox so the dot stays cursor-sized at any zoom */}
          <circle cx={hover.re} cy={-hover.im} r={view.w * 0.006} />
        </g>
      )}
    </svg>
  )
}
