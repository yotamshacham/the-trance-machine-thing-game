// A MIDI file as it plays: every note in seconds, following the file's tempo changes, nothing
// quantized. For listening to a file before importing it (import puts it on our 16th grid).

import type { DrumVoice } from '@ttm/song';
import { readSmf, type TempoChange } from './smf.ts';
import { DRUM_CHANNEL, drumVoiceOf } from './song.ts';

export interface PerformedNote {
  /** seconds from the start */
  time: number;
  duration: number;
  /** MIDI note number */
  pitch: number;
  /** 0 to 1 */
  velocity: number;
  /** on the drum channel: the drum machine voice it maps to */
  voice?: DrumVoice;
}

export interface PerformedPart {
  /** 0 to 15 */
  channel: number;
  name: string;
  drums: boolean;
  notes: PerformedNote[];
}

export interface Performance {
  /** one per MIDI channel that has notes, by channel */
  parts: PerformedPart[];
  /** seconds until the last note ends */
  duration: number;
}

export function midiPerformance(bytes: Uint8Array): Performance {
  const smf = readSmf(bytes);
  const seconds = secondsOf(smf.ppq, smf.tempos);
  const parts = new Map<number, PerformedPart>();
  smf.tracks.forEach((track, t) => {
    const channels = new Set(track.map((n) => n.channel));
    for (const n of track) {
      const drums = n.channel === DRUM_CHANNEL;
      let part = parts.get(n.channel);
      if (!part) {
        const name = drums ? 'Drums' : (channels.size === 1 && smf.trackNames[t]) || `Channel ${n.channel + 1}`;
        part = { channel: n.channel, name, drums, notes: [] };
        parts.set(n.channel, part);
      }
      const time = seconds(n.tick);
      const note: PerformedNote = { time, duration: seconds(n.end) - time, pitch: n.pitch, velocity: n.velocity / 127 };
      if (drums) note.voice = drumVoiceOf(n.pitch);
      part.notes.push(note);
    }
  });
  const sorted = [...parts.values()].sort((a, b) => a.channel - b.channel);
  for (const p of sorted) p.notes.sort((a, b) => a.time - b.time);
  const duration = Math.max(0, ...sorted.flatMap((p) => p.notes.map((n) => n.time + n.duration)));
  return { parts: sorted, duration };
}

/** Ticks → seconds through a tempo map (120 bpm until the first change, as MIDI says). */
function secondsOf(ppq: number, tempos: TempoChange[]): (tick: number) => number {
  const segments: { tick: number; at: number; secondsPerTick: number }[] = [];
  let tick = 0;
  let at = 0;
  let secondsPerTick = 60 / 120 / ppq;
  for (const change of tempos) {
    at += (change.tick - tick) * secondsPerTick;
    tick = change.tick;
    secondsPerTick = 60 / change.bpm / ppq;
    segments.push({ tick, at, secondsPerTick });
  }
  return (t) => {
    const s = segments.findLast((seg) => seg.tick <= t) ?? { tick: 0, at: 0, secondsPerTick: 60 / 120 / ppq };
    return s.at + (t - s.tick) * s.secondsPerTick;
  };
}
