# PRD — Video Clipper

## Overview

A desktop app for clipping video files (.mp4) to create training data for video diffusion models. The app provides precise frame-level seeking, clip extraction preserving original encoding properties, caption management, and bulk transcoding.

**Primary purpose**: Create and manage captioned video clip datasets for video diffusion model training. Caption visibility and quick editing are critical.

**Tech Stack**: Electron + React + TypeScript + Tailwind CSS + shadcn/ui  
**UI Primitives**: Base UI (`@base-ui/react`) — all shadcn components use Base UI primitives. Do NOT use Radix UI primitives (`@radix-ui/react-*`).  
**shadcn/ui Components**: Button, Select, Sheet, Tabs, Input, Textarea, Slider, Dialog, Progress, Label, Card, Sonner (toast notifications). All components use Base UI primitives via `base-nova` style.
**External Dependency**: ffmpeg (must be installed on the host machine — checked on app launch via `ffmpeg -version`)  
**Persistent Storage**: JSON file for settings persistence (clip length, bulk convert settings)  
**Toast Notifications**: Sonner for toast notifications

---

## Core Features

### 1. Tab Navigation

The app has a tab bar on the **left side of the top bar** with two modes using shadcn Tabs component:
- **Video** (with Video icon) — video editor with player, seek, and clip extraction
- **Gallery** (with Images icon) — grid view of all clipped videos with captions, bulk delete

Action buttons for the active tab appear on the **right side of the top bar**.

### 2. Video Loading (Video Mode)

- **Drag & drop**: Drop any video file from the filesystem into the app window to load it. Only available in Video mode.
- **Open File button**: A fallback action button in the Video mode top bar that opens a file picker dialog.
- **Load new video**: Dropping a new video file replaces the currently loaded video. The seek pointer resets to 0. The clip length setting is preserved across video loads.
- Supported formats: Any format ffmpeg can read (primarily .mp4, but not limited to).

### 3. Playback Controls (Video Mode)

- **Play / Pause**: Toggle playback with button or spacebar (global, even when not focused on player).
- **Mute / Unmute**: Toggle audio mute with button or `M` key.
- **Volume slider**: Inline slider next to mute button for fine-grained volume control.
- **Seek slider**: A precise seek control that supports sub-second granularity. The slider must accurately reflect and set the playback position to fractional-second precision (e.g., 3.7s).
- **Time display**: Show current time and total duration in `MM:SS.xx` format (hundredths of a second).
- **No skip buttons**: No `<<` / `>>` skip controls.

### 3.1 Keyboard Shortcuts (Unified)

Keyboard shortcuts work globally across both Video mode and the Expanded Player (Gallery mode), as long as no text input or textarea is focused. All shortcuts are registered on the `window` object using the capturing event phase to ensure they fire before any native video element behavior.

| Key | Action |
|-----|--------|
| `Space` | Toggle play / pause |
| `M` | Toggle mute / unmute |
| `←` (Left Arrow) | Seek backward by 1 second |
| `→` (Right Arrow) | Seek forward by 1 second |
| `↑` (Up Arrow) | Increase volume by 0.1 (10%) |
| `↓` (Down Arrow) | Decrease volume by 0.1 (10%) |
| `Escape` | Close the Expanded Player (Gallery mode only) |

**Notes:**
- `isInputFocused()` guard: shortcuts are ignored when a `<textarea>` or `<input>` (except range inputs like sliders) has focus.
- Volume changes are reflected in the VolumeControl UI slider and icon.
- The `Escape` key only applies in Expanded Player mode (closes the player and returns to the gallery grid).

### 4. Clip Extraction (Video Mode)

- **Clip length input**: A floating-point number field in the top bar, defaulting to `10.0` seconds. The user can set any positive float value (e.g., `2.5`, `15.0`, `0.1`).
- **Clip button**: Labeled "Clip" with keyboard shortcut `C`.
- **Clip behavior**:
  - Clips from the current seek position to `seek_position + clip_length`.
  - Saves to `outputs/` directory with naming convention: `<original_name>_c<NNN>.<ext>` where `<NNN>` is a zero-padded 3-digit incremental counter (e.g., `v001_c001.mp4`, `v001_c002.mp4`).
  - The counter is per-source-video and persists across sessions (tracks the last used number).
  - **After a successful clip**: Seek position does NOT change. Show a toast notification informing the user that the clip was saved, including the file name. The toast uses Sonner's default auto-dismiss (~4 seconds).
- **Insufficient remaining duration**: If `clip_length` extends beyond the video's end, show a warning toast offering to clip the remaining duration instead (from current seek position to end of video). The toast uses Sonner's default auto-dismiss (~4 seconds).
- **Re-encoding**: The clipped video is re-encoded using ffmpeg with `-ss` placed **after** `-i` for frame-accurate seeking (decodes from the beginning but lands on the exact position).
  - Re-encoding is used instead of stream copy because stream copy cannot decode frames between keyframes, causing missing content at the clip start.
  - The output preserves the original container format, resolution, and audio codec (audio is copied with `-c:a copy`).

### 5. Gallery Mode

- **Gallery grid**: Displays all clipped videos from the `outputs/` directory as a grid of thumbnails.
- **Grid layout rules**:
  - Each grid cell is **square** (1:1 aspect ratio).
  - Minimum cell size: **250x250px** when viewport allows.
  - Cell size adjusts dynamically based on viewport width. Calculate max columns that fit, then distribute evenly.
  - If viewport is smaller than 250px, cell size adapts to fit (minimum practical size).
- **Thumbnail**: Each cell shows the first frame of the video as a static thumbnail, rendered as **object-fit: cover** (cropped to fill the entire square cell). The thumbnail fills the entire cell as a background image.
- **Caption overlay**: The **lower half** of each grid cell has a dark overlay (semi-transparent dark background) with the caption text displayed on top.
  - If text is too long, it overflows within the overlay area (uses `overflow-hidden` without explicit ellipsis truncation).
  - Clicking the lower half (caption area) converts it into an inline text editor for editing.
  - The editor supports scrolling for longer text.
  - On blur or 0.5-second debounce, save the caption.
  - The inline caption editor has no visible focus ring (outline only).
  - Collapse/expand icons are vertical chevrons: `ChevronDown` for collapse, `ChevronUp` for expand.
- **Gallery refresh**:
  - Scans the `outputs/` directory when the Gallery tab is first mounted.
  - Manual refresh button available in the Gallery top bar.
- **Delete clip**:
  - On mouse hover over a gallery cell, a red trash can icon appears in the top-right corner of the cell.
  - Clicking the trash icon opens a confirmation modal asking the user to confirm deletion.
  - If confirmed, delete both the video file and its accompanying `.txt` caption file (if it exists).
  - The gallery grid refreshes after deletion.
- **Selection**:
  - Multi-select: Click individual items to select/deselect.
  - Select All: A checkbox or button to select all files in the gallery.
  - Bulk Delete: A "Delete" button in the Gallery top bar (destructive color) that deletes all selected files. Disabled when no files are selected. On confirm, deletes both the video file and its `.txt` caption file.
- **Auto-caption**: A button in the Gallery top bar (secondary variant) labeled "Auto-caption" that opens a dialog to configure the LLM endpoint and initiate bulk auto-captioning for all selected files. See Section 8.
- **Bulk Edit**: A button in the Gallery top bar (secondary variant) labeled "Edit" with a `FilePenLine` icon. Opens a slide-out drawer from the right side with two sections:
  1. **Text prepend/append**: A text area for entering text, a checkbox labeled "Insert only if not found" (if checked and the text already exists in a caption, that file is skipped), and two action buttons "Prepend" and "Append" — each applies the action immediately to all selected files.
  2. **Search and replace**: A search text field, a replace text field, and a "Replace All" button that replaces all occurrences of the search text with the replace text in selected captions.
  - No toast notifications for bulk edit operations.
  - The button is disabled when no files are selected.
  - Captions update reactively via the caption store (same mechanism as auto-caption).

### 6. Expanded Player (Gallery Mode)

- Clicking the **upper half** (thumbnail area) of a gallery cell opens the expanded player.
- Video fills the viewport optimally (maintaining aspect ratio).
- Play, pause, seek, and volume controls are available.
- Audio plays with sound.
- **Caption editor**: A text area is displayed **below** the video (not overlaying it) for entering/editing caption text.
- Caption is saved as a `.txt` file with the same base name as the video (e.g., `v001_c003.mp4` → `v001_c003.txt`).
- **Autosave with debounce**: Caption text is automatically saved on input with a 0.5-second debounce (shared with the caption store's global debounce).
- The `.txt` file is created on first save (does not exist initially).
- **Auto-caption button**: A button labeled "Auto-caption" appears next to the caption text area. Clicking it sends the current video's thumbnail to the LLM for captioning. During processing, the button is disabled with a tooltip indicating progress.
- Close button or Escape key returns to gallery grid.
- **Tab switch closes player**: Switching from Gallery to Video tab automatically closes the expanded player.
- **Video stops on close**: Video playback stops when the expanded player is closed.

### 7. Bulk Conversion Mode (Gallery)

- **Activation**: A "Convert" button in the Gallery top bar (primary color) opens a **slide-out drawer** from the right side.
- **Frame count check**: A "Check Frame Count" button (secondary variant) in the Bulk Convert drawer footer, positioned between the Reset and Convert buttons. Clicking it scans the `converted/` directory and displays a scrollable list of converted files with their exact frame counts (via ffprobe `-count_frames`). Toast notifications for empty directory or errors. Results are displayed in a scrollable list below the button within the drawer.
- **Selection**:
  - Multi-select: Click individual items to select/deselect.
  - Select All: A checkbox or button to select all files in the gallery.
- **Conversion settings panel** (inside the drawer):
  - Each parameter is **optional** — the user may change only what they need while keeping everything else from the source.
  - **Codec**: Dropdown with a `"Same as source"` option (default). Other options: `libx264`, `libx265`, `libsvtav1`, `mpeg4`. A "clear" button resets to source.
  - **Resolution**: Width and height inputs with a `"Same as source"` toggle. When set, the app scales up to cover the target resolution (`force_original_aspect_ratio=increase`) and crops the excess to fill the frame without stretching (no letterboxing/pillarbox). A "clear" button resets to source.
   - **Frame rate**: Numeric input for target fps (e.g., 24, 30, 60) with a `"Same as source"` toggle. When set, uses motion-compensated frame interpolation (`minterpolate=fps=X:mi_mode=mci`) in the video filter chain to generate intermediate frames rather than dropping/duplicating frames. A "clear" button resets to source.
  - **Bitrate**: Numeric input for target bitrate (e.g., `5000k`, `10M`) with a `"Same as source"` toggle. A "clear" button resets to source.
  - **Create flipped copy**: A checkbox option. When checked, after the encoding step (or file copy for no-op), a second ffmpeg step runs `-vf "hflip"` to create a horizontally flipped copy. Output file is named `<base>_flipped.<ext>`. The accompanying caption file is also copied with all occurrences of "left" ↔ "right" swapped (using a placeholder-based 3-step replace to avoid collision). A "clear" button resets to source.
  - **Settings persistence**: The drawer remembers the last-used settings via JSON config file. When the user reopens the drawer, the previous settings are restored.
- **Execution**:
  - Converts all selected files using the specified settings.
  - Outputs to `converted/` directory.
  - Files in `converted/` can be overwritten without warning.
  - Accompanying `.txt` caption files are copied alongside converted videos. If flipped copy is enabled, the flipped caption file has "left" ↔ "right" word swap applied.
  - Show progress indicators (per-file and overall).
  - When a param is "Same as source", simply omit that ffmpeg flag (don't pass `-c:v`, `-b:v`, or `-vf` for that param).

---

### 8. Auto-caption (Gallery)

- **LLM Configuration**: Configurable via a modal dialog with fields for:
  - **Base URL** (e.g., `http://localhost:8080`) — default: `http://localhost:8080` (single string field, not separate URL + port)
  - **Model name** — default: `model`
  - **API key** — default: `DUMMY` (optional, sent as `Authorization` header if provided)
  All settings stored in JSON config file under key `AUTO_CAPTION_CONFIG` (object with `baseUrl`, `model`, `apiKey`).
- **UI — ButtonGroup**: The Auto-caption button in the Gallery top bar uses a `ButtonGroup` pattern:
  ```
  ┌──────────────────┬───┐
  │ Auto-caption     │ ⋮ │  ← secondary variant, ellipsis-vertical icon
  └──────────────────┴───┘
  ```
  The main button triggers auto-captioning for the selected files. The button is **disabled** when no files are selected. The ellipsis-vertical icon button opens the **Auto-caption Settings** dialog where the user can configure the base URL, model name, and API key.
- **Activation**:
  - **Gallery bulk mode**: With N files selected, clicking "Auto-caption" sends a request to the LLM for each file. The button is **disabled** when no files are selected (same as Delete and Convert buttons).
  - **Expanded player mode**: When a video is expanded, a separate "Auto-caption" button appears below the video (next to the caption text area). Clicking it captions only that single file.
  - **Gallery grid single-cell**: No direct auto-caption from the grid — only accessible via the expanded player.
  - **Video tab**: No auto-caption in the Video tab. Gallery-only feature.
- **Prompt construction**:
  - **System prompt**: Instruct the LLM to write a plain-text caption prefixed with `Caption: `. Example:
    ```
    You are a helpful assistant that writes short, descriptive captions for video clips used in AI training data.
    You will be shown a single image (a frame from a video). Write a plain-text caption describing what is happening in this video clip.
    Do NOT use markdown, headings, bullet points, or any formatting — just return the raw caption text.
    Prefix your caption with "Caption: " at the very beginning of your response.
    ```
  - **User prompt** (per frame):
    - If **no existing caption**: `"Describe what is happening in this video clip."`
    - If **existing caption exists**: `"Existing caption: \"<existing caption>\". Add visual description of what you see in the image that complements the existing caption. Preserve the existing caption's dialogue and spoken content — do not rewrite or remove it. Combine the existing caption with your visual description into a single cohesive caption."`
  - A single frame (thumbnail) from the video is sent as part of the request as a base64-encoded string (see API contract below).
- **Response parsing**:
  - Search the LLM response for `Caption:` prefix.
  - If found, extract everything after the first `Caption:` (trimmed) as the new caption.
  - If `Caption:` is **not** found, fallback to using the entire LLM response (trimmed).
  - Write the parsed caption to the `.txt` file, overwriting any existing content.
- **Bulk processing UI state** (persistent Sonner toast):
  - During processing, a **persistent toast** appears (using `toast.loading()` with `duration: Infinity` and a fixed toast ID) showing:
    - Description: "Auto-captioning..."
    - A thin progress bar (full width)
    - Counter at the right: `n / total`
  - The toast updates dynamically as progress changes (by calling `toast.custom()` with the same fixed ID).
  - The progress toast is only dismissed when `current === total` (all files done), not on per-file `done` events.
  - On completion: a standard info toast appears — "Auto-captioned n clips" (all success) or "Auto-caption failed for n clips" (any failures).
  - The operation is **interruptible**: clicking Cancel stops processing remaining files.
- **Button states during processing**:
  - Both the Gallery top bar Auto-caption button and the expanded player Auto-caption button are **disabled** (grayed out) while captioning is in progress.
  - They re-enable once the operation completes (success, error, or cancellation).
- **API contract**:
  - **Request**: `POST <baseUrl>/v1/chat/completions` (OpenAI-compatible format)
    - **Headers**: `Content-Type: application/json`, `Authorization: Bearer <apiKey>` (if apiKey is provided)
    - **Body**:
      ```json
      {
        "model": "<model>",
        "messages": [
          {
            "role": "system",
            "content": "<system prompt>"
          },
          {
            "role": "user",
            "content": [
              { "type": "text", "text": "<user prompt>" },
              { "type": "image_url", "image_url": { "url": "data:image/jpeg;base64,<base64_encoded_thumbnail>" } }
            ]
          }
        ],
        "max_tokens": 2024,
        "stream": false
      }
      ```
    - The image is the existing gallery thumbnail JPEG file (already extracted for the gallery grid). Read from disk, base64-encoded, and embedded inline as a data URI.
  - **Response**: Standard OpenAI-compatible chat completion JSON. Extract `choices[0].message.content`.
  - **Reasoning models**: For models that return `reasoning_content` (e.g., o-series, DeepSeek-R1) instead of `content`, the code extracts the response by finding the last closing tag (`</reasoning>`, `</thinthinking>`, etc.) and using the text after it. If no closing tag is found, the full `reasoning_content` is used.
  - **Error handling**: If the LLM returns an error or times out, skip the file, log the error, and continue with the next file. Show a final toast summarizing successes and failures.
  - **Timeout**: 60 seconds per request.
- **Concurrency**: Process files **sequentially** (one at a time) to avoid overwhelming the local LLM server. No parallel requests.
- **Toast notifications**:
  - On completion (all success): info toast — "Auto-captioned n clips".
  - On completion (any failures): error toast — "Auto-caption failed for n clips".
  - On interrupt: error toast — "Auto-caption failed".

---

## UI Layout

### Top Bar

```
┌─────────────────────────────────────────────────────────────────┐
│  [Video] [Gallery]    ...       [⏱ 10.0s] [Clip]              │
└─────────────────────────────────────────────────────────────────┘
   ↑ tabs                    ↑ action buttons for active tab
```

### Video Mode

```
┌─────────────────────────────────────────────────────────────────┐
│  [Video] [Gallery]      ...       [⏱ 10.0s] [Clip]            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                                                         │    │
│  │                                                         │    │
│  │                   VIDEO PLAYER                          │    │
│  │                                                         │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  [▶/❚❚] [🔊] [===o===]  00:03.70 / 05:22.40                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Gallery Mode

```
┌───────────────────────────────────────────────────────────────────────┐
│  [Video] [Gallery]    ...  [Select All] [Auto-caption ⋮] [Convert]  │
│                                          [Delete] [Refresh]           │
├───────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                             │
│  │          │ │          │ │          │  ← 500px min (dynamic)      │
│  │  THUMB   │ │  THUMB   │ │  THUMB   │   square cells              │
│  │ (cover)  │ │ (cover)  │ │ (cover)  │   object-fit: cover         │
│  ├──────────┤ ├──────────┤ ├──────────┤                             │
│  │ "A cat   │ │ "Dog     │ │ "Bird    │  ← dark overlay             │
│  │ running  │ │ playing  │ │ flying   │   caption overlay           │
│  │ in the   │ │ in park" │ │ high"    │   click to edit             │
│  │ park"    │ │          │ │          │                             │
│  └──────────┘ └──────────┘ └──────────┘                            │
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘
```

### Expanded Player

```
┌─────────────────────────────────────────────────────────────────┐
│  [Video] [Gallery]    ...       [Auto-caption] [Convert] [Delete]│
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                                                         │    │
│  │                   VIDEO PLAYER                          │    │
│  │              (aspect ratio maintained)                   │    │
│  │                    ┌─[×]──┐                             │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  [▶/❚❚] [🔊] [===o===]  00:03.70 / 05:22.40                    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                                                         │    │
│  │   Caption text area (below video, not overlaying)       │    │
│  │   [Auto-caption] button (next to text area)             │    │
│  │   with scroll support for long text                     │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## File Structure

```
video-clipper/
├── outputs/                    # Clipped video files
│   ├── v001_c001.mp4
│   ├── v001_c001.txt           # Caption (optional, created on save)
│   ├── v001_c002.mp4
│   └── ...
├── converted/                  # Bulk-converted output
│   ├── v001_c001.mp4
│   ├── v001_c001.txt           # Copied caption
│   ├── v001_c001_flipped.mp4   # Flipped copy (if enabled)
│   ├── v001_c001_flipped.txt   # Flipped caption (left↔right swapped)
│   └── ...
├── src/
│   ├── main/                   # Electron main process
│   ├── renderer/               # React frontend
│   └── preload/                # Preload script for IPC
├── PRD.md
├── AGENTS.md
└── package.json
```

---

## Technical Requirements

### ffmpeg Integration

- All video operations use ffmpeg via child process execution.
- **ffmpeg check on launch**: On app activation (e.g., macOS dock click when app was previously terminated), verify ffmpeg is available in PATH. If not found, show an error dialog via `dialog.showErrorBox`. The check runs inside `app.on('activate')` when `BrowserWindow.getAllWindows().length === 0`.
- **Clip command template** (re-encode for frame-accurate seeking, `-ss` **after** `-i`):
  ```
  ffmpeg -y -i <input> -ss <start> -t <duration> <output>
  ```
- **Bulk convert command template** (params omitted if "Same as source"):
  ```
  ffmpeg -y -i <input> [-vf "scale=W:H:force_original_aspect_ratio=increase,crop=W:H,minterpolate=fps=X:mi_mode=mci"] [-c:v <codec>] [-b:v <bitrate>] -c:a copy <output>
  ```
  - Resolution: scales up to cover target (`force_original_aspect_ratio=increase`), then crops excess.
  - Frame rate: uses motion-compensated interpolation (`minterpolate`) combined into the `-vf` chain.
  - If all params are "Same as source", skip ffmpeg entirely and copy the file directly.
- **Thumbnail extraction**:
  ```
  ffmpeg -y -i <input> -frames:v 1 -q:v 2 <output>.jpg
  ```

### IPC Architecture

- Main process handles: ffmpeg execution, file system operations, drag-and-drop file resolution.
- Renderer process handles: UI rendering, user input, video playback via HTML5 `<video>`.
- Preload script exposes safe IPC channels.

### Precision Seeking

- Use HTML5 `<video>` element's `currentTime` property for seeking.
- The seek slider must support at least 0.01s granularity.
- Display time with 2 decimal places.

### Counter Persistence

- Track clip counters per source video file in a JSON state file (`clip-counters.json`).
- Load on app start, save after each clip operation.

### Settings Persistence

- Use JSON config file for persistent storage of app settings and preferences.
- Store: bulk conversion settings (codec, resolution, fps, bitrate), clip length default, window size/position, auto-caption configuration.
- Settings are loaded on app start and saved on change.
- New settings key: `AUTO_CAPTION_CONFIG` (object: `{ baseUrl: string, model: string, apiKey: string }`, defaults: `{ baseUrl: "http://localhost:8080", model: "model", apiKey: "DUMMY" }`).

### Auto-caption LLM Integration

- **IPC channel**: `auto-caption:run` (R→M), returns `{ success, results?: Array<{ file: string; success: boolean; error?: string }> }`.
- **IPC channel**: `auto-caption:progress` (M→R), payload: `{ file: string; current: number; total: number; status: 'processing' | 'done' | 'error' }`.
- **IPC channel**: `auto-caption:interrupt` (R→M), triggers cancellation of ongoing bulk operation.
- **IPC channel**: `fs:scan-converted` (R→M), returns `{ files: ConvertedFileInfo[] }` — scans `converted/` directory for frame counts via ffprobe.
- **Service**: `src/main/services/auto-caption.service.ts` — handles sequential file processing, LLM HTTP requests, response parsing, and caption file writing.
- **HTTP client**: Use Node.js `fetch` (native, Node 18+) to send requests to the configured endpoint URL. Set a 60-second timeout per request.
- **Authorization**: Send `Authorization: Bearer <apiKey>` header if an API key is configured (skip header if key is `"DUMMY"`).
- **Image payload**: Read the thumbnail JPEG file, base64-encode it, embed as `data:image/jpeg;base64,<base64>` in the request body.
- **Sequential processing**: Files are processed one at a time in order. No concurrency.
- **Interrupt support**: Use an `AbortController` or a shared flag to cancel in-flight requests and skip remaining files.

---

## Non-Goals (v1)

- No authentication or multi-user support.
- No cloud storage integration.
- No video editing beyond clipping (no trimming, merging, or effects).
- No support for non-video files.
- No command-line interface.
- No audio-only output.
- No subtitle support.
