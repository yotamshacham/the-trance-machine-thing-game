# AGENTS.md

A web tracker for making psytrance: a drum machine, synths and a sampler, played from a song file
that people edit in the browser and agents write directly. Deployed to Cloudflare Pages (free tier).

## The song file is the product
- Everything the app plays is a **song** (`songs/*.json`, schema `songs/schema.json`, defined in
  `packages/song/src/schema.ts`). The UI and agents edit the same file; nothing musical lives only in the UI.
- Writing or changing a song: read `docs/song-format.md` and `docs/composing.md` first, then
  `pnpm song check <file>` until it passes. Songs in `songs/` show up in the app's Songs menu.
- Changing the format: zod schema first, then `pnpm song schema`, `docs/song-format.md`, and every
  file in `songs/` still parsing (a test enforces this). A breaking change bumps `VERSION` and adds a migration.

## Layout and boundaries
`packages/song` (format, pure) ← `packages/formats` (MIDI and other files, pure) and
`packages/engine` (Tone.js) ← `apps/web` (React). Each has its own `AGENTS.md` with its boundary
and how to verify it; read it before working inside that package. Where code goes and why:
`docs/architecture.md`.

## Workflow
- Every change goes on a branch and lands through a PR to `main` (`gh pr create`); CI runs
  `pnpm check` and `pnpm build`. Never commit to `main` directly.
- Pure logic (`packages/song`, `packages/formats`, `apps/web/src/state.ts`) is test-first: load
  `mattpocock-skills:tdd`. A bug fix starts with a failing test.
- Load `mattpocock-skills:domain-modeling` before changing a stored type, and
  `mattpocock-skills:codebase-design` before adding a package or module.
- Done means `pnpm check` and `pnpm build` pass, *and* for anything audible or visible you ran
  `pnpm dev` (http://localhost:5180), used it and listened. Say plainly what you could not verify.
- Decisions (a library, a format, a hosting choice) get a dated record in `docs/decisions/`;
  what's built vs. planned lives in `docs/roadmap.md`. Update both in the same PR as the change.

## Ground rules
- Sound is synthesized in code or comes from samples we may redistribute (CC0 or our own).
  Licensed packs (Futurephonic, Splice…) are local banks: linked in gitignored `samples/private/`,
  served by the dev server only, never committed or deployed. See `docs/samples.md`.
- Imported material (game rips, MIDI from the web) is never committed; tests build their inputs in code.
- Musical taste is the user's: when a choice is aesthetic, offer options and ask.

## Deploy
`pnpm deploy:web` builds and uploads `apps/web` to the Pages project `the-trance-machine`, by hand
from a logged-in Mac (`wrangler login`). There are no Cloudflare secrets in GitHub.
