export const DEFAULT_SENSITIVITY = Object.freeze({
  dwellMs: 500,
  smoothing: 0.25,
  minRadiusPx: 90,
  maxRadiusPx: 160,
})

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

export function normalizeSensitivity(value = DEFAULT_SENSITIVITY) {
  const source = typeof value === 'number' ? { smoothing: value } : value ?? {}
  const minRadiusPx = Number.isFinite(source.minRadiusPx)
    ? Math.max(0, source.minRadiusPx)
    : DEFAULT_SENSITIVITY.minRadiusPx
  const maxRadiusPx = Number.isFinite(source.maxRadiusPx)
    ? Math.max(minRadiusPx, source.maxRadiusPx)
    : DEFAULT_SENSITIVITY.maxRadiusPx

  return {
    dwellMs: clamp(
      Number.isFinite(source.dwellMs) ? source.dwellMs : DEFAULT_SENSITIVITY.dwellMs,
      300,
      600,
    ),
    smoothing: clamp(
      Number.isFinite(source.smoothing) ? source.smoothing : DEFAULT_SENSITIVITY.smoothing,
      0.05,
      0.8,
    ),
    minRadiusPx,
    maxRadiusPx,
  }
}

export function radiusForConfidence(trackedConfidence, sensitivity = DEFAULT_SENSITIVITY) {
  const normalized = normalizeSensitivity(sensitivity)
  const confidence = clamp(Number.isFinite(trackedConfidence) ? trackedConfidence : 0, 0, 1)
  return Math.round(
    normalized.maxRadiusPx - confidence * (normalized.maxRadiusPx - normalized.minRadiusPx),
  )
}

export function opacityForConfidence(trackedConfidence) {
  const confidence = clamp(Number.isFinite(trackedConfidence) ? trackedConfidence : 0, 0, 1)
  return 0.2 + confidence * 0.65
}
