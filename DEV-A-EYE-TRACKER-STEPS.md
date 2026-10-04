# Dev A: Temporary Eye-Tracker Sandbox

Use `/Users/corbinplatti_school/Documents/GitHub/gaze-testbed` as a temporary
sandbox for understanding gaze coordinates, DOM probing, and component
highlighting. Do not change the main `mhacks` contracts until this basic loop
works.

## Goal

Build this loop inside the testbed:

```text
WebGazer point
  -> smoothed (x, y)
  -> DOM elements in a local area
  -> 2–5 meaningful component candidates
  -> temporary candidate outlines
```

The first success condition is:

> Moving the mouse or eyes over the testbed consistently outlines the correct
> local group of `data-component` candidates, with the nearest candidate
> identified as primary.

## Steps

### 1. Create a sandbox branch

```bash
cd /Users/corbinplatti_school/Documents/GitHub/gaze-testbed
git switch -c gaze-experiment
git status
```

Preserve any existing changes, especially the current `package-lock.json`
change.

### 2. Install and run the testbed

```bash
npm install
npm run dev
```

Open the local Vite URL, normally `http://localhost:5173`.

### 3. Install the tracking packages

```bash
npm install @mediapipe/tasks-vision webgazer
```

The default head mode imports MediaPipe Face Landmarker directly:

```js
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
```

Keep WebGazer isolated to the explicit `trackingMode="gaze"` comparison path.
The default head mode uses the MediaPipe task's camera stream, normalized face
landmarks, and neutral-pose mapping. Before distributing the final app, review
the selected package licenses with the team.

### 4. Add a gaze experiment folder

Create:

```text
src/gaze/
├── GazeTrackingLayer.jsx
├── headLandmarker.js
├── webgazer.js
├── headCursor.js
├── smoothing.js
├── probe.js
├── frame.js
└── overlay.js
```

Keep these modules independent from the main `mhacks` source tree.

### 5. Start the tracker

Create the tracking boundary before wiring the page behavior. The testbed
should mount its page through a reusable wrapper:

```jsx
<GazeTrackingLayer>
  <TestbedPage />
</GazeTrackingLayer>
```

`GazeTrackingLayer` owns the sandbox's camera-tracker lifecycle, head/gaze
mapping, smoothing, dwell locking, click/keyboard activation, and calls to the probe.
Keep the temporary debug overlay behind that boundary. The page components
should not import WebGazer or know how coordinates are produced.

Inside that wrapper or its controller, head mode:

1. Create a `FaceLandmarker` in `VIDEO` mode.
2. Read normalized face landmarks from `detectForVideo(...)`.
3. Map a stable nose/head anchor to the viewport.
4. Stop the camera stream and landmarker when the component unmounts.

The legacy gaze comparison path still calls `webgazer.begin()` and registers
`webgazer.setGazeListener(...)`.

Initially, hide the camera preview and prediction dot if they distract from
the test. Add a visible debug dot yourself so the raw gaze point is obvious.

### Calibration checkpoint (before DOM targeting)

WebGazer can report that the camera is ready before it has enough regression
data to produce gaze coordinates. Complete the sandbox's multi-point calibration
before expecting predictions:

1. Look at the yellow calibration point.
2. Click that point.
3. Repeat for all calibration points across the page, including near the
   corners and viewport edges.
4. Wait for the status to change from `no face prediction` to `gaze active`.
5. After calibration completes, freeze the mapping so ordinary cursor motion
   cannot retrain it and cause drift.

The green face box confirms face detection; it does not by itself mean that a
screen-coordinate prediction is available. Keep this calibration step
sandbox-only for now. The production `mhacks` version will report its
calibration state through the gaze contract.

The default testbed mode is now head tracking, which does not need the
screen-point regression calibration. The first stable face position becomes the
neutral head position, then movement maps to a viewport-local cursor. Press `R`
to recenter after changing posture or camera placement. Use
`trackingMode="gaze"` when testing the calibrated eye-prediction path above.

### 6. Add a debug gaze dot

Create a fixed-position circle that moves to the latest `(x, y)` coordinate.
This verifies that the tracker is producing coordinates before DOM targeting is
added.

Remember:

- `x` is pixels from the left of the viewport.
- `y` is pixels from the top of the viewport.

### 7. Implement `probe(x, y)`

The probe should:

1. Call `document.elementsFromPoint(x, y)`.
2. Ignore invisible or irrelevant elements.
3. Ignore the debug/highlight layer itself.
4. Find the nearest meaningful ancestor with `data-component`.
5. Rank meaningful component roots by distance from the gaze point.
6. Return the five nearest candidates and their bounding rectangles, with the
   exact hit or nearest candidate as primary. The query may accept an adaptive
   `radiusPx`; use `radiusPx: 0` for click overrides.

The testbed already has many useful attributes, for example:

```html
<h1 data-component="HeroHeading">...</h1>
<button data-component="PrimaryButton">...</button>
```

### 8. Add temporary candidate outlines

Create fixed-position outline elements and update them from the local
candidates' `getBoundingClientRect()` values. Use a stronger outline for the
primary candidate and lighter outlines for nearby candidates. This makes the
uncertainty visible instead of implying pixel-level accuracy.

The outline should be for debugging only. It will eventually be replaced by
the PM/UI-owned gaze overlay.

The adaptive-orb prototype also exposes an optional `onGazeFrame` seam. The
sandbox renders a soft orb for debugging, while the production PM layer should
own that rendering and use the frame's `gaze` values.

### 9. Test with the mouse first

Before using eye tracking, feed `mousemove` coordinates into `probe(x, y)`.

Verify that:

- Buttons appear as local candidate targets, with the nearest button primary.
- Nested text snaps to its component root.
- The `GhostLayer` is ignored.
- Modals are selected instead of content behind them.
- Small controls and cards appear in the local candidate group.

This separates DOM-probing bugs from eye-tracking bugs.

### 10. Add smoothing

Keep the most recent 5–10 points and average them, or use an exponential
moving average. Compare the raw debug dot with the smoothed point.

Use the sensitivity-controlled `smoothing` value, defaulting to `0.25` in the
adaptive-orb prototype, and tune it against visible jitter and target lag.
WebGazer's Kalman filter remains disabled here so the rAF loop owns the EMA.
The same sensitivity setting controls the adaptive radius (90–160 px by
default) so smoothing and spatial forgiveness remain one user-facing knob.
The same sensitivity object may also provide `dwellMs` (default `500`) so the
lock threshold can be tuned without changing the tracking wrapper.
The adaptive-orb wrapper keeps rendering at display rate but throttles DOM
selection to 24 Hz and requires two consecutive wins before switching targets;
clicks bypass that hysteresis.

### 10a. Head-pointer mode

Head mode reduces the face mesh to a normalized face-box center, rather than
using the noisy eye-to-screen regression. `headCursor.js` maps displacement
from a stable neutral anchor, applying a deadzone, verticalGain, horizontalGain,
horizontal camera mirroring, and the same sensitivity-controlled EMA. Brief
face-detector dropouts preserve the anchor. The resulting screen point enters
the existing orb, nearby-component query, dwell, lock, and `GazeFrame` path.
Enter/Space or a mouse click confirms the current highlighted target; `R`
recenters the neutral head position.

The runtime prefers the central nose landmark as the head anchor so eye and
eyelid movement does not directly drive the cursor.

### 11. Add snapping

If the gaze lands on a nested `<span>`, `<em>`, SVG child, or other small
element, walk upward until a meaningful component is found.

Use the existing `data-component` attribute as the temporary component
identity. Do not use CSS selectors as the long-term join key.

### 12. Add dwell locking

Track the selected component and the time when the gaze entered it.

Start with a dwell threshold of approximately `500ms`. Log a message when the
component becomes locked.

Do not lock based on a single noisy gaze sample.

### 13. Add click fallback

On click:

1. Read `event.clientX` and `event.clientY`.
2. Call `probe(x, y)`.
3. Lock the selected component immediately.

The click path must work even if the camera is unavailable.

### 14. Convert the result to a `GazeFrame`

Only after the temporary highlighting loop works, shape the result like the
main repository contract:

```ts
{
  candidates: [{
    id: "c0",
    selector: "...",
    componentName: "HeroHeading",
    filePath: null,
    boundingRect: { x, y, width, height },
    outerHTMLSnippet: "...",
    htmlTruncated: false,
    confidence: 0.5,
    trackedConfidence: 0.5,
    supportedOps: []
  }],
  lockedTarget: null,
  gaze: {
    x: 0,
    y: 0,
    smoothedX: 0,
    smoothedY: 0,
    radiusPx: 90,
    trackedConfidence: 0.5
  },
  capturedAt: Date.now()
}
```

Candidates may additionally carry JSON-safe `orbOverlap` and
`centerDistancePx` values. Select spatially, then restore document order before
serializing the bounded list.

For this temporary experiment, `filePath` may be `null` and `supportedOps`
may be an empty array. Source mapping and edit catalogs come later.

Log each created frame as `JSON.stringify(frame)` while validating the
handoff. The console output should contain no DOM nodes, `DOMRect` objects,
functions, or other browser-only values.

### 15. Preserve the wrapper boundary for the eventual webpage viewer

As the loop becomes more complete, keep the same wrapper boundary ready for
the eventual webpage viewer:

```jsx
<GazeTrackingLayer>
  <WebpageViewer />
</GazeTrackingLayer>
```

The modules in `src/gaze/` should remain reusable behind the wrapper rather
than becoming entangled with the demo page's components. This is an
architecture to continue using, not a refactor to postpone until after the
sandbox is complete.

When this behavior moves into `mhacks`, preserve Dev A's ownership seam:

- Dev A's gaze client produces a JSON-safe `GazeFrame` from `(x, y)`.
- The webpage-side probe owns DOM inspection and source/component metadata.
- The PM/UI layer owns the production highlight overlay.
- Dev B owns pipeline state and decisions; Dev C owns IPC response plumbing.
- The gaze client does not edit files, render the production overlay, mutate
  pipeline state, or import another team's source tree.

The wrapper is therefore an extraction boundary, not a reason to move
production overlay or orchestration responsibilities into the gaze client.
For an iframe or webview, leave coordinate conversion and the page bridge as
an explicit adapter boundary; do not assume the host can inspect a
cross-origin document directly.

## Verification checklist

- [ ] WebGazer produces gaze coordinates.
- [ ] Calibration completes and the status reports active predictions.
- [ ] Mouse coordinates can drive the same probe logic.
- [ ] The correct `data-component` gets outlined.
- [ ] The debug overlay is not selected as a target.
- [ ] Smoothing reduces visible jitter.
- [ ] Head movement is surfaced as an unstable-tracking state instead of
      retargeting unpredictably.
- [ ] Dwell locking works around 500ms.
- [ ] Click override selects the clicked component immediately.
- [ ] Modals, fixed elements, SVG, small controls, and scrolling behave
      acceptably.
- [ ] The temporary result can be serialized with `JSON.stringify`.
- [ ] The sandbox integration can be extracted behind a tracking-wrapper
      boundary without moving production overlay or orchestration ownership
      into the gaze client.

## Do not implement yet

- Jev decisions.
- Code editing or file writes.
- Git operations.
- The production IPC channel.
- The final PM-owned overlay.
- `data-source` injection or full source-file mapping.

Those belong in the main `mhacks` integration after the sandbox behavior is
understood and reliable.
