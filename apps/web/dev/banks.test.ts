import { describe, expect, it } from 'vitest';
import { buildBank, multisampleNote, parseSampleName, type ListDir } from './banks.ts';

const tree: Record<string, { files?: string[]; dirs?: string[] }> = {
  'p/Kicks': { files: ['FP_FG C Convex Kick.wav', 'FP_FG C Convex Kick.wav.asd', '.DS_Store'] },
  'p/Basses': { dirs: ['Origin Bass', 'Empty'] },
  'p/Basses/Origin Bass': { files: ['FP_FG ORIGIN Bass A#.wav', 'FP_FG ORIGIN Bass C.wav'] },
  'p/Basses/Empty': { files: [] },
  'p/Leads': { files: ['FP_FG 135 F# Echo Chamber.wav', '144 - X - Psycho Killer.wav', 'X - E - High Diver.wav'] },
};
const list: ListDir = (dir) => ({ files: tree[dir]?.files ?? [], dirs: tree[dir]?.dirs ?? [] });

describe('buildBank', () => {
  const bank = buildBank(
    {
      id: 'fp',
      name: 'FP',
      groups: [
        { group: 'Kicks', kind: 'one-shot', dirs: ['p/Kicks', 'p/Missing'] },
        { group: 'Basses', kind: 'multisample', dirs: ['p/Basses/*'] },
        { group: 'Leads', kind: 'loop', dirs: ['p/Leads'] },
      ],
    },
    list,
  );

  it('makes a hit of each audio file in a one-shot folder, skipping other files', () => {
    expect(bank.sounds.filter((s) => s.group === 'Kicks')).toEqual([
      { group: 'Kicks', label: 'Convex Kick · C', instrument: { kind: 'sampler', sample: '/local-samples/p/Kicks/FP_FG C Convex Kick.wav' } },
    ]);
  });

  it('makes one multisampled instrument per folder, named after it', () => {
    expect(bank.sounds.filter((s) => s.group === 'Basses')).toEqual([
      {
        group: 'Basses',
        label: 'Origin Bass',
        instrument: {
          kind: 'sampler',
          gate: true,
          sample: {
            'A#1': '/local-samples/p/Basses/Origin Bass/FP_FG ORIGIN Bass A#.wav',
            C1: '/local-samples/p/Basses/Origin Bass/FP_FG ORIGIN Bass C.wav',
          },
        },
      },
    ]);
  });

  it('gives loops their tempo and key', () => {
    expect(bank.sounds.filter((s) => s.group === 'Leads').map((s) => [s.label, s.instrument.bpm, s.instrument.root])).toEqual([
      ['Psycho Killer · 144', 144, undefined],
      ['Echo Chamber · 135 F#', 135, 'F#3'],
      ['High Diver · E', undefined, 'E3'],
    ]);
  });
});

describe('parseSampleName', () => {
  it('reads both naming styles', () => {
    expect(parseSampleName('FP_FG 135 F# Echo Chamber.wav')).toEqual({ name: 'Echo Chamber', bpm: 135, key: 'F#' });
    expect(parseSampleName('133 - F - Wideboy.wav')).toEqual({ name: 'Wideboy', bpm: 133, key: 'F' });
    expect(parseSampleName('140- A - Willow Creek.wav')).toEqual({ name: 'Willow Creek', bpm: 140, key: 'A' });
    expect(parseSampleName('FP_FG 142 X Life Between the Cracks.wav')).toEqual({ name: 'Life Between the Cracks', bpm: 142 });
    expect(parseSampleName('FPCP Borg.wav')).toEqual({ name: 'Borg' });
    expect(parseSampleName('138 Roller Loop.wav')).toEqual({ name: 'Roller Loop', bpm: 138 });
  });
});

describe('multisampleNote', () => {
  it('puts octave-less notes in octave 1, and C0/C1 at C1/C2', () => {
    expect(multisampleNote('Chrome Bass A#.wav')).toBe('A#1');
    expect(multisampleNote('Bite Bass C0.wav')).toBe('C1');
    expect(multisampleNote('Bite Bass C1.wav')).toBe('C2');
    expect(multisampleNote('Notes.txt')).toBeUndefined();
  });
});
