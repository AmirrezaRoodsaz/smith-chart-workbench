import { useMemo, useState } from 'react'
import type { Complex } from '../core/complex'
import { gridPathR, gridPathX, gridValues } from './geometry'

export interface ViewBox { x: number; y: number; w: number }
export const HOME_VIEW: ViewBox = { x: -1.1, y: -1.1, w: 2.2 }

export interface SmithChartProps {
  onHoverGamma?: (g: Complex | null) => void
}

export function SmithChart(_props: SmithChartProps) {
  const [view] = useState<ViewBox>(HOME_VIEW)

  const grid = useMemo(() => {
    const { r, x } = gridValues(view.w)
    return {
      r: r.map((v) => ({ v, d: gridPathR(v) })),
      x: x.map((v) => ({ v, d: gridPathX(v) })),
    }
  }, [view.w])

  return (
    <svg
      className="smith-chart"
      viewBox={`${view.x} ${view.y} ${view.w} ${view.w}`}
      preserveAspectRatio="xMidYMid meet"
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
