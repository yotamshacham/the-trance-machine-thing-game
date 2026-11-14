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
  it('a fill silences the tracks it cuts while its notes play, and only those', () => {
    const { events } = schedule(song({ group: 'fills', cut: ['kick'] }));
    expect(events.filter((e) => e.step >= 16).map((e) => e.trackId).sort()).toEqual(['lead', 'lead', 'lead', 'lead', 'riser']);
    expect(events.filter((e) => e.step < 16 && e.trackId === 'kick')).toHaveLength(4);
  });

  it('without cut, a fill is just another track', () => {
    expect(schedule(song({ group: 'fills' })).events.filter((e) => e.step >= 16).length).toBe(9);
  });

  it('a muted fill cuts nothing', () => {
    expect(schedule(song({ cut: ['kick'], mute: true })).events.filter((e) => e.trackId === 'kick')).toHaveLength(8);
  });

  it('refuses cutting a track that is not there', () => {
    try {
      song({ cut: ['kik'] });
      expect.unreachable();
    } catch (e) {
      expect((e as SongError).issues).toEqual(['tracks.riser.cut: no track "kik"']);
    }
  });

  it('a group is a short lowercase name', () => {
    expect(() => song({ group: 'My Fills!' })).toThrow(SongError);
  });
});
