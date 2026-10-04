import webgazer from 'webgazer'

let previousFaceAnchor = null

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function readTrackedConfidence(data, headMotion) {
  if (Number.isFinite(data?.confidence)) return clamp(data.confidence, 0, 1)
  if (headMotion === null) return 0.5
  return clamp(1 - headMotion / 24, 0, 1)
}

function readHeadTracking() {
  const positions = webgazer.getTracker?.().getPositions?.()
  if (!Array.isArray(positions) || positions.length === 0) {
    previousFaceAnchor = null
    return { headPose: null, headMotion: null }
  }

  const validPositions = positions.filter((position) => (
    Array.isArray(position)
      && Number.isFinite(position[0])
      && Number.isFinite(position[1])
  ))
  if (validPositions.length === 0) {
    previousFaceAnchor = null
    return { headPose: null, headMotion: null }
  }

  const minX = Math.min(...validPositions.map((position) => position[0]))
  const maxX = Math.max(...validPositions.map((position) => position[0]))
  const minY = Math.min(...validPositions.map((position) => position[1]))
  const maxY = Math.max(...validPositions.map((position) => position[1]))
  const canvas = webgazer.getVideoElementCanvas?.()
  const videoWidth = canvas?.width || 640
  const videoHeight = canvas?.height || 480
  // Landmark 1 is the nose tip in MediaPipe FaceMesh. It is a more stable
  // head-motion anchor than the full face box, whose edges can move slightly
  // when the eyes or eyelids move. Fall back to the box center if unavailable.
  const nose = validPositions[1] ?? [
    (minX + maxX) / 2,
    (minY + maxY) / 2,
  ]
  const anchor = {
    x: clamp(nose[0] / videoWidth, 0, 1),
    y: clamp(nose[1] / videoHeight, 0, 1),
    faceWidth: clamp((maxX - minX) / videoWidth, 0, 1),
    faceHeight: clamp((maxY - minY) / videoHeight, 0, 1),
  }
  const motion = previousFaceAnchor
    ? Math.hypot(
        (anchor.x - previousFaceAnchor.x) * videoWidth,
        (anchor.y - previousFaceAnchor.y) * videoHeight,
      )
    : null
  previousFaceAnchor = anchor
  return { headPose: anchor, headMotion: motion }
}

// Keep WebGazer lifecycle and its browser-specific setup in one place. The
// sample callback is useful while diagnosing camera/face-model startup: the
// library can call its listener with null before it sees a face.
export function startWebGazer(
  onGaze,
  onSample,
  { disableMouseLearning = false, headOnly = false } = {},
) {
  previousFaceAnchor = null
  // WebGazer's package does not make these MediaPipe assets available through
  // Vite automatically. They are copied into public/mediapipe/face_mesh so
  // the model can load from a stable root-relative URL in dev and production.
  webgazer.params.faceMeshSolutionPath = '/mediapipe/face_mesh'
  // Start each sandbox run with calibration data for the current user and
  // camera position. Persistence is useful for a finished product, but makes
  // this experiment harder to reason about when calibration changes.
  webgazer.saveDataAcrossSessions(false)
  // The tracking layer owns the tunable smoothing. Avoid stacking WebGazer's
  // Kalman filter on top of the EMA, which can pull vertical motion toward the
  // middle of the screen and make the upper region feel unreachable.
  webgazer.applyKalmanFilter(false)

  // Keep WebGazer's own preview visible while diagnosing face detection. The
  // production viewer will hide these and use the host-owned overlay later.
  webgazer
    .showVideoPreview(true)
    .showVideo(true)
    // The face mesh is useful while debugging gaze, but its eye landmarks can
    // make head mode look like eye tracking. Head mode still uses the detector;
    // it simply does not render or consume the gaze-regression path.
    .showFaceOverlay(!headOnly)
    .showFaceFeedbackBox(true)
    // Use the sandbox's raw/smoothed dots instead of WebGazer's separate dot;
    // the latter can remain at its last rendered position during calibration.
    .showPredictionPoints(false)
    .setGazeListener((data, elapsedTime) => {
      const { headPose, headMotion } = readHeadTracking()
      const trackedConfidence = readTrackedConfidence(data, headMotion)
      onSample?.(data, elapsedTime, { headPose, headMotion, trackedConfidence })
      if (headOnly) return
      if (!data || !Number.isFinite(data.x) || !Number.isFinite(data.y)) return

      const prediction = { x: data.x, y: data.y }
      console.log('[WebGazer] gaze prediction', { ...prediction, elapsedTime })
      onGaze?.(prediction, elapsedTime, { headPose, headMotion, trackedConfidence })
    })

  const started = webgazer.begin()
  if (disableMouseLearning) {
    started.then(() => webgazer.removeMouseEventListeners())
  }
  return started
}

export function recordCalibrationPoint(x, y) {
  webgazer.recordScreenPosition(x, y, 'click')
}

export function stopCalibrationLearning() {
  // Keep the learned mapping fixed during gaze use. Our own click fallback
  // still works, but incidental cursor motion cannot continually retrain the
  // regression and make the screen mapping drift.
  webgazer.removeMouseEventListeners()
}

export function stopWebGazer() {
  webgazer.clearGazeListener()
  webgazer.pause()
  previousFaceAnchor = null
}
