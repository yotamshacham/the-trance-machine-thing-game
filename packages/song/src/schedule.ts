// A song → the notes it plays, in absolute steps. What the engine plays and the tests check.

import { toMidi } from './pitch.ts';
import { STEPS_PER_BAR, STEPS_PER_BEAT, type Instrument, type Section, type Song } from './schema.ts';

/** The pitch a synth note without one plays. */
export const DEFAULT_PITCH = 'C3';

/** The pitch a note without one plays on this instrument: a sample's own pitch, else C3. */
export function defaultPitchOf(instrument: Instrument): string {
  if (instrument.kind !== 'sampler') return DEFAULT_PITCH;
  if (typeof instrument.sample === 'string') return instrument.root ?? DEFAULT_PITCH;
  return Object.keys(instrument.sample).sort((a, b) => toMidi(a) - toMidi(b))[0] ?? DEFAULT_PITCH;
}
export const DEFAULT_VELOCITY = 0.8;

export interface NoteEvent {
  /** steps from the start of what was scheduled */
  step: number;
  trackId: string;
  /** MIDI note number; null for drum hits */
  pitch: number | null;
  vel: number;
  /** steps; a note sliding into the next lasts until it */
  len: number;
  /** the previous note of this track slides into this one */
  slideIn: boolean;
  /** this note slides into the track's next one, so is never released */
  slideOut: boolean;
}

export interface Schedule {
  events: NoteEvent[];
  /** steps */
  length: number;
}

export const schedule = (song: Song): Schedule => scheduleSections(song, song.arrangement);

/** The given sections one after another (the whole song, or one section to loop while editing). */
export function scheduleSections(song: Song, sections: Section[]): Schedule {
  const events: Pending[] = [];
  let start = 0;
  for (const section of sections) {
    const end = start + section.bars * STEPS_PER_BAR;
    for (const track of song.tracks) {
      const patternId = section.play[track.id];
      const pattern = patternId === undefined ? undefined : track.patterns[patternId];
      if (!pattern) continue;
      const drum = track.instrument.kind === 'drum';
      const fallback = defaultPitchOf(track.instrument);
      for (let at = start; at < end; at += pattern.length) {
        for (const n of pattern.notes) {
          if (at + n.step >= end) break;
          events.push({
            step: at + n.step,
            trackId: track.id,
            pitch: drum ? null : toMidi(n.pitch ?? fallback),
            vel: n.vel ?? DEFAULT_VELOCITY,
            len: n.len ?? 1,
            slideIn: false,
            slideOut: false,
            slide: n.slide ?? false,
          });
        }
      }
    }
    start = end;
  }
  events.sort((a, b) => a.step - b.step);
  return { events: linkSlides(events), length: start };
}

type Pending = NoteEvent & { slide: boolean };

/** A sliding note is held until the track's next note, which is marked as slid into. */
function linkSlides(events: Pending[]): NoteEvent[] {
  const lastByTrack = new Map<string, Pending>();
  for (const e of events) {
    const prev = lastByTrack.get(e.trackId);
    if (prev?.slide && prev.step < e.step) {
      prev.len = Math.max(prev.len, e.step - prev.step);
      prev.slideOut = true;
      e.slideIn = true;
    }
    lastByTrack.set(e.trackId, e);
  }
  return events.map(({ slide: _, ...e }) => e);
}

/** Seconds per step (a 16th) at a tempo. */
export const stepSeconds = (bpm: number): number => 60 / bpm / STEPS_PER_BEAT;

/** When a step starts, in seconds, with every off-16th pushed late by `swing` of a step. */
export function stepTime(step: number, bpm: number, swing = 0): number {
  const d = stepSeconds(bpm);
  return step * d + (step % 2 === 1 ? swing * d : 0);
}

/** Where each section starts, in steps, and the song's length. */
export function sectionStarts(song: Song): { starts: number[]; length: number } {
  const starts: number[] = [];
  let at = 0;
  for (const s of song.arrangement) {
    starts.push(at);
    at += s.bars * STEPS_PER_BAR;
  }
  return { starts, length: at };
}
