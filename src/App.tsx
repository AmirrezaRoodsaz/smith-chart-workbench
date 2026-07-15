import { SmithChart } from './chart/SmithChart'

export default function App() {
  return (
    <div className="app">
      <header className="app-header"><h1>Smith Chart</h1></header>
      <main className="chart-area"><SmithChart /></main>
    </div>
  )
}
