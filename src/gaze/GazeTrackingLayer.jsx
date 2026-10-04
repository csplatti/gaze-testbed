import { useEffect, useRef } from 'react'
import Calibration from './Calibration.jsx'
import { startWebGazer, stopWebGazer } from './webgazer.js'
import { startHeadTracking } from './headLandmarker.js'
import { createEmaSmoother } from './smoothing.js'
import { createDwellTracker } from './dwell.js'
import { createTargetStabilizer } from './stabilizer.js'
import { createHeadCursor, DEFAULT_HEAD_TRACKING } from './headCursor.js'
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
  trackingMode = 'head',
  headTracking = DEFAULT_HEAD_TRACKING,
  listening = false,
  onGazeFrame,
}) {
  const lockedTarget = useRef(null)
  const sensitivityRef = useRef(sensitivity)
  const trackingModeRef = useRef(trackingMode)
  const headTrackingRef = useRef(headTracking)
  const listeningRef = useRef(listening)
  const frameCallbackRef = useRef(onGazeFrame)

  sensitivityRef.current = sensitivity
  trackingModeRef.current = trackingMode
  headTrackingRef.current = headTracking
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
    const headCursor = createHeadCursor(headTrackingRef.current)
    const dwell = createDwellTracker(initialSensitivity.dwellMs)
    const targetStabilizer = createTargetStabilizer(2)
    const selectionIntervalMs = 1000 / 24
    let lastSelectionAt = Number.NEGATIVE_INFINITY
    let lastCandidates = []
    let stableTarget = null
    let latestCursor = null

    ensureOverlay()
    updateStatus({
      source: trackingModeRef.current === 'head' ? 'starting head tracking' : 'starting camera',
      target: null,
      locked: false,
    })

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

      const activeMode = trackingModeRef.current
      if (activeMode === 'gaze' && sample.headMotion > headMotionThreshold) {
        updateStatus({ source: 'head movement detected · hold still', target: null, locked: false })
        return
      }

      const currentSensitivity = normalizeSensitivity(sensitivityRef.current)
      smoother.setAlpha(currentSensitivity.smoothing)
      headCursor.setSmoothing(currentSensitivity.smoothing)
      dwell.setThreshold(currentSensitivity.dwellMs)
      let rawPoint = sample.point
      let smoothed = null
      if (activeMode === 'head') {
        const cursor = headCursor.map(sample.headPose, {
          width: window.innerWidth,
          height: window.innerHeight,
        })
        if (!cursor) return
        rawPoint = cursor.rawPoint
        smoothed = cursor.point
      } else {
        smoothed = smoother.update(sample.point)
        if (!smoothed) return
      }

      const trackedConfidence = Number.isFinite(sample.trackedConfidence)
        ? sample.trackedConfidence
        : 0.5
      const radiusPx = radiusForConfidence(trackedConfidence, currentSensitivity)

      updateRawPoint(rawPoint)
      updateSmoothedPoint(smoothed)
      updateGazeOrb({
        point: smoothed,
        radiusPx,
        opacity: opacityForConfidence(trackedConfidence),
      })
      latestCursor = { rawPoint, point: smoothed, radiusPx, trackedConfidence }

      const now = performance.now()
      if (now - lastSelectionAt >= selectionIntervalMs) {
        lastSelectionAt = now
        const area = probeArea(smoothed.x, smoothed.y, radiusPx)
        lastCandidates = area.candidates
        const stabilized = targetStabilizer.update(area.primary, area.candidates)
        stableTarget = stabilized.target
        const dwellState = dwell.update(stableTarget, now)
        if (stabilized.changed) lockedTarget.current = null

        const isLocked = lockedTarget.current?.element === stableTarget?.element
        updateHighlights(lastCandidates, isLocked ? lockedTarget.current : null, stableTarget)
        updateStatus({ source: sample.source, target: stableTarget, candidates: lastCandidates, locked: isLocked })

        if (dwellState.lockedTarget && !isLocked) {
          lock(dwellState.lockedTarget, 'dwell', lastCandidates)
        }
      }

      emitFrame(lastCandidates, {
        x: rawPoint.x,
        y: rawPoint.y,
        smoothedX: smoothed.x,
        smoothedY: smoothed.y,
        radiusPx,
      }, trackedConfidence)
    }

    const handleMouseMove = (event) => {
      if (trackingModeRef.current !== 'gaze') return
      latestSample = {
        point: { x: event.clientX, y: event.clientY },
        source: 'mouse',
        headMotion: null,
        trackedConfidence: 1,
      }
    }

    const handleClick = (event) => {
      if (trackingModeRef.current === 'head') {
        activateCurrentTarget('click')
        return
      }

      const area = probeArea(event.clientX, event.clientY, 0)
      lastCandidates = area.candidates
      stableTarget = targetStabilizer.click(area.primary)
      if (stableTarget) {
        lock(dwell.click(stableTarget), 'click', lastCandidates)
      } else {
        lockedTarget.current = null
        dwell.reset()
      }
      updateHighlights(lastCandidates, stableTarget, stableTarget)

      emitFrame(lastCandidates, {
        x: event.clientX,
        y: event.clientY,
        smoothedX: event.clientX,
        smoothedY: event.clientY,
        radiusPx: 0,
      }, 1)
    }

    const activateCurrentTarget = (source) => {
      if (!stableTarget) return
      lock(dwell.click(stableTarget), source, lastCandidates)
      if (!latestCursor) return
      emitFrame(lastCandidates, {
        x: latestCursor.rawPoint.x,
        y: latestCursor.rawPoint.y,
        smoothedX: latestCursor.point.x,
        smoothedY: latestCursor.point.y,
        radiusPx: latestCursor.radiusPx,
      }, latestCursor.trackedConfidence)
    }

    const handleKeyDown = (event) => {
      if (trackingModeRef.current === 'head' && event.key.toLowerCase() === 'r') {
        const anchor = latestSample?.headPose
        const centered = headCursor.recenter(anchor, {
          width: window.innerWidth,
          height: window.innerHeight,
        })
        if (!centered) {
          updateStatus({ source: 'head tracking · no face to recenter', target: stableTarget, candidates: lastCandidates, locked: false })
          return
        }
        stableTarget = null
        lockedTarget.current = null
        targetStabilizer.reset()
        dwell.reset()
        latestCursor = null
        updateHighlights([], null, null)
        updateStatus({ source: 'head tracking · recentered', target: null, locked: false })
        return
      }

      if (trackingModeRef.current === 'head' && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault()
        activateCurrentTarget('keyboard')
      }
    }

    const renderLatestSample = () => {
      if (!mounted) return
      processSample(latestSample)
      animationFrame = window.requestAnimationFrame(renderLatestSample)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('click', handleClick, true)
    window.addEventListener('keydown', handleKeyDown)
    animationFrame = window.requestAnimationFrame(renderLatestSample)

    let headTracker = null
    if (trackingModeRef.current === 'head') {
      headTracker = startHeadTracking((headPose, diagnostics) => {
        samplesSeen += 1
        latestSample = {
          point: null,
          source: 'head',
          headPose,
          headMotion: null,
          trackedConfidence: diagnostics?.trackedConfidence ?? (headPose ? 1 : 0),
        }
        if (headPose) {
          predictionsSeen += 1
          if (predictionsSeen === 1 || predictionsSeen % 30 === 0) {
            updateStatus({
              source: `head tracking active (${predictionsSeen} face samples) · press R to recenter`,
              target: null,
              locked: false,
            })
          }
        } else if (samplesSeen % 30 === 0) {
          updateStatus({
            source: `camera ready · no face detected (${samplesSeen} samples)`,
            target: null,
            locked: false,
          })
        }
      })
      headTracker.ready
        .then(() => {
          if (mounted) {
            updateStatus({ source: 'head camera ready · look at the camera', target: null, locked: false })
          }
        })
        .catch((error) => {
          console.error('[Gaze Testbed] Face Landmarker could not start', error)
          if (mounted) {
            updateStatus({
              source: `camera error: ${error?.name ?? 'unknown'}`,
              target: null,
              locked: false,
            })
          }
        })
    } else {
      startWebGazer(
        (prediction, _elapsedTime, diagnostics) => {
          latestSample = {
            point: prediction,
            source: 'gaze',
            headPose: diagnostics?.headPose,
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
    }

    return () => {
      mounted = false
      if (animationFrame) window.cancelAnimationFrame(animationFrame)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('click', handleClick, true)
      window.removeEventListener('keydown', handleKeyDown)
      headTracker?.stop()
      if (trackingModeRef.current === 'gaze') stopWebGazer()
      removeOverlay()
    }
  }, [])

  return (
    <>
      {trackingMode === 'gaze' ? <Calibration /> : null}
      {children}
    </>
  )
}
