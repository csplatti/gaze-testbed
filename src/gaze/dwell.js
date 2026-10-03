export function createDwellTracker(thresholdMs = 500) {
  let threshold = thresholdMs
  let currentElement = null
  let enteredAt = null
  let lockedTarget = null

  function update(target, now) {
    const changed = target?.element !== currentElement
    if (changed) {
      currentElement = target?.element ?? null
      enteredAt = target ? now : null
      lockedTarget = null
    }

    if (target && enteredAt !== null && now - enteredAt >= threshold) {
      lockedTarget = target
    }

    return { changed, enteredAt, lockedTarget }
  }

  function click(target) {
    currentElement = target?.element ?? null
    enteredAt = target ? 0 : null
    lockedTarget = target ?? null
    return lockedTarget
  }

  function reset() {
    currentElement = null
    enteredAt = null
    lockedTarget = null
  }

  function setThreshold(nextThreshold) {
    if (Number.isFinite(nextThreshold)) threshold = Math.max(0, nextThreshold)
  }

  return { update, click, reset, setThreshold }
}
