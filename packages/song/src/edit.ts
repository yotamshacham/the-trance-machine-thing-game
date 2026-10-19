// Edits the UI makes to a song. Each returns a new song and leaves the one given untouched.

import { noteName, toMidi } from './pitch.ts';
import { STEPS_PER_BAR, type Instrument, type Note, type Pattern, type Section, type Song, type Track } from './schema.ts';

function mapTrack(song: Song, trackId: string, f: (t: Track) => Track): Song {
  return { ...song, tracks: song.tracks.map((t) => (t.id === trackId ? f(t) : t)) };
}

function mapSection(song: Song, index: number, f: (s: Section) => Section): Song {
  return { ...song, arrangement: song.arrangement.map((s, i) => (i === index ? f(s) : s)) };
}

/**
 * What a click on a step does: an empty step gets a note (at `pitch`, on a synth or sampler);
 * a note at another pitch is moved to `pitch`; otherwise the note is removed.
 */
export function toggleStep(song: Song, trackId: string, patternId: string, step: number, pitch?: string): Song {
  return mapTrack(song, trackId, (t) => {
    const pattern = t.patterns[patternId];
    if (!pattern) return t;
    const pitched = pitch !== undefined && t.instrument.kind !== 'drum';
    const at = pattern.notes.filter((n) => n.step === step);
    let notes: Note[];
    if (!at.length) notes = [...pattern.notes, pitched ? { step, pitch } : { step }].sort((a, b) => a.step - b.step);
    else if (pitched && !at.some((n) => n.pitch === pitch)) {
      notes = pattern.notes.map((n) => (n.step === step ? { ...n, pitch } : n));
    } else notes = pattern.notes.filter((n) => n.step !== step);
    return { ...t, patterns: { ...t.patterns, [patternId]: { ...pattern, notes } } };
  });
}

/** Every note of the pattern moved by `semitones` (notes that would leave MIDI range stay put). */
export function transposePattern(song: Song, trackId: string, patternId: string, semitones: number): Song {
  return mapTrack(song, trackId, (t) => {
    const pattern = t.patterns[patternId];
    if (!pattern) return t;
    const notes = pattern.notes.map((n) => {
      if (!n.pitch) return n;
      const m = toMidi(n.pitch) + semitones;
      return m >= 0 && m <= 127 ? { ...n, pitch: noteName(m) } : n;
    });
    return { ...t, patterns: { ...t.patterns, [patternId]: { ...pattern, notes } } };
  });
}

/** The first of a, b, c … z, then p27, p28 … that isn't taken. */
function freshId(taken: Iterable<string>, prefixes: string[]): string {
  const used = new Set(taken);
  for (const p of prefixes) if (!used.has(p)) return p;
  for (let n = prefixes.length + 1; ; n++) if (!used.has(`p${n}`)) return `p${n}`;
}

const LETTERS = [...'abcdefghijklmnopqrstuvwxyz'];

/** A new pattern on the track: empty, or a copy of `from`. */
export function addPattern(
  song: Song,
  trackId: string,
  from?: string,
  length = STEPS_PER_BAR,
): { song: Song; patternId: string } {
  const track = song.tracks.find((t) => t.id === trackId);
  if (!track) throw new Error(`No track "${trackId}"`);
  const patternId = freshId(Object.keys(track.patterns), LETTERS);
  const source = from ? track.patterns[from] : undefined;
  const pattern: Pattern = source ? structuredClone(source) : { length, notes: [] };
  return { song: mapTrack(song, trackId, (t) => ({ ...t, patterns: { ...t.patterns, [patternId]: pattern } })), patternId };
}

/** Which pattern a track plays in a section; null silences it there. */
export function setSectionPattern(song: Song, sectionIndex: number, trackId: string, patternId: string | null): Song {
  return mapSection(song, sectionIndex, (s) => {
    const { [trackId]: _, ...play } = s.play;
    return { ...s, play: patternId === null ? play : { ...play, [trackId]: patternId } };
  });
}

export const updateSection = (song: Song, index: number, change: Partial<Omit<Section, 'play'>>): Song =>
  mapSection(song, index, (s) => ({ ...s, ...change }));

/** A new section after `after` (at the end by default), playing what that one plays. */
export function addSection(song: Song, after = song.arrangement.length - 1): Song {
  const like = song.arrangement[after];
  const section: Section = like ? { ...structuredClone(like), name: `${like.name} 2` } : { name: 'A', bars: 4, play: {} };
  const arrangement = [...song.arrangement];
  arrangement.splice(after + 1, 0, section);
  return { ...song, arrangement };
}

export function removeSection(song: Song, index: number): Song {
  if (song.arrangement.length <= 1) return song; // a song always has a section
  return { ...song, arrangement: song.arrangement.filter((_, i) => i !== index) };
}

export function moveSection(song: Song, from: number, to: number): Song {
  const arrangement = [...song.arrangement];
  const [moved] = arrangement.splice(from, 1);
  if (!moved) return song;
  arrangement.splice(Math.max(0, Math.min(to, arrangement.length)), 0, moved);
  return { ...song, arrangement };
}

/** A new track with one empty pattern "a", played in no section yet. */
export function addTrack(song: Song, name: string, instrument: Instrument): { song: Song; trackId: string } {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'track';
  const trackId = freshId(
    song.tracks.map((t) => t.id),
    [base, ...Array.from({ length: 98 }, (_, i) => `${base}-${i + 2}`)],
  );
  const track: Track = { id: trackId, name, instrument, patterns: { a: { length: STEPS_PER_BAR, notes: [] } } };
  return { song: { ...song, tracks: [...song.tracks, track] }, trackId };
}

export function removeTrack(song: Song, trackId: string): Song {
  return {
    ...song,
    tracks: song.tracks.filter((t) => t.id !== trackId),
    arrangement: song.arrangement.map((s) => {
      const { [trackId]: _, ...play } = s.play;
      return { ...s, play };
    }),
  };
}

export const updateTrack = (song: Song, trackId: string, change: Partial<Omit<Track, 'id' | 'patterns'>>): Song =>
  mapTrack(song, trackId, (t) => ({ ...t, ...change }));
