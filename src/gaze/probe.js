const IGNORED_COMPONENTS = new Set(['GhostLayer'])
const INTERACTIVE_TAGS = new Set(['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'])
const MEANINGFUL_BLOCK_TAGS = new Set([
  'ARTICLE',
  'ASIDE',
  'FOOTER',
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
  'HEADER',
  'MAIN',
  'NAV',
  'P',
  'SECTION',
  'SVG',
])
const DEFAULT_AREA_RADIUS = 320
const OVERLAP_GRID_SIZE = 9

function isVisible(element) {
  if (!(element instanceof Element)) return false

  const style = window.getComputedStyle(element)
  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
    return false
  }

  return element.getClientRects().length > 0
}

function isIgnored(element) {
  return element.closest?.('[data-gaze-overlay="true"]') ||
    IGNORED_COMPONENTS.has(element.closest?.('[data-component]')?.dataset.component)
}

function isMeaningfulElement(element, rect = element.getBoundingClientRect()) {
  // Semantic blocks and controls are meaningful by default, compact
  // data-component roots remain useful for dense controls, and future fixtures
  // can opt in with data-gaze-target.
  const interactive = INTERACTIVE_TAGS.has(element.tagName) || element.getAttribute('role')
  const semanticBlock = MEANINGFUL_BLOCK_TAGS.has(element.tagName)
  const intentionallySmall = rect.width <= 320 && rect.height <= 180
  const explicitTarget = element.dataset.gazeTarget === 'true'
  return Boolean(interactive || semanticBlock || intentionallySmall || explicitTarget)
}

function componentRoot(element) {
  let current = element
  while (current && current !== document.documentElement) {
    if (
      current.dataset?.component &&
      !IGNORED_COMPONENTS.has(current.dataset.component) &&
      isMeaningfulElement(current)
    ) {
      return current
    }
    current = current.parentElement
  }
  return null
}

function selectorFor(element) {
  return `[data-component=${JSON.stringify(element.dataset.component)}]`
}

function targetFromElement(element, metrics = {}) {
  const rect = element.getBoundingClientRect()
  return {
    element,
    componentName: element.dataset.component,
    selector: selectorFor(element),
    boundingRect: {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
    },
    ...metrics,
  }
}

function distanceToRect(x, y, rect) {
  const dx = Math.max(rect.left - x, 0, x - rect.right)
  const dy = Math.max(rect.top - y, 0, y - rect.bottom)
  return Math.hypot(dx, dy)
}

function centerDistance(x, y, rect) {
  return Math.hypot(x - (rect.left + rect.width / 2), y - (rect.top + rect.height / 2))
}

function orbOverlap(x, y, radius, rect) {
  if (radius === 0) return distanceToRect(x, y, rect) === 0 ? 1 : 0
  if (rect.width <= 0 || rect.height <= 0) return 0

  let inside = 0
  for (let row = 0; row < OVERLAP_GRID_SIZE; row += 1) {
    for (let column = 0; column < OVERLAP_GRID_SIZE; column += 1) {
      const sampleX = rect.left + ((column + 0.5) / OVERLAP_GRID_SIZE) * rect.width
      const sampleY = rect.top + ((row + 0.5) / OVERLAP_GRID_SIZE) * rect.height
      if (Math.hypot(sampleX - x, sampleY - y) <= radius) inside += 1
    }
  }
  return inside / (OVERLAP_GRID_SIZE * OVERLAP_GRID_SIZE)
}

function normalizeRadius(radiusPx) {
  if (radiusPx === undefined) return DEFAULT_AREA_RADIUS
  return Number.isFinite(radiusPx) ? Math.max(0, radiusPx) : DEFAULT_AREA_RADIUS
}

function nearbyInteractiveTarget(x, y) {
  const candidates = [...document.querySelectorAll('[data-component]')]
    .filter((element) => isVisible(element) && !isIgnored(element))
    .map((element, order) => {
      const rect = element.getBoundingClientRect()
      const interactive = INTERACTIVE_TAGS.has(element.tagName) || element.getAttribute('role')
      const small = rect.width <= 240 && rect.height <= 120
      if (!interactive && !small) return null

      const distance = distanceToRect(x, y, rect)
      return { element, order, distance, tolerance: interactive ? 42 : 24 }
    })
    .filter(Boolean)
    .filter(({ distance, tolerance }) => distance <= tolerance)
    .sort((a, b) => a.distance - b.distance || a.order - b.order)

  return candidates[0] ? targetFromElement(candidates[0].element) : null
}

export function probe(x, y, { snap = true } = {}) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null

  const elements = document.elementsFromPoint(x, y)
  for (const element of elements) {
    if (!isVisible(element) || isIgnored(element)) continue

    const target = componentRoot(element)
    if (!target || !isVisible(target) || isIgnored(target)) continue

    return targetFromElement(target)
  }

  // Gaze error can miss a small control by a few pixels. Snap only for the
  // normal gaze path; radiusPx: 0 uses snap:false for exact click probing.
  return snap ? nearbyInteractiveTarget(x, y) : null
}

export function probeArea(x, y, radiusPx) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return { primary: null, candidates: [] }
  }

  const radius = normalizeRadius(radiusPx)
  const exact = probe(x, y, { snap: false })
  const candidates = [...document.querySelectorAll('[data-component]')]
    .filter((element) => isVisible(element) && !isIgnored(element))
    .map((element, order) => {
      const rect = element.getBoundingClientRect()
      if (!isMeaningfulElement(element, rect)) return null

      const distance = distanceToRect(x, y, rect)
      if (distance > radius) return null

      return {
        element,
        order,
        distance,
        centerDistancePx: centerDistance(x, y, rect),
        orbOverlap: orbOverlap(x, y, radius, rect),
        area: rect.width * rect.height,
      }
    })
    .filter(Boolean)

  const ranked = [...candidates].sort((a, b) =>
    b.orbOverlap - a.orbOverlap ||
    a.centerDistancePx - b.centerDistancePx ||
    a.area - b.area ||
    a.order - b.order,
  )

  // Rank spatially, then restore document order for serialization. This
  // keeps IDs and candidate lists deterministic while preserving the nearest
  // candidate as primary metadata.
  const selected = ranked
    .slice(0, 5)
    .sort((a, b) => a.order - b.order)
    .map(({ element, distance, centerDistancePx, orbOverlap: overlap }) => targetFromElement(element, {
      distance,
      centerDistancePx,
      orbOverlap: overlap,
    }))

  const primaryElement = exact?.element ?? ranked[0]?.element ?? null
  const primary = primaryElement
    ? selected.find((candidate) => candidate.element === primaryElement) ?? targetFromElement(primaryElement)
    : null

  return { primary, candidates: selected }
}
