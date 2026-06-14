# Refactoring TODO

> Based on CODE_QUALITY_REPORT.md — tracking implementation progress.

## Phase 1 — Quick Wins ✅

- [x] **#8** `SETTINGS_KEYS` — add `CLIP_LENGTH`, replace inline strings across codebase
- [x] **#5** `GalleryItem` — remove dead `onCaptionChanged` listener (N+1 subscriptions)
- [x] **#3** `useGallery` — auto-refresh when switching to gallery tab
- [x] **#11** Delete unused `useToast` hook

## Phase 2 — Medium Effort

- [x] **#1** Extract `useSettingsSync` hook from `app-state.tsx` (249 → 219 lines)
- [x] **#4** Preload IPC listener boilerplate — create `createListener` helper
- [x] **#7** `auto-caption.service.ts` — decouple from Electron `BrowserWindow`
- [x] **#6** `BulkEditDrawer` — use `useCaptionStore()` instead of direct IPC
- [x] **#10** Centralize directory paths in `src/main/paths.ts`

## Phase 3 — Larger Refactors

- [x] **#2** `App.tsx` (523 → 444 lines) — extracted `useClipAction`, `useAutoCaption` hooks
- [ ] **#9** `useVideoPlayer` — consolidate triple time-update paths into single source

## Phase 4 — Low Priority Cleanup

- [ ] **#12** Preload manual channel mapping — codegen or single wrapper
- [ ] **#13** `buildConvertOptions` — inline or guard pattern
- [ ] **#14** `countFrames` — use `runFfprobe` instead of manual spawn
- [ ] **#15** `getVideoInfo` — use `runFfprobe` instead of manual spawn
- [ ] **#16** Debug helpers — register once instead of every render
- [ ] **#17** Import pattern consistency
- [ ] **#18** Caption save debounce inconsistency

## Architectural (Future)

- [ ] **A** Settings service with typed groups
- [ ] **B** Unified `ProgressEvent` type
- [ ] **C** Drawer self-managed open/close state
- [ ] **D** `useElectronAPI` hook
- [ ] **E** Consistent error handling pattern
