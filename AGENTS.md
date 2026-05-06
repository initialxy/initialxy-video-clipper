# AGENTS.md — Video Clipper

> Guide for AI agents building this project. Read this before making any changes.

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
│   │   ├── AutoCaptionModal.tsx # Dialog for auto-caption endpoint settings
│   │   └── ui/                # shadcn/ui components (all Base UI primitives)
│   │       ├── button.tsx, select.tsx, sheet.tsx, tabs.tsx, sonner.tsx
│   │       ├── input.tsx, input-group.tsx, textarea.tsx, slider.tsx
│   │       ├── dialog.tsx, label.tsx, card.tsx
│   ├── hooks/
│   │   ├── useVideoPlayer.ts  # Playback state (play/pause/seek/mute/volume)
│   │   ├── useGallery.ts      # Gallery file scanning & state
│   │   ├── useCaption.ts      # Caption CRUD with debounced save
│   │   ├── useConvertSettings.ts # Bulk conversion settings (load/save/reset)
│   │   ├── useLoadVideo.ts    # Shared video loading (getVideoInfo → SET_VIDEO → SET_TAB)
│   │   └── useDebouncedCallback.ts # Shared debounced callback wrapper
│   ├── lib/utils.ts           # cn function
│   ├── store/app-state.tsx    # Central state (context + useReducer)
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
| `galleryFiles` | `GalleryFile[]` | Scanned output files |
| `selectedFiles` | `Set<string>` | Files selected for bulk ops |
| `expandedFile` | `string \| null` | Gallery file in expanded player (reset on tab switch) |
| `isConverting` | `boolean` | Bulk conversion in progress |
| `convertProgress` | `number` | Conversion progress percentage |
| `isConvertDrawerOpen` | `boolean` | Bulk convert drawer visibility |
| `isAutoCaptioning` | `boolean` | Auto-caption in progress |
| `autoCaptionProgress` | `{ current: number; total: number }` | Auto-caption progress (current/total) |
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

**Clipping** (stream copy, no re-encode):
```
ffmpeg -i <INPUT> -ss <START> -t <DURATION> -c copy -avoid_negative_ts make_zero <OUTPUT>
```
`-ss` AFTER `-i` for frame-accurate seeking.

**Bulk conversion** (omit params for "Same as source"):
```
ffmpeg -i <INPUT> [-vf "scale=W:H:force_original_aspect_ratio=decrease,crop=W:H"] [-c:v <CODEC>] [-r <FPS>] [-b:v <BITRATE>] -c:a copy <OUTPUT>
```
If all params are "Same as source", copy file directly.

**Thumbnail:**
```
ffmpeg -i <INPUT> -frames:v 1 -q:v 2 <OUTPUT>.jpg
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
