const OVERLAY_ATTRIBUTE = 'data-gaze-overlay'
const OVERLAY_ID = 'gaze-debug-overlay'

function makeLayer() {
  const layer = document.createElement('div')
  layer.id = OVERLAY_ID
  layer.setAttribute(OVERLAY_ATTRIBUTE, 'true')
  Object.assign(layer.style, {
    position: 'fixed',
    inset: '0',
    zIndex: '2147483647',
    pointerEvents: 'none',
  })

  const rawDot = document.createElement('div')
  const smoothedDot = document.createElement('div')
  const orb = document.createElement('div')
  const outline = document.createElement('div')
  const status = document.createElement('div')

  rawDot.dataset.gazeRawDot = 'true'
  smoothedDot.dataset.gazeSmoothedDot = 'true'
  orb.dataset.gazeOrb = 'true'
  outline.dataset.gazeOutline = 'true'
  status.dataset.gazeStatus = 'true'

  Object.assign(rawDot.style, dotStyle('#f8bd46', 8))
  Object.assign(smoothedDot.style, dotStyle('#5ae0e7', 12))
  Object.assign(orb.style, {
    position: 'fixed',
    transform: 'translate(-50%, -50%)',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(90, 224, 231, .55) 0%, rgba(90, 224, 231, .18) 38%, rgba(90, 224, 231, 0) 72%)',
    border: '1px solid rgba(90, 224, 231, .5)',
    boxShadow: '0 0 20px rgba(90, 224, 231, .2)',
    pointerEvents: 'none',
    display: 'none',
  })
  Object.assign(outline.style, {
    position: 'fixed',
    border: '2px solid #5ae0e7',
    borderRadius: '6px',
    boxShadow: '0 0 0 1px rgba(10, 10, 10, .8), 0 0 18px rgba(90, 224, 231, .55)',
    transition: 'left 80ms linear, top 80ms linear, width 80ms linear, height 80ms linear',
    display: 'none',
  })
  Object.assign(status.style, {
    position: 'fixed',
    top: '8px',
    left: '50%',
    transform: 'translateX(-50%)',
    padding: '4px 8px',
    borderRadius: '4px',
    background: 'rgba(10, 10, 10, .85)',
    color: '#e6e7ea',
    font: '12px/1.3 ui-monospace, SFMono-Regular, Menlo, monospace',
  })

  layer.append(orb, rawDot, smoothedDot, outline, status)
  document.body.append(layer)
  return { layer, rawDot, smoothedDot, orb, outline, status }
}

function dotStyle(color, size) {
  return {
    position: 'fixed',
    width: `${size}px`,
    height: `${size}px`,
    marginLeft: `${-size / 2}px`,
    marginTop: `${-size / 2}px`,
    borderRadius: '50%',
    background: color,
    border: '1px solid #0a0a0a',
    boxShadow: `0 0 0 1px ${color}, 0 0 10px ${color}`,
    display: 'none',
  }
}

let nodes = null
let candidateOutlineNodes = new Map()

export function ensureOverlay() {
  if (!nodes || !document.getElementById(OVERLAY_ID)) nodes = makeLayer()
  return nodes
}

export function updateRawPoint(point) {
  const { rawDot } = ensureOverlay()
  Object.assign(rawDot.style, { left: `${point.x}px`, top: `${point.y}px`, display: 'block' })
}

export function updateSmoothedPoint(point) {
  const { smoothedDot } = ensureOverlay()
  Object.assign(smoothedDot.style, { left: `${point.x}px`, top: `${point.y}px`, display: 'block' })
}

export function updateGazeOrb({ point, radiusPx, opacity = 0.6 }) {
  const { orb } = ensureOverlay()
  const diameter = Math.max(0, radiusPx * 2)
  Object.assign(orb.style, {
    left: `${point.x}px`,
    top: `${point.y}px`,
    width: `${diameter}px`,
    height: `${diameter}px`,
    opacity: `${opacity}`,
    display: 'block',
  })
}

export function updateHighlight(target, locked = false) {
  updateHighlights(target ? [target] : [], locked ? target : null, target)
}

export function updateHighlights(targets = [], lockedTarget = null, primaryTarget = null) {
  const { outline } = ensureOverlay()
  outline.style.display = 'none'
  const visibleElements = new Set(targets.map((target) => target.element))

  for (const [element, candidateOutline] of candidateOutlineNodes) {
    if (!visibleElements.has(element)) {
      candidateOutline.remove()
      candidateOutlineNodes.delete(element)
    }
  }

  targets.forEach((target, index) => {
    let candidateOutline = candidateOutlineNodes.get(target.element)
    if (!candidateOutline) {
      candidateOutline = document.createElement('div')
      candidateOutline.setAttribute(OVERLAY_ATTRIBUTE, 'true')
      candidateOutlineNodes.set(target.element, candidateOutline)
      ensureOverlay().layer.append(candidateOutline)
    }

    const rect = target.element.getBoundingClientRect()
    const isPrimary = primaryTarget
      ? primaryTarget.element === target.element
      : index === 0
    const isLocked = lockedTarget?.element === target.element
    Object.assign(candidateOutline.style, {
      position: 'fixed',
      left: `${rect.left}px`,
      top: `${rect.top}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      border: `${isPrimary ? 2 : 1}px ${isPrimary ? 'solid' : 'dashed'} ${isLocked ? '#f8bd46' : isPrimary ? '#5ae0e7' : '#b864ff'}`,
      borderRadius: '6px',
      boxShadow: isPrimary ? '0 0 0 1px rgba(10, 10, 10, .8), 0 0 18px rgba(90, 224, 231, .55)' : 'none',
      display: 'block',
    })
  })
}

export function updateStatus({ source, target, candidates = [], locked }) {
  const { status } = ensureOverlay()
  const nearby = candidates.length > 1 ? ` + ${candidates.length - 1} nearby` : ''
  status.textContent = `${source}: ${target?.componentName ?? 'no component'}${nearby}${locked ? ' · LOCKED' : ''}`
}

export function removeOverlay() {
  document.getElementById(OVERLAY_ID)?.remove()
  nodes = null
  candidateOutlineNodes = new Map()
}
