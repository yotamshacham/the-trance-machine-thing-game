# 0004 — songs/local: the app and an agent share a file, live

2026-11-14

## Decision
Before an in-app "Ask AI" (`docs/ai.md`), the app and Claude Code work on the same file:
- `songs/local/` is gitignored and served by the dev server only (`apps/web/dev/localSongs.ts`):
  list, read, and write (validated with `parseSong`, written canonical).
- A song opened from there, or saved there with **Save to project**, is *linked*: edits in the app
  are written to the file after 300 ms; a change to the file on disk reaches the app over Vite's
  websocket and reloads the song (`reload` action: undoable, keeps the section being edited).
- If the file changed while the app was closed, the file wins on next open (undo brings back the browser's copy).

## Why
What's missing now is mostly engine and format work, which an in-app AI couldn't do. Claude Code can,
and a shared file removes the download, move, and reopen round trip. It also gives material we
can't commit (game rips, licensed samples) a home that's never in git or a deploy.

## Not chosen
- Writing into `songs/`: committed, so no rips or private samples there.
- A file picker / File System Access API: Chrome-only, and an agent can't see what the browser picked.

## Addendum (2026-11-14): requests
Requests from the app (**✦ Ask**) go through the same folder: `songs/local/.requests.json`, written
by the dev server, claimed and finished by an agent through `pnpm song requests`. A file and a CLI,
not a socket to the agent, so any agent that can run a command can serve them, and nothing is
lost while none is running.
