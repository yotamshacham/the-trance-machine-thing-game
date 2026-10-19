# packages/engine (`@ttm/engine`)

Plays a song in the browser with Tone.js: the drum machine voices, the synths, the sampler,
a channel strip per track, the transport. Root `AGENTS.md` applies.

## Boundary
- Knows songs (`@ttm/song`) and Tone.js; never React, never file formats.
- The UI talks to an `Engine`, never to Tone directly, so the audio implementation stays swappable.
- Sound settings live as plain data in `src/presets.ts` (no Tone import there, so it's unit tested);
  `src/voices.ts` turns them into Tone nodes. New sounds start as a preset row, not new code.
- Unit tests cover `presets.ts`. Anything that makes sound is verified by ear in the running app
  (`pnpm dev`): tests passing is not "it sounds right".

## Verify
`pnpm --filter @ttm/engine test && pnpm --filter @ttm/engine typecheck`, then listen.
