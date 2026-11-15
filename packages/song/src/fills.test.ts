import { describe, expect, it } from 'vitest';
import { parseSong } from './song.ts';

describe('noise riser', () => {
  it('is a synth preset', () => {
    const song = parseSong({
      format: 'ttm-song',
      version: 1,
      title: 't',
      bpm: 145,
      tracks: [{ id: 'rise', name: 'Noise rise fill', instrument: { kind: 'synth', preset: 'noise-rise' }, patterns: { a: { length: 16, notes: [{ step: 0, len: 16 }] } } }],
      arrangement: [{ name: 'A', bars: 1, play: { rise: 'a' } }],
    });
    expect(song.tracks[0]!.instrument).toEqual({ kind: 'synth', preset: 'noise-rise' });
  });
});
