import test from 'node:test'
import assert from 'node:assert/strict'
import { probeArea } from '../src/gaze/probe.js'
import { FakeElement, installFakeDom, rect } from './fake-dom.js'

test('scripted 12-target probe set keeps the intended component primary', () => {
  const targets = [
    'Navbar', 'HeroHeading', 'PrimaryButton', 'Cards',
    'Card-light', 'Card-dark', 'ToolButton-1', 'PageButton-5',
    'NameInput', 'Modal', 'CloseModalButton', 'Footer',
  ].map((componentName, index) => new FakeElement('button', {
    component: componentName,
    rect: rect((index % 4) * 180, Math.floor(index / 4) * 120, 120, 40),
  }))
  const dom = installFakeDom(targets)

  const measurements = targets.map((target) => {
    const targetRect = target.getBoundingClientRect()
    dom.document.setHitStack([target])
    const first = probeArea(targetRect.x + 10, targetRect.y + 10)
    const second = probeArea(targetRect.x + 10, targetRect.y + 10)
    assert.equal(first.primary.componentName, target.dataset.component)
    assert.deepEqual(
      first.candidates.map((candidate) => candidate.componentName),
      second.candidates.map((candidate) => candidate.componentName),
    )
    assert.ok(first.candidates.length >= 1 && first.candidates.length <= 5)
    return {
      target: target.dataset.component,
      primary: first.primary.componentName,
      candidateCount: first.candidates.length,
      candidateListStable: true,
    }
  })

  assert.equal(measurements.filter(({ target, primary }) => target === primary).length, 12)
  dom.restore()
})
