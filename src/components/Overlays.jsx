import { useState } from 'react'
// Edge cases: fixed FAB, modal + scrim (z-index), dropdown, tooltip, element in the bottom-right corner
export default function Overlays() {
  const [modal, setModal] = useState(false)
  const [menu, setMenu] = useState(false)
  return (
    <>
      <div className="floating-menu" data-component="FloatingMenu">
        <button className="btn small" onClick={() => setMenu(!menu)}>Menu ▾</button>
        {menu && (
          <ul className="dropdown" data-component="Dropdown">
            <li>Profile</li><li>Settings</li><li onClick={() => setModal(true)}>Open modal</li>
          </ul>
        )}
      </div>
      <button className="fab" onClick={() => setModal(true)} data-component="FAB" title="Tooltip: floating action button">+</button>
      {modal && (
        <div className="scrim" data-component="Scrim" onClick={() => setModal(false)}>
          <div className="modal" data-component="Modal" onClick={(e) => e.stopPropagation()}>
            <h3>Modal dialog</h3>
            <p>Gaze should target the modal, not the page behind the scrim.</p>
            <button className="btn primary" onClick={() => setModal(false)}>Close</button>
          </div>
        </div>
      )}
    </>
  )
}
