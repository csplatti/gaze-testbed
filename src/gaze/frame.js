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

function serializeCandidate(candidate, index, trackedConfidence = 0.5) {
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

  const serialized = {
    id: `c${index}`,
    selector: debugSelector(safeCandidate, element),
    componentName: safeCandidate.componentName ?? null,
    filePath: element?.dataset?.source ?? null,
    boundingRect: rect,
    outerHTMLSnippet: outerHTML.slice(0, HTML_SNIPPET_LIMIT),
    htmlTruncated: outerHTML.length > HTML_SNIPPET_LIMIT,
    confidence: finiteNumber(safeCandidate.confidence, trackedConfidence),
    trackedConfidence: finiteNumber(safeCandidate.trackedConfidence, trackedConfidence),
    supportedOps: [],
  }

  if (Number.isFinite(safeCandidate.orbOverlap)) serialized.orbOverlap = safeCandidate.orbOverlap
  if (Number.isFinite(safeCandidate.centerDistancePx)) {
    serialized.centerDistancePx = safeCandidate.centerDistancePx
  }

  return serialized
}

function serializeGaze(gaze, trackedConfidence) {
  if (!gaze) return null
  return {
    x: finiteNumber(gaze.x),
    y: finiteNumber(gaze.y),
    smoothedX: finiteNumber(gaze.smoothedX),
    smoothedY: finiteNumber(gaze.smoothedY),
    radiusPx: finiteNumber(gaze.radiusPx),
    trackedConfidence: finiteNumber(gaze.trackedConfidence, trackedConfidence),
  }
}

export function createGazeFrame({
  candidates = [],
  lockedTarget = null,
  gaze = null,
  trackedConfidence = 0.5,
} = {}) {
  const uniqueCandidates = []
  const seenElements = new Set()
  for (const candidate of candidates) {
    if (!candidate || (candidate.element && seenElements.has(candidate.element))) continue
    if (candidate.element) seenElements.add(candidate.element)
    uniqueCandidates.push(candidate)
  }

  const serializedCandidates = uniqueCandidates.map((candidate, index) =>
    serializeCandidate(candidate, index, trackedConfidence),
  )
  const lockedIndex = lockedTarget
    ? uniqueCandidates.findIndex((candidate) => candidate.element === lockedTarget.element)
    : -1

  return {
    candidates: serializedCandidates,
    lockedTarget: lockedIndex >= 0 ? serializedCandidates[lockedIndex] : null,
    gaze: serializeGaze(gaze, trackedConfidence),
    capturedAt: Date.now(),
  }
}
