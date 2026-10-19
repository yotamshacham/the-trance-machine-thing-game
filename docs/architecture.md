# Architecture

pnpm workspaces, TypeScript (strict), Vite + React, Tone.js, Vitest, Cloudflare Pages.

```
packages/song      @ttm/song     the song format: schema (zod), grid shorthand, edits, scheduling
packages/formats   @ttm/formats  files ↔ songs: Standard MIDI in/out; importers registry
packages/engine    @ttm/engine   plays songs with Tone.js: drum voices, synths, sampler, transport
apps/web           @ttm/web      the tracker UI
songs/                           song files (the template, AI-written songs) + schema.json
scripts/song.ts                  CLI over the packages (check, tidy, schema, import, export)
```

Dependencies only point down: `web → engine, formats → song`. `song` and `formats` are pure
(no DOM) and fully unit tested; `engine` is tested where it's data (`presets.ts`) and by ear.

## Data flow
1. A song file is read by `parseSong`: validated, cross-references checked, grids expanded, so
   everything downstream sees canonical `Song` data.
2. The UI edits it through pure functions (`packages/song/src/edit.ts`) behind a reducer with undo
   (`apps/web/src/state.ts`), and autosaves it to localStorage.
3. `schedule(song)` turns the arrangement into absolute-step `NoteEvent`s (loops patterns, links
   slides). The `Engine` indexes them by step and plays each 16th from the Tone transport, so
   swapping the song mid-play is just re-indexing.
4. Saving writes canonical JSON with grids wherever lossless (`stringifySong`).

## Seams for what's next
- New file formats: an `Importer` in `packages/formats/src/registry.ts`.
- New sounds: a preset row in `packages/engine/src/presets.ts`; a new instrument kind starts in the schema.
- In-app AI: a Pages Function under `apps/web/functions/` (see `docs/ai.md`).
