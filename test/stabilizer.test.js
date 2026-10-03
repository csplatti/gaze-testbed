import test from 'node:test'
import assert from 'node:assert/strict'
import { createTargetStabilizer } from '../src/gaze/stabilizer.js'

const target = (element) => ({ element, componentName: element })

test('requires two consecutive wins before switching targets', () => {
  const stabilizer = createTargetStabilizer(2)
  const first = target('first')
  const second = target('second')

  assert.equal(stabilizer.update(first, [first]).target, first)
  assert.equal(stabilizer.update(second, [first, second]).target, first)
  assert.equal(stabilizer.update(first, [first, second]).target, first)
  assert.equal(stabilizer.update(second, [first, second]).target, first)
  assert.equal(stabilizer.update(second, [first, second]).target, second)
})

test('click override changes the active target immediately', () => {
  const stabilizer = createTargetStabilizer(2)
  const first = target('first')
  const second = target('second')

  stabilizer.update(first, [first])
  assert.equal(stabilizer.click(second), second)
})
