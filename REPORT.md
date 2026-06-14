# Source Verification Report

**Date:** 2026-06-14
**Scope:** Verification of AGENTS.md claims against actual source code

---

## What the App Does

Desktop app (Electron + React + TypeScript) for clipping video files into short segments to create training data for video diffusion models. Users load source videos, scrub to positions, clip segments of configurable duration, add descriptive captions, and optionally batch-convert or auto-caption clips via LLM.

---

## Verification Summary

| Category | Status |
|----------|--------|
| Clipping | ✅ Accurate |
| Gallery | ✅ Accurate |
| Caption store | ✅ Accurate (minor stale comment) |
| Bulk conversion | ✅ Accurate |
| Frame count scanning | ✅ Accurate |
| Auto-captioning | ✅ Accurate (one undocumented feature) |
| Bulk edit | ⚠️ Bug found |
| Keyboard shortcuts | ✅ Accurate |
| Settings persistence | ✅ Accurate |
| App state / reducer | ✅ Accurate |
| Build config | ✅ Accurate |
| Window creation | ✅ Accurate |
| Toast behavior | ✅ Accurate |
| IPC channels | ⚠️ Count mismatch |

---

## Discrepancies

### 1. Stale comment in caption-store.tsx — ✅ Fixed

**File:** `src/renderer/store/caption-store.tsx`

Comment updated from `(2s)` to `(500ms)` to match the actual timeout value.

---

### 2. Bug: `ensureLoaded()` not awaited in BulkEditDrawer — ✅ Fixed

**File:** `src/renderer/components/BulkEditDrawer.tsx`

`applyToFiles()` made `async`, `ensureLoaded()` is now `await`ed before `getCaption()`. Callers (`handlePrepend`, `handleAppend`) updated to `async` as well.

---

### 3. IPC channel count mismatch — ✅ Fixed

**File:** `AGENTS.md`

Updated count from 17 to 18. Added `caption:changed` row to IPC table with description.

---

### 4. Undocumented: reasoning_content handling — ✅ Documented

**File:** `AGENTS.md`

Added entry to Key Design Decisions: auto-caption service handles `reasoning_content` from reasoning models (DeepSeek R1, etc.) by extracting caption text after closing `<thinking>`/`<reasoning>` tags.

---

### 5. Undocumented: `onConvertWarnNoChanges` auto-clips — ✅ Documented

**File:** `AGENTS.md`

Added note to IPC table entry for `convert:warn-no-changes`: this is the desired behavior — when conversion is a no-op, the renderer auto-clips the remaining video from current playback position.

---

## Files Reviewed

| File | Purpose |
|------|---------|
| `src/shared/ipc.ts` | IPC channel names, payloads, returns |
| `src/shared/types.ts` | Domain types |
| `src/shared/utils.ts` | Pure utilities |
| `src/main/index.ts` | Window creation, app lifecycle |
| `src/main/ffmpeg.ts` | Pure ffmpeg command builders |
| `src/main/paths.ts` | Centralized directory paths |
| `src/main/settings.ts` | JSON config persistence |
| `src/main/ipc-handlers.ts` | IPC route delegation |
| `src/main/services/clip.service.ts` | Clip creation with counter |
| `src/main/services/convert.service.ts` | Bulk conversion + flip |
| `src/main/services/auto-caption.service.ts` | LLM auto-captioning |
| `src/main/services/caption.service.ts` | Caption file CRUD |
| `src/main/services/gallery.service.ts` | File scanning, deletion, thumbnails |
| `src/main/services/converted.service.ts` | Frame count scanning |
| `src/renderer/App.tsx` | Root component, drag-drop, toasts, shortcuts |
| `src/renderer/store/app-state.tsx` | Central state (context + useReducer) |
| `src/renderer/store/caption-store.tsx` | Reactive caption cache |
| `src/renderer/hooks/useVideoPlayer.ts` | Playback controls |
| `src/renderer/hooks/useVideoKeyboardShortcuts.ts` | Global keyboard shortcuts |
| `src/renderer/hooks/useClipAction.ts` | Clip action with edge cases |
| `src/renderer/hooks/useGallery.ts` | Gallery scanning and refresh |
| `src/renderer/hooks/useAutoCaption.ts` | Auto-caption orchestration |
| `src/renderer/components/VideoPlayer.tsx` | Main video player |
| `src/renderer/components/GalleryItem.tsx` | Gallery card with caption overlay |
| `src/renderer/components/ExpandedPlayer.tsx` | Full player for gallery items |
| `src/renderer/components/BulkConvertDrawer.tsx` | Conversion settings drawer |
| `src/renderer/components/BulkEditDrawer.tsx` | Bulk caption editing drawer |
| `src/renderer/components/AutoCaptionDrawer.tsx` | LLM API settings drawer |
| `vite.config.ts` | Build configuration |
