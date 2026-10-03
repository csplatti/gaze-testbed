import { useState } from 'react'
// Edge cases: table, SVG elements (not HTML), inner scroll container, tabs
const ROWS = Array.from({ length: 5 }, (_, i) => ({ id: i + 1, name: `Item ${i + 1}`, v: (i + 2) * 17 % 90 + 10 }))
export default function DataPanel() {
  const [tab, setTab] = useState('table')
  return (
    <section className="section" data-component="DataPanel">
      <h2>Data</h2>
      <div className="tabs" data-component="Tabs">
        {['table', 'chart', 'list'].map((t) => (
          <button key={t} className={tab === t ? 'tab active' : 'tab'} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>
      {tab === 'table' && (
        <table className="table" data-component="Table">
          <thead><tr><th>ID</th><th>Name</th><th>Value</th></tr></thead>
          <tbody>{ROWS.map((r) => (<tr key={r.id}><td>{r.id}</td><td>{r.name}</td><td>{r.v}</td></tr>))}</tbody>
        </table>
      )}
      {tab === 'chart' && (
        <svg className="chart" viewBox="0 0 300 120" data-component="BarChart">
          {ROWS.map((r, i) => (
            <rect key={r.id} x={20 + i * 55} y={110 - r.v} width="40" height={r.v} fill="#5D58E9" />
          ))}
          <text x="20" y="12" fill="#A5ADBA" fontSize="10">SVG chart</text>
        </svg>
      )}
      {tab === 'list' && (
        <ul className="scroll-box" data-component="ScrollBox">
          {Array.from({ length: 30 }, (_, i) => (<li key={i}>Scrollable row {i + 1}</li>))}
        </ul>
      )}
    </section>
  )
}
