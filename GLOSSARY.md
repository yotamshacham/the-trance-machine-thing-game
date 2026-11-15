# The Trance Machine

A tracker for psytrance: songs are files that people edit in the browser and agents write directly.

## The song

**Song**:
Everything that plays: tempo, tracks, the arrangement and the effects, in one file.
_Avoid_: project, track (for the whole piece)

**Track**:
One instrument with its own patterns and its place in the mix.
_Avoid_: channel, part, voice

**Pattern**:
A named run of notes belonging to one track, repeated to fill a section.
_Avoid_: clip

**Section**:
A stretch of bars in the arrangement, naming which pattern each track plays.
_Avoid_: scene, part

**Arrangement**:
The song's sections in order.

**Step**:
A 16th note, the grid's unit of time; a bar is 16 steps.
_Avoid_: tick, row

**Loop**:
A sample with its own tempo that plays its own riff; given one note per phrase, never a melody.

**Melody track**:
A track whose notes have more than one pitch.

## The mix

**Send**:
How much of a track also goes to one of the song's shared effects (the delay or the reverb), 0 to 1.
_Avoid_: wet, amount

**Duck**:
A track's volume dipping each time the ducking track (the kick, by default) hits, then recovering.
_Avoid_: sidechain (the studio technique it imitates), pump

**Fill**:
A short break that announces what comes next, usually the last bar of 8: the kick and bass patterns change, often with a riser.


**Patch**:
A synth's settings beyond its preset: oscillator stack, filter, envelopes, extras and LFOs.
_Avoid_: preset (the named starting point a patch builds on)

**LFO**:
A slow, tempo-synced cycle that moves one thing in a patch (cutoff, volume, pitch or pan).
_Avoid_: modulator, wobble

**Part**:
A group of tracks in the editor by their role in the mix: kick & bass, drums, leads, pads & FX.
_Avoid_: bus, folder

## Working with agents

**Linked song**:
The song open in the app that is kept in step with a file in `songs/local/`: edits in either place reach the other.
_Avoid_: synced song

**Request**:
A one-line ask sent from the app about a track, a section or the song, for an agent to carry out and answer.
_Avoid_: prompt, message
