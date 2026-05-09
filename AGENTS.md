# AGENTS.md — Video Clipper

> Guide for AI agents building this project. Read this before making any changes.

---

### Editing This File

**CRITICAL: Never edit `AGENTS.md` directly.** Direct edits cause KV cache invalidation and token reprocessing, which is extremely slow.

Instead:
1. `cp AGENTS.md AGENTS.new.md` — copy to a working file
2. Edit `AGENTS.new.md` with all required changes
3. `mv AGENTS.new.md AGENTS.md` — replace the original

This applies to every edit session, even single-line changes.

---

## Project Summary

Desktop app for clipping video files to create training data for video diffusion models. Electron + React + TypeScript + Tailwind CSS + shadcn/ui (Base UI primitives). Uses ffmpeg for all video operations.

**See PRD.md** for full feature specifications, UI layouts, and technical requirements.

---

## Architecture

### Directory Structure

```
src/
├── shared/                    # Cross-process types and utilities
│   ├── constants.ts           # SETTINGS_KEYS
│   ├── ipc.ts                 # IPC channel names, IPCPayloads, IPCReturns
│   ├── types.ts               # Domain types (VideoInfo, ClipResult, ConvertSettings, GalleryFile, etc.)
│   └── utils.ts               # Pure utilities (formatTime, formatCounter, getCaptionPath, getThumbnailPath, etc.)
├── main/                      # Electron main process
│   ├── index.ts               # Window creation, app lifecycle, CSP, remote debugging
│   ├── ipc-handlers.ts        # Thin IPC route delegates → services
│   ├── ffmpeg.ts              # Pure command builders (buildClipCommand, buildConvertCommand, buildThumbnailCommand)
│   ├── constants.ts           # VIDEO_EXTENSIONS
│   ├── db.ts                  # JSON config file persistence
│   ├── utils.ts               # Main-process utilities (safeUnlink, ensureDir, deleteFileWithMetadata)
│   └── services/
│       ├── ffmpeg-executor.ts # Shared runFfmpeg (child_process spawn)
│       ├── ffprobe.service.ts # getVideoInfo, checkFfmpeg
│       ├── clip.service.ts    # Clip operations (counter, naming, validation)
│       ├── convert.service.ts # Bulk conversion orchestration
│       ├── gallery.service.ts # File scanning, thumbnail caching
│       ├── caption.service.ts # Caption file CRUD
│       └── auto-caption.service.ts # Sequential LLM auto-captioning
├── preload/
│   └── index.ts               # ContextBridge (types from @shared/ipc)
├── renderer/                  # React frontend
│   ├── index.tsx              # Entry point
│   ├── App.tsx                # Root component, tab routing, debug helpers
│   ├── components/
│   │   ├── TopBar.tsx         # Tab bar + action buttons + drag-drop overlay
│   │   ├── VideoPlayer.tsx    # Main video player with inline controls
│   │   ├── VolumeControl.tsx  # Mute button + volume slider
│   │   ├── GalleryView.tsx    # Grid of clipped videos
│   │   ├── GalleryItem.tsx    # Single gallery card (thumb + caption overlay)
│   │   ├── ExpandedPlayer.tsx # Full player for gallery items
│   │   ├── CaptionEditor.tsx  # Text area with debounced autosave
│   │   ├── CaptionOverlay.tsx # Inline caption overlay for gallery cells
│   │   ├── BulkConvertDrawer.tsx # Slide-out drawer for bulk conversion
│   │   ├── DeleteConfirmModal.tsx # Confirmation modal for deletion
│   │   ├── AutoCaptionDrawer.tsx # Slide-out drawer for LLM API settings
│   │   ├── BulkEditDrawer.tsx    # Slide-out drawer for bulk caption editing
│   │   └── ui/                # shadcn/ui components (all Base UI primitives)
│   │       ├── button.tsx, select.tsx, sheet.tsx, tabs.tsx, sonner.tsx
│   │       ├── input.tsx, input-group.tsx, textarea.tsx, slider.tsx
│   │       ├── dialog.tsx, label.tsx, card.tsx, progress.tsx
│   │       ├── field.tsx, button-group.tsx, separator.tsx
│   ├── hooks/
│   │   ├── useVideoPlayer.ts             # Playback state (play/pause/seek/mute/volume)
│   │   ├── useVideoKeyboardShortcuts.ts  # Global keyboard shortcuts (Space, M, arrows, Escape)
│   │   ├── useGallery.ts                 # Gallery file scanning & state
│   │   ├── useLoadVideo.ts               # Shared video loading (getVideoInfo → SET_VIDEO → SET_TAB)
│   │   └── useDebouncedCallback.ts       # Shared debounced callback wrapper
│   ├── lib/utils.ts           # cn function
│   ├── store/app-state.tsx    # Central state (context + useReducer)
│   │   └── caption-store.tsx  # Reactive caption cache with debounced persistence (0.5s)
│   └── styles/globals.css     # Tailwind + ZFlow theme (dark-first)
└── env.d.ts                   # ElectronAPI interface (derived from @shared/ipc)
```

### Design Principles

- **Shared layer** (`src/shared/`) — all cross-process types. No barrel files, explicit imports only.
- **Service layer** — business logic in `src/main/services/`. IPC handlers are thin delegates.
- **ffmpeg** — pure command builder (`ffmpeg.ts`) + separate executor (`ffmpeg-executor.ts`).
- **State** — React context + `useReducer`. No external state libs.
- **Settings** — JSON config file in main process, accessed via IPC.
- **UI primitives** — Base UI (`@base-ui/react`) exclusively. Never `@radix-ui/react-*`.
- **No `any` in IPC** — everything typed from `src/shared/ipc.ts`.

### App State

Managed in `src/renderer/store/app-state.tsx` via context + `useReducer`:

| State | Type | Description |
|-------|------|-------------|
| `activeTab` | `'video' \| 'gallery'` | Current tab |
| `currentVideo` | `VideoState \| null` | Video loaded in Video tab (preserved across tab switches) |
| `clipLength` | `number` | Default clip duration in seconds (persisted via settings) |
| `convertCodec` | `string` | Video codec for bulk convert (persisted via settings) |
| `convertWidth` | `number` | Target width for bulk convert (persisted via settings) |
| `convertHeight` | `number` | Target height for bulk convert (persisted via settings) |
| `convertFps` | `number` | Target frame rate for bulk convert (persisted via settings) |
| `convertBitrate` | `string` | Target bitrate for bulk convert (persisted via settings) |
| `galleryFiles` | `GalleryFile[]` | Scanned output files |
| `selectedFiles` | `Set<string>` | Files selected for bulk ops |
| `expandedFile` | `string \| null` | Gallery file in expanded player (reset on tab switch) |
| `isConverting` | `boolean` | Bulk conversion in progress |
| `convertProgress` | `number` | Conversion progress percentage |
| `isConvertDrawerOpen` | `boolean` | Bulk convert drawer visibility |
| `isAutoCaptionDrawerOpen` | `boolean` | Auto-caption settings drawer visibility |
| `isAutoCaptioning` | `boolean` | Auto-caption in progress |
| `isBulkEditDrawerOpen` | `boolean` | Bulk edit drawer visibility |
| `currentTime` | `number` | Current playback position |

**Key behaviors:**
- `SET_TAB` resets `expandedFile` (closes expanded player on tab switch)
- `SET_VIDEO` resets `currentTime` to 0 (new video = start from beginning)
- `ExpandedPlayer` does NOT dispatch `SET_VIDEO` (prevents overwriting Video tab state)
- `VideoPlayer` uses `useGlobalState: true` only when no `filePath` prop (i.e. Video tab mode)

### IPC Channels

17 channels defined in `src/shared/ipc.ts`. `ElectronAPI` in `env.d.ts` derives types from `IPCPayloads`/`IPCReturns`.

| Channel | Direction | Payload | Returns |
|---------|-----------|---------|---------|
| `clip:create` | R→M | `{ inputPath, outputPath, start, duration }` | `{ success, outputPath?, error? }` |
| `convert:bulk` | R→M | `{ files[], settings, outputDir }` | `{ success, results? }` |
| `convert:progress` | M→R | `{ file, progress, status }` | — |
| `convert:warn-no-changes` | M→R | — | — |
| `auto-caption:run` | R→M | `{ files[], config: { baseUrl, model, apiKey } }` | `{ success, results? }` |
| `auto-caption:progress` | M→R | `{ file, current, total, status }` | — |
| `auto-caption:interrupt` | R→M | — | `{ cancelled }` |
| `fs:get-video-info` | R→M | `{ filePath }` | `{ duration, width, height, codec, fps }` |
| `fs:extract-thumbnail` | R→M | `{ filePath, outputPath }` | `{ success, outputPath? }` |
| `fs:read-caption` | R→M | `{ filePath }` | `{ content?, exists }` |
| `fs:write-caption` | R→M | `{ filePath, content }` | `{ success }` |
| `fs:scan-outputs` | R→M | `{}` | `{ files: GalleryFile[] }` |
| `fs:delete-clip` | R→M | `{ filePath }` | `{ success, error? }` |
| `fs:bulk-delete` | R→M | `{ paths: string[] }` | `{ success, errors: string[] }` |
| `app:open-file` | R→M | `{}` | `{ filePath?, cancelled }` |
| `settings:get` | R→M | `{ key }` | `{ value? }` |
| `settings:set` | R→M | `{ key, value }` | `{ success }` |

### Path Aliases

`@renderer/*` → `src/renderer/`, `@main/*` → `src/main/`, `@preload/*` → `src/preload/`, `@shared/*` → `src/shared/`

### UI Primitives

All shadcn/ui components use **Base UI** (`@base-ui/react`) via `"style": "base-nova"` in `components.json`.

| Component | Primitive |
|-----------|-----------|
| Button | `@base-ui/react/button` |
| Select | `@base-ui/react/select` |
| Sheet | `@base-ui/react/dialog` |
| Tabs | `@base-ui/react/tabs` |
| Input | `@base-ui/react/input` |
| Slider | `@base-ui/react/slider` |
| Dialog | `@base-ui/react/dialog` |
| Label | `@base-ui/react/label` |
| Textarea | native `<textarea>` |
| Card | native `<div>` |
| Sonner | `sonner` (independent) |
| InputGroup | custom composition (Input + Button + Textarea wrappers) |
| Field | custom composition (Label + Separator primitives) |
| Progress | native `<div>` with ARIA |
| ButtonGroup | custom composition (div + Separator) |
| Separator | `@base-ui/react/separator` |

When adding new shadcn components, use `base-nova` style. Never use `@radix-ui/react-*`.

### Build

Vite 8 + `vite-plugin-electron`. Outputs to `dist/`:
- `dist/main/index.js` — Main process (ESM, Node.js built-ins externalized)
- `dist/preload/index.js` — Preload (**CommonJS**, `lib.formats: ['cjs']`)
- `dist/index.html` + `dist/assets/` — Bundled React app

**Critical:** Node.js built-ins must be in `rollupOptions.external` (Rolldown wraps them in a `__require()` shim that fails in ESM). Electron imports must use `import electron from 'electron'` + destructuring (CJS module).

**Window creation:** Show immediately (no `show: false` + `ready-to-show`). No `sandbox: true`. Call `Menu.setApplicationMenu(null)`. Dev detection: `process.env.NODE_ENV === 'development'` only (NOT `!app.isPackaged`).

**Dev mode:** App loads from `dist/` in both dev and production (not Vite dev server). This avoids CORS issues with `file://` resources.

### Theme & Toast

Pano Neu theme (tweakcn), dark-first (`:root` = dark, `.light` = light override). Sonner toasts use `toastOptions` on `<Toaster>` for dark styling — never CSS selectors like `[data-style='default']`.

### Commands

```
npm start           # Build + run Electron (loads from dist/)
npm run start:debug # Build + run with --remote-debugging-port=9222
npm run dev         # Vite dev server only (HMR, no Electron)
npm run build       # Type check + Vite build
npm run lint:fix    # Auto-fix ESLint
npm run typecheck   # tsc --noEmit
```

Pre-commit: lint-staged → typecheck → lint → build (all must pass).

---

## ffmpeg Commands

**Clipping** (re-encode for accurate frame-level clipping):
```
ffmpeg -y -i <INPUT> -ss <START> -t <DURATION> <OUTPUT>
```
`-ss` AFTER `-i` for frame-accurate seeking. Re-encoding is used instead of stream copy because stream copy cannot decode frames between keyframes, causing missing content at the clip start.

**Bulk conversion** (omit params for "Same as source"):
```
ffmpeg -y -i <INPUT> [-vf "scale=W:H:force_original_aspect_ratio=increase,crop=W:H,minterpolate=fps=X:mi_mode=mci"] [-c:v <CODEC>] [-b:v <BITRATE>] -c:a copy <OUTPUT>
```
Resolution: scales up to cover target, crops excess. Framerate: uses motion-compensated frame interpolation (`minterpolate`). Both combine into a single `-vf` argument. If all params are "Same as source", copy file directly.

**Thumbnail:**
```
ffmpeg -y -i <INPUT> -frames:v 1 -q:v 2 <OUTPUT>.jpg
```

---

## Electron MCP Debug Guide

> **Use `electron-mcp-server`, NOT chrome-devtools MCP.**

### Debug Workflow

1. **Kill**: `pkill -9 electron` (always `-9`, not `-f`)
2. **Build**: `npm run build`
3. **Launch (background only)**: `npm run start:debug > /dev/null 2>&1 &`
   - **CRITICAL**: Must be background launch with redirect. Never chain with `&&` or run foreground — it will block the shell and get killed by timeout.
4. **Wait** 3-5 seconds
5. **Verify**: `electron_get_electron_window_info` → expect `"automationReady": true`
   - If fails, check `curl -s http://127.0.0.1:9222/json/version`

### Restart Mid-Session

1. `pkill -9 electron`
2. `npm run start:debug > /dev/null 2>&1 &` (background, no chaining)
3. Wait 3-5s, verify port 9222
4. If MCP still says "Not connected" despite port up → MCP server was killed, ask user to reload

### Troubleshooting

| Symptom | Fix |
|---------|-----|
| "No Electron applications found" | `npm run start:debug > /dev/null 2>&1 &` |
| "Not connected" (port 9222 up) | Ask user to reload electron MCP |
| Port 9222 down | Rebuild + relaunch |

### Loading Video

Use `window.__loadVideo(filePath)` (debug helper in `App.tsx`), not the file dialog:
```
electron_send_command_to_electron → "eval" → { code: "window.__loadVideo('/path/to/video.mp4')" }
```

Other helpers: `__setVideoTime(t)`, `__getVideoTime()`, `__seekAndWait(t)`. Test video: `sample_video.mp4`.

### Navigation

Prefer `electron_send_command_to_electron` with `get_page_structure` + `click_by_text` over screenshots. Use `electron_take_screenshot` only for visual validation.

---

## Implementation Status

### Auto-caption Feature (Complete)

**Milestone: Implementation complete, tested with reasoning models**

#### Completed
| Component | File | Status |
|-----------|------|--------|
| Service | `src/main/services/auto-caption.service.ts` | ✅ Created, supports reasoning + non-reasoning models |
| IPC handlers | `src/main/ipc-handlers.ts` | ✅ Added 3 handlers |
| Shared types | `src/shared/types.ts` | ✅ Added `AutoCaptionProgress`, `AutoCaptionResult` |
| IPC channels | `src/shared/ipc.ts` | ✅ Added 3 channels with payloads/returns |
| Settings key | `src/shared/constants.ts` | ✅ Added `AUTO_CAPTION_CONFIG` |
| State | `src/renderer/store/app-state.tsx` | ✅ Added `isAutoCaptioning` state + action |
| Settings drawer | `src/renderer/components/AutoCaptionDrawer.tsx` | ✅ Created (Sheet, always mounted) |
| Gallery button group | `src/renderer/components/TopBar.tsx` | ✅ Added Auto-caption + LLM API Settings buttons (refresh first) |
| Expanded player button | `src/renderer/components/ExpandedPlayer.tsx` | ✅ Added Auto-caption button |
| App wiring | `src/renderer/App.tsx` | ✅ Progress toast, config loading, handlers |
| Preload | `src/preload/index.ts` | ✅ Added 3 methods |
| ElectronAPI | `src/env.d.ts` | ✅ Added 3 methods |
| Gallery caption data | `src/main/services/gallery.service.ts` | ✅ `scanOutputs()` includes caption field |
| Gallery caption prop | `src/renderer/components/GalleryItem.tsx` | ✅ Accepts caption prop, re-syncs on update |
| Build | — | ✅ Passes typecheck, lint, build |

### Auto-caption Toast (Complete)

**Milestone: Implementation complete — progress toast with Sonner default styling**

#### Implementation
| Component | File | Description |
|-----------|------|-------------|
| Progress toast rendering | `src/renderer/App.tsx` | Uses `toast.loading()` with component, `duration: Infinity`, fixed ID |
| Toast dismissal | `src/renderer/App.tsx` | Only dismisses when `current === total` (all files done), not per-file |
| Completion toasts | `src/renderer/App.tsx` | Success: "Auto-captioned n clips" (info); Failure: "Auto-caption failed for n clips" (error) |

**Design notes:**
- Progress toast uses `toast.loading()` (not `toast()`) to support `duration: Infinity` — `toast()` with JSX ignores the duration option
- Toast dismissal only triggers when `data.current === data.total` to avoid premature dismissal when per-file `done` events fire rapidly
- Uses fixed toast ID (`AUTO_CAPTION_TOAST_ID` const) — no ref tracking needed since `toast.dismiss()` is idempotent
- Progress toast component is a standalone exported component, reused via `toast.loading()`

#### Tested
| Feature | Status |
|---------|--------|
| Gallery UI renders with Auto-caption button | ✅ Verified |
| Button disabled when no files selected | ✅ Verified |
| Button enabled when files selected | ✅ Verified |
| Settings drawer opens on ellipsis click | ✅ Verified |
| Drawer transition (in/out) | ✅ Verified |
| Bulk auto-caption execution | ✅ Verified |
| Progress toast visible and updating | ✅ Verified |
| Toast only dismissed when all files done | ✅ Verified |
| Completion toasts (success/failure) | ✅ Verified |
| Expanded player auto-caption | ✅ Verified |
| Reasoning model support (reasoning_content fallback) | ✅ Verified |
| Caption refresh on gallery update | ✅ Verified |

### Video Keyboard Shortcuts (Complete)

**Milestone: Implementation complete**

#### Implementation
| Component | File | Description |
|-----------|------|-------------|
| Hook | `src/renderer/hooks/useVideoKeyboardShortcuts.ts` | Shared keyboard shortcut handler |
| VideoPlayer | `src/renderer/components/VideoPlayer.tsx` | Calls hook, passes playback callbacks |
| ExpandedPlayer | `src/renderer/components/ExpandedPlayer.tsx` | Inherits shortcuts via VideoPlayer |
| VolumeControl | `src/renderer/components/VolumeControl.tsx` | Receives `volume` prop for UI sync |
| useVideoPlayer | `src/renderer/hooks/useVideoPlayer.ts` | Added `getVolume`, `getCurrentTime` |

#### Keyboard Shortcuts
| Key | Action | Scope |
|-----|--------|-------|
| `Space` | Toggle play/pause | Video tab + ExpandedPlayer |
| `M` | Toggle mute | Video tab + ExpandedPlayer |
| `←` / `→` | Seek ±1 second | Video tab + ExpandedPlayer |
| `↑` / `↓` | Volume ±0.1 | Video tab + ExpandedPlayer |
| `Escape` | Close expanded player | ExpandedPlayer only |

**Design notes:**
- All shortcuts registered via `window.addEventListener('keydown', ..., { capture: true })` — fires before native video element behavior
- `isInputFocused()` guard prevents shortcuts when text input/textarea is focused
- Volume tracking uses `useRef` in the hook + `volume` prop in VolumeControl for UI sync
- Seeking uses percentage of duration (2%) instead of fixed seconds for consistent experience across videos of any length

### Caption Store (Complete)

**Milestone: Implementation complete — single source of truth with reactive updates**

#### Implementation
| Component | File | Description |
|-----------|------|-------------|
| Store | `src/renderer/store/caption-store.tsx` | Reactive cache (Map), debounced persistence (500ms), `ensureLoaded()` lazy reads, `caption:changed` IPC listener |
| Provider | `src/renderer/App.tsx` | Wrapped with `CaptionStoreProvider` |
| GalleryItem | `src/renderer/components/GalleryItem.tsx` | Uses `store.getCapon/setCaption` directly, `ensureLoaded()` on mount |
| ExpandedPlayer | `src/renderer/components/ExpandedPlayer.tsx` | Uses `store.getCaption/setCaption` directly, `ensureLoaded()` on mount |
| CaptionOverlay | `src/renderer/components/CaptionOverlay.tsx` | Calls `onSave` (→ `store.setCaption`) |

#### Deleted
| File | Reason |
|------|--------|
| `src/renderer/hooks/useCaption.ts` | Replaced by direct store usage |
| `src/renderer/hooks/useDebouncedCaptionSave.ts` | Store handles debounce internally |

**Design notes:**
- Store is the single source of truth — components never maintain local caption state
- Built-in debounced persistence (500ms) — no separate debounce hooks needed
- Listens for `caption:changed` IPC events to stay in sync with main process (auto-caption, other tabs)
- `ensureLoaded()` provides lazy disk reads on first access

### Bulk Edit (Complete)

**Milestone: Implementation complete**

#### Implementation
| Component | File | Description |
|-----------|------|-------------|
| Drawer | `src/renderer/components/BulkEditDrawer.tsx` | Slide-out drawer with two sections (prepend/append + search/replace) |
| State | `src/renderer/store/app-state.tsx` | Added `isBulkEditDrawerOpen` state + action |
| Button | `src/renderer/components/TopBar.tsx` | Added Bulk Edit button with FilePenLine icon |
| App wiring | `src/renderer/App.tsx` | Mounted BulkEditDrawer component |

**Design notes:**
- Two sections: (1) text prepend/append with "Insert only if not found" checkbox, (2) search/replace
- Prepend/Append are immediate action buttons (each applies to all selected files), no radio toggle
- Search/Replace uses exact string replacement via `String.split().join()`
- No toast notifications for bulk edit operations
- Uses direct IPC `readCaption`/`writeCaption` calls per file
- Caption updates propagate reactively via `caption:changed` IPC events → caption store
- Button disabled when no files selected
