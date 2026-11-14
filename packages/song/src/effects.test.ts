import { describe, expect, it } from 'vitest';
import { effectsOf, mixOf } from './effects.ts';
import { SongError, parseSong } from './song.ts';

const base = {
  format: 'ttm-song',
  version: 1,
  title: 't',
  bpm: 145,
  tracks: [
    { id: 'kick', name: 'Kick', instrument: { kind: 'drum', voice: 'kick' }, patterns: { a: { grid: 'x...' } } },
    { id: 'bass', name: 'Bass', instrument: { kind: 'synth', preset: 'rolling-bass' }, patterns: { a: { grid: '. F#1 F#1 F#1' } } },
  ],
  arrangement: [{ name: 'A', bars: 1, play: { kick: 'a', bass: 'a' } }],
};

describe('effects', () => {
  it('a song without effects gets the defaults: a dotted-8th delay, a medium reverb, ducked by the kick', () => {
    expect(effectsOf(parseSong(base))).toEqual({
      delay: { steps: 3, feedback: 0.35 },
      reverb: { decay: 2.5 },
      duck: { by: 'kick', release: 0.18 },
    });
  });

  it('a song sets its own, field by field', () => {
    const song = parseSong({ ...base, effects: { delay: { steps: 2 }, duck: { by: 'bass', release: 0.3 } } });
    expect(effectsOf(song)).toEqual({
      delay: { steps: 2, feedback: 0.35 },
      reverb: { decay: 2.5 },
      duck: { by: 'bass', release: 0.3 },
    });
  });

  it('a track is dry, not ducked and unfiltered unless it says so', () => {
    const song = parseSong({ ...base, tracks: [base.tracks[0], { ...base.tracks[1], delay: 0.3, duck: 0.8, highpass: 120 }] });
    expect(mixOf(song.tracks[0]!)).toEqual({ delay: 0, reverb: 0, duck: 0, lowpass: undefined, highpass: undefined });
    expect(mixOf(song.tracks[1]!)).toEqual({ delay: 0.3, reverb: 0, duck: 0.8, lowpass: undefined, highpass: 120 });
  });

  it('refuses sends and duck outside 0–1, and filters outside hearing', () => {
    const bad = { ...base, tracks: [{ ...base.tracks[0], reverb: 2, lowpass: 5 }, base.tracks[1]] };
    try {
      parseSong(bad);
      expect.unreachable();
    } catch (e) {
      expect((e as SongError).issues).toEqual([expect.stringMatching(/^tracks\.0\.reverb/), expect.stringMatching(/^tracks\.0\.lowpass/)]);
    }
  });

  it('refuses ducking by a track that is not there', () => {
    try {
      parseSong({ ...base, effects: { duck: { by: 'kik' } } });
      expect.unreachable();
    } catch (e) {
      expect((e as SongError).issues).toEqual(['effects.duck.by: no track "kik"']);
    }
  });

  it('ducking by the default kick is fine when the song has no kick track: nothing ducks', () => {
    const noKick = { ...base, tracks: [base.tracks[1]], arrangement: [{ name: 'A', bars: 1, play: { bass: 'a' } }] };
    expect(effectsOf(parseSong(noKick)).duck.by).toBe('kick');
  });

  it('keeps effects through a save', async () => {
    const { stringifySong } = await import('./song.ts');
    const song = parseSong({ ...base, effects: { reverb: { decay: 4 } }, tracks: [base.tracks[0], { ...base.tracks[1], reverb: 0.2 }] });
    expect(parseSong(stringifySong(song))).toEqual(song);
  });
});
