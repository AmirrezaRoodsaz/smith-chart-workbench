import { useMemo, useRef, useState } from 'react'
import type { Complex } from '../core/complex'
import { gridPathR, gridPathX, gridValues } from './geometry'

export interface ViewBox { x: number; y: number; w: number }
export const HOME_VIEW: ViewBox = { x: -1.1, y: -1.1, w: 2.2 }

export interface SmithChartProps {
  onHoverGamma?: (g: Complex | null) => void
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

export function SmithChart(_props: SmithChartProps) {
  const [view, setView] = useState<ViewBox>(HOME_VIEW)
  const svgRef = useRef<SVGSVGElement>(null)
  const pointers = useRef(new Map<number, { x: number; y: number }>())

  function onWheel(e: React.WheelEvent<SVGSVGElement>) {
    const svg = svgRef.current!
    const p = clientToSvg(svg, e.clientX, e.clientY)
    setView((v) => zoomAbout(v, p.x, p.y, e.deltaY > 0 ? 1.2 : 1 / 1.2))
  }

  function onPointerDown(e: React.PointerEvent<SVGSVGElement>) {
    e.currentTarget.setPointerCapture(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
  }

  function onPointerMove(e: React.PointerEvent<SVGSVGElement>) {
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

  return (
    <svg
      ref={svgRef}
      className="smith-chart"
      viewBox={`${view.x} ${view.y} ${view.w} ${view.w}`}
      preserveAspectRatio="xMidYMid meet"
      onWheel={onWheel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onDoubleClick={() => setView(HOME_VIEW)}
    >
      <circle cx={0} cy={0} r={1} className="chart-rim" />
      <line x1={-1} y1={0} x2={1} y2={0} className="grid-line" />
      {grid.r.map(({ v, d }) => (
        <path key={`r${v}`} d={d} className={v === 1 ? 'grid-line grid-emph' : 'grid-line'} />
      ))}
      {grid.x.map(({ v, d }) => (
        <path key={`x${v}`} d={d} className={Math.abs(v) === 1 ? 'grid-line grid-emph' : 'grid-line'} />
      ))}
      <circle cx={0} cy={0} r={0.008} className="chart-center" />
    </svg>
  )
}
