import test from 'node:test'
import assert from 'node:assert/strict'
import { createDwellTracker } from '../src/gaze/dwell.js'

const target = (element) => ({ element, componentName: element })

test('dwell locks only after the threshold and resets when the target changes', () => {
  const tracker = createDwellTracker(500)
  const first = target('first')
  const second = target('second')

  assert.equal(tracker.update(first, 0).lockedTarget, null)
  assert.equal(tracker.update(first, 499).lockedTarget, null)
  assert.equal(tracker.update(first, 500).lockedTarget, first)
  assert.equal(tracker.update(second, 501).lockedTarget, null)
  assert.equal(tracker.update(second, 1000).lockedTarget, null)
  assert.equal(tracker.update(second, 1001).lockedTarget, second)
})

test('click locks immediately and reset clears the lock', () => {
  const tracker = createDwellTracker(500)
  const clicked = target('clicked')

  assert.equal(tracker.click(clicked), clicked)
  tracker.reset()
  assert.equal(tracker.update(clicked, 0).lockedTarget, null)
})

test('updates the dwell threshold from sensitivity without losing the current target', () => {
  const tracker = createDwellTracker(500)
  const first = target('first')

  tracker.update(first, 0)
  tracker.setThreshold(300)
  assert.equal(tracker.update(first, 300).lockedTarget, first)
})
