import { useEffect, useState } from 'react'
import type { Complex } from './core/complex'
import { SmithChart } from './chart/SmithChart'
import { ReadoutPanel } from './app/ReadoutPanel'

function initialTheme(): 'light' | 'dark' {
  const saved = localStorage.getItem('smith-theme')
  if (saved === 'light' || saved === 'dark') return saved
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export default function App() {
  const [gamma, setGamma] = useState<Complex | null>(null)
  const [theme, setTheme] = useState(initialTheme)
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('smith-theme', theme)
  }, [theme])
  return (
    <div className="app">
      <header className="app-header">
        <h1>Smith Chart</h1>
        <button className="theme-toggle" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </header>
      <main className="chart-area">
        <SmithChart onHoverGamma={setGamma} />
        <ReadoutPanel gamma={gamma} z0={50} />
      </main>
    </div>
  )
}
