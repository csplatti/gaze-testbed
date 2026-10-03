export function createDwellTracker(thresholdMs = 500) {
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

    if (target && enteredAt !== null && now - enteredAt >= thresholdMs) {
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

  return { update, click, reset }
}
