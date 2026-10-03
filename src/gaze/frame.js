const HTML_SNIPPET_LIMIT = 2048

function serializeCandidate(candidate, index) {
  const element = candidate.element
  const outerHTML = element?.outerHTML ?? ''
  const boundingRect = candidate.boundingRect ?? element?.getBoundingClientRect?.()
  const rect = boundingRect
    ? {
        x: boundingRect.x,
        y: boundingRect.y,
        width: boundingRect.width,
        height: boundingRect.height,
      }
    : { x: 0, y: 0, width: 0, height: 0 }

  return {
    id: `c${index}`,
    selector: candidate.selector ?? null,
    componentName: candidate.componentName ?? null,
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
  const serializedCandidates = candidates.map(serializeCandidate)
  const lockedIndex = lockedTarget
    ? candidates.findIndex((candidate) => candidate.element === lockedTarget.element)
    : -1

  return {
    candidates: serializedCandidates,
    lockedTarget: lockedIndex >= 0 ? serializedCandidates[lockedIndex] : null,
    capturedAt: Date.now(),
  }
}
