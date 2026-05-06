# AGENTS.md — Video Clipper

> Guide for AI agents building this project. Read this before making any changes.

---

## Project Summary

A desktop app for clipping video files to create training data for video diffusion models. Built with Electron + React + TypeScript + Tailwind CSS. Uses ffmpeg for all video operations.

**See PRD.md** for full feature specifications, UI layouts, and technical requirements.

---

## Architecture

### Directory Structure

```
video-clipper/
├── outputs/                    # Clipped video output (runtime)
├── converted/                  # Bulk-converted output (runtime)
├── src/
│   ├── shared/                 # Shared types and utilities (main + preload + renderer)
│   │   ├── ipc.ts              # IPC channel names, payload types, return types
│   │   ├── types.ts            # Domain types (VideoInfo, ClipResult, ConvertSettings, GalleryFile)
│   │   └── utils.ts            # Pure utilities (time formatting, path helpers, counter formatting)
│   ├── main/                   # Electron main process (Node.js)
│   │   ├── index.ts            # Window creation, app lifecycle, CSP headers, Menu.setApplicationMenu(null)
│   │   ├── ipc-handlers.ts     # IPC route registration (thin delegates to services)
│   │   ├── ffmpeg.ts           # ffmpeg command builder (pure functions, no side effects)
│   │   ├── constants.ts        # VIDEO_EXTENSIONS, SETTINGS_KEYS
│   │   ├── db.ts               # JSON config file persistence (node:sqlite unavailable in Electron)
│   │   └── services/           # Business logic layer
│   │       ├── ffmpeg-executor.ts    # Shared runFfmpeg executor (spawns child_process)
│   │       ├── ffprobe.service.ts    # getVideoInfo, checkFfmpeg (ffprobe parsing)
│   │       ├── clip.service.ts       # Clip operations (counter, naming, validation)
│   │       ├── convert.service.ts    # Bulk conversion orchestration
│   │       ├── gallery.service.ts    # File scanning, thumbnail caching
│   │       └── caption.service.ts    # Caption file CRUD
│   ├── preload/
│   │   └── index.ts            # Context bridge for safe IPC (types from @shared/ipc)
│   ├── renderer/               # React frontend
│   │   ├── index.tsx           # Renderer entry point
│   │   ├── App.tsx             # Root component with tab routing
│   │   ├── components/
│   │   │   ├── TopBar.tsx              # Tab bar (left) + action buttons (right) + drag-drop
│   │   │   ├── VideoPlayer.tsx         # Main video player with inline playback controls
│   │   │   ├── VolumeControl.tsx       # Mute button + volume slider
│   │   │   ├── GalleryView.tsx         # Grid of clipped videos with thumbnails
│   │   │   ├── GalleryItem.tsx         # Single gallery card (thumb + caption overlay)
│   │   │   ├── ExpandedPlayer.tsx      # Full-screen video player for gallery items
│   │   │   ├── CaptionEditor.tsx       # Text area with debounced autosave
│   │   │   ├── CaptionOverlay.tsx      # Inline caption overlay for gallery grid cells
│   │   │   ├── BulkConvertDrawer.tsx   # Slide-out drawer for bulk conversion settings
│   │   │   ├── Toast.tsx               # Toast notification system
│   │   │   └── DeleteConfirmModal.tsx  # Confirmation modal for clip deletion
│   │   ├── components/ui/              # shadcn/ui components (all Base UI primitives)
│   │   │   ├── button.tsx              # Button (default, outline, secondary, ghost, destructive, link)
│   │   │   ├── select.tsx              # Select dropdown
│   │   │   ├── sheet.tsx               # Sheet (Base UI dialog, BulkConvertDrawer side pane, confirmation modals)
│   │   │   ├── drawer.tsx              # Drawer (vaul, unused — replaced by Sheet)
│   │   │   ├── tabs.tsx                # Tabs
│   │   │   ├── sonner.tsx              # Toast notifications
│   │   │   ├── input.tsx               # Text input
│   │   │   ├── textarea.tsx            # Multi-line text input
│   │   │   ├── slider.tsx              # Range slider
│   │   │   ├── dialog.tsx              # Modal dialog
│   │   │   ├── progress.tsx            # Progress indicator
│   │   │   ├── label.tsx               # Form label
│   │   │   └── card.tsx                # Card container
│   │   ├── hooks/
│   │   │   ├── useVideoPlayer.ts       # Playback state management (play/pause/seek/mute)
│   │   │   ├── useClipCounter.ts       # Per-source clip counter tracking
│   │   │   ├── useGallery.ts           # Gallery file scanning & state
│   │   │   ├── useCaption.ts           # Caption CRUD with debounced save
│   │   │   ├── useConvertSettings.ts   # Bulk conversion settings (load/save/reset)
│   │   │   └── useToast.ts             # Toast notification management
│   │   ├── lib/
│   │   │   └── utils.ts                # Utility (cn function)
│   │   ├── store/
│   │   │   └── app-state.tsx           # Central state (active tab, current video, clip length, etc.)
│   │   └── styles/
│   │       └── globals.css             # Tailwind base + ZFlow theme (dark-first)
│   └── env.d.ts                # Type declarations (vite/client, CSS modules, ElectronAPI derived from @shared/ipc)
├── index.html                  # Root HTML entry point
├── vite.config.ts              # Vite build config (renderer + electron plugin)
├── tsconfig.json               # TypeScript configuration
├── eslint.config.js            # ESLint flat config (shared TS rules + per-context globals)
├── .prettierrc                 # Prettier config with tailwindcss plugin
├── components.json             # shadcn/ui configuration
├── .husky/pre-commit           # Pre-commit hook (lint-staged → typecheck → lint → build)
├── .gitignore
├── package.json
├── PRD.md
└── AGENTS.md
```

### Process Model

```
┌─────────────────────────────────────────────┐
│           Electron Main Process             │
│                                             │
│  - Window management                        │
│  - IPC handlers (clip, convert, fs ops)     │
│  - ffmpeg child process spawning            │
│  - File system access                       │
│  - JSON config file settings persistence    │
│  - ffmpeg availability check on launch      │
└──────────────┬──────────────────────────────┘
               │ IPC (contextBridge)
┌──────────────▼──────────────────────────────┐
│           Electron Renderer Process         │
│                                             │
│  - React UI tree (tab-based navigation)     │
│  - HTML5 <video> playback                   │
│  - User input handling                      │
│  - State management                         │
└─────────────────────────────────────────────┘
```

### Architecture Design

#### Shared Types Layer (`src/shared/`)

All types used across process boundaries live here. This eliminates duplication between preload, main, and renderer.

- **`ipc.ts`** — IPC channel names, payload types, return types.
- **`types.ts`** — Domain types (`VideoInfo`, `ClipResult`, `ConvertSettings`, `GalleryFile`, `ConvertResult`, `ConvertProgress`).
- **`utils.ts`** — Pure utilities usable by any process (time formatting `MM:SS.xx`, file path helpers, counter formatting, `getCaptionPath`, `getThumbnailPath`).

No barrel files (`index.ts` re-exports) — explicit imports only.

#### Main Process Service Layer

```
src/main/
├── index.ts          # Window creation, app lifecycle, CSP headers, Menu.setApplicationMenu(null)
├── ipc-handlers.ts   # IPC route registration (thin delegates to services)
├── ffmpeg.ts         # ffmpeg command builder (pure functions, no side effects)
├── constants.ts      # VIDEO_EXTENSIONS, SETTINGS_KEYS
├── db.ts             # JSON config file persistence (node:sqlite unavailable in Electron)
└── services/
    ├── ffmpeg-executor.ts    # Shared runFfmpeg executor (spawns child_process)
    ├── ffprobe.service.ts    # getVideoInfo, checkFfmpeg (ffprobe parsing)
    ├── clip.service.ts       # Clip operations (counter, naming, validation)
    ├── convert.service.ts    # Bulk conversion orchestration
    ├── gallery.service.ts    # File scanning, thumbnail caching
    └── caption.service.ts    # Caption file CRUD
```

**ipc-handlers.ts** is thin — receives IPC payloads, validates them, delegates to services:
```typescript
ipcMain.handle('clip:create', async (_event, payload) => {
  return clipService.createClip(payload);
});
```

**ffmpeg.ts** is a pure command builder — no child_process calls:
```typescript
export function buildClipCommand(input: string, output: string, start: number, duration: number): string[] {
  return ['ffmpeg', '-ss', String(start), '-i', input, '-t', String(duration), output];
}
```

**ffmpeg-executor.ts** is the shared `runFfmpeg` executor — all services use this single `spawn` implementation (no duplicates).

This makes ffmpeg logic testable and easy to reason about.

#### Renderer State Management

**app-state.tsx** uses React context + `useReducer` for global state:
- `activeTab` ('video' | 'gallery')
- `currentVideo` (path, duration, info) — the video loaded in the Video tab
- `clipLength` (number) — default clip duration in seconds
- `galleryFiles` (array) — scanned output files
- `selectedFiles` (Set) — files selected for bulk convert
- `expandedFile` (string | null) — gallery file currently in expanded player
- `isConvertDrawerOpen` (boolean) — bulk convert drawer visibility
- `currentTime` (number) — current playback position (updated during playback)

Components subscribe to only the slice they need via custom hooks derived from the context.

**Tab switch behavior:** Switching tabs dispatches `SET_TAB` which resets `expandedFile`. The `currentVideo` state is preserved across tab switches — switching tabs does NOT load a different video.

**SET_VIDEO behavior:** The `SET_VIDEO` action sets `currentTime: 0` — this is intentional. When a new video is loaded (via drag-drop, open file, or debug hook), playback starts from the beginning.

**Key state preservation:**
- `currentVideo` persists across tab switches (never reset by tab change)
- `SET_VIDEO` resets `currentTime: 0` (new video = start from beginning, intentional)
- ExpandedPlayer does NOT dispatch `SET_VIDEO` (prevents gallery expansion from overwriting video tab state)

#### Key Design Decisions

| Concern | Approach | Why |
|---------|----------|-----|
| IPC types | Single `src/shared/ipc.ts` | No drift between preload/main/renderer |
| ffmpeg | Pure command builder + separate executor | Testable, no side effects in builder |
| Business logic | Service layer in main process | Separates IPC plumbing from domain logic |
| State | React context + useReducer | Simple, no external deps, per PRD |
| Settings | JSON config file in main, accessed via IPC | Only main process touches disk |
| Shared utils | `src/shared/utils.ts` | Time formatting, path helpers used by both processes |
| Video persistence | `currentVideo` preserved across tabs, `currentTime` reset on new video | Simpler model; tab-switch time restore not yet implemented |
| UI primitives | Base UI (`@base-ui/react`) for all shadcn components | Consistent primitive library across all components. Do NOT use `@radix-ui/react-*` |

#### What This Avoids

- **No circular dependencies** — shared layer has zero imports from app code
- **No `any` in IPC** — everything typed from one registry
- **No business logic in IPC handlers** — handlers are thin delegates
- **No barrel files** — explicit imports only
- **No duplicated interfaces** — all domain types in `src/shared/types.ts`
- **No dead code** — unused components/hooks removed, unused state eliminated
- **No ExpandedPlayer SET_VIDEO** — prevents gallery expansion from overwriting video tab state
- **No `galleryFiles` in BulkConvertDrawer** — removed unused import, uses `selectedFiles` from app state only
- **No Radix UI primitives** — all shadcn components use `@base-ui/react`, never `@radix-ui/react-*`

#### UI Primitives

All shadcn/ui components in this project use **Base UI** (`@base-ui/react`) as their primitive library. This is configured via `"style": "base-nova"` in `components.json`.

- **Button** → `@base-ui/react/button`
- **Select** → `@base-ui/react/select`
- **Sheet** → `@base-ui/react/dialog` (BulkConvertDrawer side pane, confirmation modals)
- **Drawer** → `vaul` (unused — replaced by Sheet)
- **Tabs** → `@base-ui/react/tabs`
- **Input** → `@base-ui/react/checkbox` (uses Base UI checkbox primitive)
- **Textarea** → native `<textarea>` (no primitive needed)
- **Slider** → `@base-ui/react/slider` (uses Base UI slider primitive)
- **Dialog** → `@base-ui/react/dialog` (uses Base UI dialog primitive)
- **Progress** → `@base-ui/react/progress` (uses Base UI progress primitive)
- **Label** → `@base-ui/react/label` (uses Base UI label primitive)
- **Card** → native `<div>` with consistent styling (no primitive needed)
- **Sonner** → `sonner` (independent package, not a Base UI component)

When adding new shadcn components, always use the Base UI variant. Do NOT use `@radix-ui/react-*` packages. When running `npx shadcn@latest add <component>`, specify the `base-nova` style to get the correct primitives.

Import pattern for Base UI Tabs:
```typescript
import { Tabs } from '@base-ui/react/tabs';
// Use: Tabs.Root, Tabs.List, Tabs.Tab, Tabs.Panel
```

### Build Tool

Vite 8 with `vite-plugin-electron`. Vite is used purely as a build tool — compile TypeScript, bundle React, apply Tailwind. No dev server is needed at runtime.

**Build output:**
- `dist/main/index.js` — Main process (ESM, Node.js built-ins externalized)
- `dist/preload/index.js` — Preload script (**CommonJS** — Electron requires `require()`, not `import`. Configured via `lib.formats: ['cjs']` in vite config)
- `dist/index.html` + `dist/assets/` — Bundled React app (outputs to `dist` root, not `dist/renderer/`)

**Important:** The main process must NOT bundle Node.js built-in modules. Rolldown (Vite 8's bundler) wraps them in a `__require()` shim that fails in ESM context. All Node.js built-ins (`fs`, `path`, `child_process`, `url`, `node:sqlite`, etc.) must be listed in `rollupOptions.external`.

Electron imports must use `import electron from 'electron'` + destructuring, not named imports, because Electron is a CommonJS module.

**Window creation:**
- Do NOT use `show: false` + `ready-to-show` pattern — in headless/sandboxed environments the event may never fire. Show the window immediately.
- Do NOT use `sandbox: true` in `webPreferences` — it can interfere with preload/contextBridge.
- Call `Menu.setApplicationMenu(null)` in `app.whenReady()` to remove the default Electron menu bar.
- Dev detection: use `process.env.NODE_ENV === 'development'` only. Do NOT use `!app.isPackaged` — when running via `electron .` (not electron-builder), `isPackaged` is always `false`, causing production builds to incorrectly try loading `http://localhost:5173`.

**Dev mode renderer loading:**
- The app loads from `dist/` files in both dev and production (not from Vite dev server at `http://localhost:5173`).
- This is intentional: using `loadFile` instead of `loadURL` allows the renderer to load local `file://` resources (videos, thumbnails) without CORS issues.
- For HMR during development, run `npm run build` before each Electron launch, or use `npm run dev` for renderer-only hot reloading without Electron.

**npm start** runs `npm run build && electron .` — builds first, then launches Electron. Loads from `dist/`.

**npm run dev** runs the Vite dev server with HMR for renderer-only hot reloading. Does NOT launch Electron.

**Debugging with MCP / Chrome DevTools:**
- Launch Electron with `--remote-debugging-port=9222` flag for Chrome DevTools / MCP server integration.
- The main process automatically enables remote debugging in dev mode via `app.commandLine.appendSwitch('remote-debugging-port', '9222')`.
- MCP server auto-detects the Electron app on port 9222.
- To debug: run `npm exec electron . --remote-debugging-port=9222` or use the MCP server's auto-detection.

**Debug helpers (exposed on `window` in dev mode):**

| Helper | Signature | Purpose |
|--------|-----------|---------|
| `__loadVideo` | `(filePath: string) => Promise<void>` | Load a video into the player. Bypasses "Open File" dialog. Calls `getVideoInfo` internally then dispatches `SET_VIDEO`. |
| `__setVideoTime` | `(time: number) => void` | Seek video to specified time. |
| `__getVideoTime` | `() => { videoCurrentTime: number, sliderValue: string }` | Returns current video currentTime and seek slider value. |
| `__seekAndWait` | `(time: number) => Promise<{ actualTime: number, requestedTime: number }>` | Seek and wait for `seeked` event, returns the actual position after seek completes. Useful for verifying keyframe alignment. |

Usage via MCP:
```
electron_send_command_to_electron → command: "eval" → args: { code: "window.__loadVideo('/path/to/video.mp4')" }
electron_send_command_to_electron → command: "eval" → args: { code: "window.__seekAndWait(10)" }
```

Example test video: `sample_video.mp4` at the project root.

### Theme

ZFlow theme from tweakcn, dark-first (`:root` = dark, `.light` = light override). Uses oklch color palette with purple primary accent. Inter font (sans), JetBrains Mono (mono), Source Serif 4 (serif).

### Toast Styling

Sonner toasts use dark theme via `toastOptions` on the `<Toaster>` component in App.tsx:
```tsx
<Toaster
  toastOptions={{
    style: {
      background: 'var(--background)',
      color: 'var(--foreground)',
      border: '1px solid var(--border)',
    },
  }}
/>
```

Do NOT use CSS selectors like `[data-style='default']` — Sonner doesn't use these attributes. Always use `toastOptions` or the headless approach for custom styling.

### IPC Channels

Define all IPC channels explicitly in the preload script. Never use `contextIsolation: false`.

| Channel | Direction | Payload | Returns |
|---------|-----------|---------|---------|
| `clip:create` | renderer → main | `{ inputPath, outputPath, start, duration }` | `{ success, outputPath, error? }` |
| `clip:warn-insufficient` | main → renderer | `{ remaining, requested }` | — |
| `convert:bulk` | renderer → main | `{ files[], settings, outputDir }` | `{ success, results[] }` |
| `convert:progress` | main → renderer | `{ file, progress, status }` | — |
| `convert:warn-no-changes` | main → renderer | — | — |
| `fs:get-video-info` | renderer → main | `{ filePath }` | `{ duration, width, height, codec, fps }` |
| `fs:extract-thumbnail` | renderer → main | `{ filePath, outputPath }` | `{ success, outputPath }` |
| `fs:read-caption` | renderer → main | `{ filePath }` | `{ content, exists }` |
| `fs:write-caption` | renderer → main | `{ filePath, content }` | `{ success }` |
| `fs:scan-outputs` | renderer → main | `{}` | `{ files[] }` |
| `fs:delete-clip` | renderer → main | `{ filePath }` | `{ success, error? }` |
| `fs:bulk-delete` | renderer → main | `{ paths: string[] }` | `{ success, errors: string[] }` |
| `app:drag-drop` | renderer → main | `{ filePath }` | `{ success }` |
| `app:check-ffmpeg` | renderer → main | `{}` | `{ available, path? }` |
| `app:open-file` | renderer → main | `{}` | `{ filePath?, cancelled }` |
| `settings:get` | renderer → main | `{ key }` | `{ value }` |
| `settings:set` | renderer → main | `{ key, value }` | `{ success }` |

### TypeScript Path Aliases

Configured in `tsconfig.json` and `vite.config.ts`:

| Alias | Resolves To |
|-------|-------------|
| `@renderer/*` | `src/renderer/*` |
| `@main/*` | `src/main/*` |
| `@preload/*` | `src/preload/*` |
| `@shared/*` | `src/shared/*` |

### ElectronAPI Interface

The `ElectronAPI` interface is declared in `src/env.d.ts` and derives its payload/return types from `IPCPayloads`/`IPCReturns` in `src/shared/ipc.ts`. The preload script uses the same shared types. This prevents drift — adding a new IPC channel only requires updating `ipc.ts` and the preload implementation; the types flow automatically through `env.d.ts`.

---

## Implementation Rules

### 1. ffmpeg Commands

**Clipping (stream copy ONLY — no re-encode ever):**
```bash
ffmpeg -i <INPUT> -ss <START> -t <DURATION> <OUTPUT>
```
- `-ss` after `-i` for accurate seeking.

**Bulk conversion (each param is optional — omit if "Same as source"):**
```bash
ffmpeg -i <INPUT> \
  [-vf "scale=W:H:force_original_aspect_ratio=decrease,crop=W:H"] \
  [-c:v <CODEC>] [-r <FPS>] [-b:v <BITRATE>] \
  -c:a copy \
  <OUTPUT>
```
- If all params are "Same as source", skip ffmpeg entirely and copy the file directly (`cp`).

**Thumbnail extraction:**
```bash
ffmpeg -i <INPUT> -frames:v 1 -q:v 2 <OUTPUT>.jpg
```

### 2. Precision Seeking

- HTML5 `<video>` `currentTime` supports floating-point values.
- Seek slider: `<input type="range">` with `step="0.01"` and `min="0"` and `max=<duration>`.
- Display format: `MM:SS.xx` (e.g., `03:45.12`).
- On slider change, set `videoElement.currentTime = value` immediately. Do not debounce seeking.

### 3. Clip Counter Persistence

- Store counters in `clip-counters.json` at the project root.
- Format: `{ "<source_video_path>": <next_counter_number> }`.
- Load on app start, increment after each successful clip.
- Counter format: zero-padded 3-digit (e.g., `_c001`, `_c002`).

### 4. Caption Autosave

- Use a 2-second debounce on text input changes.
- On debounced save, write to `<video_base_name>.txt` in the same directory as the video.
- If the `.txt` file does not exist, create it. If it exists, overwrite.
- Empty caption text: delete the `.txt` file if it exists (do not save empty files).

### 5. Gallery Thumbnails

- Extract first frame on first load, cache as `<video_name>.thumb.jpg` alongside the video.
- Check for cached thumbnail before re-extracting.
- Thumbnails should be generated at a reasonable size (e.g., 320px wide, maintaining aspect ratio).

### 6. Gallery Grid Layout

- Each grid cell is **square** (1:1 aspect ratio).
- Minimum cell size: **500x500px** when viewport allows.
- Cell size adjusts dynamically based on viewport width. Calculate max columns that fit, then distribute evenly.
- Thumbnail rendered as `object-fit: cover` (cropped to fill the square cell).
- Lower half of each cell has a dark overlay with caption text on top.
- Long captions truncated with ellipsis (`...`).
- Clicking the lower half converts it to an inline text editor.

### 7. Drag and Drop

- Only available in Video mode. Gallery mode does not accept drops.
- Handle both file system paths (in Electron) and file objects (in browser dev mode).
- On successful drop, load the video into the player, reset seek to 0, keep clip length setting.
- Accept only video MIME types or known extensions (.mp4, .mov, .avi, .mkv, .webm).
- Provide an "Open File" button as fallback in Video mode top bar.

### 8. Playback Controls

- Play/Pause: button or spacebar (global, even when not focused on player).
- Mute/Unmute: button or `M` key.
- Volume slider: inline slider next to mute button.
- No skip buttons (`<<` / `>>`).

### 9. Toast Notifications

- Used for: clip saved confirmation, insufficient duration warning, no-changes conversion warning, errors.
- Auto-dismiss after 3 seconds.
- Can include action buttons (e.g., "Clip remaining" for insufficient duration).
- **Dark theme**: Always use `toastOptions` on `<Toaster>` for dark background styling. Do NOT rely on CSS overrides with arbitrary selectors.

### 10. Settings Persistence

- Use JSON config file for persistent storage (via `db.ts`).
- `better-sqlite3` is incompatible with the latest Electron, and `node:sqlite` is not exposed in Electron's Node.js context.
- Store: bulk conversion settings (codec, resolution, fps, bitrate), clip length default, window size/position, clip counters.
- Settings are loaded on app start and saved on change.
- Bulk conversion drawer remembers last-used settings.

### 11. ffmpeg Check on Launch

- On app startup, verify ffmpeg is available in PATH.
- If not found, show an error dialog and prevent the app from functioning until resolved.

### 12. Delete Clip

- On hover over a gallery cell, show a red trash can icon in the top-right corner.
- Click opens a confirmation modal.
- On confirm, delete both the video file and its `.txt` caption file (if exists).
- Gallery grid refreshes after deletion.

### 13. Tab Navigation

- Two tabs: **Video** (with Video icon, left) and **Gallery** (with Images icon, right) in the top bar.
- Video mode: video player, seek, clip extraction, drag-and-drop, open file.
- Gallery mode: grid view, captions, bulk convert, bulk delete, refresh.
- Action buttons in the top bar change based on the active tab.
- Switching tabs closes the expanded player and stops video playback.

### 14. State Management

- Use React `useState` and `useReducer` for local component state.
- Use a simple context-based global store for cross-component state (active tab, current video, clip length).
- Avoid external state management libraries (no Redux, Zustand, etc.) — keep it simple.
- Extract complex UI logic into custom hooks (e.g., `useConvertSettings`, `useVideoPlayer`).

### 15. Styling

- Use Tailwind CSS utility classes exclusively. No CSS-in-JS libraries.
- Dark theme by default (ZFlow theme, dark-first).
- Responsive within the Electron window (minimum window size: 800x600).

### 16. CaptionOverlay Styling

Both focused (editing) and unfocused (display) states must be visually consistent:
- **Unfocused**: Outer div `h-full w-full bg-black/60 p-3` with inner `<p>` using `text-sm leading-relaxed`.
- **Focused**: Outer div `h-full w-full bg-black/50` with `<textarea>` using `h-full w-full resize-none bg-transparent p-3 text-sm leading-relaxed text-foreground outline-none`.
- Both states use `p-3` padding and `leading-relaxed` line-height for consistent text vertical position.
- Never use `flex items-stretch` with `h-full` on textarea — it can cause vertical alignment shifts. Use direct `h-full` on the container instead.

### 17. BulkConvertDrawer Resolution Inputs

- Resolution inputs (width × height) use `0` as the default/unset value.
- Display logic: `value={width ? width : ''}` — empty string when width is 0 (falsy), actual value when non-zero.
- Reset button visibility: `{(width || height) && (<X />)}` — only shown when either dimension is non-zero.
- Reset handler: `setWidth(0); setHeight(0)` — sets both to 0 (unset).
- Save logic: `width ? String(width) : ''` — only saves non-zero values to settings.
- Load logic: treats `0` and empty string as unset.

### 18. useVideoPlayer Hook

- Accepts `filePath` and options: `useVideoPlayer(filePath?: string, options?: { useGlobalState?: boolean; autoPlay?: boolean })`.
- When `useGlobalState` is true, restores time from `currentTimeRef.current` on video load (for tab-switch persistence).
- Uses `currentTimeRef` to track global playback position shared via `VideoPlayer.currentTimeRef`.
- The `loadedmetadata` event handler checks: `currentTimeRef.current > 0 && currentTimeRef.current < video.duration` before seeking.
- Global mode syncs `currentTime` to app state via `SET_CURRENT_TIME` in VideoPlayer component.

---

## Development Conventions

### TypeScript

- Strict mode enabled. No `any` types unless absolutely unavoidable.
- Define interfaces for all IPC messages, API responses, and component props.
- Use `const` enums or string literals for IPC channel names.
- All domain types and IPC types live in `src/shared/` — never duplicate them in service files or preload.
- The `ElectronAPI` interface in `src/env.d.ts` derives its types from `src/shared/ipc.ts` to prevent drift.

### React

- Functional components with hooks only. No class components.
- Keep components focused — one responsibility per component.
- Extract complex UI logic into custom hooks.

### ESLint

- Flat config (`eslint.config.js`) with shared TypeScript rules applied globally, plus per-context rules:
  - **Main/Preload**: Node.js globals, TypeScript rules
  - **Renderer**: Browser globals, TypeScript rules, React hooks rules, React Refresh rules
- Always run `npm run lint:fix` before committing to auto-fix issues.

### Pre-commit Hooks

Configured via husky + lint-staged. On `git commit`:

1. **lint-staged** — formats and lints only staged files
2. **typecheck** — full TypeScript type check (`tsc --noEmit`)
3. **lint** — full ESLint check on all source files
4. **build** — full Vite build to verify everything compiles

All steps must pass for the commit to succeed.

### Error Handling

- ffmpeg failures: Capture stderr, parse for meaningful errors, display to user via toast.
- File operation failures: Show inline error messages, never crash the app.
- Network/IPC failures: Graceful degradation with retry options where applicable.

### Testing

- No automated tests required for v1. Manual testing is sufficient.
- Ensure the app works with at least .mp4 (H.264 + AAC) files.

---

## Build & Run

```bash
npm install
npm start                # Build + run Electron (loads from dist/, no dev server)
npm run dev              # Start Vite dev server only (HMR for renderer, no Electron)
npm run build            # Type check + Vite build (renderer + main + preload)
npm run electron:build   # Package as distributable (electron-builder)
npm run lint             # Run ESLint on all source files
npm run lint:fix         # Auto-fix ESLint issues
npm run format           # Format all source files with Prettier
npm run typecheck        # Run TypeScript type check
```

**Important:** `npm start` builds first then runs `electron .`. The app loads all files from `dist/` — no Vite dev server at runtime. This is a standalone desktop app.

---

## Electron MCP Setup (For Debugging & Testing)

> **Use the Electron MCP server (`electron-mcp-server`), NOT the chrome-devtools MCP.** The chrome-devtools MCP lacks Electron-specific context and cannot interact with Electron's native features.

### Routine Debug Workflow

1. **Kill everything**: `pkill -9 electron` — always use `-9` (not `-f`, which will kill the MCP server).
2. **Build**: `npm run build` — compile the app first.
3. **Launch with debugging**: Run `npm run start:debug > /dev/null 2>&1 &` in the **background** (note the trailing `> /dev/null 2>&1 &`). **CRITICAL: Electron MUST always be launched exactly like this, and never chained with another command.** If launched in the foreground, or chained with another command such as `pkill ... &&` or `sleep ... &&`, it will block the shell thread and get killed by the harness timeout.
4. **Wait**: Give Electron 3-5 seconds to fully start and open the debug port.
5. **Verify**: `electron_get_electron_window_info` — expect `"automationReady": true`. If it fails, check that port 9222 is responding with `curl -s http://127.0.0.1:9222/json/version`.

### When Electron Needs Restart Mid-Session

1. Kill: `pkill -9 electron`
2. Rebuild + relaunch: `npm run start:debug > /dev/null 2>&1 &` (**must include `> /dev/null 2>&1 &` and nothing else prepending or appending this command**)
3. Wait 3-5 seconds for Electron to start.
4. Verify port 9222 is responding: `curl -s http://127.0.0.1:9222/json/version`
4. If MCP tool still fails (returns "No Electron applications found" or "Not connected" despite port 9222 being up), the MCP server was killed and needs reload: ask the user to restart from their harness.

### Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| "No Electron applications found" | Electron not running | `npm run start:debug > /dev/null 2>&1 &` |
| "Not connected" | MCP server not reconnected | Verify that port is up and ask user to reload electron MCP |
| Port 9222 down | Electron crashed | Rebuild + `npm run start:debug > /dev/null 2>&1 &` |

### Loading a Video for Testing

The "Open File" button opens a native file dialog which MCP cannot drive. Use `window.__loadVideo(filePath)` instead:

```
electron_send_command_to_electron → command: "eval" → args: { code: "window.__loadVideo('/path/to/video.mp4')" }
```

This calls `electronAPI.getVideoInfo(filePath)` internally to probe the video, then dispatches `SET_VIDEO` to load it into the player. A test video is available at `sample_video.mp4` at the project root.

### Navigation Strategy

When driving the Electron app via MCP tools, **prefer `electron_send_command_to_electron` with `get_page_structure` + `click_by_text`** over `electron_take_screenshot` for navigation tasks. `get_page_structure` returns structured data about all interactive elements (buttons, inputs, links) with their text, state, and properties — far more token-efficient than images when the goal is simply to navigate the UI. Use `electron_take_screenshot` only when you need to validate the exact visual appearance or layout of the UI.

---

## Implementation Order

Build the app in this sequence:

1. ~~**Project scaffold**: Electron + React + TypeScript + Tailwind + shadcn setup.~~ ✅ DONE
2. ~~**Main process**: Window creation, IPC channel definitions, preload script.~~ ✅ DONE
3. ~~**Theme**: ZFlow dark-first theme application.~~ ✅ DONE
4. ~~**Tab navigation**: Top bar with Video/Gallery tabs, action buttons per tab.~~ ✅ DONE
5. ~~**Video player**: Drag-and-drop loading, open file dialog, play/pause, mute/volume, precision seek slider, time display, global keyboard shortcuts.~~ ✅ DONE
6. ~~**Clip extraction**: Clip length input, Clip button with `C` hotkey, ffmpeg integration, counter persistence, toast on success, insufficient-duration warning toast, no re-encode.~~ ✅ DONE
7. ~~**Gallery view**: File scanning, thumbnail generation, dynamic square grid layout (500px min), caption overlay with inline editing, delete with confirmation modal, gallery refresh.~~ ✅ DONE
8. ~~**Expanded player**: Click thumbnail to open, playback with sound, seek/volume controls, caption editor below video, close on Escape.~~ ✅ DONE
9. ~~**Caption editing**: Debounced autosave, `.txt` file CRUD, inline overlay editor in gallery, full editor in expanded view.~~ ✅ DONE
10. ~~**Bulk conversion**: Slide-out drawer, optional params with "Same as source", settings persistence via JSON config, ffmpeg batch processing, progress indicators, no-changes toast warning, caption file copying.~~ ✅ DONE
11. ~~**ffmpeg check on launch**: Verify ffmpeg availability, show error dialog if missing.~~ ✅ DONE
12. ~~**Settings persistence**: JSON config file for bulk conversion settings, clip length default, window size/position.~~ ✅ DONE
13. ~~**Code quality refactor**: Shared `runFfmpeg` executor, extracted `ffprobe.service`, `useConvertSettings` hook, deduplicated interfaces, removed dead code (unused components/hooks/state), cleaned up config files.~~ ✅ DONE
14. ~~**UI polish & UX improvements**: Sonner toast notifications, shadcn Tabs/Sheet/Button widgets, vertical volume slider on hover, drag-drop on main content area, close button on video player, scissors icon on Clip button, renamed tabs to Video/Gallery with icons, hover selection UX for gallery, clip length persistence via settings, requestAnimationFrame for smooth seek, stop video on expanded player close, cursor at end on caption edit start.~~ ✅ DONE
15. ~~**Bug fixes**: Bulk convert drawer state management (moved `isOpen` from hook to app state), larger gallery select/delete buttons, full-cover gallery thumbnails, removed caption input focus ring, vertical chevron icons for caption editor, tab switch closes expanded player, correct Select All checkbox icons, toast notification integration, 'c' hotkey works after seeking, video player sizing with min-h-0 and object-contain.~~ ✅ DONE
16. ~~**UI polish & bug fixes**: CaptionOverlay consistent styling (h-full, leading-relaxed, p-3 in both states), BulkConvertDrawer resolution inputs show empty when unset (0 treated as unset, no confusing "0" display), Sonner toast dark theme via toastOptions, bulk convert button disabled when no files selected.~~ ✅ DONE
17. **UI polish & bug fixes**: Tab type renamed from `'clip'` to `'video'` across all files (app-state, App, TopBar), BulkConvertDrawer title alignment fixed (`px-4`), file count counter removed from drawer, codec dropdown styling fixed (explicit bg/fg via style prop), gallery bulk delete button added (destructive color, disabled when no selection), ExpandedPlayer close button moved inside video container (top-right absolute), clip length label replaced with RulerDimensionLine icon, 's' size fixed to `text-sm`, BulkConvertDrawer removed unused `galleryFiles` import.
18. **UI consistency audit & shadcn migration**: Full audit of all UI components — replaced raw HTML form elements with shadcn/ui components (Input, Textarea, Slider, Dialog, Progress, Label). Removed custom focus ring styling, custom progress bar styling, and inline button styles. All components now use consistent shadcn variants (default, outline, destructive, ghost, secondary). Input fields use `bg-transparent` for consistent dark theme appearance. Progress uses shadcn Progress component with custom styling. Dialog uses shadcn Dialog with proper backdrop blur and animation. Label uses shadcn Label with form-label class. Slider uses shadcn Slider with track/thumb styling.
