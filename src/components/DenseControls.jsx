// Edge cases: many small adjacent targets (disambiguation), inline links in text
export default function DenseControls() {
  return (
    <section className="section" data-component="DenseControls">
      <h2>Dense controls</h2>
      <div className="toolbar" data-component="Toolbar">
        {Array.from({ length: 10 }, (_, i) => (
          <button key={i} className="tiny-btn" aria-label={`tool ${i + 1}`}>{i + 1}</button>
        ))}
      </div>
      <div className="chips" data-component="TagCloud">
        {['react', 'css', 'vite', 'electron', 'gaze', 'voice', 'git', 'ui', 'agent', 'jev'].map((t) => (
          <span key={t} className="chip">{t}</span>
        ))}
      </div>
      <nav className="breadcrumbs" data-component="Breadcrumbs"><a href="#">Home</a> / <a href="#">Docs</a> / <a href="#">Setup</a></nav>
      <div className="pagination" data-component="Pagination">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (<button key={n} className="page-btn">{n}</button>))}
      </div>
      <p className="long-text" data-component="Paragraph">
        This paragraph has <a href="#">an inline link</a>, some <strong>bold text</strong>, and{' '}
        <code>inline code</code> in the middle of a line. Eye tracking should resolve to the
        paragraph or the exact inline element depending on sensitivity. Lorem ipsum dolor sit amet,
        consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
      </p>
    </section>
  )
}
