import { useEffect, useState } from 'react'
import { updateStatus } from './overlay.js'
import { recordCalibrationPoint, stopCalibrationLearning } from './webgazer.js'

const POINTS = [
  // Outer samples teach the model the viewport boundaries.
  [8, 8], [50, 8], [92, 8],
  [8, 50], [50, 50], [92, 50],
  [8, 92], [50, 92], [92, 92],
  // Inner samples reduce the jump between the center and the edges.
  [25, 25], [75, 25], [25, 75], [75, 75],
]

export default function Calibration() {
  const [index, setIndex] = useState(0)
  const [capturing, setCapturing] = useState(false)
  const [captureTimer, setCaptureTimer] = useState(null)

  useEffect(() => () => {
    if (captureTimer) window.clearInterval(captureTimer)
  }, [captureTimer])

  if (index >= POINTS.length) return null

  const [left, top] = POINTS[index]

  const handleClick = () => {
    if (capturing) return

    setCapturing(true)
    updateStatus({ source: `capturing calibration ${index + 1}/${POINTS.length}`, target: null, locked: false })

    const startedAt = performance.now()
    const timer = window.setInterval(() => {
      // The user should keep looking at the point while these samples are
      // captured. Multiple samples are more useful than one noisy click.
      recordCalibrationPoint(window.innerWidth * left / 100, window.innerHeight * top / 100)
      if (performance.now() - startedAt >= 500) {
        window.clearInterval(timer)
        setCaptureTimer(null)
        setCapturing(false)
        const nextIndex = index + 1
        setIndex(nextIndex)
        if (nextIndex >= POINTS.length) stopCalibrationLearning()
        updateStatus({
          source: nextIndex >= POINTS.length
            ? 'calibration complete · model frozen'
            : `calibration ${nextIndex}/${POINTS.length}`,
          target: null,
          locked: false,
        })
      }
    }, 50)
    setCaptureTimer(timer)
  }

  return (
    <div
      data-gaze-overlay="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2147483646,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: '72px',
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '6px 10px',
          borderRadius: '5px',
          background: 'rgba(10, 10, 10, .88)',
          color: '#fff',
          font: '13px/1.3 system-ui, sans-serif',
        }}
      >
        Look at the yellow point, hold your gaze, then click it ({index + 1}/{POINTS.length})
      </div>
      <button
        type="button"
        aria-label={`Calibration point ${index + 1} of ${POINTS.length}`}
        onClick={handleClick}
        style={{
          position: 'absolute',
          left: `${left}%`,
          top: `${top}%`,
          width: '30px',
          height: '30px',
          transform: 'translate(-50%, -50%)',
          padding: 0,
          border: '3px solid #fff',
          borderRadius: '50%',
          background: '#f8bd46',
          boxShadow: '0 0 0 2px #0a0a0a, 0 0 18px #f8bd46',
          cursor: 'crosshair',
          pointerEvents: 'auto',
          opacity: capturing ? 0.55 : 1,
        }}
      />
    </div>
  )
}
