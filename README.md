# Gaze Testbed

Dummy React app for testing the gaze + voice dev tool. No backend.

The current verification record is in
[`DEV-A-TESTBED-REPORT.md`](./DEV-A-TESTBED-REPORT.md). The reusable tracker
boundary lives in `src/gaze/`; it can wrap this demo page now and a future
webpage viewer later.

The wrapper accepts the future renderer seam without coupling the page to
WebGazer:

```jsx
<GazeTrackingLayer
  sensitivity={{ dwellMs: 500, smoothing: 0.25, minRadiusPx: 90, maxRadiusPx: 160 }}
  onGazeFrame={(frame) => pmOverlay.render(frame.gaze)}
>
  <WebpageViewer />
</GazeTrackingLayer>
```

The callback is local renderer data; candidate frames remain bounded at five
items and radius-zero queries are reserved for click overrides.

```
npm install
npm run dev     # http://localhost:5173
npm test         # deterministic probe, frame, and smoothing fixtures
```

Every component root has `data-component="Name"` (stand-in for the future DOM-to-source mapping).
Component files live in `src/components/`, so file/component lookup can be tested too.

## Edge cases covered
| Area | What it tests |
|---|---|
| Corner pins (TL/TR/BL/BR), left sidebar, bottom FAB | Gaze accuracy at screen edges and corners |
| Navbar icon row, toolbar (18px buttons, 1px gap), pagination, tag cloud | Tiny adjacent targets, disambiguation by speech |
| Hero | Large gradient block, nested badge/heading/buttons |
| Cards (light, dark, low-contrast) | Colour variety; overlay visibility on each background |
| Corner badge + `GhostLayer` (`pointer-events: none`) | Absolute positioning; hit-testing that must skip invisible layers |
| Sticky navbar, fixed dropdown and FAB | Fixed/sticky elements while scrolling |
| Modal + scrim | z-index: target the modal, not the page behind it |
| Form controls | Labels vs inputs, checkbox/radio/toggle/slider |
| Tabs, table, SVG chart, scroll box | Non-HTML (SVG) targets, nested scroll container, content swapping |
| Below-the-fold block, footer (10px text) | Scrolling, very small text |
| Paragraph with inline link/bold/code | Block vs inline granularity |

Suggested edit commands to try: "make this button bigger", "change this card to blue", "add a border to this".
