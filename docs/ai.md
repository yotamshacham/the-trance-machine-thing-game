# Working with AI

The song file is the interface: an agent that can write JSON can write music here.

## Now: agents write song files
In this repo, ask Claude Code (or any agent) for a track. It reads `docs/song-format.md` and
`docs/composing.md`, writes `songs/<name>.json`, and runs `pnpm song check` until it passes.
The dev server picks the file up; it's in the app's Songs menu. To have an agent change what you
made in the browser, Save the song into `songs/` and point the agent at it.

### Live, while the app plays: `songs/local/`
On the dev server, **Save to project** writes the song to `songs/local/<name>.json` (gitignored)
and keeps the two in step: edits in the app are written to the file, and when an agent edits the
file the app reloads it, while playing, as one undoable edit. Files there also show in the Songs menu
under *songs/local*. Use it for anything that can't be committed (songs from game rips, songs
using local sample banks); an agent writes there directly and runs `pnpm song check` on it.

### Asking from the app: requests
With a linked song, each track, the section bar and the song have **✦ Ask**: a one-line request
("darker bass", "make this sparser"). It waits in `songs/local/.requests.json`; the app shows it
as waiting → working… → done, with the agent's reply. An agent serving requests loops:

1. `pnpm song requests wait`: blocks until a request comes, claims it, prints it (run it in the background).
2. Edit `songs/local/<file>` for what it asks (`pnpm song check` it); the app reloads it live.
3. `pnpm song requests done <id> <one-line reply>` (or `failed <id> <why>`).

Requests only move while an agent is running that loop.

`pnpm song import <file.mid>` turns a MIDI file (a game soundtrack, a sketch) into a song an
agent can then rework.

## Next: asking from inside the app (planned)
An "Ask AI" box that sends the current song and the request to a Cloudflare Pages Function, which
calls the Claude API with `songs/schema.json` and these docs as context and returns an edited song.
The app validates the reply with `parseSong` and shows it as one undoable edit. Same shape as the
coach in piano-advanced-practice-ai (KV, invite codes, an API key as a Pages secret). Needs a
decision record before building: cost and access control.
