import { describe, expect, it } from 'vitest';
import { SongError, parseSong } from './song.ts';

const withSynth = (instrument: Record<string, unknown>) => ({
  format: 'ttm-song',
  version: 1,
  title: 't',
  bpm: 145,
  tracks: [{ id: 'lead', name: 'Lead', instrument: { kind: 'synth', preset: 'supersaw', ...instrument }, patterns: { a: { grid: 'C4' } } }],
  arrangement: [{ name: 'A', bars: 1, play: { lead: 'a' } }],
});

describe('synth patches', () => {
  it('takes the patch fields: filter, unison, noise, sub, drive, LFOs', () => {
    const song = parseSong(
      withSynth({
        filter: 'bandpass',
        filterAttack: 0.01,
        filterDecay: 0.3,
        filterSustain: 0.2,
        unison: 9,
        detune: 40,
        noise: 0.1,
        sub: 0.5,
        drive: 0.3,
        lfo: [
          { target: 'volume', rate: 1, depth: 1, shape: 'square' },
          { target: 'cutoff', rate: 16, depth: 0.5 },
        ],
      }),
    );
    expect(song.tracks[0]!.instrument).toMatchObject({ filter: 'bandpass', unison: 9, lfo: [{ target: 'volume' }, { target: 'cutoff', rate: 16 }] });
  });

  it('refuses what a patch can not be', () => {
    const issues = (instrument: Record<string, unknown>) => {
      try {
        parseSong(withSynth(instrument));
        return [];
      } catch (e) {
        return (e as SongError).issues;
      }
    };
    expect(issues({ unison: 17 })).toEqual([expect.stringMatching(/unison/)]);
    expect(issues({ filter: 'comb' })).toEqual([expect.stringMatching(/filter/)]);
    expect(issues({ lfo: [{ target: 'wobble', rate: 1, depth: 1 }] })).toEqual([expect.stringMatching(/lfo\.0\.target/)]);
    expect(issues({ lfo: [{ target: 'cutoff', rate: 0, depth: 1 }] })).toEqual([expect.stringMatching(/lfo\.0\.rate/)]);
    expect(issues({ lfo: [1, 2, 3].map(() => ({ target: 'pan', rate: 4, depth: 0.5 })) })).toEqual([expect.stringMatching(/lfo/)]);
  });
});
