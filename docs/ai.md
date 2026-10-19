# Working with AI

The song file is the interface: an agent that can write JSON can write music here.

## Now: agents write song files
In this repo, ask Claude Code (or any agent) for a track. It reads `docs/song-format.md` and
`docs/composing.md`, writes `songs/<name>.json`, and runs `pnpm song check` until it passes.
The dev server picks the file up; it's in the app's Songs menu. To have an agent change what you
made in the browser, Save the song into `songs/` and point the agent at it.

`pnpm song import <file.mid>` turns a MIDI file (a game soundtrack, a sketch) into a song an
agent can then rework.

## Next: asking from inside the app (planned)
An "Ask AI" box that sends the current song and the request to a Cloudflare Pages Function, which
calls the Claude API with `songs/schema.json` and these docs as context and returns an edited song.
The app validates the reply with `parseSong` and shows it as one undoable edit. Same shape as the
coach in piano-advanced-practice-ai (KV, invite codes, an API key as a Pages secret). Needs a
decision record before building: cost and access control.
