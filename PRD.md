# PRD — Video Clipper

## Overview

A desktop app for clipping video files (.mp4) to create training data for video diffusion models. The app provides precise frame-level seeking, clip extraction preserving original encoding properties, caption management, and bulk transcoding.

**Tech Stack**: Electron + React + TypeScript + Tailwind CSS  
**External Dependency**: ffmpeg (assumed installed on the host machine)

---

## Core Features

### 1. Video Loading

- **Drag & drop**: Drop any video file from the filesystem into the app window to load it.
- **Load new video**: Closing the current video and dropping a new one resets the seek pointer to 0. The clip length setting is preserved across video loads.
- Supported formats: Any format ffmpeg can read (primarily .mp4, but not limited to).

### 2. Playback Controls

- **Play / Pause**: Toggle playback with button or spacebar.
- **Seek slider**: A precise seek control that supports sub-second granularity. The slider must accurately reflect and set the playback position to fractional-second precision (e.g., 3.7s).
- **Time display**: Show current time and total duration in `MM:SS.xx` format (hundredths of a second).

### 3. Clip Extraction

- **Clip length input**: A floating-point number field in the top bar, defaulting to `10.0` seconds. The user can set any positive float value (e.g., `2.5`, `15.0`, `0.1`).
- **Clip button**: Labeled "Clip" with keyboard shortcut `C`.
- **Clip behavior**:
  - Clips from the current seek position to `seek_position + clip_length`.
  - Saves to `outputs/` directory with naming convention: `<original_name>_c<NNN>.<ext>` where `<NNN>` is a zero-padded 3-digit incremental counter (e.g., `v001_c001.mp4`, `v001_c002.mp4`).
  - The counter is per-source-video and persists across sessions (tracks the last used number).
- **Insufficient remaining duration**: If `clip_length` extends beyond the video's end, warn the user and offer to clip the remaining duration instead (from current seek position to end of video).
- **Encoding preservation**: The clipped video must preserve the original video's:
  - Container format (extension)
  - Video codec
  - Audio codec (if present)
  - Frame rate
  - Resolution
  - Bitrate
  - All other stream properties
  - Implementation: Use ffmpeg stream copy (`-c copy`) with precise start/duration via `-ss` and `-t`. When stream copy cannot achieve frame-exact cuts, offer re-encode mode as fallback.

### 4. Caption Mode (Gallery View)

- **Gallery grid**: Displays all clipped videos from the `outputs/` directory as a grid of thumbnails.
- **Thumbnail**: Each grid item shows the first frame of the video as a static thumbnail image.
- **Caption display**: Below each thumbnail, show the caption text (if a `.txt` file exists) in a compact preview.
- **Expanded view**: Clicking a thumbnail opens an enlarged player:
  - Video fills the viewport optimally (maintaining aspect ratio).
  - Play, pause, and seek controls are available.
  - Audio plays with sound.
- **Caption editing**:
  - A text box beneath the video (in both gallery and expanded view) allows entering/editing caption text.
  - Caption is saved as a `.txt` file with the same base name as the video (e.g., `v001_c003.mp4` → `v001_c003.txt`).
  - **Autosave with debounce**: Caption text is automatically saved on input with a 2-second debounce.
  - The `.txt` file is created on first save (does not exist initially).

### 5. Bulk Conversion Mode

- **Activation**: A "Bulk Convert" button/toggle in the gallery view.
- **Selection**:
  - Multi-select: Click individual items to select/deselect.
  - Select All: A checkbox or button to select all files in the gallery.
- **Conversion settings panel**:
  - **Codec**: Dropdown to select output video codec (e.g., `libx264`, `libx265`, `libsvtav1`, `mpeg4`).
  - **Resolution**: Width and height inputs. The app auto-crops and resizes without distorting the aspect ratio (letterbox/pillarbox with crop to target, not stretch).
  - **Frame rate**: Numeric input for target fps (e.g., 24, 30, 60).
  - **Bitrate**: Numeric input for target bitrate (e.g., `5000k`, `10M`).
- **Execution**:
  - Converts all selected files using the specified settings.
  - Outputs to `converted/` directory.
  - Files in `converted/` can be overwritten without warning.
  - Accompanying `.txt` caption files are copied alongside converted videos.
  - Show progress indicators (per-file and overall).

---

## UI Layout

```
┌─────────────────────────────────────────────────────┐
│  TOP BAR                                            │
│  [Clip Length: 10.0s]  [Clip (C)]  [Gallery]       │
├─────────────────────────────────────────────────────┤
│  MAIN CONTENT AREA                                  │
│                                                     │
│  ┌─────────────────────────────────────────────┐    │
│  │                                             │    │
│  │          VIDEO PLAYER                       │    │
│  │                                             │    │
│  │                                             │    │
│  └─────────────────────────────────────────────┘    │
│  [◄◄] [▶/❚❚] [►►]  [===========o=========] 00:03.70│
│                                                     │
├─────────────────────────────────────────────────────┤
│  STATUS BAR: Loaded: v001.mp4 | Clips: 5           │
└─────────────────────────────────────────────────────┘
```

**Gallery View Layout**:

```
┌─────────────────────────────────────────────────────┐
│  TOP BAR                                            │
│  [Clip Length: 10.0s]  [Clip (C)]  [Editor ◄]      │
│  [Select All] [Bulk Convert...]                     │
├─────────────────────────────────────────────────────┤
│  GALLERY GRID                                       │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐              │
│  │ [thumb] │ │ [thumb] │ │ [thumb] │              │
│  │         │ │         │ │         │              │
│  │ cap txt │ │ cap txt │ │ cap txt │              │
│  └─────────┘ └─────────┘ └─────────┘              │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐              │
│  │ [thumb] │ │ [thumb] │ │ [thumb] │              │
│  │         │ │         │ │         │              │
│  │ cap txt │ │ cap txt │ │ cap txt │              │
│  └─────────┘ └─────────┘ └─────────┘              │
└─────────────────────────────────────────────────────┘
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
- **Clip command template** (stream copy mode):
  ```
  ffmpeg -ss <start> -i <input> -t <duration> -c copy -avoid_negative_ts make_zero <output>
  ```
- **Bulk convert command template**:
  ```
  ffmpeg -i <input> -vf "scale=w:h:force_original_aspect_ratio=decrease,crop=w:h" -c:v <codec> -r <fps> -b:v <bitrate> -c:a copy <output>
  ```
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

---

## Non-Goals (v1)

- No authentication or multi-user support.
- No cloud storage integration.
- No video editing beyond clipping (no trimming, merging, or effects).
- No support for non-video files.
- No command-line interface.
