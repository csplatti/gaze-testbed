export function createTargetStabilizer(requiredWins = 2) {
  const winsNeeded = Math.max(1, requiredWins)
  let stableTarget = null
  let pendingElement = null
  let pendingWins = 0

  function resetPending() {
    pendingElement = null
    pendingWins = 0
  }

  function update(proposedTarget, candidates = []) {
    const currentCandidate = stableTarget
      ? candidates.find((candidate) => candidate.element === stableTarget.element)
      : null

    if (!stableTarget) {
      stableTarget = proposedTarget
      resetPending()
      return { target: stableTarget, changed: Boolean(stableTarget) }
    }

    if (proposedTarget?.element === stableTarget.element) {
      stableTarget = currentCandidate ?? proposedTarget
      resetPending()
      return { target: stableTarget, changed: false }
    }

    if (!proposedTarget) {
      stableTarget = currentCandidate
      resetPending()
      return { target: stableTarget, changed: !stableTarget }
    }

    if (pendingElement === proposedTarget.element) {
      pendingWins += 1
    } else {
      pendingElement = proposedTarget.element
      pendingWins = 1
    }

    if (pendingWins < winsNeeded) {
      return { target: currentCandidate ?? stableTarget, changed: false }
    }

    stableTarget = proposedTarget
    resetPending()
    return { target: stableTarget, changed: true }
  }

  function click(target) {
    stableTarget = target ?? null
    resetPending()
    return stableTarget
  }

  function reset() {
    stableTarget = null
    resetPending()
  }

  return { update, click, reset }
}
