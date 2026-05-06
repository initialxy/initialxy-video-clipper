# Code Quality Audit — Video Clipper

**Date:** 2026-05-05
**Scope:** Full codebase audit covering unused code, modularization, abstractions, duplication, complexity, and naming.

---

## 1. Unused / Dead Code

### 1.1 Unused UI Components

| File | Status |
|------|--------|
| `src/renderer/components/ui/drawer.tsx` | **REMOVED** — `vaul` Drawer component. AGENTS.md says "unused — replaced by Sheet". |
| `src/renderer/components/ui/progress.tsx` | **REMOVED** — shadcn Progress component. The BulkConvertDrawer uses a custom progress bar instead. |
| `src/renderer/components/ui/separator.tsx` | **REMOVED** — indirectly used only by `button-group.tsx` (also removed). |
| `src/renderer/components/ui/button-group.tsx` | **REMOVED** — `ButtonGroup`, `ButtonGroupSeparator`, `ButtonGroupText` were never imported. |

### 1.2 Unused Shared Code

| Export | Location | Status |
|--------|----------|--------|
| `debounce` / `DebouncedFunction` | `src/shared/utils.ts` | **REMOVED** — replaced by `useDebouncedCallback` hook |
| `getDirectory` | `src/shared/utils.ts` | **REMOVED** — no imports found |

### 1.3 Unused Main Process Exports

| Export | Location | Status |
|--------|----------|--------|
| `closeDb` | `src/main/db.ts` | **REMOVED** — JSON backend doesn't need close |
| `ensureThumbnail` | `src/main/services/gallery.service.ts` | **REMOVED** — never called |
| `getCurrentTime` | `src/renderer/hooks/useVideoPlayer.ts` | **REMOVED** — never consumed |

### 1.4 Unused IPC Channels

| Channel | Status |
|---------|--------|
| `clip:warn-insufficient` | **REMOVED** — insufficient-duration logic handled inline in App.tsx |
| `app:drag-drop` | **REMOVED** — no renderer consumer |
| `app:check-ffmpeg` | **REMOVED** — no renderer consumer |

### 1.5 Unused `sonner.tsx` Toast Functions

**REMOVED** — dead `toast`/`success`/`error`/`warning`/`info` functions removed from `sonner.tsx`.

### 1.6 Package.json Cleanup

| Package | Status |
|---------|--------|
| `vaul` | **REMOVED** — `drawer.tsx` was unused |

---

## 2. Duplicated Types

### 2.1 `VideoInfo` Duplicated 3 Times → FIXED

| Location | Status |
|----------|--------|
| `src/shared/types.ts` | Source of truth |
| `src/main/services/ffprobe.service.ts` | **FIXED** — now imports from `@shared/types` |
| `src/renderer/store/app-state.tsx` | **FIXED** — `VideoState extends VideoInfo` |

### 2.2 `ScannedFile` vs `GalleryFile` → FIXED

**FIXED** — `ScannedFile` removed from `gallery.service.ts`. `scanOutputs` now returns `GalleryFile[]`. App state uses `GalleryFile[]`. IPCReturns uses `GalleryFile[]`.

### 2.3 `ClipPayload` vs IPC Type

**DEFERRED** — `ClipPayload` in clip.service.ts is a subset of IPC type. Service ignores `outputPath` (generates internally). Low priority to consolidate.

### 2.4 `FfmpegResult` vs `ClipResult`

**DEFERRED** — `FfmpegResult` is generic executor result, `ClipResult` is clip-specific with `outputPath`. Different purposes, acceptable to keep separate.

---

## 3. Duplicated Logic

### 3.1 "Load Video" Pattern → FIXED

**FIXED** — extracted `useLoadVideo` hook. Used in:
- `App.tsx` `handleDrop`
- `TopBar.tsx` `handleOpenFile`
- `App.tsx` debug hook (partial — still inline, acceptable for dev-only code)

### 3.2 Inline Debounce Logic → FIXED

**FIXED** — created `useDebouncedCallback` hook in `@renderer/hooks/useDebouncedCallback.ts`. Used in:
- `CaptionOverlay.tsx`
- `useCaption.ts`

### 3.3 `SETTINGS_KEYS` Duplicated → FIXED

**FIXED** — moved to `src/shared/constants.ts`. Both `useConvertSettings.ts` and main process import from shared location.

---

## 4. Modularization & Separation of Concerns

### 4.1 App.tsx Is Overloaded

**DEFERRED** — App.tsx (385 lines) contains drag-drop, clip logic, keyboard shortcuts, delete management, IPC subscriptions, and JSX. Could extract into focused hooks (`useDragDrop`, `useClipAction`, `useKeyboardShortcuts`, `useDeleteManagement`, `useConversionEvents`) but low priority.

### 4.2 TopBar.tsx Does Too Much

**PARTIAL** — `handleOpenFile` now uses `useLoadVideo`. Clip length input could be extracted into `ClipLengthInput` component but low priority.

### 4.3 IPC Handlers in index.ts → FIXED

**FIXED** — `clip:warn-insufficient` handler removed from `index.ts` (was unused).

### 4.4 ffmpeg.ts Missing `-c copy` → FIXED

**FIXED** — `buildClipCommand` now includes `-c copy` and `-avoid_negative_ts make_zero`.

---

## 5. Overly Complex / Confusing Code

### 5.1 useVideoPlayer Seek Logic

**DEFERRED** — seek mechanism with `isWaitingForSeekedRef` and `pendingSeekTimeRef` is complex. Could simplify but works correctly.

### 5.2 handleClipAction Convoluted Flow

**DEFERRED** — nested conditionals for clip logic. Could flatten and extract insufficient-duration branch.

### 5.3 onConvertWarnNoChanges Handler

**DEFERRED** — handler silently creates clip of remaining video. Could rename or split concerns.

### 5.4 VolumeControl State Redundancy

**DEFERRED** — local `volume` state mirrors video element. Could derive from video element directly.

---

## 6. Naming Inconsistencies

### 6.1 Tab Name: `clip` → `video` → FIXED

**FIXED** — GalleryView text now says "Video mode".

### 6.2 Inconsistent Event Naming

**DEFERRED** — `onClipWarnInsufficient` removed (channel unused).

### 6.3 `toastSuccess` / `toastError` vs `toast` → FIXED

**FIXED** — unified to direct `sonner.toast` calls. Removed `useToast` hook.

### 6.4 `videoTimeRef` in App.tsx

**DEFERRED** — ref tracks current playback time as parallel to app state. Could use `currentTime` from state directly.

---

## 7. Missing IPCReturns Entries → FIXED

**FIXED** — `FS_BULK_DELETE` added to `IPCReturns`. Unused channels (`CLIP_WARN_INSUFFICIENT`, `APP_DRAG_DROP`, `APP_CHECK_FFMPEG`) removed.

---

## 8. Summary of Actions Taken

### Completed (12 items)

| # | Item | Priority |
|---|------|----------|
| 1 | Fix ffmpeg clip command (`-c copy`) | High |
| 2 | Remove duplicated `VideoInfo` from ffprobe.service | High |
| 3 | Add `FS_BULK_DELETE` to `IPCReturns` | High |
| 4 | Move `SETTINGS_KEYS` to shared layer | High |
| 5 | Remove dead code (UI components, utils, exports, package.json) | High |
| 6 | Extract "load video" pattern into `useLoadVideo` hook | Medium |
| 7 | Unify toast usage (direct `sonner.toast`) | Medium |
| 8 | Replace inline debounce with `useDebouncedCallback` hook | Medium |
| 9 | Remove unused IPC handler from `index.ts` | Medium |
| 10 | Fix GalleryView text ("Clip mode" → "Video mode") | Medium |
| 11 | Remove unused IPC channels (preload, handlers, types, env.d.ts) | Medium |
| 12 | Remove unused `progress.tsx` component | Medium |
| 13 | Consolidate `ScannedFile` → `GalleryFile` | Low |

### Deferred (7 items)

| # | Item | Priority | Rationale |
|---|------|----------|-----------|
| 14 | Extract App.tsx logic into focused hooks | Low | Large refactor, works correctly |
| 15 | Simplify seek logic in useVideoPlayer | Low | Works correctly, complex but functional |
| 16 | Flatten handleClipAction conditionals | Low | Works correctly, could be cleaner |
| 17 | Rename onConvertWarnNoChanges | Low | Naming improvement only |
| 18 | Extract ClipLengthInput component | Low | Minor modularization |
| 19 | ClipPayload vs IPC type consolidation | Low | Different purposes, acceptable |
| 20 | FfmpegResult vs ClipResult consolidation | Low | Different purposes, acceptable |

---

## 9. Files Changed

### Modified
- `src/main/ffmpeg.ts` — added `-c copy` and `-avoid_negative_ts make_zero`
- `src/main/services/ffprobe.service.ts` — removed duplicated VideoInfo
- `src/shared/ipc.ts` — added FS_BULK_DELETE, removed unused channels
- `src/renderer/store/app-state.tsx` — VideoState extends VideoInfo, GalleryFile[] type
- `src/main/services/gallery.service.ts` — ScannedFile → GalleryFile, removed ensureThumbnail
- `src/shared/utils.ts` — removed debounce, getDirectory
- `src/main/db.ts` — removed closeDb
- `src/renderer/hooks/useVideoPlayer.ts` — removed getCurrentTime
- `src/renderer/components/ui/sonner.tsx` — removed dead functions
- `src/renderer/components/GalleryView.tsx` — fixed "Clip mode" → "Video mode"
- `src/main/index.ts` — removed ipcMain import, removed clip:warn-insufficient handler
- `src/main/ipc-handlers.ts` — removed unused dragDrop/checkFfmpeg handlers
- `src/preload/index.ts` — removed unused IPC bindings
- `src/renderer/hooks/useConvertSettings.ts` — now imports SETTINGS_KEYS from shared
- `src/env.d.ts` — removed unused IPC entries
- `src/renderer/App.tsx` — unified toast, added useLoadVideo
- `src/renderer/components/TopBar.tsx` — now uses useLoadVideo
- `src/renderer/components/CaptionOverlay.tsx` — now uses useDebouncedCallback
- `src/renderer/hooks/useCaption.ts` — now uses useDebouncedCallback
- `package.json` — removed vaul dependency, fixed JSON corruption

### Added
- `src/shared/constants.ts` — shared SETTINGS_KEYS
- `src/renderer/hooks/useLoadVideo.ts` — shared video loading hook
- `src/renderer/hooks/useDebouncedCallback.ts` — shared debounce hook

### Deleted
- `src/renderer/components/ui/drawer.tsx`
- `src/renderer/components/ui/button-group.tsx`
- `src/renderer/components/ui/separator.tsx`
- `src/renderer/components/ui/progress.tsx`
