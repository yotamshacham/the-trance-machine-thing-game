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
  it('a cutting track silences every track outside its group while its notes play', () => {
    const { events } = schedule(song({ group: 'fills', cut: true }));
    expect(events.filter((e) => e.step >= 16).map((e) => e.trackId)).toEqual(['riser']);
    expect(events.filter((e) => e.step < 16).map((e) => e.trackId)).toContain('kick');
  });

  it('tracks in the same group as the fill keep playing', () => {
    const s = song({ group: 'fills', cut: true });
    const withSnare = parseSong({ ...s, tracks: s.tracks.map((t) => (t.id === 'kick' ? { ...t, group: 'fills' } : t)) });
    expect(schedule(withSnare).events.filter((e) => e.step >= 16).map((e) => e.trackId).sort()).toEqual(['kick', 'kick', 'kick', 'kick', 'riser']);
  });

  it('without cut, a fill is just another track', () => {
    expect(schedule(song({ group: 'fills' })).events.filter((e) => e.step >= 16).length).toBe(9);
  });

  it('a muted cutting track cuts nothing', () => {
    expect(schedule(song({ group: 'fills', cut: true, mute: true })).events.filter((e) => e.trackId === 'kick')).toHaveLength(8);
  });

  it('a group is a short lowercase name', () => {
    expect(() => song({ group: 'My Fills!' })).toThrow(SongError);
  });
});
