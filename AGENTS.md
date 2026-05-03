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
│   │   ├── ipc-handlers.ts     # IPC route handlers
│   │   └── ffmpeg.ts           # ffmpeg command builder & executor
│   ├── preload/
│   │   └── index.ts            # Context bridge for safe IPC
│   └── renderer/               # React frontend
│       ├── index.tsx           # Renderer entry point
│       ├── App.tsx             # Root component with view routing
│       ├── components/
│       │   ├── TopBar.tsx              # Clip length input, Clip button, view toggle
│       │   ├── VideoPlayer.tsx         # Main video player with playback controls
│       │   ├── SeekSlider.tsx          # Precision seek slider (0.01s granularity)
│       │   ├── GalleryView.tsx         # Grid of clipped videos with thumbnails
│       │   ├── GalleryItem.tsx         # Single gallery card (thumb + caption)
│       │   ├── ExpandedPlayer.tsx      # Full-screen video player for gallery items
│       │   ├── CaptionEditor.tsx       # Text area with debounced autosave
│       │   ├── BulkConvertPanel.tsx    # Bulk conversion settings modal/panel
│       │   └── ProgressBar.tsx         # Per-file and overall progress display
│       ├── hooks/
│       │   ├── useVideoPlayer.ts       # Playback state management
│       │   ├── useClipCounter.ts       # Per-source clip counter tracking
│       │   ├── useGallery.ts           # Gallery file scanning & state
│       │   └── useCaption.ts           # Caption CRUD with debounced save
│       ├── store/
│       │   └── app-state.ts            # Central state (view mode, current video, etc.)
│       └── styles/
│           └── globals.css             # Tailwind base + custom utilities
├── electron-builder.config.js  # Electron build configuration
├── tsconfig.json               # TypeScript configuration
├── tailwind.config.js          # Tailwind CSS configuration
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
└──────────────┬──────────────────────────────┘
               │ IPC (contextBridge)
┌──────────────▼──────────────────────────────┐
│           Electron Renderer Process         │
│                                             │
│  - React UI tree                            │
│  - HTML5 <video> playback                   │
│  - User input handling                      │
│  - State management                         │
└─────────────────────────────────────────────┘
```

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
| `app:drag-drop` | renderer → main | `{ filePath }` | `{ success }` |

---

## Implementation Rules

### 1. ffmpeg Commands

**Clipping (stream copy — preserves all original properties):**
```bash
ffmpeg -ss <START> -i <INPUT> -t <DURATION> -c copy -avoid_negative_ts make_zero <OUTPUT>
```
- `-ss` before `-i` for fast seeking (may not be frame-exact).
- For frame-exact cuts, move `-ss` after `-i` (slower but precise).
- Use `-c copy` to preserve codec, bitrate, resolution, framerate, audio.
- `-avoid_negative_ts make_zero` prevents timestamp issues.

**Bulk conversion:**
```bash
ffmpeg -i <INPUT> \
  -vf "scale=W:H:force_original_aspect_ratio=decrease,crop=W:H" \
  -c:v <CODEC> -r <FPS> -b:v <BITRATE> \
  -c:a copy \
  <OUTPUT>
```

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

### 6. Drag and Drop

- Handle both file system paths (in Electron) and file objects (in browser dev mode).
- On successful drop, load the video into the player, reset seek to 0, keep clip length setting.
- Accept only video MIME types or known extensions (.mp4, .mov, .avi, .mkv, .webm).

### 7. State Management

- Use React `useState` and `useReducer` for local component state.
- Use a simple context-based global store for cross-component state (current view, loaded video, clip length).
- Avoid external state management libraries (no Redux, Zustand, etc.) — keep it simple.

### 8. Styling

- Use Tailwind CSS utility classes exclusively. No CSS-in-JS libraries.
- Dark theme by default (suitable for video editing workflows).
- Responsive within the Electron window (minimum window size: 800x600).

---

## Development Conventions

### TypeScript

- Strict mode enabled. No `any` types unless absolutely unavoidable.
- Define interfaces for all IPC messages, API responses, and component props.
- Use `const` enums or string literals for IPC channel names.

### React

- Functional components with hooks only. No class components.
- Keep components focused — one responsibility per component.
- Extract complex logic into custom hooks.

### Error Handling

- ffmpeg failures: Capture stderr, parse for meaningful errors, display to user.
- File operation failures: Show inline error messages, never crash the app.
- Network/IPC failures: Graceful degradation with retry options where applicable.

### Testing

- No automated tests required for v1. Manual testing is sufficient.
- Ensure the app works with at least .mp4 (H.264 + AAC) files.

---

## Build & Run

```bash
npm install
npm run electron:dev     # Start Electron in dev mode
npm run build            # Build for production
npm run electron:build   # Package as distributable
```

---

## Implementation Order

Build the app in this sequence:

1. **Project scaffold**: Electron + React + TypeScript + Tailwind setup.
2. **Main process**: Window creation, IPC channel definitions, preload script.
3. **Video player**: Drag-and-drop loading, play/pause, precision seek slider, time display.
4. **Clip extraction**: Clip length input, Clip button with `C` hotkey, ffmpeg integration, counter persistence, insufficient-duration warning.
5. **Gallery view**: File scanning, thumbnail generation, grid layout, caption display.
6. **Caption editing**: Text input with debounced autosave, `.txt` file creation.
7. **Expanded player**: Click-to-enlarge, playback with sound, seek controls.
8. **Bulk conversion**: Multi-select, settings panel, ffmpeg batch processing, progress indicators, caption file copying.
