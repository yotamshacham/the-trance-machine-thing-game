# packages/song (`@ttm/song`)

The song format: schema, parsing, grid shorthand, editing, scheduling. Root `AGENTS.md` and
`docs/song-format.md` apply; this file covers only what's local.

## Boundary
- Pure TypeScript, no DOM, no Tone.js, no React. Depends only on `zod`.
- Deterministic: same song in, same data out. Everything here is unit tested.
- A change to the schema is a format change: update `docs/song-format.md`, regenerate
  `songs/schema.json` (`pnpm song schema`), and keep every file in `songs/` parsing.

## Verify
`pnpm --filter @ttm/song test && pnpm --filter @ttm/song typecheck`
