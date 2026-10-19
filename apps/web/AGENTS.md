# apps/web (`@ttm/web`)

The tracker UI: Vite + React, deployed to Cloudflare Pages. Root `AGENTS.md` applies.

## Boundary
- Song edits go through `@ttm/song`'s edit functions via the reducer in `src/state.ts`; sound only
  through `@ttm/engine`'s `Engine`; files only through `@ttm/formats`. Components hold no music logic.
- Simple first: every control is visible and labelled, no hidden modes. Undo covers every edit.
- No `alert`/`confirm`/`prompt`: undo instead of "are you sure?".

- `dev/` is dev-server code (local sample banks): it never runs in the build, and audio it serves
  never goes into `public/`.

## Verify
`pnpm --filter @ttm/web typecheck && pnpm --filter @ttm/web test`, then `pnpm dev`
(http://localhost:5180) and use the change: click it, play it, listen.
