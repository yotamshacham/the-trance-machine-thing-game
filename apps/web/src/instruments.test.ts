import { describe, expect, it } from 'vitest';
import type { Bank } from './bank.ts';
import { soundFor, soundGroups, soundKey } from './instruments.ts';

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
});
