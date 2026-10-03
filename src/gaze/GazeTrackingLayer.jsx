import { useEffect, useRef } from 'react'
import Calibration from './Calibration.jsx'
import { startWebGazer, stopWebGazer } from './webgazer.js'
import { createEmaSmoother } from './smoothing.js'
import { createDwellTracker } from './dwell.js'
import { probeArea } from './probe.js'
import { createGazeFrame } from './frame.js'
import {
  DEFAULT_SENSITIVITY,
  normalizeSensitivity,
  opacityForConfidence,
  radiusForConfidence,
} from './sensitivity.js'
import {
  ensureOverlay,
  removeOverlay,
  updateGazeOrb,
  updateHighlights,
  updateRawPoint,
  updateSmoothedPoint,
  updateStatus,
} from './overlay.js'

export default function GazeTrackingLayer({
  children,
  sensitivity = DEFAULT_SENSITIVITY,
  listening = false,
  onGazeFrame,
}) {
  const lockedTarget = useRef(null)
  const sensitivityRef = useRef(sensitivity)
  const listeningRef = useRef(listening)
  const frameCallbackRef = useRef(onGazeFrame)

  sensitivityRef.current = sensitivity
  listeningRef.current = listening
  frameCallbackRef.current = onGazeFrame

  useEffect(() => {
    let mounted = true
    let samplesSeen = 0
    let predictionsSeen = 0
    let latestSample = null
    let animationFrame = null
    const headMotionThreshold = 8
    const initialSensitivity = normalizeSensitivity(sensitivityRef.current)
    const smoother = createEmaSmoother(initialSensitivity.smoothing)
    const dwell = createDwellTracker(initialSensitivity.dwellMs)

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

    const emitFrame = (candidates, gaze, trackedConfidence) => {
      const frame = createGazeFrame({
        candidates,
        lockedTarget: lockedTarget.current,
        gaze,
        trackedConfidence,
      })
      console.log('[Gaze Testbed] GazeFrame', JSON.stringify(frame))
      frameCallbackRef.current?.(frame)
      return frame
    }

    const processSample = (sample) => {
      if (!mounted || !sample || listeningRef.current) return

      if (sample.headMotion > headMotionThreshold) {
        updateStatus({ source: 'head movement detected · hold still', target: null, locked: false })
        return
      }

      const currentSensitivity = normalizeSensitivity(sensitivityRef.current)
      smoother.setAlpha(currentSensitivity.smoothing)
      dwell.setThreshold(currentSensitivity.dwellMs)
      const smoothed = smoother.update(sample.point)
      if (!smoothed) return

      const trackedConfidence = Number.isFinite(sample.trackedConfidence)
        ? sample.trackedConfidence
        : 0.5
      const radiusPx = radiusForConfidence(trackedConfidence, currentSensitivity)

      updateRawPoint(sample.point)
      updateSmoothedPoint(smoothed)
      updateGazeOrb({
        point: smoothed,
        radiusPx,
        opacity: opacityForConfidence(trackedConfidence),
      })

      const area = probeArea(smoothed.x, smoothed.y, radiusPx)
      const target = area.primary
      const dwellState = dwell.update(target, performance.now())
      if (dwellState.changed) lockedTarget.current = null

      const isLocked = lockedTarget.current?.element === target?.element
      updateHighlights(area.candidates, isLocked ? lockedTarget.current : null, target)
      updateStatus({ source: sample.source, target, candidates: area.candidates, locked: isLocked })

      if (dwellState.lockedTarget && !isLocked) {
        lock(dwellState.lockedTarget, 'dwell', area.candidates)
      }

      emitFrame(area.candidates, {
        x: sample.point.x,
        y: sample.point.y,
        smoothedX: smoothed.x,
        smoothedY: smoothed.y,
        radiusPx,
      }, trackedConfidence)
    }

    const handleMouseMove = (event) => {
      latestSample = {
        point: { x: event.clientX, y: event.clientY },
        source: 'mouse',
        headMotion: null,
        trackedConfidence: 1,
      }
    }

    const handleClick = (event) => {
      const area = probeArea(event.clientX, event.clientY, 0)
      const target = area.primary
      if (target) lock(dwell.click(target), 'click', area.candidates)

      emitFrame(area.candidates, {
        x: event.clientX,
        y: event.clientY,
        smoothedX: event.clientX,
        smoothedY: event.clientY,
        radiusPx: 0,
      }, 1)
    }

    const renderLatestSample = () => {
      if (!mounted) return
      processSample(latestSample)
      animationFrame = window.requestAnimationFrame(renderLatestSample)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('click', handleClick, true)
    animationFrame = window.requestAnimationFrame(renderLatestSample)

    startWebGazer(
      (prediction, _elapsedTime, diagnostics) => {
        latestSample = {
          point: prediction,
          source: 'gaze',
          headMotion: diagnostics?.headMotion,
          trackedConfidence: diagnostics?.trackedConfidence,
        }
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
      if (animationFrame) window.cancelAnimationFrame(animationFrame)
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
