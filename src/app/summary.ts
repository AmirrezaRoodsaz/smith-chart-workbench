import { formatEng } from '../core/units'
import { KIND_META } from './elementMeta'
import type { AppState } from './state'

const CORE_UNIT: Record<string, string> = { nH: 'H', pF: 'F' }

export function networkSummary(
  state: AppState,
  vswr: number,
  load: { re: number; im: number },
  sourceName?: string,
): string {
  const lines = [
    `Smith Chart Workbench — matching network`,
    `Z0 ${state.z0} Ω · f ${formatEng(state.freqHz, 'Hz')} · Load ${load.re} ${load.im < 0 ? '-' : '+'} j${Math.abs(load.im)} Ω${sourceName ? ` (from ${sourceName})` : ''}`,
    ...state.elements.map((el, i) => {
      const meta = KIND_META[el.kind]
      const val = meta.unit === '°'
        ? `${el.value.toFixed(1)}° (${el.lineZ0 ?? 50} Ω)`
        : meta.unit === 'Ω' ? `${el.value} Ω` : formatEng(el.value, CORE_UNIT[meta.unit])
      return `${i + 1}. ${meta.label} ${val}${el.enabled ? '' : ' (disabled)'}`
    }),
    `Input VSWR ${Number.isFinite(vswr) ? vswr.toFixed(2) : '∞'}`,
  ]
  return lines.join('\n')
}
