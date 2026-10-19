# 0002 — Default sounds are synthesized

2026-10-18

## Decision
The default drum kit and synths are Tone.js synthesis defined as data in
`packages/engine/src/presets.ts`. No sample files ship by default.

## Why
Sample packs we own (Splice etc.) can't be redistributed in a public repo or site; CC0 kits need
curating and hosting. Synthesis needs neither, loads instantly, and its parameters are part of the
song format so an AI can shape sounds too. Psytrance's core sounds (kick, rolling bass, acid, hats)
are synthetic in origin anyway. The sampler stays for samples we add later (`docs/samples.md`).
