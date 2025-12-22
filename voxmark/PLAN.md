# VoxMark Implementation Plan

This plan captures the complete scope and requirements for the VoxMark voice-powered PDF annotation app, including UI, offline behavior, and processing flows.

## Goals
- Create a standalone PDF annotation app that turns voice into PDF annotations using full viewport context and cross-file references.
- Keep everything in a clean, modern UI with the specified palette and minimal shadows.
- Support multi-PDF workflows, long recordings, offline capture, and batch processing.

## UI + Visual Direction
- Palette: oatmeal, earth-metal, charcoal, white-linen, dull purple, muted pink.
- Typography: expressive serif for brand + clean sans for UI (Playfair Display + Manrope).
- Subtle motion: page load fade, panel slide, mic pulse, list reveals.
- Use iconography (Phosphor) across controls for clarity and polish.
- Responsive layout: collapsible sidebar on mobile, floating mic, touch-friendly targets.
- Layout model: top global PDF toolbar, secondary annotation toolbar, left sidebar for outline/thumbnails, right overflow/settings menu.
- Visual target: macOS Preview-inspired toolbar + sidebar styling (segmented controls, frosted header), while preserving the specified palette.
- Move sidebar toggle into the sidebar header; show a floating toggle only when collapsed.
- Toggle feedback should be visual (button state/glow) instead of modal notifications.
- Use compact header layout on mobile with a minimal queue badge and no status pill.
- On mobile, move the viewer toolbar into a bottom action bar for thumb reach.
- On mobile, use icon-only actions in the bottom bar (labels hidden but accessible).
- On mobile, stack the top toolbar rows and keep core actions compact + icon-first.
- Add settings scrim blur when the settings panel is open.
- Use toasts for informational feedback; reserve modals for confirmations and destructive actions.
- Add theme switcher (light/dark/system) with full color tokens and hover variants.
- Theme toggle should be a 3-state icon clicker (system -> dark -> light -> system).

## Functional Requirements
- PDF Management
  - Load single/multiple PDFs.
  - Switch between PDFs and track active document.
  - Display annotation counts per PDF.

- Voice Input
  - Start/stop mic for long sessions.
  - Track timestamps, scroll, page indices, and active PDF per segment.
  - Support STT providers: Native, OpenAI Whisper, Anthropic (stub), Gemini (stub).
  - STT prompt field for online providers.

- Viewport Context
  - Track visible viewport bounds across multi-page view.
  - Capture visible text layer spans for accurate text anchoring.
  - Provide a visible indicator of viewport overlay when enabled.
  - Track movement within page, across pages, and across PDFs.
  - Record tap-focus pins (multiple per recording) and clear after recording ends.
  - Ensure tap focus pins are visible above the text layer and anchored correctly.

- AI Processing
  - Separate model/provider config from STT.
  - Providers: OpenAI, Anthropic, Gemini.
  - Enforce JSON response schema (annotation type/color/comment/target/contextRef).
  - Allow custom prompt append.
  - Mock AI toggle for offline/demo.
  - Chunk long recordings into context windows (viewport/time-based) to avoid oversized prompts.

- Annotation Creation
  - Highlight, underline, strikethrough, notes, bbox.
  - Use text anchor if possible; fallback to bbox or tap focus.
  - Improve text matching for two-column layouts with column-aware ordering.
  - Handle figures/tables with bbox targeting.

- Processing Modes
  - Real-time: process after mic stop.
  - Batch: queue multiple sessions; process on button.
  - UI uses a compact mode toggle (icon + label) instead of radio pills.

- Offline
  - Full offline capture: PDFs + recordings + context.
  - IndexedDB storage for unprocessed sessions.
  - Prompt to process queued sessions when online.
  - Persist PDFs, annotations, session state, and logs in IndexedDB for refresh survival.

- Export
  - Download active annotated PDF.
  - Download merged PDF.
  - Download all PDFs as ZIP.

- Manual Adjustments
  - Enter adjust mode for overlays.
  - Drag/resize bbox, snap-to-text option.
  - Commit adjustments to re-embed annotations.

- System Logs
  - Add a logs toggle in the header that opens a panel.
  - Store all processing events for the current session.
  - Render logs as expandable entries for long payloads.

- Persistence
  - LocalStorage: settings, mode, API keys.
  - IndexedDB: queued/unprocessed sessions, PDFs, annotations, session state, logs.
  - Clear processed sessions from IDB; keep annotated PDFs in IDB for restore.

- Safety
  - Reset action in danger zone with modal confirmation.
  - No native browser alerts/toasts (use custom modals).
  - Add keyboard shortcut for mic toggle on md/lg screens (e.g., M).

## Architecture / Files
- `voxmark/index.html` (structure + CDN dependencies)
- `voxmark/styles/main.css` (theme + layout + motion)
- `voxmark/js/` (modular app: core, ui, settings, pdf, annotations, ai, stt, batch, export, storage, interactions, pwa)
- `voxmark/manifest.json` + `voxmark/sw.js` (PWA support)
- `voxmark/assets/` (icons)

## Testing Checklist
- Load multiple PDFs, switch active docs, view counts.
- Record long session across pages/PDFs; stop mic to process.
- Batch queue 10+ sessions; reload and verify queue persistence.
- Offline/online transitions with queue prompt.
- Tap focus pins captured and used.
- Adjust mode drag/resize/snap and commit.
- Export single, merged, zip.
- PWA install and offline load after first visit.
## Additional UX/Behavior Notes
- Ensure mock AI bypasses API key requirements and runs without keys.
- Improve PDF load resilience; show per-file errors and indicate whether a PDF has a text layer.
- Text selection should be possible on text-layer PDFs with a visible selection highlight.
- Settings panel spacing should be consistent; avoid heavy backgrounds on unselected options.
- Replace STT provider radio pills with a dropdown, consistent with AI provider.
- Add ability to unload a PDF from the list with a confirmation when it has annotations.
- Auto-fit PDF scale to viewer width and allow trackpad/gesture zoom.
- Fix pinch zoom to avoid jumpy min/max clamps; apply smooth preview scaling.
- Remove +/- zoom buttons and numeric zoom badge; rely on pinch + scroll zoom.
- Trim long PDF filenames with ellipses to avoid sidebar horizontal scroll.
- Remove viewport overlay UI toggle; keep context capture without intrusive UI.
- Improve text selection reliability by ensuring text layers render and are selectable.
- Use PDF.js text layer APIs without deprecated parameters (`textContentSource`).
- Guard against detached ArrayBuffers during PDF restore (clone buffers safely).
- Pinch zoom uses pinch-center origin + smooth preview scaling to reduce jumps.
- Tap focus uses touch + pointer tap detection and shows a visible pin.
- Hide queue indicator when empty; keep connection label screen-reader only.
- System theme respects OS preference and updates on change.
- Render PDF link annotations and handle internal link navigation with a return popup.
- Add outline/bookmarks, thumbnails, and page search/jump UI in the sidebar.
- Search results should highlight the matching text on-page after jump.
- Render existing PDF annotations (highlights, notes, shapes) alongside link overlays.
- Handle Named, GoToR, Launch, and file attachment link actions.
- Add optional OCR (beta) for scanned pages using Tesseract.js.
- Virtualize page rendering with IntersectionObserver to avoid rendering all pages at once.
- Polish mobile UI: compact search/jump inputs, icon-only controls, and better spacing in top bar and bottom action bar.
- Ensure dropdown menus are positioned near their triggers on mobile (avoid off-screen placement).
- Make settings/logs panels scrollable on mobile with proper max-height and touch scrolling.
- Smooth pinch-zoom behavior and disable auto-fit during pinch gestures to avoid jumpy scale changes.
- Simplify mobile top bar and bottom toolbar layouts; keep mic inside the toolbar and remove redundant floating controls.
- Lighten general UI typography for a more refined, less heavy look.

## PDF Library Evaluation
### PDFium
Pros
- High‑performance rendering engine used in Chromium.
- Excellent fidelity for complex PDFs.
Cons
- Not a browser‑native JS library; typically requires WASM build + heavy setup.
- Weak out‑of‑the‑box annotation tooling in the browser without significant glue code.
- Large binary size and more complex licensing/redistribution considerations.

### React‑PDF (react-pdf.org)
Pros
- React wrapper around PDF.js; good developer ergonomics for React apps.
- Solid rendering and pagination with React components.
Cons
- React‑specific; this project is vanilla HTML/JS, so it adds unnecessary framework overhead.
- Still PDF.js underneath; text layer/annotation issues remain the same.

### pdf-lib (pdf-lib.js.org)
Pros
- Best-in-class for creating/editing/embedding annotations and writing PDFs.
- Pure JS, works offline, no native dependencies.
Cons
- Not a renderer; needs PDF.js (or another renderer) for viewport and text layer.
- No built‑in UI or selection layer.

### Recogito PDF Annotator
Pros
- UI‑focused annotations with highlight/notes workflow.
- Built on PDF.js with annotation‑centric features.
Cons
- Oriented around manual annotation; limited for voice‑driven, context‑aware pipelines.
- Less control over custom viewport/tap tracking and STT/AI flows.

### PDF.js (current renderer)
Pros
- The de‑facto browser renderer; supports text layer, zoom, and page events.
- Mature ecosystem; works offline after initial load.
Cons
- Text layer quirks require tuning for selection/anchoring.
- No built‑in annotation UI; requires custom overlay + pdf‑lib for embedding.

### Nutrient SDK (formerly PSPDFKit)
Pros
- Best‑in‑class annotation UI, text selection, viewport handling, zoom, and UX polish.
- Handles multi‑page view, comments, and a mature annotation data model.
Cons
- Commercial/paid; licensing may not fit a personal/open setup.
- Heavier bundle; vendor lock‑in.

### Article on PDF.js layers (plainenglish.io)
Pros
- Helpful conceptual guide for layers (canvas/text/annotation) in PDF.js.
Cons
- Not a library; reference only.

## Recommendation
- Keep PDF.js for rendering + viewport tracking and pdf-lib for embedding annotations.
- If a “better” renderer/UI stack is acceptable, Nutrient SDK offers the strongest out‑of‑the‑box annotation UX, but it is paid.
- For open‑source and vanilla JS, the PDF.js + pdf-lib combo remains the most viable path; focus on fixing text layer selection and overlay alignment rather than switching libraries.
