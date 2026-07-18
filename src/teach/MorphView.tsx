import { useEffect, useRef, useState } from 'react'
import { morphGridPaths } from './morph'

export function MorphView({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => { ref.current?.showModal() }, [])
  const [t, setT] = useState(0)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    if (!playing) return
    let start: number | null = null
    let id = 0
    const tick = (ts: number) => {
      if (start === null) start = ts
      const nt = Math.min(1, (ts - start) / 4000)
      setT(nt)
      if (nt < 1) id = requestAnimationFrame(tick)
      else setPlaying(false)
    }
    id = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(id)
  }, [playing])

  const ease = t * t * (3 - 2 * t) // smoothstep
  const paths = morphGridPaths(ease)

  return (
    <dialog ref={ref} className="teach-dialog" onClose={onClose}>
      <div className="dialog-head">
        <h2>Why does it look like this?</h2>
        <button onClick={onClose} aria-label="Close">✕</button>
      </div>
      <p className="teach-blurb">
        Impedances live on an infinite half-plane: resistance runs right forever, reactance up and
        down forever. The Smith chart bends that whole half-plane into the disk of reflection
        coefficients — constant-resistance lines become circles, constant-reactance lines become
        arcs, and the point at infinity lands on the right edge of the rim.
      </p>
      <svg viewBox="-1.3 -1.3 2.6 2.6" className="morph-svg" aria-label="Conformal map morph">
        <circle cx={0} cy={0} r={1} className="chart-rim" style={{ opacity: ease }} />
        {paths.map((p, i) => (
          <path key={i} d={p.d} className={p.emph ? 'grid-line grid-emph' : 'grid-line'} />
        ))}
      </svg>
      <div className="morph-controls">
        <button onClick={() => { setT(0); setPlaying(true) }} disabled={playing}>▶ Morph</button>
        <input type="range" min={0} max={1000} value={Math.round(t * 1000)} aria-label="Morph progress"
          onChange={(e) => { setPlaying(false); setT(Number(e.target.value) / 1000) }} />
        <span className="morph-caption">{t < 0.5 ? 'impedance plane (z = r + jx)' : 'reflection plane (Γ)'}</span>
      </div>
    </dialog>
  )
}
