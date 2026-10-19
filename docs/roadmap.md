# Roadmap

## Built
- Song format v1 with grid shorthand, JSON Schema, CLI (`pnpm song`).
- Drum machine (8 synthesized voices), 6 synth presets with acid slides, URL sampler.
- Tracker UI: sections, per-track patterns, step grid, mute/solo/volume, undo, autosave.
- MIDI import (GM drums mapped, 16th quantize, 4-bar sections deduped into patterns) and export.
- `songs/basic-psy.json` template.

## Next
- Hear and tune the default sounds (kick and bass especially) against reference tracks.
- Sidechain-style ducking of bass/pads by the kick; per-track effects (delay, reverb, filter).
- Note editing beyond click/shift-click: velocity, length, slide in the grid.
- In-app "Ask AI" (`docs/ai.md`).
- Tracker module import (MOD/XM/IT/S3M): pattern-based like ours, so they map almost directly.
- Video game music import: VGM/VGZ (register logs; Sega/Genesis, SN76489, YM2612) and NSF/SPC/GBS.
  Wrap existing open-source converters (VGMTrans family, libgme) rather than writing emulators.
  Prior work: video-game-psytrance-tool's `FormatAdapter` and discovery catalog of VGM archives.
- Sample library (CC0) and user samples in IndexedDB (`docs/samples.md`).
- Offline render to WAV.
