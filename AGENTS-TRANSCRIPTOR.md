# AGENTS-TRANSCRIPTOR.md

Guidance for AI coding agents working on **`Transcriptor.html`**. The phone-first video player (`index.html`) is documented separately in `AGENTS.md`.

## Project

**Transcriptor** (shown as "AMPM Player" in its title) is a single-file, browser-based media player built around a transcript editor. It lets a user load local video/audio files, play them, and type a transcript with timestamps inserted at the current playback position. The transcript editor is always visible and is the main part of the UI.

- File: `Transcriptor.html` (HTML + CSS + vanilla JS, all inline)
- It is opened from the video player's ↗ button (`#newBtn` in `index.html`) and is part of the same installed PWA: its head links `manifest.webmanifest`, `theme-color` and the icons (`icon.svg`, `icons/icon-192.png`, `icons/apple-touch-icon.png`, relative paths), and it must stay in the same folder as `index.html` so it is inside the manifest scope. It is in the `sw.js` pre-cache list.
- **Back to the player:** the first sidebar button is `#playerLink` (a plain `<a href="index.html">`, purple, play icon, label "Video player"; icon only when the sidebar is collapsed). It navigates in the same window, which always stays inside the installed app.
- **One app, one look:** the light/dark choice is stored in `localStorage['ampm:prefs'].theme`, the same key `index.html` uses (read at start, written by the Theme button, merged into the existing object so the player's other settings are kept). A tiny script in `<head>` applies it before first paint. The two pages keep separate media libraries for now (picked files are not shared between them).
- **Head tags must stay:** `Transcriptor.html` is only treated as part of the installed app if its `<head>` has `<link rel="manifest" href="manifest.webmanifest">`, the `theme-color` and apple meta tags and the icon links (copied from `index.html`). A version exported from the artifact editor had lost them, which is why the installed app opened this page in the normal browser. If the page is ever re-exported, check these first.
- No build step, no dependencies, no backend. Only external resource is the Inter font from Google Fonts.
- Media never leaves the machine: files are played through `URL.createObjectURL`.

## Running

Open the HTML file directly in a browser (Chrome/Edge on Windows is the primary target). There is nothing to install.

## File layout

The file has three parts, in order:

1. `<style>`: theme tokens on `:root` (light) with dark overrides, then layout sections: App shell, Library sidebar, Transcript pane, Player/stage, Responsive.
2. Markup: `.app` grid containing `aside.lib` (library sidebar) and `.right-col` (transcript pane + player stage).
3. `<script>`: one `state` object, `renderLibrary` and `applyClasses`, media functions (`addFiles`, `loadItem`, `togglePlay`, `seekBy`), the volume boost (`ensureAudio`, `setBoost`), then event wiring.

## Architecture notes

- The transcript pane is always shown above the player. There is no transcript toggle or transcript mode.
- The only UI mode class on `#app` is `lib-open`. Change it via `state` + `applyClasses()`, never by toggling classes directly.
- The sidebar has two widths: collapsed (`--lib-w`, 68px, icons only) and expanded (`--lib-exp`, 240px, icon + label). Its tools are Library (expand/collapse) and Theme.
- The `<video>` element is hidden (`display: none`); it is used for both video and audio playback and only drives the custom controls.
- The player stage is three rows, kept compact so the transcript editor gets the height: (1) top bar: `+ Add`, file title, A-B loop controls; (2)+(3) one `.tl-row` card whose header holds play, time, Last, volume boost, then the timeline title, zoom buttons and range readout, with the timeline canvas below it. There is no separate seek bar and no separate loop row.
- The library starts expanded on load (`state.libOpen` is true above 700px; phone-width screens start collapsed). It never closes by itself; only the Library button toggles it.
- The library is a flat list of files. Items are keyed by `name|size|lastModified` to avoid duplicates. There is no search, folder grouping, previous/next, or auto-advance: the user picks a file from the list.

## Adding media

Adding a file is the first thing a user must do, so it never requires opening the library. The empty player shows a large "Add video / audio file" button, and the player's top bar has a compact "＋ Add" button (the file title sits next to it; the file name is not repeated anywhere else). Both trigger the hidden `#fileIn` input, the same one the library sidebar uses. Folders are not supported.

## Volume boost (up to 300%)

- `video.volume` caps at 100%, so playback is routed through the Web Audio API: `MediaElementSource → high-pass → presence peaking filter → GainNode (boost) → DynamicsCompressor → makeup GainNode → limiter → destination` (the high-pass, presence filter, makeup and limiter are transparent unless **Voice** is on; see below).
- The graph is created lazily by `ensureAudio()` (needs a user gesture), and `createMediaElementSource` may only be called once per element, so never call it again.
- The slider (`#boostBar`, 0–300 in steps of 5) and the ↑/↓ keys (±10) both go through `setBoost()`. `state.boost` is the percentage; gain is `boost / 100`.
- The compressor keeps loud peaks from clipping at high boost. Do not remove it without replacing it.

## Keyboard shortcuts (keep in sync with the textarea placeholder)

- Shift+Space: play/pause (works inside the transcript too)
- Ctrl/Cmd+Enter: insert timestamp
- Ctrl/Cmd+S: export as .txt
- Ctrl/Cmd + wheel, or Ctrl/Cmd + `+` / `-` / `0`: zoom the text (Ctrl+0 resets); the whole page never zooms
- Ctrl/Cmd+F: find; Ctrl/Cmd+H: find and replace
- F2 / F4: insert [inaudible] / [crosstalk] marker with the current time
- Alt+↑ / Alt+↓: playback speed
- Alt+R: review mode on/off (listen locked; pausing unlocks the editor with the caret at the playing line)
- `[` / `]`: skip back/forward by the Skip value
- Esc (in a text field): leave the editor so the shortcuts below work
- Alt+click/drag on the timeline: seek without magnet snap
- Outside text fields: Space, ←/→ (±5 s), ↑/↓ (volume boost ±10%), `P` (pause + edit), `T` (timestamp), `L` (A-B loop on/off), `+` / `-` (timeline zoom)

## Timestamp formats

- One place decides what a stamp is: `lineStamp(line)` (with `BRACKET_STAMP_RE`, `BARE_LINE_RE`, `bareTime`, `stripLineStamp`, `STAMP_PREFIX`), defined just above `insertTimestamp`. Everything that reads stamps goes through `parseStamps`, so follow-playback, the line highlight, timeline markers, Last, A-B loop options, Review, media-key previous/next and the progress readout all understand both forms.
- Bracketed `[m:ss]` / `[h:mm:ss]` is recognised anywhere on a line and wins when a line has both. A bare stamp (`0:02`, `00:00:02`, optional `.5` fraction ignored) only counts at the **start** of a line and must be followed by whitespace or the end of the line, so `10:30 am` or `5:30 PM` at the start of a line is not a stamp.
- Bare stamps also work for click-to-seek (`stampAtCaret`), the word count (not counted), Export with Include timestamps off (removed with the spaces after it), the Word export (stamp greyed) and speaker labels (a speaker can follow a bare stamp: `STAMP_PREFIX` is used by `insertSpeaker`, `SPK_LABEL_RE`, the autocomplete and the export label regex).
- Ctrl+Enter, F2/F4 and new speaker turns still insert the bracketed form. Do not add a new place that checks for `[` only; use `lineStamp`.

## Transcript follows playback

- Timestamps are `[m:ss]` or `[h:mm:ss]` anywhere on a line, **or a bare `m:ss` / `h:mm:ss` at the start of a line** (e.g. `00:00:02   text`, as in pasted transcripts; see "Timestamp formats"). `parseStamps` reads them, `syncTranscriptToTime` scrolls the textarea to the line matching the current media time.
- It runs on `timeupdate` (only when the active line changes) and on `seeked` (always), so seeking by slider, `[`/`]` or arrows moves the editor.
- Scroll position is measured with a hidden mirror div (`offsetOfChar`) because wrapped lines make line-index math wrong. Keep it in sync with the textarea font/padding.
- When the textarea is not focused, the caret is parked at the end of the active line so Pause + edit continues there. While the user is typing, only the scroll changes.

## Reverse find (click a timestamp → audio jumps)

- A click on a `[m:ss]` / `[h:mm:ss]` token in the transcript seeks the media to that time (`stampAtCaret`). Only `click` triggers it, so scrolling, arrow keys and typing never move the audio.
- Selecting text (drag) is ignored.
- The click sets `suppressSyncUntil` so the follow-playback scroll doesn't yank the editor away from the line the user just clicked.
- Playback state is kept: a paused player stays paused after the jump.

## Timestamp bookmarks

- The visible seek bar was removed: the timeline shows every transcript timestamp as a marker and does the seeking. `#seekBar` and `#seekMarks` still exist inside a `hidden` wrapper because the script reads them. Do not delete them without cleaning those references, and do not show them again unless asked.
- `#lastStampBtn` ("⇥ Last m:ss", in the timeline header) jumps to the final timestamp in the document. It is disabled when there are no timestamps.
- `renderBookmarks` runs on `loadItem`, `loadedmetadata`, `durationchange`, and (debounced) on transcript `input`. It fills `tlStamps` and updates the Last button.

## Zoomable timeline

- `.tl-row` holds a header (`.tl-head`: play `#playBtn`, `#currentTime` / `#totalTime`, `#lastStampBtn`, volume `#boostBar`/`#boostVal`, speed `#speedSel`, Voice `#voiceBtn`, Timeline title, `#tlOut` / `#tlIn` / `#tlFit`, `#tlInfo`) and `#tlCanvas`, which draws a time ruler, the waveform, transcript timestamps (accent for the last one), the A-B loop range and the playhead. Everything is one `tlDraw()` pass; colors come from the CSS variables via `tlColors()` (cache reset in `applyTheme`).
- The view is `tl = { start, span }` in seconds (min span 2 s, max the full duration), kept valid by `tlClamp()`. **Magnet snap:** a click or drag within `TL_SNAP_PX` (10 px, scales with zoom) of a transcript timestamp lands exactly on it (`tlSnap`); hold **Alt** to seek freely. Panning, wheel, `[`/`]` and arrow keys do not snap. Wheel zooms around the cursor, Shift+wheel / Shift+drag / middle-drag pans, click or drag seeks, double-click or **Fit** shows the whole file, the − / ＋ buttons and `+` / `-` keys zoom around the playhead. Wheel and gesture events are `preventDefault`ed so the browser never zooms the page.
- While playing, a rAF loop (`tlLoop`) redraws and the window pages along with the playhead; a manual zoom/pan pauses that for 2 s (`tl.holdUntil`). On `seeked` outside the view (transcript click, Last, bookmark, loop wrap) the view recentres on the playhead.
- Waveform: `tlLoadPeaks` decodes the file once with an `OfflineAudioContext` at 8 kHz (never uploaded), `tlBuildPeaks` stores min/max peaks at 100/s plus a pyramid of x8 coarser levels so drawing stays cheap when zoomed out. Files over 120 MB skip the waveform (ruler and markers still work). Peaks are cached on the library item (`item.peaks`, `item.peaksState`).
- `tlStamps` is set in `renderBookmarks`; `updateLoopBand` also calls `tlDraw`, so loop and transcript changes redraw the timeline.

## A-B loop (timestamp to timestamp)

- `.loop-row` sits at the right end of the top bar (same line as Add and the title) and holds a Loop toggle (`#loopBtn`, key `L` outside text fields) and two selects, From (`#loopA`) and to (`#loopB`), filled by `refreshLoopOptions` from the transcript's timestamps. `#loopB` also offers "End of file" (`Infinity` in `loop.b`).
- On first enable, From is the timestamp at or before the playhead and to is the next one. Changing a select while looping restarts at From.
- `loopTick` (requestAnimationFrame, only while playing and looping) seeks back to From when playback reaches the end point. Seeks more than 1 s past the end are left alone so the user can leave the loop; the `ended` event handles "End of file".
- The looped range is drawn on the timeline by `tlDraw`. A `.loop-band` is still maintained inside the hidden `#seekMarks`; it is not visible.
- The loop turns off by itself if the transcript no longer has timestamps.

## Current-line highlight

- The textarea is wrapped in `.editor-wrap` (created in JS) with a `.line-hl` bar behind it. The textarea background must stay transparent for the bar to show.
- `updateLineHighlight` highlights the whole line (including wrapped rows) the caret is on, measured with `offsetOfChar`. `positionLineHighlight` only re-applies the scroll offset and runs on every scroll.
- **While the media is playing, the playing line wins** (`playingLine()`: the stamp line for the current time, same rule as follow-playback), even when the caret is in the editor and the user is typing. The caret and typing are untouched; only the bar moves. When paused, ended, or before the first stamp, the bar follows the caret again. `updateLineHighlight` also runs on `play`, `pause`, `seeked` and `ended`.

## Status messages

- `#tsStatus` (in `.transcript-footer`) is a floating note over the bottom-right corner of the editor, not a layout row. Setting its `textContent` shows it; a `MutationObserver` fades it out after 3 s and clears the text. It takes no vertical space. The audio file name is never written to it.

## Speakers

- The speaker bar (created in JS, above the editor) holds up to 9 numbered slots, saved in `localStorage` under `ampm.speakers`. Names are stored uppercase without the colon.
- **Alt+1…9** (or clicking a chip) calls `insertSpeaker(slot)`. Double-click a chip to rename it. Ctrl+number is deliberately not used: Chrome/Edge reserve it for tab switching and pages cannot override it.
- Behavior, based on the caret line: existing speaker label gets swapped; empty or timestamp-only line gets filled; caret at the end of a finished line starts a new turn (`\n[m:ss] NAME: `); caret elsewhere in an unlabeled line tags that line.
- Text is inserted with `execCommand('insertText')` so Ctrl+Z works, with a `setRangeText` fallback.
- Shortcuts are skipped while typing in the add-speaker input, so Shift+Space can type a space there.

### Speaker name autocomplete (type the start of a name + colon)

- Typing the start of a name in **capitals** followed by `:` at the start of a line (after an optional `[m:ss]`) completes it to the full label: `MA:` becomes `DR. MARIANO:`. Implemented in the `input` listener after `renderSpeakers()` (`knownSpeakerNames`, `matchSpeaker`, `SPK_LABEL_RE`).
- Known names are the speaker-bar slots plus every label already used in the transcript (a line starting with CAPITALS followed by `:`; the line being typed is ignored). Matching, best first: the name starts with what was typed (ignoring periods, so `DR M` matches `DR. MARIANO`), a word of the name starts with it, the initials of the words start with it. Ties go to the label used most often, then the most recent.
- Guards: needs 2+ letters; only runs on a typed `:` (`inputType === 'insertText'`), not on paste, IME composition or lowercase text; does nothing if what was typed is already a real label in the document (so a user's own short label like `MA:` is respected); the replacement uses `execCommand('insertText')` so **Ctrl+Z** undoes the completion (`spkAutoBusy` stops it re-triggering itself).
- A short toast (`#tsStatus`) shows `MA: → DR. MARIANO:`. No popup or Tab key is involved.

## Autosave (per media file)

- The transcript is saved in `localStorage` as `ampm.tx.<library key>` = `{text, t, name}`, where the key is the same `name|size|lastModified` used by the library, so adding the same file again brings its text back. With no file loaded it is saved as `ampm.tx.draft`. Nothing is uploaded.
- Saved 700 ms after typing stops (`input` listener) and immediately on `pagehide` / tab hidden (`txSaveNow`). The header shows `Saved h:mm` (`#saveInfo`). An empty editor is never saved, so an accidental clear cannot erase a saved copy.
- `loadItem` calls `txOnLoad(item)` first. Switching between library files swaps the editor to that file's own saved transcript (or empty). First file added with an empty editor restores its saved text. If the editor already has text and a different saved copy exists, a `confirm()` asks which to keep; keeping the editor text replaces the saved copy.
- On page start (`txRestoreLast`), if the editor is empty, the most recently saved transcript is put back (even before any media is added) and `txKey` points at it, so later edits keep saving to the same file.
- Storage failures (private mode, full quota) show `Not saved (browser storage full)`; do not block typing.

## Export

- Header button **Export ▾** (`#exportBtn`, menu `#exportMenu`): **Text (.txt)** (UTF-8 with BOM, CRLF line breaks so Windows Notepad shows it correctly) and **Word (.doc)** (an HTML document with Word headers, which Word opens; speaker labels bold, timestamps grey). Checkbox **Include timestamps** (`#exportStamps`, saved as `ampm.exportStamps`); when off, every `[m:ss]` / `[h:mm:ss]` is removed and lines left empty by that are dropped.
- **Ctrl/Cmd+S** exports `.txt` (the browser's Save Page is suppressed). File name is the media name (or the saved transcript's name), unsafe characters replaced.
- A real `.docx` would need a zip writer; the `.doc` HTML route avoids adding any library. Keep it that way unless asked.

## Auto-rewind on resume

- Number box **Rewind** (`#rewindInput`, 0 to 10 s, default 2, saved as `ampm.rewind`, 0 = off) in the transcript header. After a pause, `play` first jumps back that many seconds (`pausedAt` recorded on `pause`).
- Skipped when the position moved while paused (more than 1.5 s from where it paused: seek, timestamp click, bookmark, Last), after loading another file (`txOnLoad` resets `pausedAt`), at the end of the file, and for the loop wrap (its `play()` comes after a seek).

## Playback speed

- `#speedSel` (0.5× to 1.5×) in the timeline header, **Alt+↑ / Alt+↓** step through the list (`stepSpeed`; the handler uses `stopImmediatePropagation` so the plain ↑/↓ volume keys do not also fire). `setSpeed` sets both `defaultPlaybackRate` and `playbackRate` (a new `src` resets the rate, so it is re-applied on `loadedmetadata`), keeps `preservesPitch` on, and saves `ampm.speed`.

## Voice clean-up (Voice button)

- `#voiceBtn` toggles `voiceOn` (saved as `ampm.voice`). `applyVoice()` sets the filter chain: on = high-pass 110 Hz, +4 dB peaking at 2.8 kHz, compressor threshold -28 dB / ratio 3 for levelling quiet and loud speech, makeup gain 1.5, then the limiter; off = the original behaviour (high-pass at 10 Hz, 0 dB, compressor -8 dB / 8:1, makeup 1). The nodes always sit in the chain so toggling never rebuilds the graph (`createMediaElementSource` can only be called once). The chain is created by `ensureAudio()`, which also runs on `play` when Voice is saved as on.

## Quick markers

- **F2** inserts `[inaudible h:mm:ss]`, **F4** inserts `[crosstalk h:mm:ss]` at the caret (time omitted when no media is loaded), through `execCommand` so Ctrl+Z works (`insertMarker`, `insertAtCaret`). The brackets do not directly wrap a time, so `parseStamps` and the timeline ignore them.
- Review them with Find (below): the "Jump to" chips search `[inaudible` / `[crosstalk`, and landing on a match inside such a marker also moves the audio to the time in it (`seekToMarkerAt`).

## Find and replace

- **Ctrl/Cmd+F** opens the find bar (an overlay in the top-right of `.editor-wrap`, `.find-bar`), **Ctrl/Cmd+H** opens it with the replace row. Enter / Shift+Enter = next / previous, Esc closes, `Aa` = match case (default is case-insensitive), `⇄` shows or hides the replace row. The count shows `n / total`. Typing in the bar jumps to the first match at or after the caret.
- Matches are selected in the textarea (`findGoto`: focus the textarea, `setSelectionRange`, scroll with `offsetOfChar`, focus back to the find box) and `suppressSyncUntil` is set so follow-playback does not scroll away for 4 s. **Replace** replaces the selected match and moves on; **All** replaces everything in one `execCommand` step, so one Ctrl+Z undoes it all.
- The find and replace inputs stop key propagation (the global `[` / `]` skip keys would otherwise block typing a bracket); Ctrl/Cmd combinations are allowed through.

## Word count and progress

- `.editor-meta` (bottom-left of the transcript pane, no layout space, pointer-events none) shows the word count (timestamps and `[markers]` not counted) and, when media is loaded and there are timestamps, `typed to 1:56:48 of 2:26:08 (80%)` (the latest timestamp against the duration). Updated 250 ms after typing and on `loadedmetadata` / `durationchange`.

## Phrase shortcuts

- The **⚡ Phrases** button (speaker bar) opens a dialog with one `short = full text` per line (short forms: letters/numbers, up to 12; `#` lines ignored; max 300), saved raw in `localStorage` as `ampm.phrases`. Typing a short form followed by space or `. , ; ? !` expands it (`input` listener; `:` is deliberately excluded because the speaker autocomplete uses it). A capitalised short form capitalises the expansion. Uses `execCommand('insertText')` (`phraseBusy` guards re-entry), so Ctrl+Z undoes it.

## Review mode (listen with the keyboard, fix on pause)

- Header button **Review** (`#reviewBtn`, `aria-pressed`) or **Alt+R** toggles `reviewOn` via `setReview(on, announce)`. Not saved: it always starts off. The old line-by-line stepping (`N` / Shift+`N` / `R`, the 12 s clip and its `reviewTick`) was **removed on purpose**; do not bring it back.
- **Listening:** the textarea is `readOnly` (`.editor-wrap.reviewing`, accent outline) and blurred, so Space / Shift+Space / arrows / `[` `]` only control playback. Playback is normal and continuous; the highlight bar follows the playing line.
- **Pause = edit:** any pause (Space, Shift+Space, media key, headset, the Pause + edit button or `P`) while review is on calls `reviewEditHere()`: it unlocks the editor (`reviewEdit = true`, `.review-edit` lighter outline), focuses it, puts the caret at the **start of the line that was playing, just after its timestamp and the spaces after it** (`stampLineAt`, `afterStampPos`), scrolls there and shows `Paused at m:ss — edit, Shift+Space to resume`. The `pause` listener ignores the end of the file and pauses while nothing is loaded.
- **After resuming:** the editor **stays editable** and in `syncTranscriptToTime` the caret **follows the audio** to the start of each new playing line (even while the editor is focused), but not for 1.5 s after the user typed (`lastTypeAt`), so a word is never split between two lines. A later pause moves the caret back to the playing line unless the user was typing at that moment.
- `reviewLocked()` (guard in `insertTimestamp`, `insertSpeaker`, `insertMarker`, `replaceOne`, `replaceAll`) is true only while locked (`reviewOn && !reviewEdit`); the message is `Review mode — pause to edit`. If you add another function that edits the text, add the same guard.
- **Alt+R** (capture-phase listener so it wins everywhere) turns review off from either state; pressing it again starts a fresh locked review.

## Text size and line spacing

- **Aa** button (`#fontBtn`, menu `#fontMenu`, same open/close pattern as Export) with two sliders: size 10–36 px (`#fontSize`, default 13.5, `FS_MIN` / `FS_MAX`) and line spacing 1.3–2.4 (`#lineHeight`, default 1.65), plus Reset. Saved as JSON in `localStorage` `ampm.font` = `{fs, lh}`.
- The textarea font is `font: 500 var(--tx-fs, 13.5px)/var(--tx-lh, 1.65) "Inter"`; `applyFont` sets the two custom properties on `#transcriptText`. `offsetOfChar` and the line highlight read the computed font, so they follow automatically. `applyFont` keeps the caret's line at the same screen position while the metrics change. Do not hard-code the size elsewhere; the mirror div must keep using the textarea's computed font.

### Quick zoom on the text box

- Same setting as the size slider (`fontPrefs.fs`), changed through `zoomText(fs, announce)` (rounds to 0.5 px, clamps to `FS_MIN`–`FS_MAX`, calls `applyFont(true)`, toast `Text 130%` relative to the 13.5 px default). Inputs: **Ctrl/Cmd + mouse wheel** or trackpad pinch over the editor (non-passive `wheel` listener with `preventDefault`, so the page itself does not zoom; wheel notches step 1 px, small trackpad deltas scale smoothly via `zoomF`), **Ctrl/Cmd + `+` / `-` / `0`** anywhere in the page (0 resets), and **two-finger pinch** on touch screens (`touchstart` / `touchmove` on the textarea; `touch-action: pan-x pan-y` on `#transcriptText` keeps the browser's own pinch-zoom off the editor). Plain wheel and one-finger scrolling are untouched.
- **The whole-app (browser page) zoom is blocked on purpose**: the viewport meta has `maximum-scale=1,user-scalable=no` (it is in the very first line of the file; keep it if the file is re-exported), `html, body { touch-action: pan-x pan-y }` stops pinch and double-tap zoom, a capture-phase `wheel` listener cancels Ctrl+wheel everywhere, `gesture*` events are cancelled for Safari, and a capture-phase `keydown` listener turns Ctrl/Cmd + `+` / `-` / `0` into text zoom anywhere in the page (not just in the editor). The browser's own menu zoom cannot be blocked by a page.

## Time readout

- `.tl-time` (current / total, in the timeline header) is large and high-contrast on a panel chip (19 px, total 15 px muted). In review mode `reviewOn` also sets `html.reviewing`, which makes it 30 px with an accent frame (`html.reviewing .tl-time`), since the clock is the thing watched while reviewing. Keep it readable in both themes (only `--ink`, `--muted`, `--panel`, `--accent` are used).

## Keep media on this device (IndexedDB)

- **Why:** the library (`state.items`, object URLs) lives in memory, so a reload, a browser that discards background tabs, or leaving for `index.html` and coming back used to empty it. Files added now are also stored in this browser (never uploaded) and restored on the next start.
- **Storage:** IndexedDB database `ampm-transcriptor`, store `files` (keyPath `key`), records `{key, name, type, size, t, file}` where `key` is the same `name|size|lastModified` library key and `file` is the `File` itself (stored as a blob, not read into memory). `persistItem(item)` runs after `addFiles` (`item.saving` / `item.saved` drive the " · saving…" / " · saved" tag in the library list), checks room with `navigator.storage.estimate()` (needs the file size + 200 MB free) and asks for `navigator.storage.persist()`. A failure shows a toast and leaves the file memory-only.
- **Setting:** sidebar checkbox **Keep on this device** (`#keepFiles`, saved as `ampm.keepFiles`, default on) only affects files added from then on. `#keepInfo` shows `Saved on this device: n files · x MB · about y GB room left`.
- **Start-up:** `mediaAll()` at the end of the script re-creates the items (`saved: true`), sorted by time added, and opens the one in `localStorage['ampm.activeFile']` (written by `loadItem`) without autoplay, or the most recent. The restored transcript text follows the active file through `txOnLoad`.
- **Removing:** every library item has a small ✕ (`.item-del`, `removeItem`) that asks for confirmation, removes the file from the library and from IndexedDB; if it was the open file the empty player returns. **Transcripts are never deleted by this.**
- If a transcript's file is not in the library when another file is added, the editor switches to the new file's text and a toast says the previous transcript is kept; adding that file again brings it back.
- The player page (`index.html`) has its own separate storage (`ampm` database / OPFS); the two libraries are not shared yet.

## Media keys and headset buttons (Media Session API)

- At the end of the script. Handlers: `play`, `pause`, `seekbackward` / `seekforward` (the Skip value, or the OS-provided offset), `seekto`, and **`previoustrack` / `nexttrack` = previous / next transcript timestamp** (`stampStep`; falls back to a Skip jump when there is no timestamp). Previous goes to the start of the current line when more than 1.5 s into it, otherwise to the line before.
- Metadata (title = file name, app icon) is set on `loadedmetadata`; `playbackState` and `setPositionState` are refreshed on `play` / `pause` / `seeked` / `ratechange`. All calls are wrapped in `try/catch`; browsers without the API skip it. Handlers do nothing until a file is loaded.
- Keys reach the page only while the browser considers it the active media session (it has played audio); the OS or browser can still keep a key for itself.

## Windows desktop mode

Windows is the primary target. Things to check when changing UI:

- Test in Chrome and Edge at 100%, 125% and 150% display scaling.
- Unicode glyphs used as icons (☰ ☼ ＋ ▶ ⏸ 🔊) render with Segoe UI Symbol/Emoji fallbacks on Windows and differ in size and baseline. Keep them in fixed-width boxes so labels don't shift.
- `.icon-btn.icon-row` buttons must stay `display: flex`. Inheriting `display: grid` from `.icon-btn` stacks the icon above the label and clips the text in the 34px-high button (this was the bug in the expanded library sidebar).
- In the collapsed sidebar, labels must be hidden (`display: none`), not just transparent, so they cannot affect layout.
- Mind the 700px breakpoint: below it the sidebar becomes a top bar and labels are hidden.

## Conventions

- Keep everything in the single HTML file unless asked to split it.
- Use the CSS variables (`--bg`, `--panel`, `--ink`, `--accent`, ...) for all colors. Any new color needs both light and dark values.
- Plain JavaScript only; no frameworks or build tooling.
- Never put file names into `innerHTML`; use `textContent` (`renderLibrary` already does).
- Don't add network calls or upload media.
- Keep the UI minimal (the Review and Aa buttons are the only additions to the transcript header): don't re-add search, folders, previous/next, replay, extra skip/timestamp buttons, a visible seek bar, or a status/footer row that takes space, unless asked. Vertical space belongs to the transcript editor.

## Testing checklist

- Add a video and an audio file; confirm both appear in the library and clicking one loads it.
- Toggle Library and Theme in both collapsed and expanded sidebar states; icons and labels must sit on one line.
- Confirm the transcript editor is visible on load and there is no way to hide it.
- Insert a timestamp (Ctrl+Enter) and confirm the `[m:ss]` format at the cursor.
- Drag the boost slider to 300% and use ↑/↓ outside the editor; sound gets louder and the label updates.
- Zoom the timeline with the wheel, the buttons and `+` / `-`; pan with Shift+wheel; seek by clicking; confirm the playhead pages along while playing and the waveform appears for an audio file.
- Click/drag the timeline near a timestamp marker: it snaps; with Alt held it does not.
- Insert a timestamp: the status note appears bottom-right and fades; editor height never changes.
- Loop controls are on the top bar with Add and the title; play/time/Last/volume are in the timeline header.
- Open it from the installed player's ↗ button: it should open in an app window, not the browser.
- Type `MA:` at the start of a line when the transcript already has `DR. MARIANO:`; it becomes `DR. MARIANO:`, Ctrl+Z restores `MA:`; `ma:` (lowercase) and a single letter such as `Q:` are left alone.
- Type some text, reload the page: the transcript comes back. Add the same media file: its text is loaded. Switch between two library files: each shows its own transcript.
- Export .txt and .doc with and without timestamps; the .doc opens in Word with bold speaker names.
- Set Rewind to 3, pause, press Shift+Space: playback resumes 3 s earlier; seek while paused first: no rewind.
- Change speed with the list and Alt+↑/↓: audio slows down without a chipmunk pitch; the speed stays after loading another file.
- Turn Voice on and off while a quiet recording plays: rumble is reduced, speech is clearer, no clipping at 300% boost.
- Press F2 / F4 while playing: markers appear with the current time. Ctrl+F, click "inaudible": the editor jumps to the marker and the audio to its time. Replace one and Replace All (one Ctrl+Z undoes All).
- Bottom-left of the editor shows word count and "typed to X of Y (Z%)".
- Add `tnx = Thank you.` under ⚡ Phrases, type `tnx ` in the editor: it expands; Ctrl+Z undoes it.
- Review: load a file with timestamped lines, click **Review** (or Alt+R). The editor locks (typing, Ctrl+Enter, Alt+1…9, F2/F4, Replace do nothing and show the status note). Press Space: it plays continuously and the highlight follows. Press Space again: the editor unlocks, the caret sits at the start of the line that was playing (after its timestamp), you can type or use the arrow keys. Shift+Space resumes (with the Rewind jump), the editor stays editable and the caret follows the audio; typing mid-line does not get the caret yanked away for 1.5 s. Alt+R turns review off.
- Open **Aa**: change size and spacing; the editor text, the highlight bar and follow-playback scrolling stay aligned (also with wrapped lines). Reload: the setting is kept. Reset returns to 13.5 px / 1.65.
- Press the keyboard media keys or headset buttons while a file has played: play/pause, seek, and previous/next track jumps between transcript timestamps; the OS media overlay shows the file name.
- Hold Ctrl and roll the wheel over the editor (or press Ctrl + `+` / `-` / `0` anywhere): only the text zooms, the page does not (also check Ctrl+wheel over the timeline and the player, and pinch on a phone); the size matches the Aa slider and survives a reload. On a phone, pinch with two fingers on the editor.
- Switch Review mode on (Alt+R): the time at the left of the timeline header becomes big with an accent frame; off again returns it to normal size.
- Add a file, reload the page (and discard the tab from the browser's tab menu): the file is back in the library with the same transcript and opens ready to play. Untick **Keep on this device**, add another: it shows no "saved" tag and is gone after a reload. Remove a file with the ✕: it leaves the list and the device, and its transcript is still there when the file is added again.
- Verify dark mode and the mobile layout.
