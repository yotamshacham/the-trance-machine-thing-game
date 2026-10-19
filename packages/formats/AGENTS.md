# packages/formats (`@ttm/formats`)

Other file formats ↔ songs: Standard MIDI in and out today; tracker modules (MOD/XM/IT) and
video game music formats (VGM, NSF, SPC…) next (see `docs/roadmap.md`). Root `AGENTS.md` applies.

## Boundary
- Pure TypeScript, no DOM, no Tone.js, no React. Bytes in, `Song` out (and back).
- Depends only on `@ttm/song`. Every importer produces a valid song (`parseSong` accepts it).
- A new format is a new `Importer` in `src/registry.ts`. For chip formats, prefer wrapping an
  existing open-source converter over writing emulation; record the choice in `docs/decisions/`.
- Tests build their MIDI files in code (`src/midi/smf.ts`'s writer); no binary fixtures in git.

## Verify
`pnpm --filter @ttm/formats test && pnpm --filter @ttm/formats typecheck`
