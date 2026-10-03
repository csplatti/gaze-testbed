import Navbar from './components/Navbar.jsx'
import Hero from './components/Hero.jsx'
import Cards from './components/Cards.jsx'
import DenseControls from './components/DenseControls.jsx'
import ContactForm from './components/ContactForm.jsx'
import DataPanel from './components/DataPanel.jsx'
import Overlays from './components/Overlays.jsx'
import Footer from './components/Footer.jsx'
import GazeTrackingLayer from './gaze/GazeTrackingLayer.jsx'

const NAV = ['Overview', 'Cards', 'Dense controls', 'Form', 'Data', 'Overlays']

export default function App() {
  return (
    <GazeTrackingLayer>
      <div className="app" data-component="App">
        <Navbar />
        <div className="layout">
          <aside className="sidebar" data-component="Sidebar">
            {NAV.map((n, i) => (
              <a key={n} href="#" className={i === 0 ? 'side-link active' : 'side-link'}>{n}</a>
            ))}
            <div className="side-note">Left-edge zone: gaze is least accurate near screen edges.</div>
          </aside>
          <main className="main">
            <Hero />
            <Cards />
            <DenseControls />
            <ContactForm />
            <DataPanel />
            <section className="below-fold" data-component="BelowFold">
              <h2>Below the fold</h2>
              <p>Scroll target. Gaze should map to elements after the page scrolls.</p>
              <div className="tall" />
            </section>
            <Footer />
          </main>
        </div>
        <Overlays />
        {/* Corner calibration pins: check that gaze can reach screen corners */}
        <div className="pin tl" data-component="PinTL">TL</div>
        <div className="pin tr" data-component="PinTR">TR</div>
        <div className="pin bl" data-component="PinBL">BL</div>
        <div className="pin br" data-component="PinBR">BR</div>
      </div>
    </GazeTrackingLayer>
  )
}
