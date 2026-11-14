import type { Track } from '@ttm/song';
import { describe, expect, it } from 'vitest';
import type { Bank } from './bank.ts';
import { groupTracks, partOf } from './groups.ts';

const banks: Bank[] = [
  {
    id: 'fp',
    name: 'Futurephonic',
    sounds: [
      { group: 'Kicks', label: 'Fractal Kick', instrument: { kind: 'sampler', sample: '/k.wav' } },
      { group: 'Basses', label: 'Chrome Bass', instrument: { kind: 'sampler', sample: { A1: '/a.wav' } } },
      { group: 'Hats', label: 'Ring Hat', instrument: { kind: 'sampler', sample: '/h.wav' } },
      { group: 'Tonal hits', label: 'Quickstab', instrument: { kind: 'sampler', sample: '/q.wav', root: 'F3' } },
      { group: 'FX & risers', label: 'Rising Robot', instrument: { kind: 'sampler', sample: '/r.wav' } },
      { group: 'Pads & atmospheres', label: 'City', instrument: { kind: 'sampler', sample: '/p.wav' } },
    ],
  },
];

const track = (id: string, instrument: Track['instrument'], name = id): Track => ({ id, name, instrument, patterns: {} });

describe('parts: which group a track belongs to', () => {
  it('the drum machine: the kick with the bass, the rest are drums', () => {
    expect(partOf(track('k', { kind: 'drum', voice: 'kick' }), banks)).toBe('kick-bass');
    expect(partOf(track('c', { kind: 'drum', voice: 'clap' }), banks)).toBe('drums');
  });

  it('synths by preset', () => {
    expect(partOf(track('b', { kind: 'synth', preset: 'rolling-bass' }), banks)).toBe('kick-bass');
    expect(partOf(track('s', { kind: 'synth', preset: 'sub' }), banks)).toBe('kick-bass');
    expect(partOf(track('a', { kind: 'synth', preset: 'acid' }), banks)).toBe('leads');
    expect(partOf(track('l', { kind: 'synth', preset: 'lead' }), banks)).toBe('leads');
    expect(partOf(track('p', { kind: 'synth', preset: 'pad' }), banks)).toBe('pads-fx');
  });

  it('bank samples by the bank group they come from', () => {
    const s = (sample: Track['instrument']) => track('x', sample);
    expect(partOf(s({ kind: 'sampler', sample: '/k.wav' }), banks)).toBe('kick-bass');
    expect(partOf(s({ kind: 'sampler', sample: { A1: '/a.wav' }, gate: true }), banks)).toBe('kick-bass');
    expect(partOf(s({ kind: 'sampler', sample: '/h.wav' }), banks)).toBe('drums');
    expect(partOf(s({ kind: 'sampler', sample: '/q.wav', root: 'F4' }), banks)).toBe('leads');
    expect(partOf(s({ kind: 'sampler', sample: '/r.wav' }), banks)).toBe('pads-fx');
    expect(partOf(s({ kind: 'sampler', sample: '/p.wav' }), banks)).toBe('pads-fx');
  });

  it('any other sample by its track name, else other', () => {
    const own = (name: string) => track('x', { kind: 'sampler', sample: '/mine.wav' }, name);
    expect(partOf(own('Snare roll'), banks)).toBe('drums');
    expect(partOf(own('Vox lead'), banks)).toBe('leads');
    expect(partOf(own('Riser'), banks)).toBe('pads-fx');
    expect(partOf(own('Sub bass'), banks)).toBe('kick-bass');
    expect(partOf(own('Field recording'), banks)).toBe('other');
  });

  it('groups in a fixed order, tracks in song order, empty groups left out', () => {
    const tracks = [
      track('lead', { kind: 'synth', preset: 'lead' }),
      track('kick', { kind: 'drum', voice: 'kick' }),
      track('hat', { kind: 'drum', voice: 'closed-hat' }),
      track('bass', { kind: 'synth', preset: 'rolling-bass' }),
    ];
    expect(groupTracks(tracks, banks).map((g) => [g.id, g.name, g.tracks.map((t) => t.id)])).toEqual([
      ['kick-bass', 'Kick & bass', ['kick', 'bass']],
      ['drums', 'Drums', ['hat']],
      ['leads', 'Leads', ['lead']],
    ]);
  });

  it('a track that names its group goes there: fills, or a group of its own', () => {
    const tracks = [
      { ...track('riser', { kind: 'synth', preset: 'noise', swell: true }), group: 'fills' },
      { ...track('roll', { kind: 'drum', voice: 'snare' }), group: 'fills' },
      track('kick', { kind: 'drum', voice: 'kick' }),
      { ...track('vox', { kind: 'sampler', sample: '/v.wav' }), group: 'vocal-chops' },
    ];
    expect(groupTracks(tracks, banks).map((g) => [g.id, g.name, g.tracks.map((t) => t.id)])).toEqual([
      ['kick-bass', 'Kick & bass', ['kick']],
      ['fills', 'Fills', ['riser', 'roll']],
      ['vocal-chops', 'Vocal chops', ['vox']],
    ]);
  });
});
