# Roadmap

## Built
- Song format v1 with grid shorthand, JSON Schema, CLI (`pnpm song`).
- Drum machine (8 synthesized voices), 6 synth presets with acid slides, URL sampler.
- Tracker UI: sections, per-track patterns, step grid, mute/solo/volume, undo, autosave.
- MIDI import (GM drums mapped, 16th quantize, 4-bar sections deduped into patterns) and export.
- `songs/basic-psy.json` template; Goa Sunrise and Night Forest examples.
- Fills: tracks in a `fills` group; `noise` preset + `swell` for risers. Groups can be named per track.
- Synth patches: filter type and envelope, unison/detune, noise, sub, drive, two tempo-synced LFOs (cutoff, volume gate, pitch, pan); a Synth panel per track. Next: several oscillators per patch, a mod matrix, per-track chorus/phaser; later wavetables and a ladder filter (AudioWorklet).
- Mix: per-track delay/reverb sends, duck by the kick, low/high-pass; shared tempo-synced delay and reverb. Lead presets: supersaw, psy-pluck, square-lead, soft-saw.
- Tracks shown in foldable groups (kick & bass, drums, leads, pads & FX), each track's controls foldable to one line; worked out from the sound. Next: let a song name its own groups.
- **✦ Ask** on tracks, sections and the song: requests an agent picks up (`pnpm song requests`), with replies shown in the app.
- `songs/local/` (dev server): the app and an agent edit the same file live; agent edits load while playing.
- Local sample banks (Futurephonic: 796 sounds, multisampled basses, tempo-synced loops), dev server only.

## Next
- Song-level effect settings in the UI; filter and send automation over a section (builds).
- Hear and tune the default sounds (kick and bass especially) against reference tracks.
- Note editing beyond click/shift-click: velocity, length, slide in the grid.
- In-app "Ask AI" (`docs/ai.md`).
- Tracker module import (MOD/XM/IT/S3M): pattern-based like ours, so they map almost directly.
- Video game music import: VGM/VGZ (register logs; Sega/Genesis, SN76489, YM2612) and NSF/SPC/GBS.
  Wrap existing open-source converters (VGMTrans family, libgme) rather than writing emulators.
  Prior work: video-game-psytrance-tool's `FormatAdapter` and discovery catalog of VGM archives.
- Sample library (CC0) and user samples in IndexedDB (`docs/samples.md`).
- Loop start offsets (play bars 9–16 of a loop) and a sample tuning offset (the Futurephonic basses sit ~40 cents flat).
- Offline render to WAV.
