# 0005 — The mix: sends to shared effects, ducking from the schedule

2026-11-14

## Decision
- A song has **one delay and one reverb**; tracks reach them through **sends** (`delay`, `reverb`, 0–1).
  The delay is timed in steps, so it follows the tempo.
- **Ducking is scheduled, not detected**: when the ducking track (the kick) has a note at a step, the
  engine dips every ducking track's gain at that note's time and lets it recover over `release`.
- Track mix fields sit flat on the track, next to `gain` and `pan`; the shared settings live in
  `song.effects`. All optional, so songs without them still parse unchanged (no version bump).

## Why
- Sends to a shared space are how a psy mix is built and how producers think; one delay and one
  reverb keep the sound cohesive and cost two effect nodes, not two per track.
- Audio-detected sidechain needs an envelope follower and still lags the kick; we know exactly
  when every kick is, so we schedule the dip on the same clock and it lands on time, with no lookahead.

## Not chosen
- Per-track insert effects (a delay on each track): more control, much more CPU and file surface;
  add if a song really needs two different delays.
- An `fx` object on each track: one more level of nesting for agents to get right, for no gain.
