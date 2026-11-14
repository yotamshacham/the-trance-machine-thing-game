# Samples and sounds

## Default sounds: synthesized
The default kit is made in code (`packages/engine/src/presets.ts`): every drum voice and synth
preset is Tone.js synthesis, so there's nothing to license, download or host, and the app works
offline. This is what the deployed site plays.

## Local sample banks (licensed packs)
Packs bought for personal use, like Futurephonic, may be used to make music but not redistributed:
no git, no deploy. They live as **links** in `samples/private/` (gitignored), and only the dev
server serves them (`apps/web/dev/localSamples.ts`, at `/local-samples/…`). A bank definition
(`apps/web/dev/futurephonic.ts`, folder rules only, no audio) turns a pack's folders into groups
of sounds: kicks, basses, leads & arps, and so on. The app lists them under "Futurephonic samples"
when the dev server finds them; on the deployed site they don't exist.

Set up on a new machine (paths are where the packs were unpacked):
```bash
mkdir -p samples/private
ln -s ~/Downloads/"Futurephonic - Future Geometrics - An Audio Library for Psychedelic Trance" samples/private/futurephonic-fg
ln -s ~/Downloads/"Futurephonic - Sonic Formations" samples/private/futurephonic-sf
```

How the Futurephonic folders map:
- **Basses**: each folder is a multisample, one file per note. Notes without an octave were
  recorded in octave 1 (C1–B1, measured); "C0"/"C1" are C1 and C2.
- **Leads & arps, pads, top loops**: loops named "135 F# Name" or "135 - F# - Name" carry their
  tempo and key; they're stretched to the song's tempo. Unnamed tempo means a free one-shot.
- **Kicks, snares & claps, hats, percussion, FX**: one-shots.

Adding another pack: link it under `samples/private/`, write a `BankDefinition` beside
`futurephonic.ts`, and pass it to `localSamples` in `apps/web/vite.config.ts`.

Songs that use a local bank (e.g. `songs/chrome-machine.json`) play those tracks only where the
pack is linked; elsewhere those tracks are silent.

## Redistributable samples
Files under `apps/web/public/samples/` are deployed with the app at `/samples/…`. Only commit
files we may redistribute: CC0 packs (with their source in `apps/web/public/samples/SOURCES.md`)
or sounds we make ourselves.

## Open questions
- A built-in CC0 library, and where to host larger files (R2 has a free tier).
- User samples: dropped-in files kept in IndexedDB so songs can reference them in the browser.
