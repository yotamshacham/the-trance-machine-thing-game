# Composing psytrance in this format

For agents writing songs: the genre conventions that make a song sound like psytrance. They are
defaults, not rules; when the user asks for something else, do that.

## Tempo and key
- Full-on/progressive: 138–148 bpm, 145 is the classic. Darker/forest styles go faster (150+).
- Minor modes with a dark colour: **phrygian** (F# G A B C# D E) and phrygian dominant
  (F# G A# B C# D E), also aeolian. F#, E, G and A are common roots; the bass root sits at E1–A1.

## The groove
- **Kick**: four on the floor, `x...x...x...x...`, every bar of the drop. Nothing else hits the low end with it.
- **Rolling bass**: the three 16ths after each kick, "KBBB": `. F#1 F#1 F#1` per beat. Stays mostly on
  the root; movement comes in the last beat or every 2–4 bars (`. G1 F#1 A1`). It never plays on the kick.
- **Hats**: open hat on the offbeat 8ths (`..x.` per beat); closed hats on 16ths around it.
- **Clap/snare** on 2 and 4 (`....x.......x...`), often only in the drop.
- **Acid / lead**: 1–2 bar 16th-note phrases in the scale, octave jumps, accents (`!`) and
  slides (`~`) for squelch. Repetition with small changes beats new material.
- **Pad**: long chords (`notes` with `len` 32–64) for breakdowns.

## Arrangement
Phrases are 8 or 16 bars; change something every 8. A typical full-on track (~7–9 min):
intro (kick + hats, 32) → build (bass in, 16) → drop (everything, 32) → breakdown (no kick,
pads + lead, 16–32) → build (8–16) → drop 2 (variation, 32) → outro (32). Mute the kick a bar
before a drop for tension (a 1-bar section without it).

Make each new section by reusing patterns and changing one or two tracks; write variations as new
patterns (`b`, `c`) on the same track rather than new tracks.

## Before handing a song over
`pnpm song check songs/<file>.json` passes, and its summary (bars, length, tracks per section)
matches what was asked.
