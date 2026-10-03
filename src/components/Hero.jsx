// Edge case: large element, gradient bg, nested elements (badge > heading > buttons)
export default function Hero() {
  return (
    <section className="hero" data-component="Hero">
      <span className="badge" data-component="HeroBadge">New · v2.0</span>
      <h1 data-component="HeroHeading">Build interfaces <em>with your eyes</em></h1>
      <p className="hero-sub" data-component="HeroSubtitle">
        A large gradient block. Look at the heading, the subtitle, or the empty space around them.
      </p>
      <div className="hero-actions" data-component="HeroActions">
        <button className="btn primary" data-component="PrimaryButton">Get started</button>
        <button className="btn ghost" data-component="GhostButton">Learn more</button>
      </div>
    </section>
  )
}
