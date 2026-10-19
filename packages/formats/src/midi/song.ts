// MIDI files ↔ songs. Importing puts every note on the 16th grid and cuts the piece into
// four-bar sections; each track's identical four-bar stretches share one pattern.

import {
  FORMAT,
  STEPS_PER_BAR,
  VERSION,
  noteName,
  parseSong,
  schedule,
  toMidi,
  type DrumVoice,
  type Note,
  type Pattern,
  type Section,
  type Song,
  type SynthPreset,
  type Track,
} from '@ttm/song';
import { readSmf, writeSmf, type RawNote } from './smf.ts';

const DRUM_CHANNEL = 9;
/** Bars per imported section (and so per imported pattern). */
export const IMPORT_SECTION_BARS = 4;

/** General MIDI drum notes → our drum voices. */
export function drumVoiceOf(gmNote: number): DrumVoice {
  if (gmNote === 35 || gmNote === 36) return 'kick';
  if (gmNote === 38 || gmNote === 40) return 'snare';
  if (gmNote === 39) return 'clap';
  if (gmNote === 42 || gmNote === 44) return 'closed-hat';
  if (gmNote === 46) return 'open-hat';
  if ([49, 51, 52, 53, 55, 57, 59].includes(gmNote)) return 'ride';
  if ([69, 70, 82].includes(gmNote)) return 'shaker';
  return 'perc';
}

/** Our drum voices → the General MIDI note each is written as. */
export const GM_DRUM_NOTE: Record<DrumVoice, number> = {
  kick: 36,
  snare: 38,
  clap: 39,
  'closed-hat': 42,
  'open-hat': 46,
  ride: 51,
  perc: 37,
  shaker: 70,
};

export interface MidiImportOptions {
  title: string;
}

interface Part {
  name: string;
  notes: Note[];
  meanPitch: number;
}

export function songFromMidi(bytes: Uint8Array, { title }: MidiImportOptions): Song {
  const smf = readSmf(bytes);
  const stepTicks = smf.ppq / 4;
  const toNote = (n: RawNote, pitched: boolean): Note => {
    const note: Note = { step: Math.round(n.tick / stepTicks) };
    if (pitched) note.pitch = noteName(n.pitch);
    const len = Math.max(1, Math.round((n.end - n.tick) / stepTicks));
    if (len !== 1) note.len = len;
    const vel = Math.round((n.velocity / 127) * 100) / 100;
    if (vel !== 0.8) note.vel = vel;
    return note;
  };

  const melodic: Part[] = [];
  const drums = new Map<DrumVoice, Note[]>();
  smf.tracks.forEach((track, t) => {
    const channels = [...new Set(track.map((n) => n.channel))].sort((a, b) => a - b);
    for (const channel of channels) {
      const raw = track.filter((n) => n.channel === channel);
      if (channel === DRUM_CHANNEL) {
        for (const n of raw) {
          const voice = drumVoiceOf(n.pitch);
          drums.set(voice, [...(drums.get(voice) ?? []), toNote(n, false)]);
        }
        continue;
      }
      const name = (channels.length === 1 && smf.trackNames[t]) || `Channel ${channel + 1}`;
      const meanPitch = raw.reduce((a, n) => a + n.pitch, 0) / raw.length;
      melodic.push({ name, notes: raw.map((n) => toNote(n, true)), meanPitch });
    }
  });

  const byPitch = [...melodic].sort((a, b) => a.meanPitch - b.meanPitch);
  const presetOf = (p: Part): SynthPreset =>
    melodic.length > 1 && p === byPitch[0] ? 'rolling-bass' : p === byPitch.at(-1) ? 'lead' : 'pluck';

  const allNotes = [...melodic.flatMap((p) => p.notes), ...[...drums.values()].flat()];
  const lastStep = Math.max(0, ...allNotes.map((n) => n.step + 1));
  const bars = Math.max(1, Math.ceil(lastStep / STEPS_PER_BAR));
  const chunkSteps = IMPORT_SECTION_BARS * STEPS_PER_BAR;
  const chunks = Math.ceil(bars / IMPORT_SECTION_BARS);
  const arrangement: Section[] = Array.from({ length: chunks }, (_, c) => {
    const first = c * IMPORT_SECTION_BARS + 1;
    const sectionBars = Math.min(IMPORT_SECTION_BARS, bars - c * IMPORT_SECTION_BARS);
    const last = first + sectionBars - 1;
    return { name: first === last ? `bar ${first}` : `bars ${first}–${last}`, bars: sectionBars, play: {} };
  });

  const usedIds = new Set<string>();
  const tracks: Track[] = [];
  const addTrack = (name: string, instrument: Track['instrument'], notes: Note[]) => {
    const id = uniqueId(name, usedIds);
    const patterns: Record<string, Pattern> = {};
    const seen = new Map<string, string>(); // chunk contents → pattern id
    for (let c = 0; c < chunks; c++) {
      const inChunk = dedupe(notes.filter((n) => Math.floor(n.step / chunkSteps) === c))
        .map((n) => ({ ...n, step: n.step - c * chunkSteps }))
        .sort((a, b) => a.step - b.step || (a.pitch ? toMidi(a.pitch) : 0) - (b.pitch ? toMidi(b.pitch) : 0));
      if (!inChunk.length) continue;
      const key = JSON.stringify(inChunk);
      let patternId = seen.get(key);
      if (!patternId) {
        patternId = patternIdFor(seen.size);
        seen.set(key, patternId);
        patterns[patternId] = { length: chunkSteps, notes: inChunk };
      }
      arrangement[c]!.play[id] = patternId;
    }
    tracks.push({ id, name, instrument, patterns });
  };

  for (const part of melodic) addTrack(part.name, { kind: 'synth', preset: presetOf(part) }, part.notes);
  for (const voice of Object.keys(GM_DRUM_NOTE) as DrumVoice[]) {
    const notes = drums.get(voice);
    if (notes) addTrack(voice, { kind: 'drum', voice }, notes);
  }

  const bpm = Math.min(300, Math.max(40, Math.round(smf.bpm ?? 120)));
  // parseSong both checks what we built and puts it in canonical form
  return parseSong({ format: FORMAT, version: VERSION, title, bpm, tracks, arrangement });
}

/** One note per step and pitch: a file striking a note twice at once (or within a 16th) is struck once. */
function dedupe(notes: Note[]): Note[] {
  const seen = new Set<string>();
  return notes.filter((n) => {
    const key = `${n.step}:${n.pitch ?? ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const patternIdFor = (i: number) => (i < 26 ? String.fromCharCode(97 + i) : `p${i + 1}`);

function uniqueId(name: string, used: Set<string>): string {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'track';
  let id = base;
  for (let n = 2; used.has(id); n++) id = `${base}-${n}`;
  used.add(id);
  return id;
}

/** PPQ of exported files: 24 ticks a 16th. */
const EXPORT_PPQ = 96;

/** The whole arrangement as a Standard MIDI File: one track per song track, drums on channel 10. */
export function songToMidi(song: Song): Uint8Array<ArrayBuffer> {
  const stepTicks = EXPORT_PPQ / 4;
  const { events } = schedule(song);
  const melodicChannels = Array.from({ length: 16 }, (_, c) => c).filter((c) => c !== DRUM_CHANNEL);
  let melodicTracks = 0;
  const tracks = song.tracks.map((track) => {
    const inst = track.instrument;
    const channel = inst.kind === 'drum' ? DRUM_CHANNEL : melodicChannels[melodicTracks++ % melodicChannels.length]!;
    const notes: RawNote[] = events
      .filter((e) => e.trackId === track.id)
      .map((e) => ({
        tick: e.step * stepTicks,
        end: Math.round((e.step + e.len) * stepTicks),
        pitch: inst.kind === 'drum' ? GM_DRUM_NOTE[inst.voice] : e.pitch!,
        channel,
        velocity: Math.max(1, Math.round(e.vel * 127)),
      }));
    return { name: track.name, notes };
  });
  return writeSmf(EXPORT_PPQ, song.bpm, tracks);
}
