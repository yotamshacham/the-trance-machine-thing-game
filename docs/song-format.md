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
- `{"kind":"synth","preset":…}`: presets `rolling-bass acid sub pad lead pluck supersaw psy-pluck
  square-lead soft-saw`. Optional overrides:
  `wave` (`sawtooth square sine triangle`), `cutoff` Hz, `resonance`, `envAmount` (octaves the filter
  opens), `attack decay sustain release` seconds, `glide` seconds. `rolling-bass`, `acid` and `sub`
  are mono (slides work); the rest are polyphonic.
- **Synth patch**: on top of the preset, a synth may set
  - `filter` (`lowpass highpass bandpass notch`), `filterAttack`, `filterDecay`, `filterSustain`
  - `unison` (1–16 stacked voices) and `detune` (their spread, cents)
  - `noise`, `sub`, `drive` (0–1)
  - `lfo`: up to two `{ "target": "cutoff"|"volume"|"pitch"|"pan", "rate": steps, "depth": 0–1,
    "shape": "sine"|"square"|"triangle"|"sawtooth" }`. `rate` is one cycle in steps (1 = 16th,
    4 = beat, 16 = bar), so it follows the tempo; LFOs restart with playback, in line with the bar.
- `{"kind":"sampler","sample":url,"root":"C3","gate":false}`: plays an audio file, repitched from `root`.
  Without `gate` it plays the sample out; with it, it's cut at the note's length. Pitchless notes play `root`.
  - **Multisample**: `"sample": {"C1": url, "C#1": url, …}`, each file recorded at its note; a note
    plays the nearest one, repitched. Pitchless notes play the lowest.
  - **Loop**: add `"bpm": 135`, the loop's own tempo. It's stretched to the song's tempo (pitch
    kept), transposed from `root` by the note's pitch, and plays for the note's length: one note
    `len` 256 plays a 16-bar loop once.
  - Samples under `/local-samples/…` come from a local bank (`docs/samples.md`) and play only on
    the dev server of a computer that has those packs.

## Fills
Fills are ordinary tracks, usually in the `fills` group:
- `"group": "fills"` puts a track in the editor's Fills group (any lowercase name makes a group of its own).
- `"cut": ["kick", "bass"]`: the tracks this one **replaces**. They're silent while it plays a note;
  everything else keeps playing. A muted track cuts nothing; each id must name a track.
- A riser: `{"kind": "synth", "preset": "noise", "swell": true}`: noise that fades in over each note's
  length, so one note `len` 16 rises from silence across a bar. `swell` works on any synth (pad swells).

## Mix and effects
Each track can also say how it sits in the mix (all optional, 0 when left out):

| field | meaning |
|---|---|
| `delay`, `reverb` | 0–1: how much of the track goes to the song's delay and reverb (its **sends**) |
| `duck` | 0–1: how far the track dips each time the ducking track (the kick) hits, then recovers |
| `lowpass`, `highpass` | Hz: cut above / below |

The song's shared effects, all optional:
```jsonc
"effects": {
  "delay": { "steps": 3, "feedback": 0.35 },  // echo time in steps (3 = dotted 8th)
  "reverb": { "decay": 2.5 },                 // seconds
  "duck": { "by": "kick", "release": 0.18 }   // the track that ducks the others; seconds back up
}
```
`duck.by` must name a track if given; by default it's `kick`, and if the song has no such track
nothing ducks. A muted ducking track doesn't duck.

Sound settings per preset live in `packages/engine/src/presets.ts`.
