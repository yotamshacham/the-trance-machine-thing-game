# 0003 — Licensed sample packs as local-only banks

2026-10-18

## Decision
Commercial packs (first: Futurephonic Future Geometrics and Sonic Formations) become a second
instrument bank that exists only on the user's machine:
- the audio stays where it was unpacked, linked from gitignored `samples/private/`;
- the Vite dev server serves it (`apps/web/dev/localSamples.ts`, `apply: 'serve'`), so it's never
  in a build or a deploy;
- a committed bank definition maps folders to groups; the bank list is built on request.

The sampler gained multisamples (a file per note) and tempo-synced loops (`bpm`) to play them.

## Why
The Futurephonic licence allows use in music productions but forbids uploading the sounds to any
server or distributing them. The repo is public and the site is public, so neither may hold
them. Serving from the dev server keeps the packs usable for composing (including by agents,
whose songs reference the same `/local-samples/…` paths) without them ever leaving the machine.

## Consequences
- Songs using a local bank are silent on those tracks on the deployed site or another computer.
- Loops are stretched with Tone's GrainPlayer: fine for the 133–145 bpm packs, audibly grainy far
  from their own tempo.
