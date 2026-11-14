import { describe, expect, it } from 'vitest';
import type { Bank } from './bank.ts';
import type { Track } from '@ttm/song';
import { isLoop, isMelodic, soundFor, soundGroups, soundKey, soundsOf } from './instruments.ts';

const banks: Bank[] = [
  {
    id: 'fp',
    name: 'Futurephonic',
    sounds: [
      { group: 'Kicks', label: 'Convex Kick · C', instrument: { kind: 'sampler', sample: '/local-samples/k1.wav' } },
      { group: 'Kicks', label: 'Kites Kick · C#', instrument: { kind: 'sampler', sample: '/local-samples/k2.wav' } },
      { group: 'Basses', label: 'Chrome Bass', instrument: { kind: 'sampler', sample: { A1: '/a.wav' }, gate: true } },
    ],
  },
];

describe('sounds', () => {
  it('offers each bank’s groups after the drum machine and synths', () => {
    expect(soundGroups(banks).map((g) => g.label)).toEqual(['Drum machine', 'Synth', 'Futurephonic samples', 'Other']);
    expect(soundGroups(banks)[2]!.options).toEqual([
      { key: 'bank:fp:Kicks', label: 'Kicks' },
      { key: 'bank:fp:Basses', label: 'Basses' },
    ]);
  });

  it('knows which group a track’s sound is in, even after the song was saved and reloaded', () => {
    expect(soundKey({ kind: 'sampler', root: 'C3', sample: '/local-samples/k2.wav' }, banks)).toBe('bank:fp:Kicks');
    expect(soundKey({ kind: 'sampler', sample: '/elsewhere.wav' }, banks)).toBe('sampler');
    expect(soundKey({ kind: 'drum', voice: 'clap' }, banks)).toBe('drum:clap');
  });

  it('a group gives its first sound, named without its key', () => {
    expect(soundFor('bank:fp:Kicks', { kind: 'drum', voice: 'kick' }, banks)).toEqual({
      instrument: { kind: 'sampler', sample: '/local-samples/k1.wav' },
      name: 'Convex Kick',
    });
  });

  it('switching synth preset keeps the synth’s own settings', () => {
    expect(soundFor('synth:acid', { kind: 'synth', preset: 'lead', cutoff: 900 }, banks).instrument).toEqual({
      kind: 'synth',
      preset: 'acid',
      cutoff: 900,
    });
  });

  describe('loops stay off melody tracks', () => {
    const withLoops: Bank[] = [
      {
        id: 'fp',
        name: 'Futurephonic',
        sounds: [
          { group: 'Leads & arps', label: 'Squelcher · 138 A#', instrument: { kind: 'sampler', sample: '/sq.wav', root: 'A#3', bpm: 138 } },
          { group: 'Tonal hits', label: 'Slink · 135 F#', instrument: { kind: 'sampler', sample: '/slink.wav', root: 'F#3', bpm: 135, gate: true } },
          { group: 'Tonal hits', label: 'Quickstab · F', instrument: { kind: 'sampler', sample: '/q.wav', root: 'F3', gate: true } },
        ],
      },
    ];
    const track = (pitches: string[]): Track => ({
      id: 't',
      name: 'T',
      instrument: { kind: 'synth', preset: 'lead' },
      patterns: { a: { length: 16, notes: pitches.map((pitch, step) => ({ step, pitch })) } },
    });

    it('a loop is a sample with its own tempo', () => {
      expect(isLoop({ kind: 'sampler', sample: '/x.wav', bpm: 138 })).toBe(true);
      expect(isLoop({ kind: 'sampler', sample: '/x.wav' })).toBe(false);
      expect(isLoop({ kind: 'synth', preset: 'lead' })).toBe(false);
    });

    it('a melody track plays more than one pitch', () => {
      expect(isMelodic(track(['C3', 'D3']))).toBe(true);
      expect(isMelodic(track(['C3', 'C3']))).toBe(false);
      expect(isMelodic(track([]))).toBe(false);
    });

    it('a melody track is not offered groups that are all loops, nor the loops in mixed groups', () => {
      expect(soundGroups(withLoops, { melodic: true })[2]!.options.map((o) => o.label)).toEqual(['Tonal hits']);
      expect(soundGroups(withLoops, { melodic: false })[2]!.options.map((o) => o.label)).toEqual(['Leads & arps', 'Tonal hits']);
      expect(soundsOf(withLoops[0]!, 'Tonal hits', { melodic: true }).map((s) => s.label)).toEqual(['Quickstab · F']);
    });

    it('picking a group for a melody track gives its first sound that is not a loop', () => {
      expect(soundFor('bank:fp:Tonal hits', { kind: 'synth', preset: 'lead' }, withLoops, { melodic: true }).name).toBe('Quickstab');
      expect(soundFor('bank:fp:Tonal hits', { kind: 'synth', preset: 'lead' }, withLoops).name).toBe('Slink');
    });
  });
});
