# Samples and sounds

## Default sounds: synthesized
The default kit is made in code (`packages/engine/src/presets.ts`): every drum voice and synth
preset is Tone.js synthesis, so there's nothing to license, download or host, and the app works offline.

## Sampler
A sampler track plays an audio file by URL. Files under `apps/web/public/samples/` are served at
`/samples/…` and deployed with the app; only commit files we may redistribute:
- **CC0** packs (e.g. from Freesound, filtered to CC0), recorded with their source in
  `apps/web/public/samples/SOURCES.md`.
- Sounds we make ourselves, e.g. rendered from our own synth presets.

Commercial packs (Splice, the claude-tracker `samples/` folder) are fine for your own local use in
`samples/private/` (gitignored) but must never be committed or deployed.

## Open questions
- A built-in sample library: which CC0 sets, and where to host larger files (R2 has a free tier).
- User samples: storing dropped-in files in IndexedDB so songs can reference them locally.
