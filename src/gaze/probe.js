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
const AREA_RADIUS = 320

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
  // Components are intentionally explicit: semantic blocks and controls are
  // meaningful by default, compact data-component roots remain useful for
  // dense controls, and future fixtures can opt in with data-gaze-target.
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

function targetFromElement(element) {
  const rect = element.getBoundingClientRect()
  return {
    element,
    componentName: element.dataset.component,
    selector: `[data-component="${element.dataset.component}"]`,
    boundingRect: {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
    },
  }
}

function distanceToRect(x, y, rect) {
  const dx = Math.max(rect.left - x, 0, x - rect.right)
  const dy = Math.max(rect.top - y, 0, y - rect.bottom)
  return Math.hypot(dx, dy)
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

export function probe(x, y) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null

  const elements = document.elementsFromPoint(x, y)
  for (const element of elements) {
    if (!isVisible(element) || isIgnored(element)) continue

    const target = componentRoot(element)
    if (!target || !isVisible(target) || isIgnored(target)) continue

    return targetFromElement(target)
  }

  // Gaze error can miss a small control by a few pixels. Snap only to nearby
  // interactive/small components; do not turn the whole page into a giant
  // hit target or silently choose a large ancestor.
  return nearbyInteractiveTarget(x, y)
}

function isMeaningfulAreaTarget(element, rect) {
  const interactive = INTERACTIVE_TAGS.has(element.tagName) || element.getAttribute('role')
  const small = rect.width <= 320 && rect.height <= 180
  return Boolean(interactive || small)
}

export function probeArea(x, y) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return { primary: null, candidates: [] }
  }

  const exact = probe(x, y)
  const candidates = [...document.querySelectorAll('[data-component]')]
    .filter((element) => isVisible(element) && !isIgnored(element))
    .map((element, order) => {
      const rect = element.getBoundingClientRect()
      if (!isMeaningfulElement(element, rect)) return null

      return { element, order, distance: distanceToRect(x, y, rect) }
    })
    .filter(Boolean)
    .filter(({ distance }) => distance <= AREA_RADIUS)

  const ranked = [...candidates].sort((a, b) => a.distance - b.distance || a.order - b.order)

  // Select by proximity, then restore document order for the serialized
  // candidate list. This keeps the list stable across repeated frames while
  // still using distance to choose the primary candidate.
  const selectedElements = ranked.slice(0, 5)
  if (exact && !selectedElements.some(({ element }) => element === exact.element)) {
    selectedElements.pop()
    selectedElements.push({
      element: exact.element,
      order: candidates.find(({ element }) => element === exact.element)?.order ?? Number.MAX_SAFE_INTEGER,
      distance: distanceToRect(x, y, exact.element.getBoundingClientRect()),
    })
  }

  const selected = selectedElements
    .sort((a, b) => a.order - b.order)
    .map(({ element, distance }) => ({
    ...targetFromElement(element),
    distance,
    }))

  const nearest = ranked[0] ? targetFromElement(ranked[0].element) : null
  const primary = exact || nearest || nearbyInteractiveTarget(x, y)
  if (primary && !selected.some((candidate) => candidate.element === primary.element)) {
    selected.unshift(primary)
  }

  return { primary, candidates: selected.slice(0, 5) }
}
