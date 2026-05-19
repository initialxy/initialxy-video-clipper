# initialxy-video-clipper

Desktop app for clipping video files to create training data for video diffusion models.

![demo](demo.gif 'Video Clipper')

## Features

- **Clip mode**: Load videos via drag-and-drop or file picker, set clip length, and extract clips with frame-accurate ffmpeg re-encoding.
- **Gallery mode**: Browse all clipped videos in a responsive grid, edit captions inline, and bulk-convert clips.
- **Precision seeking**: 0.01s granularity seek slider with `MM:SS.xx` time display.
- **Caption editing**: Debounced autosave (0.5s) to `.txt` sidecar files alongside videos.
- **Bulk conversion**: Optional resolution, codec, FPS, and bitrate controls with progress tracking.
- **Frame count check**: Scan the `converted/` directory for exact frame counts via ffprobe, displayed in the Bulk Convert drawer.
- **Bulk caption edit**: Prepend, append, or search/replace text across multiple selected clips' captions.
- **Auto-caption**: LLM-powered caption generation for selected clips (OpenAI-compatible API).
- **Keyboard shortcuts**: `Space` (play/pause), `M` (mute), `←/→` (seek ±1s), `↑/↓` (volume ±10%), `Escape` (close expanded player).

## Tech Stack

- **Electron 41** — Desktop shell
- **React 19** — UI framework
- **TypeScript** — Type safety
- **Tailwind CSS 4** — Styling (dark-first theme)
- **shadcn/ui** — Headless UI primitives (Base UI exclusively)
- **ffmpeg** — Video processing (frame-accurate re-encode clipping, thumbnail extraction, bulk transcoding)
- **Sonner** — Toast notifications

## Prerequisites

- **Node.js** 22+ (LTS recommended)
- **npm** 10+
- **ffmpeg** — Must be available in `PATH` (checked on app launch)

## Getting Started

```bash
# Install dependencies
npm install

# Build and launch Electron
npm start

# Build and launch with remote debugging (port 9222)
npm run start:debug
```

The Electron window will open automatically, loading the app from the `dist/` directory.

For development only (Vite dev server with HMR, no Electron):

```bash
npm run dev
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Build + launch Electron |
| `npm run start:debug` | Build + launch Electron with `--remote-debugging-port=9222` |
| `npm run dev` | Vite dev server only (HMR, no Electron) |
| `npm run build` | TypeScript check + Vite production build |
| `npm run lint` | Run ESLint on all source files |
| `npm run lint:fix` | Auto-fix ESLint issues |
| `npm run format` | Format files with Prettier |
| `npm run typecheck` | Run TypeScript type check |

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Toggle play / pause |
| `M` | Toggle mute / unmute |
| `C` | Clip current video (Video tab only) |
| `←` / `→` | Seek backward / forward by 1 second |
| `↑` / `↓` | Increase / decrease volume by 10% |
| `Escape` | Close expanded player (Gallery mode only) |

Shortcuts are ignored when a text input or textarea has focus.

## Project Structure

```
initialxy-video-clipper/
├── src/
│   ├── shared/         # Shared types & utilities (main + preload + renderer)
│   ├── main/           # Electron main process (IPC, ffmpeg, services)
│   ├── preload/        # Context bridge for safe IPC
│   └── renderer/       # React frontend (components, hooks, store)
├── outputs/            # Clipped video output (runtime)
└── converted/          # Bulk-converted output (runtime)
```

## Architecture

- **Main process**: IPC handlers are thin delegates that forward to a service layer (`clip.service.ts`, `gallery.service.ts`, `convert.service.ts`, `caption.service.ts`, `converted.service.ts`, `auto-caption.service.ts`). ffmpeg commands are pure function builders (`ffmpeg.ts`) with separate execution logic (`ffmpeg-executor.ts`).
- **Renderer**: React context + `useReducer` for global state. Components subscribe via custom hooks. Caption state uses a reactive store with debounced persistence.
- **IPC**: 18 channels defined in `src/shared/ipc.ts`. `ElectronAPI` types derive from `IPCPayloads` / `IPCReturns` — no `any` types.
- **State management**: Central `useReducer` in `src/renderer/store/app-state.tsx`. Caption store in `src/renderer/store/caption-store.tsx` with reactive Map, debounced disk writes (500ms), and IPC sync.
- **Settings**: JSON config file in main process, accessed via `settings:get` / `settings:set` IPC channels.

## Building for Distribution

```bash
npm run build
npm run electron:build
```

Packaged binaries are produced in the `dist/` directory.

## Development Notes

- App loads from `dist/` in both dev and production (not Vite dev server) to avoid `file://` CORS issues.
- Dev detection uses `process.env.NODE_ENV === 'development'` only (not `!app.isPackaged`).
- Window shows immediately — no `show: false` + `ready-to-show` pattern.
- Node.js built-ins must be in `rollupOptions.external` (Rolldown ESM shim fails on them).
- Preload is compiled as CommonJS (`lib.formats: ['cjs']`).
- All shadcn/ui components use **Base UI** (`@base-ui/react`) via `base-nova` style. Never `@radix-ui/react-*`.

## License

[MIT License](LICENSE) © 2026 Xingchen Yu
