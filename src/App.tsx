import { useState } from 'react'
import type { Complex } from './core/complex'
import { SmithChart } from './chart/SmithChart'
import { ReadoutPanel } from './app/ReadoutPanel'

export default function App() {
  const [gamma, setGamma] = useState<Complex | null>(null)
  return (
    <div className="app">
      <header className="app-header"><h1>Smith Chart</h1></header>
      <main className="chart-area">
        <SmithChart onHoverGamma={setGamma} />
        <ReadoutPanel gamma={gamma} z0={50} />
      </main>
    </div>
  )
}
