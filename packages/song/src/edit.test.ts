import { describe, expect, it } from 'vitest';
import {
  addPattern,
  addSection,
  addTrack,
  moveSection,
  removeSection,
  removeTrack,
  setSectionPattern,
  toggleStep,
  transposePattern,
} from './edit.ts';
import { emptySong } from './song.ts';

const withKick = () => {
  const { song, trackId } = addTrack(emptySong(), 'Kick', { kind: 'drum', voice: 'kick' });
  return setSectionPattern(song, 0, trackId, 'a');
};

describe('edits', () => {
  it('adds a track with an empty pattern a and a unique id', () => {
    const song = withKick();
    expect(song.tracks[0]).toMatchObject({ id: 'kick', patterns: { a: { length: 16, notes: [] } } });
    expect(addTrack(song, 'Kick', { kind: 'drum', voice: 'kick' }).trackId).toBe('kick-2');
  });

  it('toggles steps on and off, keeping notes in order, pitched only on non-drum tracks', () => {
    let song = toggleStep(withKick(), 'kick', 'a', 4, 'C3');
    song = toggleStep(song, 'kick', 'a', 0);
    expect(song.tracks[0]!.patterns.a!.notes).toEqual([{ step: 0 }, { step: 4 }]);
    song = toggleStep(song, 'kick', 'a', 4);
    expect(song.tracks[0]!.patterns.a!.notes).toEqual([{ step: 0 }]);

    const synth = addTrack(song, 'Bass', { kind: 'synth', preset: 'rolling-bass' });
    const bass = toggleStep(synth.song, synth.trackId, 'a', 1, 'F#1');
    expect(bass.tracks[1]!.patterns.a!.notes).toEqual([{ step: 1, pitch: 'F#1' }]);
  });

  it('a click with another pitch repitches the note; with the same pitch removes it', () => {
    const { song, trackId } = addTrack(emptySong(), 'Bass', { kind: 'synth', preset: 'rolling-bass' });
    let s = toggleStep(song, trackId, 'a', 1, 'F#1');
    s = toggleStep(s, trackId, 'a', 1, 'A1');
    expect(s.tracks[0]!.patterns.a!.notes).toEqual([{ step: 1, pitch: 'A1' }]);
    s = toggleStep(s, trackId, 'a', 1, 'A1');
    expect(s.tracks[0]!.patterns.a!.notes).toEqual([]);
  });

  it('transposes a pattern, leaving drum hits and out-of-range notes alone', () => {
    const { song, trackId } = addTrack(emptySong(), 'Bass', { kind: 'synth', preset: 'rolling-bass' });
    let s = toggleStep(song, trackId, 'a', 0, 'F#1');
    s = toggleStep(s, trackId, 'a', 1, 'G9');
    s = transposePattern(s, trackId, 'a', 2);
    expect(s.tracks[0]!.patterns.a!.notes).toEqual([{ step: 0, pitch: 'G#1' }, { step: 1, pitch: 'G9' }]);
  });

  it('does not change the song it was given', () => {
    const song = withKick();
    const before = structuredClone(song);
    toggleStep(song, 'kick', 'a', 0);
    addPattern(song, 'kick', 'a');
    removeTrack(song, 'kick');
    expect(song).toEqual(before);
  });

  it('adds patterns b, c … and copies one', () => {
    const song = toggleStep(withKick(), 'kick', 'a', 0);
    const { song: s2, patternId } = addPattern(song, 'kick', 'a');
    expect(patternId).toBe('b');
    expect(s2.tracks[0]!.patterns.b).toEqual(s2.tracks[0]!.patterns.a);
    expect(addPattern(s2, 'kick').patternId).toBe('c');
  });

  it('assigns and silences a track in a section', () => {
    const song = withKick();
    expect(song.arrangement[0]!.play).toEqual({ kick: 'a' });
    expect(setSectionPattern(song, 0, 'kick', null).arrangement[0]!.play).toEqual({});
  });

  it('adds, moves and removes sections, never the last', () => {
    let song = addSection(withKick());
    expect(song.arrangement.map((s) => s.name)).toEqual(['A', 'A 2']);
    song = moveSection(song, 1, 0);
    expect(song.arrangement.map((s) => s.name)).toEqual(['A 2', 'A']);
    song = removeSection(removeSection(song, 0), 0);
    expect(song.arrangement.map((s) => s.name)).toEqual(['A']);
  });

  it('removing a track takes it out of every section', () => {
    expect(removeTrack(withKick(), 'kick').arrangement[0]!.play).toEqual({});
  });
});
