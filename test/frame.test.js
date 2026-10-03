import test from 'node:test'
import assert from 'node:assert/strict'
import { createGazeFrame } from '../src/gaze/frame.js'
import { FakeElement, installFakeDom, rect } from './fake-dom.js'

test('creates a deterministic, JSON-safe frame and round-trips it', () => {
  const longHTML = `<button>${'x'.repeat(2100)}</button>`
  const button = new FakeElement('button', {
    component: 'PrimaryButton',
    source: 'src/components/Hero.jsx',
    rect: rect(10, 20, 100, 40),
    outerHTML: longHTML,
  })
  const dom = installFakeDom([button])

  const frame = createGazeFrame({
    candidates: [
      { ...buttonTarget(button), selector: '' },
      { ...buttonTarget(button), selector: '' },
    ],
    lockedTarget: buttonTarget(button),
  })

  assert.equal(frame.candidates.length, 1)
  assert.equal(frame.candidates[0].id, 'c0')
  assert.equal(typeof frame.candidates[0].selector, 'string')
  assert.equal(frame.candidates[0].outerHTMLSnippet.length, 2048)
  assert.equal(frame.candidates[0].htmlTruncated, true)
  assert.deepEqual(frame.candidates[0].boundingRect, { x: 10, y: 20, width: 100, height: 40 })
  assert.equal(frame.lockedTarget.id, 'c0')
  assert.deepEqual(JSON.parse(JSON.stringify(frame)), frame)
  assert.equal(JSON.stringify(frame).includes('FakeElement'), false)
  dom.restore()
})

test('does not serialize a lock that is outside the current candidate list', () => {
  const first = new FakeElement('button', { component: 'First', rect: rect(0, 0, 20, 20) })
  const second = new FakeElement('button', { component: 'Second', rect: rect(30, 0, 20, 20) })
  const dom = installFakeDom([first, second])

  const frame = createGazeFrame({
    candidates: [buttonTarget(first)],
    lockedTarget: buttonTarget(second),
  })

  assert.equal(frame.lockedTarget, null)
  dom.restore()
})

test('does not mark an exactly 2 KB snippet as truncated', () => {
  const exactHTML = 'x'.repeat(2048)
  const element = new FakeElement('div', {
    component: 'ExactSnippet',
    rect: rect(0, 0, 10, 10),
    outerHTML: exactHTML,
  })
  const dom = installFakeDom([element])

  const frame = createGazeFrame({ candidates: [buttonTarget(element)] })

  assert.equal(frame.candidates[0].outerHTMLSnippet.length, 2048)
  assert.equal(frame.candidates[0].htmlTruncated, false)
  dom.restore()
})

function buttonTarget(element) {
  return {
    element,
    componentName: element.dataset.component,
    boundingRect: element.getBoundingClientRect(),
  }
}
