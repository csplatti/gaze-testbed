import webgazer from 'webgazer'

let previousFaceAnchor = null

function readHeadMotion() {
  const positions = webgazer.getTracker?.().getPositions?.()
  const anchor = positions?.[1]
  if (!anchor) {
    previousFaceAnchor = null
    return null
  }

  const motion = previousFaceAnchor
    ? Math.hypot(anchor[0] - previousFaceAnchor[0], anchor[1] - previousFaceAnchor[1])
    : null
  previousFaceAnchor = { x: anchor[0], y: anchor[1] }
  return motion
}

// Keep WebGazer lifecycle and its browser-specific setup in one place. The
// sample callback is useful while diagnosing camera/face-model startup: the
// library can call its listener with null before it sees a face.
export function startWebGazer(onGaze, onSample) {
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
    .showFaceOverlay(true)
    .showFaceFeedbackBox(true)
    // Use the sandbox's raw/smoothed dots instead of WebGazer's separate dot;
    // the latter can remain at its last rendered position during calibration.
    .showPredictionPoints(false)
    .setGazeListener((data, elapsedTime) => {
      const headMotion = readHeadMotion()
      onSample?.(data, elapsedTime, { headMotion })
      if (!data || !Number.isFinite(data.x) || !Number.isFinite(data.y)) return

      const prediction = { x: data.x, y: data.y }
      console.log('[WebGazer] gaze prediction', { ...prediction, elapsedTime })
      onGaze?.(prediction, elapsedTime, { headMotion })
    })

  return webgazer.begin()
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
