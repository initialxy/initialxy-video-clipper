# Video Clipper

Desktop app for clipping video files to create training data for video diffusion models.

## Features

- **Clip mode**: Load videos via drag-and-drop or file picker, set clip length, and extract clips with ffmpeg (no re-encoding).
- **Gallery mode**: Browse all clipped videos in a responsive grid, edit captions, and bulk-convert clips.
- **Precision seeking**: 0.01s granularity seek slider with `MM:SS.xx` time display.
- **Caption editing**: Debounced autosave to `.txt` sidecar files alongside videos.
- **Bulk conversion**: Optional resolution, codec, FPS, and bitrate controls with progress tracking.

## Tech Stack

- **Electron** — Desktop shell
- **React 19** — UI framework
- **TypeScript** — Type safety
- **Tailwind CSS 4** — Styling (ZFlow dark-first theme)
- **shadcn/ui** — Headless UI primitives
- **ffmpeg** — Video processing (stream copy, no re-encode)
- **better-sqlite3** — Persistent settings storage

## Prerequisites

- **Node.js** 18+ (LTS recommended)
- **ffmpeg** — Must be available in `PATH`

## Getting Started

```bash
# Install dependencies
npm install

# Start development server (Vite + Electron)
npm start
# or equivalently:
npm run dev
npm run electron:dev
```

The Electron window will open automatically. The renderer is served from `http://localhost:5173` with HMR enabled.

## Scripts

| Command | Description |
|---------|-------------|
| `npm start` / `npm run dev` | Start dev server + Electron |
| `npm run build` | TypeScript check + production build |
| `npm run electron:build` | Package as distributable (electron-builder) |
| `npm run lint` | Run ESLint on all source files |
| `npm run lint:fix` | Auto-fix ESLint issues |
| `npm run format` | Format files with Prettier |
| `npm run typecheck` | Run TypeScript type check |

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Play / Pause |
| `M` | Mute / Unmute |
| `C` | Clip current video |
| `Escape` | Close expanded player / modals |

## Project Structure

```
video-clipper/
├── src/
│   ├── shared/         # Shared types & utilities (main + preload + renderer)
│   ├── main/           # Electron main process (ffmpeg, IPC, db, services)
│   ├── preload/        # Context bridge for safe IPC
│   └── renderer/       # React frontend (components, hooks, store)
├── outputs/            # Clipped video output (runtime)
└── converted/          # Bulk-converted output (runtime)
```

## Architecture

- **Main process**: IPC handlers delegate to a service layer. ffmpeg commands are built as pure functions with no side effects.
- **Renderer**: React context + `useReducer` for global state. Components subscribe via custom hooks.
- **IPC**: All channels and payload types are defined in a single `src/shared/ipc.ts` registry — no drift between processes.

## Building for Distribution

```bash
npm run build
npm run electron:build
```

Packaged binaries are produced in the `dist/` directory.
