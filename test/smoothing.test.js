import test from 'node:test'
import assert from 'node:assert/strict'
import { createEmaSmoother } from '../src/gaze/smoothing.js'

test('initializes, smooths normal movement, clamps large jumps, and ignores invalid input', () => {
  const smoother = createEmaSmoother(0.5, 100)

  assert.equal(smoother.update({ x: 10, y: 20 }).x, 10)
  assert.deepEqual(smoother.update({ x: 20, y: 40 }), { x: 15, y: 30 })
  assert.deepEqual(smoother.update({ x: 1015, y: 30 }), { x: 65, y: 30 })
  assert.deepEqual(smoother.update({ x: Number.NaN, y: 30 }), { x: 65, y: 30 })
  assert.deepEqual(smoother.update(null), { x: 65, y: 30 })
})

test('reset clears the initial sample', () => {
  const smoother = createEmaSmoother(0.12)
  smoother.update({ x: 100, y: 100 })
  smoother.reset()
  assert.deepEqual(smoother.update({ x: 10, y: 20 }), { x: 10, y: 20 })
})

test('allows the sensitivity control to change the EMA factor', () => {
  const smoother = createEmaSmoother(0.1)
  smoother.update({ x: 0, y: 0 })
  smoother.setAlpha(0.5)
  assert.deepEqual(smoother.update({ x: 10, y: 10 }), { x: 5, y: 5 })
})
