import { useEffect, useState } from 'react'
import { advance, type Mission, type TourCtx } from './walkthrough'

export function WalkthroughPanel({ mission, ctx, onExit }: { mission: Mission; ctx: TourCtx; onExit: () => void }) {
  const [idx, setIdx] = useState(0)
  useEffect(() => { setIdx(0) }, [mission.id])
  useEffect(() => { setIdx((i) => advance(i, mission, ctx)) }, [mission, ctx])
  const step = mission.steps[idx]

  useEffect(() => {
    if (!step?.target) return
    const el = document.querySelector(`[data-tour="${step.target}"]`)
    el?.classList.add('tour-hi')
    return () => el?.classList.remove('tour-hi')
  }, [step?.target])

  return (
    <aside className="tour-card" aria-label="Guided walkthrough">
      <h3>{mission.title}</h3>
      <span className="tour-step-n">step {Math.min(idx + 1, mission.steps.length)} of {mission.steps.length}</span>
      <p>{step ? step.text : 'Mission complete — nice match!'}</p>
      <div className="tour-btns">
        <button onClick={onExit}>Exit</button>
        {step?.manual && (
          <button className="primary" onClick={() => setIdx(advance(idx + 1, mission, ctx))}>Next</button>
        )}
        {!step && <button className="primary" onClick={onExit}>Done</button>}
      </div>
    </aside>
  )
}
