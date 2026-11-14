// The editor shows tracks in groups (parts of the mix): kick & bass, drums, leads, pads & FX.
// Worked out from each track's sound for now; a song may name its own groups later.

import type { Track } from '@ttm/song';
import { findSound, type Bank } from './bank.ts';

export type Part = 'kick-bass' | 'drums' | 'leads' | 'pads-fx' | 'fills' | 'other';

export const PARTS: { id: Part; name: string }[] = [
  { id: 'kick-bass', name: 'Kick & bass' },
  { id: 'drums', name: 'Drums' },
  { id: 'leads', name: 'Leads' },
  { id: 'pads-fx', name: 'Pads & FX' },
  { id: 'fills', name: 'Fills' },
  { id: 'other', name: 'Other' },
];

/** words in a bank group's name or a track's name, in the order they're tried */
const WORDS: [RegExp, Part][] = [
  [/\b(kick|bass|sub)/i, 'kick-bass'],
  [/\b(hat|snare|clap|perc|ride|shaker|roll|cymbal|top|drum|bongo|conga)/i, 'drums'],
  [/\b(pad|atmos|riser|fx|sweep|noise|whoosh|build|tension|impact)/i, 'pads-fx'],
  [/\b(lead|arp|acid|stab|tonal|melod|harmon|pluck|synth|grid|vox|vocal)/i, 'leads'],
];
const byWords = (text: string): Part | undefined => WORDS.find(([re]) => re.test(text))?.[1];

export function partOf(track: Track, banks: Bank[]): Part {
  if (/\bfill/i.test(track.name)) return 'fills';
  const inst = track.instrument;
  if (inst.kind === 'drum') return inst.voice === 'kick' ? 'kick-bass' : 'drums';
  if (inst.kind === 'synth') {
    if (inst.preset === 'rolling-bass' || inst.preset === 'sub') return 'kick-bass';
    return inst.preset === 'pad' ? 'pads-fx' : 'leads';
  }
  const found = findSound(banks, inst);
  return (found && byWords(found.sound.group)) ?? byWords(track.name) ?? 'other';
}

export interface TrackGroup {
  id: Part;
  name: string;
  tracks: Track[];
}

export function groupTracks(tracks: Track[], banks: Bank[]): TrackGroup[] {
  return PARTS.map((p) => ({ ...p, tracks: tracks.filter((t) => partOf(t, banks) === p.id) })).filter((g) => g.tracks.length);
}
