# 0001 — Stack, and the song file as the centre

2026-10-18

## Decision
- pnpm workspaces · TypeScript strict · Vite + React · Tone.js · Vitest · oxlint · Cloudflare
  Pages by direct upload. Copied from piano-advanced-practice-ai and the-paint-thing-game, which
  run the same way, so tooling and deploy habits carry over.
- The song is a JSON file validated by a zod schema, which also generates the JSON Schema an AI is
  given. The UI, the CLI and agents all read and write that file.
- Tracker model: tracks own patterns; an arrangement of sections says which pattern each track
  plays. A fixed 16th grid in 4/4.
- A grid shorthand for patterns (`"x...x..."`, `". F#1 F#1 F#1"`), because agents write and read it
  with far fewer tokens and mistakes than note arrays. Notes stay canonical in memory.
- Pure packages (`song`, `formats`) hold all logic worth testing; the engine and UI stay thin.
- CI on GitHub Actions for PRs; deploy by hand, so no Cloudflare credentials live in GitHub.

## Why
The user wants to compose by asking an AI as much as by clicking. A validated, readable file
format makes the AI's output checkable (`pnpm song check`) and editable afterwards, and makes the
format, not the UI, the thing everything else is built around.

## Supersedes
Takes over from video-game-psytrance-tool (Tone.js layers, MIDI `FormatAdapter`, VGM discovery)
and claude-tracker (TS song DSL) as the home of this idea; their useful parts are listed in
`docs/roadmap.md` to port when needed.
