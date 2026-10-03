const HTML_SNIPPET_LIMIT = 2048

function finiteNumber(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback
}

function debugSelector(candidate, element) {
  if (typeof candidate.selector === 'string' && candidate.selector.length > 0) {
    return candidate.selector
  }

  const componentName = candidate.componentName ?? element?.dataset?.component
  if (typeof componentName === 'string' && componentName.length > 0) {
    return `[data-component=${JSON.stringify(componentName)}]`
  }

  const tagName = typeof element?.tagName === 'string' ? element.tagName.toLowerCase() : 'unknown'
  return tagName
}

function serializeCandidate(candidate, index) {
  const safeCandidate = candidate ?? {}
  const element = safeCandidate.element
  const outerHTML = typeof element?.outerHTML === 'string' ? element.outerHTML : ''
  const boundingRect = safeCandidate.boundingRect ?? element?.getBoundingClientRect?.()
  const rect = boundingRect
    ? {
        x: finiteNumber(boundingRect.x),
        y: finiteNumber(boundingRect.y),
        width: finiteNumber(boundingRect.width),
        height: finiteNumber(boundingRect.height),
      }
    : { x: 0, y: 0, width: 0, height: 0 }

  return {
    id: `c${index}`,
    selector: debugSelector(safeCandidate, element),
    componentName: safeCandidate.componentName ?? null,
    filePath: element?.dataset?.source ?? null,
    boundingRect: rect,
    outerHTMLSnippet: outerHTML.slice(0, HTML_SNIPPET_LIMIT),
    htmlTruncated: outerHTML.length > HTML_SNIPPET_LIMIT,
    confidence: 0.5,
    trackedConfidence: 0.5,
    supportedOps: [],
  }
}

export function createGazeFrame({ candidates = [], lockedTarget = null } = {}) {
  const uniqueCandidates = []
  const seenElements = new Set()
  for (const candidate of candidates) {
    if (!candidate || (candidate.element && seenElements.has(candidate.element))) continue
    if (candidate.element) seenElements.add(candidate.element)
    uniqueCandidates.push(candidate)
  }

  const serializedCandidates = uniqueCandidates.map(serializeCandidate)
  const lockedIndex = lockedTarget
    ? uniqueCandidates.findIndex((candidate) => candidate.element === lockedTarget.element)
    : -1

  return {
    candidates: serializedCandidates,
    lockedTarget: lockedIndex >= 0 ? serializedCandidates[lockedIndex] : null,
    capturedAt: Date.now(),
  }
}
