import type { Complex } from '../core/complex'
import { formatReadout } from './format'

export function ReadoutPanel({ gamma, z0 }: { gamma: Complex | null; z0: number }) {
  if (!gamma) return <aside className="readout readout-empty" data-explain="readout">Hover the chart</aside>
  return (
    <aside className="readout" data-explain="readout">
      <table>
        <tbody>
          {formatReadout(gamma, z0).map((r) => (
            <tr key={r.label}><th>{r.label}</th><td>{r.value}</td></tr>
          ))}
        </tbody>
      </table>
    </aside>
  )
}
