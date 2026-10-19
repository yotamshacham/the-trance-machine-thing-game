# The Trance Machine

A web tracker for making psytrance, simple enough to just click in a beat, built so an AI can
write whole tracks for you. Drum machine, synths and sampler; songs are plain JSON files.

```bash
pnpm install
pnpm dev            # http://localhost:5180
```

Click steps to switch them on, press space to play. **Loop section** plays the section you're
editing; **Whole song** plays the arrangement and follows along. Open imports `.json` songs and
MIDI files; Save and MIDI export them.

## Having an AI write a track
Ask Claude Code (or any agent) in this repo for a track, e.g. *"write a 145 bpm full-on track in
F# phrygian with a rolling bass and a squelchy acid line, 2 breakdowns"*. It writes
`songs/<name>.json`, checks it with `pnpm song check`, and the song appears in the app's Songs menu.
See [`docs/ai.md`](docs/ai.md).

## Scripts
| | |
|---|---|
| `pnpm dev` | the app, on the LAN at port 5180 |
| `pnpm check` | lint, typecheck, unit tests (what CI runs, plus `pnpm build`) |
| `pnpm song check\|tidy\|export\|import\|schema` | song files from the command line |
| `pnpm deploy:web` | build and upload to Cloudflare Pages |

## Docs
[vision](docs/vision.md) · [architecture](docs/architecture.md) · [song format](docs/song-format.md) ·
[composing psytrance](docs/composing.md) · [AI](docs/ai.md) · [samples](docs/samples.md) ·
[roadmap](docs/roadmap.md) · [decisions](docs/decisions/)
