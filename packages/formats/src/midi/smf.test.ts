import { describe, expect, it } from 'vitest';
import { readSmf, writeSmf } from './smf.ts';

describe('SMF', () => {
  it('reads back what it writes: notes by track, names, tempo', () => {
    const bytes = writeSmf(96, 145, [
      { name: 'Bass', notes: [{ tick: 0, end: 24, pitch: 30, channel: 0, velocity: 100 }] },
      {
        name: 'Drums',
        notes: [
          { tick: 0, end: 24, pitch: 36, channel: 9, velocity: 127 },
          { tick: 96, end: 120, pitch: 36, channel: 9, velocity: 127 },
        ],
      },
    ]);
    const smf = readSmf(bytes);
    expect(smf.ppq).toBe(96);
    expect(smf.bpm).toBeCloseTo(145, 1);
    expect(smf.trackNames).toEqual(['Bass', 'Drums']);
    expect(smf.tracks[1]).toEqual([
      { tick: 0, end: 24, pitch: 36, channel: 9, velocity: 127 },
      { tick: 96, end: 120, pitch: 36, channel: 9, velocity: 127 },
    ]);
  });

  it('strikes a repeated note again rather than cutting it', () => {
    const bytes = writeSmf(96, 120, [
      {
        notes: [
          { tick: 0, end: 24, pitch: 60, channel: 0, velocity: 90 },
          { tick: 24, end: 48, pitch: 60, channel: 0, velocity: 90 },
        ],
      },
    ]);
    expect(readSmf(bytes).tracks[0]!.map((n) => [n.tick, n.end])).toEqual([[0, 24], [24, 48]]);
  });

  it('refuses what is not a MIDI file', () => {
    expect(() => readSmf(new TextEncoder().encode('hello there, not midi'))).toThrow(/Not a MIDI file/);
  });
});
