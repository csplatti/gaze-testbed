import test from 'node:test'
import assert from 'node:assert/strict'
import { probe, probeArea } from '../src/gaze/probe.js'
import { FakeElement, installFakeDom, rect } from './fake-dom.js'

test('snaps nested text to the nearest meaningful component root', () => {
  const heading = new FakeElement('h2', { component: 'Heading', rect: rect(10, 10, 180, 40) })
  const text = new FakeElement('span', { rect: rect(20, 20, 40, 20) })
  heading.append(text)
  const dom = installFakeDom([heading])
  dom.document.setHitStack([text, heading])

  assert.equal(probe(30, 30).componentName, 'Heading')
  dom.restore()
})

test('returns at most five nearby candidates in document order while keeping the nearest primary', () => {
  const buttons = Array.from({ length: 6 }, (_, index) => new FakeElement('button', {
    component: `Button-${index + 1}`,
    rect: rect(index * 90, 20, 50, 32),
  }))
  const dom = installFakeDom(buttons)

  const result = probeArea(450, 36)

  assert.equal(result.primary.componentName, 'Button-6')
  assert.deepEqual(
    result.candidates.map((candidate) => candidate.componentName),
    ['Button-2', 'Button-3', 'Button-4', 'Button-5', 'Button-6'],
  )
  assert.equal(new Set(result.candidates.map((candidate) => candidate.element)).size, 5)
  dom.restore()
})

test('prioritizes modal content over the scrim and page content', () => {
  const pageButton = new FakeElement('button', { component: 'PageButton', rect: rect(0, 0, 500, 500) })
  const scrim = new FakeElement('div', { component: 'Scrim', rect: rect(0, 0, 500, 500) })
  const modal = new FakeElement('section', { component: 'Modal', rect: rect(100, 100, 300, 220) })
  const close = new FakeElement('button', { component: 'CloseModalButton', rect: rect(300, 260, 70, 32) })
  modal.append(close)
  scrim.append(modal)
  const dom = installFakeDom([pageButton, scrim])
  dom.document.setHitStack([close, modal, scrim, pageButton])

  assert.equal(probe(320, 275).componentName, 'CloseModalButton')

  dom.document.setHitStack([modal, scrim, pageButton])
  assert.equal(probe(150, 150).componentName, 'Modal')
  dom.restore()
})

test('supports exact radius-zero queries and exposes spatial candidate metadata', () => {
  const first = new FakeElement('button', { component: 'First', rect: rect(0, 0, 40, 40) })
  const second = new FakeElement('button', { component: 'Second', rect: rect(70, 0, 40, 40) })
  const dom = installFakeDom([first, second])

  dom.document.setHitStack([])
  const exactMiss = probeArea(55, 20, 0)
  assert.equal(exactMiss.primary, null)
  assert.deepEqual(exactMiss.candidates, [])

  const area = probeArea(55, 20, 30)
  assert.ok(area.candidates.length > 0)
  assert.ok(area.candidates.every((candidate) => candidate.orbOverlap >= 0 && candidate.orbOverlap <= 1))
  assert.ok(area.candidates.every((candidate) => Number.isFinite(candidate.centerDistancePx)))
  dom.restore()
})

test('ignores gaze overlays and the transparent GhostLayer', () => {
  const card = new FakeElement('article', { component: 'Card-dark', rect: rect(0, 0, 300, 220) })
  const ghost = new FakeElement('div', { component: 'GhostLayer', rect: rect(0, 0, 300, 220) })
  const debugOverlay = new FakeElement('div', { gazeOverlay: true, rect: rect(0, 0, 500, 500) })
  const debugButton = new FakeElement('button', { component: 'DebugButton', rect: rect(20, 20, 40, 30) })
  debugOverlay.append(debugButton)
  const dom = installFakeDom([card, ghost, debugOverlay])

  dom.document.setHitStack([ghost, card])
  assert.equal(probe(100, 100).componentName, 'Card-dark')

  dom.document.setHitStack([debugButton, debugOverlay])
  assert.equal(probe(30, 30), null)
  dom.restore()
})

test('handles empty space, one candidate, SVG, and current viewport rectangles', () => {
  const button = new FakeElement('button', { component: 'OnlyButton', rect: rect(20, 20, 80, 30) })
  const chart = new FakeElement('svg', { component: 'Chart', rect: rect(800, 20, 140, 100) })
  const path = new FakeElement('path', { rect: rect(820, 40, 30, 30) })
  chart.append(path)
  const dom = installFakeDom([button, chart])

  dom.document.setHitStack([button])
  const one = probeArea(40, 35)
  assert.equal(one.candidates.length, 1)
  assert.equal(one.primary.componentName, 'OnlyButton')

  dom.document.setHitStack([path, chart])
  assert.equal(probe(830, 50).componentName, 'Chart')

  dom.document.setHitStack([])
  assert.deepEqual(probeArea(500, 500), { primary: null, candidates: [] })

  button._rect = rect(600, 40, 80, 30)
  dom.document.setHitStack([button])
  assert.equal(probe(620, 50).componentName, 'OnlyButton')
  dom.restore()
})
