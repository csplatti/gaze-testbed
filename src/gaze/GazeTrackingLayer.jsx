import { useEffect, useRef } from 'react'
import Calibration from './Calibration.jsx'
import { startWebGazer, stopWebGazer } from './webgazer.js'
import { createEmaSmoother } from './smoothing.js'
import { createDwellTracker } from './dwell.js'
import { probeArea } from './probe.js'
import { createGazeFrame } from './frame.js'
import {
  ensureOverlay,
  removeOverlay,
  updateHighlights,
  updateRawPoint,
  updateSmoothedPoint,
  updateStatus,
} from './overlay.js'

export default function GazeTrackingLayer({ children }) {
  const lockedTarget = useRef(null)

  useEffect(() => {
    let mounted = true
    let samplesSeen = 0
    let predictionsSeen = 0
    const headMotionThreshold = 8
    const dwellMs = 500
    const smoother = createEmaSmoother(0.12)
    const dwell = createDwellTracker(dwellMs)

    ensureOverlay()
    updateStatus({ source: 'starting camera', target: null, locked: false })

    const lock = (target, source, candidates = [target]) => {
      if (!target) return
      lockedTarget.current = target
      updateHighlights(candidates, target, target)
      updateStatus({ source, target, candidates, locked: true })
      console.debug('[Gaze Testbed] target locked', {
        componentName: target.componentName,
        source,
      })
    }

    const emitFrame = (candidates) => {
      const frame = createGazeFrame({
        candidates,
        lockedTarget: lockedTarget.current,
      })
      console.log('[Gaze Testbed] GazeFrame', JSON.stringify(frame))
      return frame
    }

    const handlePoint = (point, source) => {
      if (!mounted) return

      updateRawPoint(point)
      const smoothed = smoother.update(point)
      updateSmoothedPoint(smoothed)

      const area = probeArea(smoothed.x, smoothed.y)
      const target = area.primary
      const dwellState = dwell.update(target, performance.now())
      if (dwellState.changed) {
        lockedTarget.current = null
      }

      const isLocked = lockedTarget.current?.element === target?.element
      updateHighlights(area.candidates, isLocked ? lockedTarget.current : null, target)
      updateStatus({ source, target, candidates: area.candidates, locked: isLocked })

      if (dwellState.lockedTarget && !isLocked) {
        lock(dwellState.lockedTarget, 'dwell', area.candidates)
      }

      emitFrame(area.candidates)
    }

    const handleMouseMove = (event) => {
      handlePoint({ x: event.clientX, y: event.clientY }, 'mouse')
    }

    const handleClick = (event) => {
      const area = probeArea(event.clientX, event.clientY)
      const target = area.primary
      if (target) {
        lock(dwell.click(target), 'click', area.candidates)
      }
      emitFrame(area.candidates)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('click', handleClick, true)

    startWebGazer(
      (prediction, _elapsedTime, diagnostics) => {
        if (diagnostics?.headMotion > headMotionThreshold) {
          updateStatus({ source: 'head movement detected · hold still', target: null, locked: false })
          return
        }
        handlePoint(prediction, 'gaze')
      },
      (prediction, _elapsedTime, diagnostics) => {
        samplesSeen += 1
        if (diagnostics?.headMotion > headMotionThreshold) {
          updateStatus({ source: 'head movement detected · hold still', target: null, locked: false })
          return
        }
        if (prediction && Number.isFinite(prediction.x) && Number.isFinite(prediction.y)) {
          predictionsSeen += 1
          if (predictionsSeen === 1 || predictionsSeen % 30 === 0) {
            updateStatus({
              source: `gaze active (${predictionsSeen} predictions)`,
              target: null,
              locked: false,
            })
          }
        } else if (samplesSeen % 30 === 0) {
          updateStatus({
            source: `camera ready · no face prediction (${samplesSeen} samples)`,
            target: null,
            locked: false,
          })
        }
      },
    )
      .then(() => {
        if (mounted && predictionsSeen === 0) {
          updateStatus({ source: 'camera ready · no predictions yet', target: null, locked: false })
        }
      })
      .catch((error) => {
        console.error('[Gaze Testbed] WebGazer could not start', error)
        if (mounted) {
          updateStatus({
            source: `camera error: ${error?.name ?? 'unknown'}`,
            target: null,
            locked: false,
          })
        }
      })

    return () => {
      mounted = false
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('click', handleClick, true)
      stopWebGazer()
      removeOverlay()
    }
  }, [])

  return (
    <>
      <Calibration />
      {children}
    </>
  )
}
