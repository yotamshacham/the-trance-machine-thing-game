import { describe, expect, it } from 'vitest';
import { schedule } from './schedule.ts';
import { SongError, parseSong } from './song.ts';

const song = (fill: Record<string, unknown>) =>
  parseSong({
    format: 'ttm-song',
    version: 1,
    title: 't',
    bpm: 145,
    tracks: [
      { id: 'kick', name: 'Kick', instrument: { kind: 'drum', voice: 'kick' }, patterns: { a: { grid: 'x...x...x...x...' } } },
      { id: 'lead', name: 'Lead', instrument: { kind: 'synth', preset: 'lead' }, patterns: { a: { grid: 'C4 . . . C4 . . . C4 . . . C4 . . .' } } },
      {
        id: 'riser',
        name: 'Riser',
        instrument: { kind: 'synth', preset: 'noise', swell: true },
        patterns: { a: { length: 32, notes: [{ step: 16, len: 16 }] } },
        ...fill,
      },
    ],
    arrangement: [{ name: 'A', bars: 2, play: { kick: 'a', lead: 'a', riser: 'a' } }],
  });

describe('fills', () => {
  it('a fill is just another track, in the group it names', () => {
    const fill = song({ group: 'fills' });
    expect(fill.tracks[2]).toMatchObject({ group: 'fills', instrument: { preset: 'noise', swell: true } });
    expect(schedule(fill).events.filter((e) => e.step >= 16).length).toBe(9);
  });

  it('a group is a short lowercase name', () => {
    expect(() => song({ group: 'My Fills!' })).toThrow(SongError);
  });
});
