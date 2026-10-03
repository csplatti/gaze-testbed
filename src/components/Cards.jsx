// Edge cases: light / dark / low-contrast cards, absolutely positioned badge, pointer-events:none overlay
const CARDS = [
  { id: 'light', title: 'Light card', cls: 'card light', body: 'Dark text on a white background.' },
  { id: 'dark', title: 'Dark card', cls: 'card dark', body: 'Light text on a dark background.' },
  { id: 'low', title: 'Low-contrast card', cls: 'card low', body: 'Grey on slightly lighter grey. Hard to detect visually.' },
]
export default function Cards() {
  return (
    <section className="section" data-component="Cards">
      <h2>Cards</h2>
      <div className="card-grid">
        {CARDS.map((c) => (
          <article key={c.id} className={c.cls} data-component={`Card-${c.id}`}>
            <div className="card-img" data-component="CardImage">img</div>
            <span className="corner-badge" data-component="CornerBadge">NEW</span>
            <h3 data-component="CardTitle">{c.title}</h3>
            <p data-component="CardBody">{c.body}</p>
            <div className="chips"><span className="chip">alpha</span><span className="chip">beta</span></div>
            <button className="btn small" data-component="CardButton">Action</button>
          </article>
        ))}
        {/* Edge case: transparent layer on top that ignores pointer events. elementFromPoint should skip it */}
        <div className="ghost-layer" data-component="GhostLayer" />
      </div>
    </section>
  )
}
