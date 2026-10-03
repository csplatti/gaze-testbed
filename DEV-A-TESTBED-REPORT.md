# Dev A testbed verification report

Date: 2026-10-03

This report records the browser-side sandbox verification before any migration
into `mhacks`. It deliberately separates DOM-probe accuracy from webcam gaze
accuracy; the former is automated, while the latter depends on the camera,
lighting, and calibration session.

## Test conditions

- Browser: Google Chrome, local Vite development server at `localhost:5173`.
- Viewport: 1728 × 832 pixels in the observed live run.
- Camera: built-in webcam, with WebGazer's 320 × 240 diagnostic preview
  enabled.
- Calibration: 13 points (nine outer/edge points plus four inner points),
  500 ms of repeated screen-position samples per point, followed by frozen
  calibration learning.
- Coordinate convention: gaze and mouse points are viewport-local
  `clientX`/`clientY` values. DOM rectangles come from
  `getBoundingClientRect()` and are therefore viewport-local; scrolling changes
  document content rectangles while fixed elements remain viewport-relative.

## Automated results

`npm test` runs the browser-side modules against deterministic DOM fixtures.
The suite covers:

- nested heading/text/button snapping and semantic meaningful-target rules;
- modal-over-scrim precedence;
- fixed/current viewport rectangles and SVG targets;
- ignored `[data-gaze-overlay="true"]` content and `GhostLayer`;
- empty-area and one-candidate behavior;
- five-candidate bound, DOM deduplication, document-order serialization, and
  nearest-primary selection;
- 12 scripted visible targets across navbar, hero, buttons, cards, dense
  controls, form, modal, and footer;
- frame JSON round-tripping, deterministic IDs, nullable metadata, lock
  membership, and 2 KB snippet truncation;
- EMA initialization, normal movement, large-jump clamping, invalid-input
  handling, and reset.

The scripted DOM probe produced 12/12 intended primary candidates and stable
candidate lists on repeated probes. This is a DOM-probe result, not a claim
that webcam gaze is 100% accurate.

## Adaptive gaze-orb prototype

The follow-up design is represented in the testbed without changing the
production `mhacks` contracts:

- `GazeTrackingLayer` samples the latest WebGazer point on `requestAnimationFrame`
  and applies the sensitivity-controlled EMA (`smoothing: 0.25` by default).
- `GazeFrame.gaze` contains viewport-local `x`, `y`, `smoothedX`, `smoothedY`,
  `radiusPx`, and `trackedConfidence` values. An optional `onGazeFrame`
  callback is the future PM seam; the debug orb is only a sandbox
  visualization.
- The wrapper accepts the contract-shaped sensitivity settings `{ dwellMs,
  smoothing }` and updates both live; the testbed also accepts the orb radius
  bounds as local renderer configuration.
- The orb radius adapts from 90 px at high tracked confidence to 160 px at low
  confidence. Its opacity also reflects tracked confidence.
- Area queries accept an optional radius. Radius-zero queries are exact click
  overrides; normal queries rank intersecting meaningful components by orb
  overlap, center distance, element area, and document order, then serialize
  the selected candidates in document order.
- Candidates may include JSON-safe `orbOverlap` and `centerDistancePx` values.

The renderer loop is intentionally separate from the query/decision path. A
future PM integration can consume the frame stream locally while Dev B receives
only the bounded candidate set and lock events needed for decisions.

## Manual webcam observations

The live Chrome run confirmed that the face mesh, calibration overlay, raw and
smoothed gaze points, candidate outlines, dwell lock, click fallback, and JSON
frame logging all operate. The remaining webcam limitations are expected for
this sandbox: head movement can destabilize predictions, small controls are
harder than large regions, and lighting/camera placement affect accuracy. No
production 80% accuracy claim is made from this qualitative run.

For a repeatable hardware measurement, record 10–15 target attempts after a
fresh calibration and report separately:

1. raw gaze point accuracy;
2. whether the intended component was the primary candidate;
3. whether the intended component appeared in the five-candidate list; and
4. false dwell locks while reading without selecting.

## Migration boundary

`src/gaze/` is the reusable browser-side boundary. A future viewer can mount
the same layer around a different page:

```jsx
<GazeTrackingLayer>
  <WebpageViewer />
</GazeTrackingLayer>
```

The eventual `mhacks` adapters still need to provide `QueryElementAt`,
`GazeState`, calibration IPC, speech-state lock-on, source mapping, and the
production overlay integration. The testbed does not implement
`preview:queryElementAt`, `preview:setCalibration`, Electron/main-process
code, Jev decisions, file edits, Git operations, pipeline state, or production
supported-operation catalogs.

For an iframe or webview, add coordinate conversion and a page-side bridge as
an explicit adapter. Do not assume the host can inspect a cross-origin
document directly.
