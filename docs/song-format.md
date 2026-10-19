# Song format (`ttm-song` v1)

A song is one JSON file. The schema is `songs/schema.json`, generated from
`packages/song/src/schema.ts`, which is the source of truth when this page and the code disagree.
Check a file with `pnpm song check <file>`; it lists every problem with its path.

## Time
- 4/4 only. A **step** is a 16th note; a **bar** is 16 steps. Tempo is `bpm`.
- `swing` (0–0.5) pushes every odd step late by that fraction of a step.

## Shape
```jsonc
{
  "$schema": "./schema.json",
  "format": "ttm-song", "version": 1,
  "title": "…", "bpm": 145, "key": "F# phrygian", "description": "…",
  "tracks": [
    { "id": "kick", "name": "Kick", "instrument": { "kind": "drum", "voice": "kick" },
      "gain": 0, "pan": 0, "mute": false,
      "patterns": { "a": { "grid": "x...x...x...x..." } } }
  ],
  "arrangement": [
    { "name": "intro", "bars": 16, "play": { "kick": "a" } }
  ]
}
```
- **Tracks** have a lowercase `id` (letters, digits, dashes), one instrument, and named patterns.
- **Patterns** belong to their track. A pattern is `{ "length": steps, "notes": [...] }`
  or the grid shorthand `{ "grid": "…" }`.
- **Arrangement** is the song in order. Each **section** plays, for `bars` bars, one pattern per
  track listed in `play`; tracks not listed are silent. A pattern shorter than its section loops;
  one longer is cut off.

## Notes
`{ "step": 0, "pitch": "F#1", "vel": 0.8, "len": 1, "slide": false }`. Only `step` is required.
- `pitch`: note name, C4 = middle C, sharps or flats (`Bb2` is stored as `A#2`). Drum tracks ignore it;
  synth/sampler notes without one play C3.
- `vel` 0–1, default 0.8; 1 is an accent. `len` in steps, default 1.
- `slide`: glide into the track's next note without retriggering (303 style); the note is held until then.
- Several notes may share a step (chords): use `notes`, since a grid holds one note per step.

## Grid
One space-separated token per step; bar lines `|` are ignored.

| token | meaning |
|---|---|
| `.` | rest |
| `x` / `X` | hit without pitch / accented (drums) |
| `F#1` | a note; `F#1!` accented, `F#1~` slides into the next |
| `-` | hold: the previous note lasts one more step |

Runs of `x X . -` may skip the spaces: `"x...x...x...x..."`. Length is the token count.
Saving writes a pattern as a grid whenever the grid says it exactly (`pnpm song tidy` does the same).

## Instruments
- `{"kind":"drum","voice":…}`: the drum machine, synthesized. Voices: `kick clap snare closed-hat
  open-hat ride perc shaker`. Optional `tune` (semitones), `decay` (multiplier).
- `{"kind":"synth","preset":…}`: presets `rolling-bass acid sub pad lead pluck`. Optional overrides:
  `wave` (`sawtooth square sine triangle`), `cutoff` Hz, `resonance`, `envAmount` (octaves the filter
  opens), `attack decay sustain release` seconds, `glide` seconds. `rolling-bass`, `acid` and `sub`
  are mono (slides work); the rest are polyphonic.
- `{"kind":"sampler","sample":url,"root":"C3","gate":false}`: plays an audio file, repitched from `root`.
  Without `gate` it plays the sample out; with it, it's cut at the note's length.

Sound settings per preset live in `packages/engine/src/presets.ts`.
