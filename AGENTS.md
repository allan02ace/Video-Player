# AMPM Player: project handoff

Read this first. It lets any Claude account (or other coding agent) continue the project without the original chat.

## What it is
A phone-first video player web app, hosted on GitHub Pages and installable as a PWA. It plays videos the person picks from their own device. Nothing is uploaded anywhere.

Brand: **AMPM Player**. Logo is a purple gradient circle with a white play triangle (`icons/icon-512.png`; the other icons and `icon.svg` are derived from it). Accent `#7c3aed`, dark frame `#1a1030`, gradient `#a78bfa` to `#6d28d9`.

## Which version this is
This file describes the **lean version** (`index.html`, about 45 KB, about 650 lines). An older handoff described a bigger build (editable shortcut table, Advanced settings popover, swipe gestures, saved library in IndexedDB, Last added / Recover, Media Session, 3x volume swipe, no-auto-landscape). **None of that is in the current `index.html`.** A damaged copy of that bigger build existed once (many functions missing, so it could not run). If a complete copy of it turns up, compare before building on either file. Do not trust any older note about features that are not listed below.

## Files
- `index.html`: the whole app (HTML, CSS and JS in one file, no libraries, no build step).
- `manifest.webmanifest`: PWA name, colors, icons.
- `sw.js`: service worker (see below). **Bump `const C='ampm-vN'` whenever `index.html` changes** so phones pick up the update. Current value: `ampm-v21`.
- `icons/`: `icon.svg`, `icon-192.png`, `icon-512.png`, `maskable-512.png`, `apple-touch-icon.png`.
- `README.md`: GitHub Pages and install steps for the owner. It still mentions "Save a copy on this device" and "Last added", which belong to the bigger build and are not in this version.

## Features in the current index.html
- **Library:** folder chips, folder list, video list with generated thumbnails (made through a queue, 2 at a time), search (a `prompt()`), light/dark toggle. "Add videos" (file picker, also accepts audio and `.srt`) and "Add folder" (`webkitdirectory`; subfolders become folders; most phones cannot do this, so everything lands in "Library").
- **Fullscreen:** on desktop (mouse), the fullscreen button and the F key fullscreen only `#stage` (`.fs-wrap:fullscreen` removes the frame), so the library panel is hidden and only the video with its controls shows, like VLC; Esc exits. On touch devices the whole page goes fullscreen (`enterFS` when a video opens, and the button). Keep all player UI (controls, subtitles, bubble, hover tip, resume dialog) inside `#stage`, otherwise it disappears in desktop fullscreen.
- **Player controls:** play/pause, prev/next (auto-advance when a video ends), seek bar, volume and brightness popover, speed cycle (1x, 1.25x, 1.5x, 2x, 0.5x, 0.75x), fit/fill, repeat, audio-only, picture-in-picture, fullscreen (hidden if unsupported), controls lock, auto-hiding controls.
- **Volume:** the slider goes to 300%. Above 100% (or once boosted) it uses a Web Audio gain plus a limiter. The audio graph is created lazily (`bootAudio`) because on iPhone Web Audio follows the silent switch while normal video does not. `volBy(d)` changes volume in 5% steps and shows the bubble.
- **Volume bar:** `#vbar` is a vertical bar on the right edge of the player (percentage on top, fill up to 300%, amber above 100%), shown for about 0.9 s by `showVol(x)` whenever volume changes by keys, wheel or swipe.
- **Play/pause badge:** `#pst`, a round badge near the top right (in the very top right corner when the controls are hidden, which is the normal case in desktop fullscreen; moved down below the pill row, same spot as the zoom chip, while the controls are showing) showing the play or pause icon for about 1.1 s whenever playback starts or pauses (`pstFlash`). Skipped while scrubbing, while the resume dialog is open, right after a video loads (`quietUntil`) and when the page is hidden.
- **On-screen bubble:** `#hud`, shown by `flash(html)` for about 0.9 s. Used by volume and the sleep timer.
- **Skip time display (VLC style):** `seekBy(sec)` moves the position and `flashTime(t)` shows plain outlined text such as `58:20 / 1:26:35` in the upper right corner of the player for about 1.3 s (`#hud` with class `osd`, which overrides the centred bubble position; `flash()` removes the class). Used by the Left/Right keys, double-tap skips (both 10 s) and the sideways swipe. The seek bar, prev/next buttons and G/H do not use it.
- **Sleep timer:** moon pill `#slBtn` opens `#slpop`: 15, 30, 45, 60 minutes, End of video, Off. It stores an end time (`sleepEnd`, wall clock, so it is correct when the screen is off) and is checked every second and on `timeupdate`. "End of video" sets `sleepEndVid`, and `v.onended` pauses instead of advancing (with Repeat on, the video never ends, so it waits). While active the pill shows `28m` or `End`.
- **Seek bar hover time:** a mouse hovering `#bar` shows `#tip` with the time under the pointer (touch is ignored). Clicking the bar already seeks natively.
- **Keyboard** (one `keydown` handler, fixed keys, not rebindable): Space play/pause, Up/Down volume (5%), Left/Right 10 s, F fullscreen, M mute, C subtitles on/off, G/H subtitle offset -/+0.1 s. Arrow keys also work while a slider has focus (the handler calls `preventDefault`, so the slider does not move twice). Mouse wheel over the video changes volume; Ctrl+wheel is zoom.
- **SRT subtitles:** CC button opens the panel. Load a `.srt`, drop one on the video, or auto-attach when a `.srt` has the same name as the video and the same folder. Offset field, nudge buttons (-0.5, -0.1, +0.1, +0.5), "Line starts now", reset, text size, show/hide, remove. Positive offset delays subtitles.
- **Phone flow:** on touch or narrow screens the app opens on the library only. Tapping a video opens the full-screen player (`.app.playing`). Back arrow or the phone back gesture returns to the library (`history.pushState` and `popstate`). Opening a video calls `requestFullscreen` on touch devices (`enterFS`).
- **Resume:** playback position saved to `localStorage` as `ampm:<key>` = `{t, d}` (seconds, duration). Tapping a partly watched video shows "Continue from mm:ss" or "Start over". The thumbnail shows a progress bar.
- **Touch gestures:** single tap shows/hides controls, double-tap left or right third skips 10 s, double-tap middle plays/pauses. Pinch zoom (video only, 1x to 5x) with drag to pan and a "Reset" chip.
- **Swipe gestures** (one finger on `#mid`; off while zoomed, controls locked, or the resume dialog is open): swipe sideways to scrub in fine steps (`SWIPE_MS=30` ms of video per pixel, constant, no speed boost; the video pauses while dragging, the picture follows the finger as a live preview, the VLC-style time is shown, and playback resumes on release if it was playing; seeks are one at a time and always jump to the newest finger position (`pumpSeek`), because starting a new seek every frame stops phones from drawing any frame until the finger stops); swipe up/down on the right half for volume, on the left half for brightness of the picture only (a CSS `filter` on the video; web pages cannot change the phone's screen backlight, there is no browser API for it) (a swipe the height of the stage moves volume by 100% and brightness across its whole range; they share the `#vol` and `#bri` sliders). Movement under 14 px is still a tap, and the click that follows a swipe is ignored (`noClickUntil`). The spinner is suppressed while scrubbing (`scrub`).
- **Orientation:** the layout simply follows how the phone is held (no forced landscape, no rotate button). `syncWide()` adds `.app.wide` in real landscape on touch devices, which left-aligns the pills.

- **Skip settings (first pill, real gear icon, `#advBtn` / `#advpop`):** replaced the old volume and brightness popover (those are still set by swipe, wheel and keys; the hidden `#pop` with `#vol` and `#bri` stays in the DOM because the code uses the sliders). `skipSeconds` (1 to 300, default 10, saved in `localStorage` as `ampm:skip`) drives the Left/Right keys, double-tap skips and the lock-screen skip buttons. Swipe scrub still uses `SWIPE_MS`.
- **Keep on this device (optional, per add):** the checkbox `#keepIn` above the Add buttons (off by default; only files added while it is ticked are kept). Kept files are copied into the browser's private file system (OPFS) from a small worker made from a Blob (`WK_SRC`, `saveOpfs`), or into IndexedDB (`ampm` / store `b`) when OPFS is unsupported or fails (`saveIdb`). One file is saved at a time (`queueSave`, `pumpSave`, `doSave`); progress shows in `#svl`. Before copying, `roomFor()` checks `navigator.storage.estimate()` (file size plus 300 MB); if there is no room the video still plays but is not kept, with a message. `navigator.storage.persist()` is requested. Metadata (key, name, folder, thumbnail, duration, size, mime, backend, file id) lives in `localStorage['ampm:saved']` (`persistMeta`); on start, `items[]` is filled from it with `url:''`, and `load()` calls `getUrl()` to open the stored file lazily (the blob is re-typed with the saved mime so iPhone plays it). Saved rows show "Saved" and a bin button (`removeSaved`) that deletes the stored copy only, never the original file; `#stor` shows total saved and room left. Re-adding a file that is already saved is skipped. Subtitles are not kept. iPhone note: install to the Home Screen, otherwise Safari may clear stored data after about a week of not opening the site. Not tested on a real iPhone at 1 GB or more: try a small file first.
- **Remembered settings:** volume (including the 300% boost), picture brightness, playback speed, fit/fill, repeat and the light/dark choice are saved in `localStorage['ampm:prefs']` (one JSON object; `pref(key,value)` writes it after a short delay) and restored at the end of the script. The theme is also applied by a tiny script in `<head>` so there is no flash. A saved volume above 100% waits (`pendingBoost`) until the first `play` to start the audio boost, because on iPhone Web Audio must not start before playback. Muted, zoom, rotation, audio-only and the sleep timer are deliberately not remembered. To remember another setting, call `pref('name',value)` where it changes and read it in the restore block.
- **Sleep timer extras:** presets 5, 15, 30, 45, 60, 90, 120 min, End of video, Off, plus a custom minutes field (`#slCustom`, `#slSet`, 1 to 600).
- **Audio files:** the picker and importer accept mp3, m4a, aac, flac, ogg, wav, wma, aiff and more; whether one plays still depends on the browser.
- **Audio only + background play:** the music-note button in the top bar (`#audioBtn`) toggles `audioOnly` (hides the picture, shows a note, button highlighted, bubble says it keeps playing in the background). While it is on, if the browser pauses the player because the page went to the background (`visibilitychange` sets `bgKeep`, the `pause` handler calls `play()` again), playback resumes. Media Session gives lock-screen / notification controls: title, app icon, play, pause, previous, next, seek by the skip time, seek to, and position state. `sleepFire()` and the Media Session pause clear `bgKeep` so a real pause stays paused. Browsers differ: this is best effort and cannot be guaranteed on every phone. Leaving the player with the back arrow still pauses.

## Not in this version (ideas, in rough priority)
1. Rebindable shortcuts and swipe seek ms/px setting (today `SWIPE_MS` is a constant; skip length is already adjustable).
2. Keep subtitles with saved videos; Last added / Recover; show saved storage in a settings screen.
3. Keep audio playing after the back arrow (needs a mini player in the library).
4. Create folders and move videos on phones.
5. `.vtt` and `.ass` subtitles; export the re-timed `.srt`; subtitle font and colour options.
6. Remote video links (fine on GitHub Pages for direct `.mp4`; YouTube links cannot play in a custom `<video>` player).

## How the code is organised (inside `index.html`)
One IIFE. Main state: `items[]`, `idx` (current), `folder`, `q`, `cues`, `off`, `lockOn`.
- Item shape: `{key, name, folder, url (blob), thumb, dur, cues, off, srtName}`. `key` = `name|size|lastModified` and is what resume uses.
- `addFiles()` adds videos and registers `.srt` files in `srtFiles['<folder>/<name lowercase>']`.
- `load(i, go)` sets the source, applies subtitles (`useSubs`), shows the player pane, and decides whether to ask to resume (`askResume`).
- Subtitles: `parseSrt`, `paintCap` (runs every animation frame; effective time is `currentTime - off`).
- Layout switches at `@media (max-width:820px),(pointer:coarse)`.
- Popovers (`#advpop` skip settings, `#subpop` subtitles, `#slpop` sleep timer; `#pop` is the old hidden volume panel) close each other; each pill button removes the others' `show` class. Add new popovers the same way.

## Gotchas learned the hard way
- The control overlay `.ov` covers the whole video, so taps must be handled on `#mid` (the empty middle area), not on the `<video>`.
- Do not add a `touchstart` handler that wakes the controls; it fights the tap-to-hide logic.
- Progress saving is skipped while the resume dialog is open, otherwise a new video would overwrite the saved position with 0.
- Browsers cannot keep access to picked files between visits, so the library is rebuilt each session. Resume still works because `key` matches the same file.
- Thumbnails go through a queue (`makeThumb`, `genThumb`) and list redraws are debounced (`renderSoon`). Do not create one hidden video per file at once.
- Keep all player UI inside `#stage`; the hud and hover tip are positioned against it.
- Typography: use curly apostrophes and quotes in visible text.
- Before finishing any change, check the script parses (extract the `<script>` and run `new Function(code)` in Node) and that every function it calls is defined. A past copy broke because dozens of functions were missing while the syntax was still valid.

## Service worker (`sw.js`)
Network-first with a cache fallback. It pre-caches the app shell (`./`, `index.html`, manifest, all icons including `maskable-512.png`), deletes older caches on activate, and only handles same-origin GET requests (blob video URLs are never touched). It stores only full `200` responses of type `basic` (no partial `206` or error responses). Offline, a failed navigation gets `index.html`; a failed file request fails cleanly instead of returning the page. Query strings are ignored when matching. There is no network timeout, so on a very slow connection the app waits for the network before using the cache.

## Deploying
Upload the folder to a GitHub repo, then Settings, Pages, branch `main`, `/ (root)`. On a phone: Android Chrome menu, Install app; iPhone Safari Share, Add to Home Screen. After changing `index.html`, bump the cache name in `sw.js`, reopen the app online, and reload once.

## Prompt to continue in a new Claude account
Upload this folder (or the files) and say:
"This is my AMPM Player web app. Read AGENTS.md first, then continue with: <your request>. Keep it a single index.html with no build step, bump the cache name in sw.js after changes, and send files individually, not as a zip."
