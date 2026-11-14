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
  /** a part, or a group a song named itself */
  id: string;
  name: string;
  tracks: Track[];
}

/** The group a track sits in: the one it names, else the part its sound suggests. */
export const groupOf = (track: Track, banks: Bank[]): string => track.group ?? partOf(track, banks);

/** The parts in their order, then any groups the song named itself, in the order they first appear. */
export function groupTracks(tracks: Track[], banks: Bank[]): TrackGroup[] {
  const known = new Set<string>(PARTS.map((p) => p.id));
  const own = [...new Set(tracks.map((t) => groupOf(t, banks)).filter((g) => !known.has(g)))];
  const name = (id: string) => id.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase());
  return [...PARTS, ...own.map((id) => ({ id, name: name(id) }))]
    .map((g) => ({ ...g, tracks: tracks.filter((t) => groupOf(t, banks) === g.id) }))
    .filter((g) => g.tracks.length);
}
