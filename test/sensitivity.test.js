import test from 'node:test'
import assert from 'node:assert/strict'
import {
  DEFAULT_SENSITIVITY,
  normalizeSensitivity,
  opacityForConfidence,
  radiusForConfidence,
} from '../src/gaze/sensitivity.js'

test('maps tracked confidence to the adaptive orb radius', () => {
  assert.equal(radiusForConfidence(1), DEFAULT_SENSITIVITY.minRadiusPx)
  assert.equal(radiusForConfidence(0), DEFAULT_SENSITIVITY.maxRadiusPx)
  assert.equal(radiusForConfidence(0.5), 125)
  assert.equal(radiusForConfidence(5), DEFAULT_SENSITIVITY.minRadiusPx)
})

test('normalizes one sensitivity configuration and scales orb opacity', () => {
  const sensitivity = normalizeSensitivity({ dwellMs: 1000, smoothing: 2, minRadiusPx: 80, maxRadiusPx: 140 })
  assert.deepEqual(sensitivity, { dwellMs: 600, smoothing: 0.8, minRadiusPx: 80, maxRadiusPx: 140 })
  assert.ok(opacityForConfidence(0) < opacityForConfidence(1))
})
