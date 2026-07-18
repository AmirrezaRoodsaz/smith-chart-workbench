import { useEffect, useState } from 'react'
import { EXPLAIN } from './explain'

// "?" mode: while active, any click on a [data-explain] element opens a
// popover instead of activating the control (capture-phase intercept).
export function ExplainLayer({ active, onExit }: { active: boolean; onExit: () => void }) {
  const [pop, setPop] = useState<{ id: string; x: number; y: number } | null>(null)

  useEffect(() => {
    document.body.classList.toggle('explain-on', active)
    if (!active) { setPop(null); return }
    const click = (e: MouseEvent) => {
      const t = (e.target as HTMLElement).closest?.('[data-explain]') as HTMLElement | null
      if (t && EXPLAIN[t.dataset.explain!]) {
        e.preventDefault()
        e.stopPropagation()
        setPop({ id: t.dataset.explain!, x: e.clientX, y: e.clientY })
      } else setPop(null)
    }
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onExit() }
    document.addEventListener('click', click, true)
    document.addEventListener('keydown', key)
    return () => {
      document.removeEventListener('click', click, true)
      document.removeEventListener('keydown', key)
      document.body.classList.remove('explain-on')
    }
  }, [active, onExit])

  if (!active || !pop) return null
  const entry = EXPLAIN[pop.id]
  const left = Math.max(8, Math.min(pop.x, window.innerWidth - 340))
  const top = Math.max(8, Math.min(pop.y + 12, window.innerHeight - 220))
  return (
    <div className="explain-pop" role="dialog" aria-label={entry.title} style={{ left, top }}>
      <h3>{entry.title}</h3>
      {entry.diagram && (
        <svg viewBox="-1.2 -1.2 2.4 2.4" className="explain-diagram" aria-hidden="true"
          dangerouslySetInnerHTML={{ __html: entry.diagram }} />
      )}
      <p>{entry.body}</p>
    </div>
  )
}
