// Edge case: sticky header, tiny adjacent icon buttons, search input, avatar
export default function Navbar() {
  return (
    <header className="navbar" data-component="Navbar">
      <div className="logo" data-component="Logo">◆ Testbed</div>
      <nav className="nav-links" data-component="NavLinks">
        <a href="#">Product</a><a href="#">Pricing</a><a href="#">Docs</a><a href="#">Blog</a>
      </nav>
      <input className="search" placeholder="Search…" data-component="SearchInput" />
      <div className="icon-row" data-component="IconRow">
        {['★', '✉', '⚙', '?'].map((i) => (
          <button key={i} className="icon-btn" aria-label={i}>{i}</button>
        ))}
      </div>
      <div className="avatar" data-component="Avatar">AB</div>
    </header>
  )
}
