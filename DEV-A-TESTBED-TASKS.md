# Dev A — Gaze Testbed Tasks

This checklist covers only the browser-side work that belongs in
`/Users/corbinplatti_school/Documents/GitHub/gaze-testbed` before migrating the
gaze client into `mhacks`.

The testbed is a validation sandbox, not the production shell. Keep production
IPC, Jev, editing, Git, PM-owned overlays, and `mhacks` contract changes out of
this repo.

## Goal

Make the testbed prove a reliable, JSON-safe gaze probe that can later be
adapted to the frozen `@mhacks/contracts` interfaces:

```text
gaze point
  -> smoothing
  -> DOM probe and snap
  -> deterministic candidate list
  -> JSON-safe frame
  -> dwell/click target lock
```

## Tasks

### 1. Preserve the sandbox baseline

- [x] Work on a dedicated testbed branch; do not modify `mhacks` contracts from
      this repo.
- [x] Confirm the testbed starts with `npm install` and `npm run dev`.
- [x] Keep the WebGazer dependency and MediaPipe assets isolated here until the
      final app's licensing and asset strategy are reviewed.
- [x] Record the current browser, camera, viewport, and calibration setup used
      for manual testing.

### 2. Make probing deterministic

- [x] Keep `document.elementsFromPoint(x, y)` as the first probe source.
- [x] Ignore invisible elements and all descendants of
      `[data-gaze-overlay="true"]`.
- [x] Replace the implicit component lookup with an explicit, documented
      meaningful-element/snap rule. Include headings, paragraphs, buttons,
      inputs, sections, cards, and other intended block-level targets.
- [x] Deduplicate candidates by DOM element.
- [x] Return no more than five candidates.
- [x] Preserve deterministic document order in the serialized candidate list.
      Use distance only to choose the primary candidate or as an internal
      ranking signal; do not use distance to reorder the final list.
- [x] Make the empty-area and one-candidate cases explicit and stable.
- [x] Keep the existing edge-case coverage working: modals, fixed elements,
      SVG, nested text, small controls, scrolling, and the ignored ghost layer.

### 3. Make frame serialization contract-shaped

- [x] Ensure every serialized candidate has JSON-safe values only: no DOM
      nodes, `DOMRect`s, functions, Maps, or undefined fields.
- [x] Keep candidate IDs deterministic within one frame (`c0`, `c1`, ...).
- [x] Always emit a string `selector` value, even when it is only a debug
      selector.
- [x] Emit `{x, y, width, height}` plain objects for bounding rectangles.
- [x] Truncate `outerHTMLSnippet` to 2KB and set `htmlTruncated` correctly.
- [x] Keep `componentName` and `filePath` nullable rather than inventing
      values.
- [x] Keep `supportedOps` empty in the sandbox unless a testbed-local fixture
      explicitly exercises a future catalog; do not invent production token
      names here.
- [x] Serialize a frame with `JSON.stringify` and parse it back successfully.
- [x] Verify that `lockedTarget` references one of the serialized candidates or
      is `null`.

### 4. Harden smoothing and tracking signals

- [x] Keep the smoother as a standalone module with no DOM or React imports.
- [x] Test the initial sample, normal movement, large jumps, reset, and
      non-finite input behavior.
- [x] Confirm that smoothing reduces jitter without making targets unusably
      laggy.
- [x] Keep head-motion detection as a diagnostic/unstable-tracking signal; it
      must not silently retarget a candidate.
- [x] Keep WebGazer lifecycle cleanup reliable when the wrapper unmounts.
- [x] Confirm camera failure still leaves the click path usable.

### 5. Make lock and click behavior reliable

- [x] Keep dwell locking near 500ms for the sandbox experiment.
- [x] Reset dwell timing when the primary target changes.
- [x] Do not lock from a single noisy sample.
- [x] Make click override immediately lock the clicked target.
- [x] Confirm clicks still work with the camera disabled or WebGazer rejected.
- [x] Keep the current debug overlay clearly marked as temporary; it is not the
      production PM overlay.

### 6. Add focused tests and fixtures

- [x] Add probe fixtures for:
      - nested heading/text/button elements;
      - adjacent small controls;
      - modal over scrim/page content;
      - ignored overlay and ghost layer;
      - empty space and off-target points;
      - scrolling and fixed-position elements.
- [x] Test deterministic ordering for the same DOM and point.
- [x] Test candidate count bounds and deduplication.
- [x] Test frame JSON round-tripping.
- [x] Test snippet truncation at and above 2KB.
- [x] Test smoother reset and large-jump handling.
- [x] Test click override without a camera.
- [x] Add a lightweight manual test page or fixture for calibration state
      transitions if automated camera testing is impractical.

### 7. Measure the sandbox behavior

- [x] Define a scripted set of 10–15 visible target elements covering the
      hero, navbar, buttons, cards, small controls, modal, and footer.
- [x] Record whether the intended component is the primary candidate for each
      target.
- [x] Record candidate-list accuracy separately from raw gaze accuracy.
- [ ] Measure dwell false-fire behavior while reading the page without trying
      to select anything.
- [x] Record the test conditions and results in a small markdown report.
- [x] Do not claim the production 80% target until the method and sample count
      are written down.

### 8. Prepare the migration boundary

- [x] Keep the reusable browser-side modules separated from testbed page
      components.
- [x] Ensure the gaze wrapper can eventually mount around a different preview
      page without importing page-specific components.
- [x] Document the coordinate assumptions: viewport-local `clientX`/`clientY`,
      scroll behavior, and any future webview coordinate conversion.
- [x] Document the agreed overlay ignore attribute:
      `[data-gaze-overlay="true"]`.
- [x] List the remaining production adapters needed in `mhacks`:
      `QueryElementAt`, `GazeState`, calibration IPC, speech-state lock-on,
      source mapping, and production overlay integration.
- [x] Do not add imports from `@mhacks/contracts` unless the integration plan
      explicitly creates a supported package boundary; the final implementation
      will adapt to the contracts inside `mhacks`.

## Not testbed work

Do not implement these here:

- [ ] `preview:queryElementAt` or `preview:setCalibration` IPC handlers.
- [ ] Electron/main-process code or Dev C's response envelopes.
- [ ] Speech event subscriptions owned by the production shell.
- [ ] Jev decisions, intent classification, routing, or edit requests.
- [ ] File edits, Git operations, undo commits, or pipeline state.
- [ ] The PM-owned production highlight overlay.
- [ ] The production `data-source` Vite/Babel plugin for the template repo.
- [ ] Production `supportedOps` catalogs or design-token ownership.

## Definition of ready to migrate

The testbed is ready to hand off when:

- [x] Mouse-driven probing is reliable across the documented edge cases.
- [x] The same probe produces deterministic, JSON-safe frames every time.
- [x] Candidate ordering, bounds, IDs, rectangles, and snippets are verified.
- [x] Dwell and click locking work with and without a camera.
- [x] Smoothing and head-motion behavior are manually verified.
- [ ] Accuracy and false-fire measurements are recorded.
- [x] The remaining production adapters are documented rather than hidden in
      testbed code.

At that point, migrate the reusable tracker/probe modules into the `mhacks`
renderer and implement the production adapters against
`packages/contracts/src/gaze.ts` and `packages/contracts/src/ipc.ts`.
