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
│   ├── main/                   # Electron main process (Node.js)
│   │   ├── index.ts            # Main process entry point
│   │   ├── ipc-handlers.ts     # IPC route handlers (create when needed)
│   │   ├── ffmpeg.ts           # ffmpeg command builder & executor (create when needed)
│   │   └── db.ts               # sqlite3 settings persistence (create when needed)
│   ├── preload/
│   │   └── index.ts            # Context bridge for safe IPC
│   ├── renderer/               # React frontend
│   │   ├── index.tsx           # Renderer entry point
│   │   ├── App.tsx             # Root component with tab routing
│   │   ├── components/
│   │   │   ├── ui/             # shadcn/ui generated components
│   │   │   ├── TopBar.tsx              # Tab bar (left) + action buttons (right)
│   │   │   ├── TabBar.tsx              # Clip / Gallery tab switcher
│   │   │   ├── VideoPlayer.tsx         # Main video player with playback controls
│   │   │   ├── SeekSlider.tsx          # Precision seek slider (0.01s granularity)
│   │   │   ├── VolumeControl.tsx       # Mute button + volume slider
│   │   │   ├── GalleryView.tsx         # Grid of clipped videos with thumbnails
│   │   │   ├── GalleryItem.tsx         # Single gallery card (thumb + caption overlay)
│   │   │   ├── ExpandedPlayer.tsx      # Full-screen video player for gallery items
│   │   │   ├── CaptionEditor.tsx       # Text area with debounced autosave
│   │   │   ├── CaptionOverlay.tsx      # Inline caption overlay for gallery grid cells
│   │   │   ├── BulkConvertDrawer.tsx   # Slide-out drawer for bulk conversion settings
│   │   │   ├── ProgressBar.tsx         # Per-file and overall progress display
│   │   │   ├── Toast.tsx               # Toast notification system
│   │   │   └── DeleteConfirmModal.tsx  # Confirmation modal for clip deletion
│   │   ├── hooks/
│   │   │   ├── useVideoPlayer.ts       # Playback state management (play/pause/seek/volume/mute)
│   │   │   ├── useClipCounter.ts       # Per-source clip counter tracking
│   │   │   ├── useGallery.ts           # Gallery file scanning & state
│   │   │   ├── useCaption.ts           # Caption CRUD with debounced save
│   │   │   └── useToast.ts             # Toast notification management
│   │   ├── lib/
│   │   │   └── utils.ts                # shadcn utility (cn function)
│   │   ├── store/
│   │   │   └── app-state.ts            # Central state (active tab, current video, clip length, etc.)
│   │   └── styles/
│   │       └── globals.css             # Tailwind base + ZFlow theme (dark-first)
│   └── env.d.ts                # Type declarations (vite/client, CSS modules, ElectronAPI)
├── index.html                  # Root HTML entry point
├── vite.config.ts              # Vite build config (renderer + electron plugin)
├── tsconfig.json               # TypeScript configuration
├── eslint.config.js            # ESLint flat config (separate rulesets for main/preload vs renderer)
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
│  - sqlite3 settings persistence             │
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

### Build Tool

Vite 8 with `vite-plugin-electron`. The renderer is served from `http://localhost:5173` in dev mode. The main process and preload are bundled separately by the Vite plugin.

**Dev workflow:**
- `npm run dev` or `npm run electron:dev` — starts Vite dev server + Electron
- The renderer loads from `http://localhost:5173` (HMR enabled)
- Main process and preload are built on-the-fly by vite-plugin-electron
- In production, the renderer is bundled as static files

**Debugging:**
- The renderer is debuggable in Chrome via `http://localhost:5173`
- Electron DevTools open automatically in dev mode
- For Chrome DevTools MCP, launch Electron with `--remote-debugging-port=9222`

### Theme

ZFlow theme from tweakcn, dark-first (`:root` = dark, `.light` = light override). Uses oklch color palette with purple primary accent. Inter font (sans), JetBrains Mono (mono), Source Serif 4 (serif).

### IPC Channels

Define all IPC channels explicitly in the preload script. Never use `contextIsolation: false`.

| Channel | Direction | Payload | Returns |
|---------|-----------|---------|---------|
| `clip:create` | renderer → main | `{ inputPath, outputPath, start, duration }` | `{ success, outputPath, error? }` |
| `clip:warn-insufficient` | main → renderer | `{ remaining, requested }` | — |
| `convert:bulk` | renderer → main | `{ files[], settings, outputDir }` | `{ success, results[] }` |
| `convert:progress` | main → renderer | `{ file, progress, status }` | — |
| `fs:get-video-info` | renderer → main | `{ filePath }` | `{ duration, width, height, codec, fps }` |
| `fs:extract-thumbnail` | renderer → main | `{ filePath, outputPath }` | `{ success, outputPath }` |
| `fs:read-caption` | renderer → main | `{ filePath }` | `{ content, exists }` |
| `fs:write-caption` | renderer → main | `{ filePath, content }` | `{ success }` |
| `fs:scan-outputs` | renderer → main | `{}` | `{ files[] }` |
| `fs:delete-clip` | renderer → main | `{ filePath }` | `{ success, error? }` |
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

### ElectronAPI Interface

The `ElectronAPI` interface is declared in `src/env.d.ts`. The preload script casts the exposed API to this type. Keep them in sync.

---

## Implementation Rules

### 1. ffmpeg Commands

**Clipping (stream copy ONLY — no re-encode ever):**
```bash
ffmpeg -ss <START> -i <INPUT> -t <DURATION> -c copy -avoid_negative_ts make_zero <OUTPUT>
```
- `-ss` before `-i` for fast seeking (may not be frame-exact).
- Use `-c copy` to preserve codec, bitrate, resolution, framerate, audio.
- `-avoid_negative_ts make_zero` prevents timestamp issues.
- **CRITICAL**: Clip mode must NEVER re-encode. Cut at nearest keyframe boundary. Preserving original encoding is paramount.

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

- Only available in Clip mode. Gallery mode does not accept drops.
- Handle both file system paths (in Electron) and file objects (in browser dev mode).
- On successful drop, load the video into the player, reset seek to 0, keep clip length setting.
- Accept only video MIME types or known extensions (.mp4, .mov, .avi, .mkv, .webm).
- Provide an "Open File" button as fallback in Clip mode top bar.

### 8. Playback Controls

- Play/Pause: button or spacebar (global, even when not focused on player).
- Mute/Unmute: button or `M` key.
- Volume slider: inline slider next to mute button.
- No skip buttons (`<<` / `>>`).

### 9. Toast Notifications

- Used for: clip saved confirmation, insufficient duration warning, no-changes conversion warning, errors.
- Auto-dismiss after 3 seconds.
- Can include action buttons (e.g., "Clip remaining" for insufficient duration).

### 10. Settings Persistence

- Use Node.js built-in `sqlite3` for persistent storage.
- Store: bulk conversion settings (codec, resolution, fps, bitrate), clip length default, window size/position.
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

- Two tabs: **Clip** (left) and **Gallery** (right) in the top bar.
- Clip mode: video player, seek, clip extraction, drag-and-drop, open file.
- Gallery mode: grid view, captions, bulk convert, delete, refresh.
- Action buttons in the top bar change based on the active tab.

### 14. State Management

- Use React `useState` and `useReducer` for local component state.
- Use a simple context-based global store for cross-component state (active tab, current video, clip length).
- Avoid external state management libraries (no Redux, Zustand, etc.) — keep it simple.

### 15. Styling

- Use Tailwind CSS utility classes exclusively. No CSS-in-JS libraries.
- Dark theme by default (ZFlow theme, dark-first).
- Responsive within the Electron window (minimum window size: 800x600).
- shadcn/ui components are available in `src/renderer/components/ui/`.

---

## Development Conventions

### TypeScript

- Strict mode enabled. No `any` types unless absolutely unavoidable.
- Define interfaces for all IPC messages, API responses, and component props.
- Use `const` enums or string literals for IPC channel names.
- The `ElectronAPI` interface in `src/env.d.ts` defines the renderer-side type contract.

### React

- Functional components with hooks only. No class components.
- Keep components focused — one responsibility per component.
- Extract complex logic into custom hooks.
- shadcn/ui components are headless primitives styled with Tailwind. Use them as building blocks.

### ESLint

- Flat config (`eslint.config.js`) with two separate rulesets:
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
npm run dev              # Start Vite dev server + Electron (same as electron:dev)
npm run electron:dev     # Start Vite dev server + Electron
npm run build            # Type check + Vite build (renderer + main + preload)
npm run electron:build   # Package as distributable (electron-builder)
npm run lint             # Run ESLint on all source files
npm run lint:fix         # Auto-fix ESLint issues
npm run format           # Format all source files with Prettier
npm run typecheck        # Run TypeScript type check
```

---

## Implementation Order

Build the app in this sequence:

1. ~~**Project scaffold**: Electron + React + TypeScript + Tailwind + shadcn setup.~~ ✅ DONE
2. ~~**Main process**: Window creation, IPC channel definitions, preload script.~~ ✅ DONE
3. ~~**Theme**: ZFlow dark-first theme application.~~ ✅ DONE
4. **Tab navigation**: Top bar with Clip/Gallery tabs, action buttons per tab.
5. **Video player**: Drag-and-drop loading, open file dialog, play/pause, mute/volume, precision seek slider, time display, global keyboard shortcuts.
6. **Clip extraction**: Clip length input, Clip button with `C` hotkey, ffmpeg integration, counter persistence, toast on success, insufficient-duration warning toast, no re-encode.
7. **Gallery view**: File scanning, thumbnail generation, dynamic square grid layout (500px min), caption overlay with inline editing, delete with confirmation modal, gallery refresh.
8. **Expanded player**: Click thumbnail to open, playback with sound, seek/volume controls, caption editor below video, close on Escape.
9. **Caption editing**: Debounced autosave, `.txt` file CRUD, inline overlay editor in gallery, full editor in expanded view.
10. **Bulk conversion**: Slide-out drawer, optional params with "Same as source", settings persistence via sqlite3, ffmpeg batch processing, progress indicators, no-changes toast warning, caption file copying.
11. **ffmpeg check on launch**: Verify ffmpeg availability, show error dialog if missing.
12. **Settings persistence**: sqlite3 for bulk conversion settings, clip length default, window size/position.
