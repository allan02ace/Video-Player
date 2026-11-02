# AMPM Player: project handoff

Read this first. It lets any Claude account (or other coding agent) continue the project without the original chat.

## What it is
A phone-first video player web app, hosted on GitHub Pages and installable as a PWA. It plays videos the person picks from their own device. Nothing is uploaded anywhere.

Brand: **AMPM Player**. Logo is a purple gradient circle with a white play triangle (supplied by the owner as `icons/icon-512.png`; the other icons and `icon.svg` are derived from it). Accent `#7c3aed`, dark frame `#1a1030`, gradient `#a78bfa` to `#6d28d9`.

## Files
- `index.html`: the whole app (HTML, CSS and JS in one file, no libraries, no build step).
- `manifest.webmanifest`: PWA name, colors, icons.
- `sw.js`: service worker. Network-first, falls back to cache. **Bump `const C='ampm-v2'` whenever `index.html` changes** so phones pick up the update.
- `icons/`: `icon.svg`, `icon-192.png`, `icon-512.png`, `maskable-512.png`, `apple-touch-icon.png` (maskable and apple-touch are full-bleed squares with the triangle in the safe zone).
- `README.md`: GitHub Pages and install steps for the owner.

## Features (all working in code, not yet tested on a real phone)
- Library with folder chips, folder list, video list with generated thumbnails, search (prompt), light/dark toggle.
- "Add videos" (file picker) and "Add folder" (`webkitdirectory`, subfolders become folders; most phones can't do this, so everything lands in "Library").
- Player: play/pause, prev/next (auto-advance), seek bar, volume and brightness popover, speed cycle (1x, 1.25x, 1.5x, 2x, 0.5x, 0.75x), fit/fill, rotate 90 degrees, repeat, audio-only, picture-in-picture, fullscreen (hidden if unsupported), controls lock, auto-hiding controls.
- Keyboard: Space play/pause (works even with a button focused), Left/Right 10 s, F fullscreen, M mute, C subtitles on/off, G/H subtitle offset -/+0.1 s.
- SRT subtitles: CC button opens the panel. Load a .srt, drop one on the video, or auto-attach when a `.srt` has the same name as the video and the same folder. Offset field, nudge buttons (-0.5, -0.1, +0.1, +0.5), "Line starts now" (syncs nearest cue to the current time), reset, text size, show/hide, remove. Positive offset delays subtitles.
- Phone flow: on touch or narrow screens the app opens on the library only. Tapping a video opens the full-screen player (`.app.playing`). Back arrow or the phone back gesture returns to the library (uses `history.pushState` and `popstate`).
- Resume: playback position is saved to `localStorage` as `ampm:<key>` = `{t, d}` (seconds, duration). Tapping a partly watched video shows "Continue from mm:ss" or "Start over". The thumbnail shows a progress bar.
- Touch: single tap shows/hides controls, double-tap left or right third skips 10 s, double-tap middle plays/pauses.

## How the code is organised (inside `index.html`)
One IIFE. Main state: `items[]`, `idx` (current), `folder`, `q`, `cues`, `off`, `lockOn`.
- Item shape: `{key, name, folder, url (blob), thumb, dur, cues, off, srtName}`. `key` = `name|size|lastModified` and is what resume uses.
- `addFiles()` adds videos and registers `.srt` files in `srtFiles['<folder>/<name lowercase>']`.
- `load(i, go)` sets the source, applies subtitles (`useSubs`), shows the player pane, and decides whether to ask to resume (`askResume`).
- Subtitles: `parseSrt`, `paintCap` (runs every animation frame; effective time is `currentTime - off`).
- Phone and resume block sits near the end, just above the `resize` listener.
- Layout switches at `@media (max-width:820px),(pointer:coarse)`.

## Gotchas learned the hard way
- The control overlay `.ov` covers the whole video, so taps must be handled on `#mid` (the empty middle area), not on the `<video>`.
- Do not add a `touchstart` handler that wakes the controls; it fights the tap-to-hide logic.
- Progress saving is skipped while the resume dialog is open, otherwise a new video would overwrite the saved position with 0.
- Browsers cannot keep access to picked files between visits, so the library is rebuilt each session. Resume still works because `key` matches the same file.
- Inside `sw.js`, only same-origin requests are cached; blob video URLs are ignored on purpose.
- Typography: use curly apostrophes and quotes in visible text.

## Not done yet (ideas, in rough priority)
1. Create folders and move videos into them on phones.
2. Persist the library across visits (would need copying files into IndexedDB, which is heavy).
3. `.vtt` and `.ass` subtitles; export the re-timed `.srt`.
4. Subtitle font and colour options.
5. Remembered speed and volume.
6. Remote video links: not possible in the original Claude-hosted preview (blocked network), but fine on GitHub Pages for direct `.mp4` links. YouTube links cannot play in a custom `<video>` player.

## Deploying
Upload the folder to a GitHub repo, then Settings, Pages, branch `main`, `/ (root)`. On a phone: Android Chrome menu, Install app; iPhone Safari Share, Add to Home Screen.

## Prompt to continue in a new Claude account
Upload this folder (or the zip) and say:
"This is my AMPM Player web app. Read AGENTS.md first, then continue with: <your request>. Keep it a single index.html with no build step, and bump the cache name in sw.js after changes."
