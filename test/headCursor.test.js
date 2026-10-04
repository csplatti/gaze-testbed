import test from 'node:test'
import assert from 'node:assert/strict'
import { createHeadCursor } from '../src/gaze/headCursor.js'

const viewport = { width: 1000, height: 800 }

test('calibrates at the first face position and maps later head movement to a screen cursor', () => {
  const cursor = createHeadCursor({ deadzone: 0, verticalGain: 1, horizontalGain: 1, invertX: false })

  assert.deepEqual(cursor.map({ x: 0.5, y: 0.5 }, viewport).point, { x: 500, y: 400 })
  assert.deepEqual(cursor.map({ x: 0.6, y: 0.5 }, viewport).rawPoint, { x: 600, y: 400 })
})

test('uses a deadzone and mirrors horizontal camera movement by default', () => {
  const cursor = createHeadCursor({ deadzone: 0.05, verticalGain: 1 })

  cursor.map({ x: 0.5, y: 0.5 }, viewport)
  const insideDeadzone = cursor.map({ x: 0.52, y: 0.5 }, viewport)
  assert.deepEqual(insideDeadzone.rawPoint, { x: 500, y: 400 })

  const moved = cursor.map({ x: 0.6, y: 0.5 }, viewport)
  assert.ok(moved.rawPoint.x < 500)
})

test('applies extra sensitivity to horizontal movement', () => {
  const cursor = createHeadCursor({ deadzone: 0, verticalGain: 1, horizontalGain: 2, invertX: false })

  cursor.map({ x: 0.5, y: 0.5 }, viewport)
  const moved = cursor.map({ x: 0.55, y: 0.55 }, viewport)

  assert.ok(Math.abs(moved.rawPoint.x - 600) < 0.001)
  assert.ok(Math.abs(moved.rawPoint.y - 440) < 0.001)
})

test('recentering makes the current face position the new screen center', () => {
  const cursor = createHeadCursor({ deadzone: 0, verticalGain: 1, invertX: false })

  cursor.map({ x: 0.5, y: 0.5 }, viewport)
  cursor.map({ x: 0.6, y: 0.5 }, viewport)
  assert.deepEqual(cursor.recenter({ x: 0.6, y: 0.5 }, viewport).point, { x: 500, y: 400 })
  assert.deepEqual(cursor.map({ x: 0.6, y: 0.5 }, viewport).point, { x: 500, y: 400 })
})

test('ignores a missing face anchor', () => {
  const cursor = createHeadCursor()
  assert.equal(cursor.map(null, viewport), null)
})

test('keeps the cursor position through a brief face-detector dropout', () => {
  const cursor = createHeadCursor({ deadzone: 0, verticalGain: 1, horizontalGain: 1, invertX: false })

  cursor.map({ x: 0.5, y: 0.5 }, viewport)
  cursor.map({ x: 0.55, y: 0.5 }, viewport)
  cursor.map(null, viewport)
  const resumed = cursor.map({ x: 0.6, y: 0.5 }, viewport)

  assert.ok(resumed.rawPoint.x > 500)
  assert.ok(resumed.rawPoint.x < 700)
})
