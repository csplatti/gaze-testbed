// Edge case: dark footer, very small text, bottom-of-page edge
export default function Footer() {
  return (
    <footer className="footer" data-component="Footer">
      <div className="footer-links" data-component="FooterLinks"><a href="#">Privacy</a><a href="#">Terms</a><a href="#">Contact</a></div>
      <small data-component="Copyright">© 2026 Testbed. Tiny 10px text.</small>
    </footer>
  )
}
