import { readFileSync } from 'node:fs';
import { parseSong, schedule } from '@ttm/song';
import { describe, expect, it } from 'vitest';
import { importFile } from '../registry.ts';
import { writeSmf, type RawNote } from './smf.ts';
import { drumVoiceOf, songFromMidi, songToMidi } from './song.ts';

const Q = 96; // ppq
const S = Q / 4; // a 16th
const note = (step: number, pitch: number, channel = 0, len = 1): RawNote => ({
  tick: step * S,
  end: (step + len) * S,
  pitch,
  channel,
  velocity: 102,
});

describe('songFromMidi', () => {
  // 8 bars: a melody that repeats every 4 bars, a bass, and GM drums on channel 10
  const melody = [0, 4, 8, 12].map((s) => note(s, 72, 0, 2));
  const bars = (notes: RawNote[], n: number) =>
    Array.from({ length: n }, (_, b) => notes.map((x) => ({ ...x, tick: x.tick + b * 16 * S, end: x.end + b * 16 * S }))).flat();
  const file = writeSmf(Q, 140, [
    { name: 'Lead', notes: [...bars(melody, 4), ...bars(melody, 4).map((n) => ({ ...n, tick: n.tick + 64 * S, end: n.end + 64 * S }))] },
    { name: 'Bass', notes: bars([note(2, 30)], 8) },
    { name: 'Drums', notes: bars([note(0, 36, 9), note(4, 39, 9), note(8, 36, 9), note(12, 39, 9), note(2, 42, 9)], 8) },
  ]);
  const song = songFromMidi(file, { title: 'test' });

  it('makes a valid song at the file tempo', () => {
    expect(parseSong(song)).toEqual(song);
    expect(song.bpm).toBe(140);
  });

  it('names melodic tracks after the file and guesses a sound by register', () => {
    expect(song.tracks.map((t) => [t.id, t.instrument])).toEqual([
      ['lead', { kind: 'synth', preset: 'lead' }],
      ['bass', { kind: 'synth', preset: 'rolling-bass' }],
      ['kick', { kind: 'drum', voice: 'kick' }],
      ['clap', { kind: 'drum', voice: 'clap' }],
      ['closed-hat', { kind: 'drum', voice: 'closed-hat' }],
    ]);
  });

  it('cuts the piece into four-bar sections that share identical patterns', () => {
    expect(song.arrangement.map((s) => [s.name, s.bars])).toEqual([['bars 1–4', 4], ['bars 5–8', 4]]);
    expect(Object.keys(song.tracks[0]!.patterns)).toEqual(['a']);
    expect(song.arrangement.every((s) => s.play.lead === 'a' && s.play.kick === 'a')).toBe(true);
  });

  it('keeps pitch, length and velocity on the grid', () => {
    expect(song.tracks[0]!.patterns.a!.notes[0]).toEqual({ step: 0, pitch: 'C5', len: 2 });
    expect(song.tracks[1]!.patterns.a!.notes[0]).toEqual({ step: 2, pitch: 'F#1' });
  });

  it('snaps off-grid notes to the nearest 16th', () => {
    const off = writeSmf(Q, 120, [{ notes: [{ tick: S + 5, end: 2 * S - 3, pitch: 60, channel: 0, velocity: 102 }] }]);
    expect(songFromMidi(off, { title: 'off' }).tracks[0]!.patterns.a!.notes).toEqual([{ step: 1, pitch: 'C4' }]);
  });
});

describe('songToMidi', () => {
  it('plays the same notes when read back', () => {
    const song = parseSong(readFileSync(new URL('../../../../songs/basic-psy.json', import.meta.url), 'utf8'));
    const back = songFromMidi(songToMidi(song), { title: song.title });
    const notes = (s: typeof song) => schedule(s).events.length;
    expect(notes(back)).toBe(notes(song));
    expect(back.bpm).toBe(145);
    expect(back.tracks.map((t) => t.instrument.kind === 'drum' && t.instrument.voice).filter(Boolean)).toEqual(
      ['kick', 'clap', 'closed-hat', 'open-hat'],
    );
  });
});

describe('drumVoiceOf', () => {
  it('maps General MIDI drums, anything unknown to perc', () => {
    expect([36, 38, 39, 42, 46, 51, 70, 64].map(drumVoiceOf)).toEqual([
      'kick', 'snare', 'clap', 'closed-hat', 'open-hat', 'ride', 'shaker', 'perc',
    ]);
  });
});

describe('importFile', () => {
  it('picks the importer by extension and titles the song after the file', () => {
    const bytes = writeSmf(Q, 120, [{ notes: [note(0, 60)] }]);
    expect(importFile(bytes, 'Moon Theme.MID').title).toBe('Moon Theme');
    expect(() => importFile(bytes, 'song.nsf')).toThrow(/Can't import \.nsf files yet/);
  });
});
