# PRD — Video Clipper

## Overview

A desktop app for clipping video files (.mp4) to create training data for video diffusion models. The app provides precise frame-level seeking, clip extraction preserving original encoding properties, caption management, and bulk transcoding.

**Primary purpose**: Create and manage captioned video clip datasets for video diffusion model training. Caption visibility and quick editing are critical.

**Tech Stack**: Electron + React + TypeScript + Tailwind CSS  
**External Dependency**: ffmpeg (must be installed on the host machine — checked on app launch via `ffmpeg -version`)  
**Persistent Storage**: `better-sqlite3` for app settings and preferences

---

## Core Features

### 1. Tab Navigation

The app has a tab bar on the **left side of the top bar** with two modes:
- **Clip** — video editor with player, seek, and clip extraction
- **Gallery** — grid view of all clipped videos with captions

Action buttons for the active tab appear on the **right side of the top bar**.

### 2. Video Loading (Clip Mode)

- **Drag & drop**: Drop any video file from the filesystem into the app window to load it. Only available in Clip mode.
- **Open File button**: A fallback action button in the Clip mode top bar that opens a file picker dialog.
- **Load new video**: Dropping a new video file replaces the currently loaded video. The seek pointer resets to 0. The clip length setting is preserved across video loads.
- Supported formats: Any format ffmpeg can read (primarily .mp4, but not limited to).

### 3. Playback Controls (Clip Mode)

- **Play / Pause**: Toggle playback with button or spacebar (global, even when not focused on player).
- **Mute / Unmute**: Toggle audio mute with button or `M` key.
- **Volume slider**: Inline slider next to mute button for fine-grained volume control.
- **Seek slider**: A precise seek control that supports sub-second granularity. The slider must accurately reflect and set the playback position to fractional-second precision (e.g., 3.7s).
- **Time display**: Show current time and total duration in `MM:SS.xx` format (hundredths of a second).
- **No skip buttons**: No `<<` / `>>` skip controls.

### 4. Clip Extraction (Clip Mode)

- **Clip length input**: A floating-point number field in the top bar, defaulting to `10.0` seconds. The user can set any positive float value (e.g., `2.5`, `15.0`, `0.1`).
- **Clip button**: Labeled "Clip" with keyboard shortcut `C`.
- **Clip behavior**:
  - Clips from the current seek position to `seek_position + clip_length`.
  - Saves to `outputs/` directory with naming convention: `<original_name>_c<NNN>.<ext>` where `<NNN>` is a zero-padded 3-digit incremental counter (e.g., `v001_c001.mp4`, `v001_c002.mp4`).
  - The counter is per-source-video and persists across sessions (tracks the last used number).
  - **After a successful clip**: Seek position does NOT change. Show a toast notification informing the user that the clip was saved, including the file name. The toast auto-dismisses after 3 seconds.
- **Insufficient remaining duration**: If `clip_length` extends beyond the video's end, show an inline toast notification offering to clip the remaining duration instead (from current seek position to end of video). The toast auto-dismisses after 3 seconds.
- **Encoding preservation**: The clipped video must preserve the original video's:
  - Container format (extension)
  - Video codec
  - Audio codec (if present)
  - Frame rate
  - Resolution
  - Bitrate
  - All other stream properties
  - Implementation: Use ffmpeg stream copy (`-c copy`) with precise start/duration via `-ss` and `-t`.
  - **No re-encode fallback**: Clip mode must NEVER re-encode. It cuts at the nearest available frame keyframe boundary. Preserving the original encoding is critically important — clip mode only extracts a portion, nothing more.

### 5. Gallery Mode

- **Gallery grid**: Displays all clipped videos from the `outputs/` directory as a grid of thumbnails.
- **Grid layout rules**:
  - Each grid cell is **square** (1:1 aspect ratio).
  - Minimum cell size: **500x500px** when viewport allows.
  - Cell size adjusts dynamically based on viewport width. Calculate max columns that fit, then distribute evenly.
  - Example: viewport 1200px → 2 columns → each cell is 600x600px.
  - Example: viewport 1800px → 3 columns → each cell is 600x600px.
  - If viewport is smaller than 500px, cell size adapts to fit (minimum practical size).
- **Thumbnail**: Each cell shows the first frame of the video as a static thumbnail, rendered as **object-fit: cover** (cropped to fill the square cell).
- **Caption overlay**: The **lower half** of each grid cell has a dark overlay (semi-transparent dark background) with the caption text displayed on top.
  - If text is too long, truncate with ellipsis (`...`) to prevent overflow.
  - Clicking the lower half (caption area) converts it into an inline text editor for editing.
  - The editor supports scrolling for longer text.
  - On blur or 2-second debounce, save the caption.
- **Gallery refresh**:
  - Automatically refreshes when switching to Gallery tab.
  - Manual refresh button available in the Gallery top bar.
- **Delete clip**:
  - On mouse hover over a gallery cell, a red trash can icon appears in the top-right corner of the cell.
  - Clicking the trash icon opens a confirmation modal asking the user to confirm deletion.
  - If confirmed, delete both the video file and its accompanying `.txt` caption file (if it exists).
  - The gallery grid refreshes after deletion.
- **Selection**:
  - Multi-select: Click individual items to select/deselect.
  - Select All: A checkbox or button to select all files in the gallery.

### 6. Expanded Player (Gallery Mode)

- Clicking the **upper half** (thumbnail area) of a gallery cell opens the expanded player.
- Video fills the viewport optimally (maintaining aspect ratio).
- Play, pause, seek, and volume controls are available.
- Audio plays with sound.
- **Caption editor**: A text area is displayed **below** the video (not overlaying it) for entering/editing caption text.
- Caption is saved as a `.txt` file with the same base name as the video (e.g., `v001_c003.mp4` → `v001_c003.txt`).
- **Autosave with debounce**: Caption text is automatically saved on input with a 2-second debounce.
- The `.txt` file is created on first save (does not exist initially).
- Close button or Escape key returns to gallery grid.

### 7. Bulk Conversion Mode (Gallery)

- **Activation**: A "Bulk Convert" button in the Gallery top bar opens a **slide-out drawer** from the right side.
- **Selection**:
  - Multi-select: Click individual items to select/deselect.
  - Select All: A checkbox or button to select all files in the gallery.
- **Conversion settings panel** (inside the drawer):
  - Each parameter is **optional** — the user may change only what they need while keeping everything else from the source.
  - **Codec**: Dropdown with a `"Same as source"` option (default). Other options: `libx264`, `libx265`, `libsvtav1`, `mpeg4`. A "clear" button resets to source.
  - **Resolution**: Width and height inputs with a `"Same as source"` toggle. When set, the app crops to fill the target resolution without stretching (no letterboxing/pillarbox). A "clear" button resets to source.
  - **Frame rate**: Numeric input for target fps (e.g., 24, 30, 60) with a `"Same as source"` toggle. A "clear" button resets to source.
  - **Bitrate**: Numeric input for target bitrate (e.g., `5000k`, `10M`) with a `"Same as source"` toggle. A "clear" button resets to source.
  - **No changes warning**: If **all** parameters are left at `"Same as source"`, show an inline toast notification warning the user that files will simply be copied to `converted/` without any actual transcoding. The toast auto-dismisses after 3 seconds.
  - **Settings persistence**: The drawer remembers the last-used settings via Node.js built-in `sqlite3`. When the user reopens the drawer, the previous settings are restored.
- **Execution**:
  - Converts all selected files using the specified settings.
  - Outputs to `converted/` directory.
  - Files in `converted/` can be overwritten without warning.
  - Accompanying `.txt` caption files are copied alongside converted videos.
  - Show progress indicators (per-file and overall).
  - When a param is "Same as source", simply omit that ffmpeg flag (don't pass `-c:v`, `-r`, `-b:v`, or `-vf` for that param).

---

## UI Layout

### Top Bar

```
┌─────────────────────────────────────────────────────────────────┐
│  [Clip] [Gallery]       ...       [Clip Length: 10.0s] [Clip]  │
└─────────────────────────────────────────────────────────────────┘
   ↑ tabs                    ↑ action buttons for active tab
```

### Clip Mode

```
┌─────────────────────────────────────────────────────────────────┐
│  [Clip] [Gallery]       ...       [Clip Length: 10.0s] [Clip]  │
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
┌─────────────────────────────────────────────────────────────────┐
│  [Clip] [Gallery]       ...       [Select All] [Bulk Convert]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                       │
│  │          │ │          │ │          │  ← 500px min (dynamic)│
│  │  THUMB   │ │  THUMB   │ │  THUMB   │   square cells        │
│  │ (cover)  │ │ (cover)  │ │ (cover)  │   object-fit: cover   │
│  ├──────────┤ ├──────────┤ ├──────────┤                       │
│  │ "A cat   │ │ "Dog     │ │ "Bird    │  ← dark overlay       │
│  │ running  │ │ playing  │ │ flying   │   caption overlay     │
│  │ in the   │ │ in park" │ │ high"    │   click to edit       │
│  │ park"    │ │          │ │          │                       │
│  └──────────┘ └──────────┘ └──────────┘                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Expanded Player

```
┌─────────────────────────────────────────────────────────────────┐
│  [Clip] [Gallery]       ...       [← Back]                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                                                         │    │
│  │                   VIDEO PLAYER                          │    │
│  │              (aspect ratio maintained)                   │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  [▶/❚❚] [🔊] [===o===]  00:03.70 / 05:22.40                    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                                                         │    │
│  │   Caption text area (below video, not overlaying)       │    │
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
- **ffmpeg check on launch**: On app startup, verify ffmpeg is available in PATH. If not found, show an error dialog and prevent the app from functioning until resolved.
- **Clip command template** (stream copy mode — no re-encode):
  ```
  ffmpeg -ss <start> -i <input> -t <duration> -c copy -avoid_negative_ts make_zero <output>
  ```
- **Bulk convert command template** (params omitted if "Same as source"):
  ```
  ffmpeg -i <input> [-vf "scale=w:h:force_original_aspect_ratio=decrease,crop=w:h"] [-c:v <codec>] [-r <fps>] [-b:v <bitrate>] -c:a copy <output>
  ```
  - If all params are "Same as source", skip ffmpeg entirely and copy the file directly.
- **Thumbnail extraction**:
  ```
  ffmpeg -i <input> -frames:v 1 -q:v 2 <output>.jpg
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

- Use Node.js built-in `sqlite3` for persistent storage of app settings and preferences.
- Store: bulk conversion settings (codec, resolution, fps, bitrate), clip length default, window size/position.
- Settings are loaded on app start and saved on change.

---

## Non-Goals (v1)

- No authentication or multi-user support.
- No cloud storage integration.
- No video editing beyond clipping (no trimming, merging, or effects).
- No support for non-video files.
- No command-line interface.
- No audio-only output.
- No subtitle support.
