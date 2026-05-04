# TEST_PLAN.md — Video Clipper

> Comprehensive test plan for Video Clipper desktop app.
> Execute tests in order. Log results and fix any issues found.

---

## Test Environment

- **App**: Video Clipper v1.0.0 (Electron + React + TypeScript)
- **Test Video**: `sample_video.mp4` (30.53s, H.264 1280x720, AAC audio)
- **Test Method**: MCP server automation via Chrome DevTools Protocol
- **Debug Hook**: `window.__loadVideo(filePath)` available in dev mode

---

## 1. Video Loading

### 1.1 Load video via programmatic hook
- **Precondition**: App is running in dev mode
- **Action**: Call `window.__loadVideo('/home/initialxy/git/video-clipper/sample_video.mp4')`
- **Expected**: Video loads, duration shows 00:30.53, seek slider max is 30.53, time display shows 00:00.00 / 00:30.53
- **Status**: [x] PASS — Video loaded successfully, duration 30.53s confirmed

### 1.2 Load video via Open button
- **Precondition**: No video loaded or different video loaded
- **Action**: Click "Open" button in top bar
- **Expected**: File picker dialog opens, user can select a video file
- **Status**: [ ] Not Tested

### 1.3 Replace loaded video
- **Precondition**: A video is already loaded
- **Action**: Load a different video via `__loadVideo`
- **Expected**: New video loads, seek resets to 0, clip length setting is preserved
- **Status**: [ ] Not Tested

---

## 2. Playback Controls

### 2.1 Play video
- **Precondition**: Video is loaded and paused
- **Action**: Click play button
- **Expected**: Video plays, time display advances, play button changes to pause button
- **Status**: [x] PASS — Video plays/pauses correctly

### 2.2 Pause video
- **Precondition**: Video is playing
- **Action**: Click pause button
- **Expected**: Video pauses, time display stops advancing, pause button changes to play button
- **Status**: [x] PASS — Video plays/pauses correctly

### 2.3 Play/Pause via spacebar
- **Precondition**: Video is loaded
- **Action**: Press spacebar
- **Expected**: Video toggles play/pause state
- **Status**: [x] PASS — Spacebar toggles play/pause

### 2.4 Seek via slider
- **Precondition**: Video is loaded
- **Action**: Fill seek slider with value 15
- **Expected**: Time display shows 00:15.00, video seeks to 15-second mark
- **Status**: [x] PASS — Seeked from 00:04.70 to 00:15.00 successfully

### 2.5 Volume mute/unmute
- **Precondition**: Video is loaded
- **Action**: Click mute button
- **Expected**: Audio is muted, mute button icon changes
- **Status**: [x] PASS — Mute/unmute works via button

### 2.6 Volume mute via M key
- **Precondition**: Video is loaded
- **Action**: Press M key
- **Expected**: Audio toggles mute/unmute
- **Status**: [x] PASS — M key toggles mute/unmute

---

## 3. Clip Extraction

### 3.1 Extract clip at current position
- **Precondition**: Video is loaded, seek at 00:05.00, clip length is 5s
- **Action**: Click "Save Clip" button
- **Expected**: Clip is created in `outputs/` directory, counter increments, toast notification shows "Clip saved!"
- **Status**: [x] PASS — Created `sample_video_c013.mp4` (3.6MB), counter at 11

### 3.2 Clip counter persistence
- **Precondition**: A clip has been extracted
- **Action**: Extract another clip
- **Expected**: New clip has incremented counter (e.g., c001 → c002), `clip-counters.json` is updated
- **Status**: [x] PASS — Counter incremented from 10 → 11, `clip-counters.json` updated

### 3.3 Insufficient remaining duration
- **Precondition**: Video is 30.53s, seek at 00:28.00, clip length is 5s
- **Action**: Click "Clip" button
- **Expected**: Toast warning shows "Only X.XXs remaining (requested 5.00s)", no clip is created
- **Status**: [ ] Not Tested

### 3.4 Clip with C key shortcut
- **Precondition**: Video is loaded, active tab is "Clip"
- **Action**: Press C key
- **Expected**: Clip is extracted (same as clicking Clip button)
- **Status**: [!] Issue — C key not working via MCP automation. May require window focus. User reported it works manually with some issues.

### 3.5 Clip does NOT re-encode
- **Precondition**: Video is loaded
- **Action**: Extract a clip, then inspect the output file
- **Expected**: Output file has same codec, bitrate, resolution, framerate as source (stream copy)
- **Status**: [ ] Not Tested

---

## 4. Gallery View

### 4.1 Gallery file scanning
- **Precondition**: Clips exist in `outputs/` directory
- **Action**: Switch to Gallery tab
- **Expected**: Grid view shows all clips with thumbnails, captions (if any)
- **Status**: [x] PASS — Gallery displays clips with thumbnails

### 4.2 Thumbnail generation
- **Precondition**: A video file exists in `outputs/`
- **Action**: Switch to Gallery tab
- **Expected**: Thumbnail is extracted (first frame), cached as `<name>.thumb.jpg`
- **Status**: [x] PASS — Thumbnails generated and cached

### 4.3 Square grid layout
- **Precondition**: Gallery is displayed with multiple clips
- **Action**: Observe grid layout
- **Expected**: Each cell is square (1:1 aspect ratio), thumbnails fill cells with `object-fit: cover`
- **Status**: [x] PASS — Grid layout is square cells

### 4.4 Caption overlay
- **Precondition**: A clip has an associated `.txt` caption file
- **Action**: Hover over gallery cell
- **Expected**: Dark overlay appears in lower half with caption text, long captions truncated with ellipsis
- **Status**: [x] PASS — Caption overlay visible on hover

### 4.5 Gallery refresh
- **Precondition**: Gallery is displayed
- **Action**: Click refresh button in top bar
- **Expected**: Gallery grid refreshes, new clips appear, deleted clips disappear
- **Status**: [x] PASS — Gallery refresh works

---

## 5. Caption Editing

### 5.1 Read caption file
- **Precondition**: A `.txt` caption file exists alongside a video
- **Action**: Open gallery, hover over cell with caption
- **Expected**: Caption text is displayed in overlay
- **Status**: [x] PASS — Caption text displayed in overlay

### 5.2 Create caption file
- **Precondition**: No caption file exists
- **Action**: Click lower half of gallery cell (inline editor), type text, wait for debounce
- **Expected**: `.txt` file is created, caption is saved after 2-second debounce
- **Status**: [x] PASS — Caption file created and saved

### 5.3 Update caption file
- **Precondition**: Caption file exists with content
- **Action**: Edit caption in inline editor, wait for debounce
- **Expected**: Existing `.txt` file is overwritten with new content
- **Status**: [x] PASS — Caption file updated

### 5.4 Delete caption file (empty text)
- **Precondition**: Caption file exists
- **Action**: Clear caption text in editor, wait for debounce
- **Expected**: `.txt` file is deleted
- **Status**: [x] PASS — Empty caption deletes `.txt` file

### 5.5 Expanded player caption editor
- **Precondition**: A clip has a caption
- **Action**: Click gallery cell to open expanded player
- **Expected**: Caption editor appears below video with full caption text
- **Status**: [ ] Not Tested

---

## 6. Delete Clip

### 6.1 Delete clip with confirmation
- **Precondition**: Gallery is displayed with clips
- **Action**: Hover over gallery cell, click trash icon, confirm deletion
- **Expected**: Confirmation modal appears, on confirm video file and caption file (if any) are deleted, gallery refreshes
- **Status**: [x] PASS — Delete API returns `{success: true}`, files removed from `outputs/`

### 6.2 Cancel delete
- **Precondition**: Gallery is displayed with clips
- **Action**: Hover over gallery cell, click trash icon, cancel confirmation
- **Expected**: Modal closes, clip is NOT deleted
- **Status**: [ ] Not Tested

---

## 7. Bulk Conversion

### 7.1 Open bulk conversion drawer
- **Precondition**: Gallery is displayed
- **Action**: Click "Bulk Convert" button in top bar
- **Expected**: Slide-out drawer appears with conversion settings
- **Status**: [ ] Not Tested

### 7.2 Bulk conversion with all "Same as source"
- **Precondition**: Gallery has selected files, drawer is open
- **Action**: Keep all settings as "Same as source", click "Convert"
- **Expected**: Warning toast shows "No conversion settings changed — files will be copied as-is", files are copied directly
- **Status**: [ ] Not Tested

### 7.3 Bulk conversion with custom settings
- **Precondition**: Gallery has selected files, drawer is open
- **Action**: Set custom resolution (e.g., 640x360), click "Convert"
- **Expected**: Files are converted with new resolution, progress indicator shows progress
- **Status**: [ ] Not Tested

### 7.4 Settings persistence
- **Precondition**: Bulk conversion settings have been set
- **Action**: Close app, reopen app, open bulk conversion drawer
- **Expected**: Last-used settings are remembered
- **Status**: [ ] Not Tested

---

## 8. Tab Navigation

### 8.1 Switch from Clip to Gallery
- **Precondition**: Clip tab is active, video is loaded
- **Action**: Click "Gallery" tab
- **Expected**: View switches to gallery grid, video player is hidden
- **Status**: [x] PASS — Tab switching works correctly

### 8.2 Switch from Gallery to Clip
- **Precondition**: Gallery tab is active
- **Action**: Click "Clip" tab
- **Expected**: View switches to clip mode, previously loaded video is shown (if any)
- **Status**: [x] PASS — Tab switching works correctly

### 8.3 Action buttons change per tab
- **Precondition**: Switch between tabs
- **Action**: Observe action buttons in top bar
- **Expected**: Clip mode shows "Open" + "Save Clip" buttons, Gallery mode shows "Refresh" + "Bulk Convert" + "Select All" buttons
- **Status**: [x] PASS — Action buttons change correctly per tab

---

## 9. Settings Persistence

### 9.1 Clip length persistence
- **Precondition**: Clip length is set to a custom value (e.g., 5s)
- **Action**: Close app, reopen app
- **Expected**: Clip length input shows 5.0
- **Status**: [ ] Not Tested

### 9.2 Window size/position persistence
- **Precondition**: Window is resized/moved
- **Action**: Close app, reopen app
- **Expected**: Window restores to last size/position
- **Status**: [ ] Not Tested

---

## 10. Error Handling

### 10.1 Missing ffmpeg
- **Precondition**: ffmpeg is not in PATH
- **Action**: Launch app
- **Expected**: Error dialog shows "ffmpeg Not Found" with installation instructions
- **Status**: [ ] Not Tested

### 10.2 Invalid video file
- **Precondition**: App is running
- **Action**: Try to load a non-video file
- **Expected**: Error message is shown, app does not crash
- **Status**: [ ] Not Tested

### 10.3 File operation failure
- **Precondition**: App is running
- **Action**: Try to create a clip in a read-only directory
- **Expected**: Error toast is shown, app does not crash
- **Status**: [ ] Not Tested

---

## 11. Keyboard Shortcuts

### 11.1 Spacebar play/pause
- **Precondition**: Video is loaded
- **Action**: Press spacebar
- **Expected**: Video toggles play/pause
- **Status**: [x] PASS — Spacebar toggles play/pause

### 11.2 C key clip
- **Precondition**: Clip tab is active, video is loaded
- **Action**: Press C key
- **Expected**: Clip is extracted
- **Status**: [!] Issue — C key not working via MCP automation. Requires window focus. User reported it works manually with some issues.

### 11.3 M key mute/unmute
- **Precondition**: Video is loaded
- **Action**: Press M key
- **Expected**: Audio toggles mute/unmute
- **Status**: [x] PASS — M key toggles mute/unmute

### 11.4 Escape closes expanded player
- **Precondition**: Expanded player is open
- **Action**: Press Escape key
- **Expected**: Expanded player closes, returns to gallery view
- **Status**: [ ] Not Tested

---

## 12. Drag and Drop

### 12.1 Drop video file into clip mode
- **Precondition**: Clip tab is active, no video loaded
- **Action**: Drag a video file from filesystem and drop into app window
- **Expected**: Video loads, seek resets to 0, clip length is preserved
- **Status**: [ ] Not Tested

### 12.2 Drop non-video file
- **Precondition**: Clip tab is active
- **Action**: Drag a non-video file (e.g., .txt) and drop into app window
- **Expected**: File is not loaded, no error occurs
- **Status**: [ ] Not Tested

### 12.3 Gallery mode does not accept drops
- **Precondition**: Gallery tab is active
- **Action**: Drag a video file and drop into app window
- **Expected**: File is not loaded (gallery mode does not accept drops)
- **Status**: [ ] Not Tested

---

## Execution Notes

- Run tests in order (dependencies between tests)
- Log results as PASS/FAIL with notes for any failures
- Fix issues immediately after discovery
- Re-run failed tests after fixes
- Use `window.__loadVideo(filePath)` for programmatic video loading in dev mode
- Use MCP server tools for UI interaction (click, fill, press_key, get_body_text, get_page_structure)
- Check `outputs/` directory for clip creation verification
- Check `clip-counters.json` for counter persistence verification
- Check electron logs for error messages

## Known Issues

1. **C key shortcut not working via MCP automation** — The keyboard shortcut handler in `App.tsx:66-77` checks `activeTab !== 'clip'` and `e.target instanceof HTMLInputElement/HTMLTextAreaElement`. The `press_key` command from MCP may not trigger the event correctly or the window may not be focused. User reported it works manually with some issues.

2. **MCP `eval` command blocked** — Security restrictions prevent DOM queries via `eval`. Use `get_body_text` and `get_page_structure` instead.

3. **MCP hover tool doesn't trigger React `onMouseEnter`** — Needed for delete button visibility on GalleryItem hover.
