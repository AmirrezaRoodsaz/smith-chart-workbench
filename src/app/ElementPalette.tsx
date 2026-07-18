import type { ElementKind } from '../core/elements'
import type { Dispatch } from './state'
import { KIND_META } from './elementMeta'

const ORDER: ElementKind[] = ['seriesL', 'seriesC', 'seriesR', 'shuntL', 'shuntC', 'shuntR', 'line', 'stubOpen', 'stubShort']

export function ElementPalette({ dispatch }: { dispatch: Dispatch }) {
  return (
    <section className="palette">
      <h2>Add element</h2>
      <div className="palette-grid">
        {ORDER.map((k) => (
          <button key={k} data-explain={`el-${k}`} data-tour={`pal-${k}`} onClick={() => dispatch({ type: 'addElement', kind: k })}>{KIND_META[k].label}</button>
        ))}
      </div>
    </section>
  )
}
