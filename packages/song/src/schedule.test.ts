import { describe, expect, it } from 'vitest';
import { defaultPitchOf, schedule, scheduleSections, sectionStarts, stepTime } from './schedule.ts';
import { parseSong } from './song.ts';

const song = parseSong({
  format: 'ttm-song',
  version: 1,
  title: 't',
  bpm: 120,
  tracks: [
    { id: 'kick', name: 'Kick', instrument: { kind: 'drum', voice: 'kick' }, patterns: { a: { grid: 'x...' } } },
    {
      id: 'acid',
      name: 'Acid',
      instrument: { kind: 'synth', preset: 'acid' },
      patterns: { a: { grid: 'C2~ . D2 x . . . . . . . . . . . .' } },
    },
  ],
  arrangement: [
    { name: 'A', bars: 1, play: { kick: 'a' } },
    { name: 'B', bars: 2, play: { kick: 'a', acid: 'a' } },
  ],
});

describe('schedule', () => {
  it('loops shorter patterns through each section, one after another', () => {
    const { events, length } = schedule(song);
    expect(length).toBe(48);
    const kicks = events.filter((e) => e.trackId === 'kick').map((e) => e.step);
    expect(kicks).toEqual([0, 4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44]);
    expect(kicks.length).toBe(12);
  });

  it('gives drums no pitch, synth notes their pitch or C3', () => {
    const { events } = schedule(song);
    expect(events.find((e) => e.trackId === 'kick')!.pitch).toBeNull();
    const acid = events.filter((e) => e.trackId === 'acid').slice(0, 3);
    expect(acid.map((e) => [e.step, e.pitch])).toEqual([[16, 36], [18, 38], [19, 48]]);
  });

  it('holds a sliding note until the next and marks that one slid into', () => {
    const acid = schedule(song).events.filter((e) => e.trackId === 'acid');
    expect(acid[0]).toMatchObject({ step: 16, len: 2, slideIn: false, slideOut: true });
    expect(acid[1]).toMatchObject({ step: 18, len: 1, slideIn: true, slideOut: false });
    expect(acid[2]).toMatchObject({ slideIn: false });
  });

  it('cuts a pattern off where its section ends', () => {
    const { events, length } = scheduleSections(song, [{ name: 'half', bars: 1, play: { acid: 'a' } }]);
    expect(length).toBe(16);
    expect(events.every((e) => e.step < 16)).toBe(true);
  });

  it('finds where sections start', () => {
    expect(sectionStarts(song)).toEqual({ starts: [0, 16], length: 48 });
  });
});

describe('stepTime', () => {
  it('is a 16th at the tempo, off-16ths pushed by swing', () => {
    expect(stepTime(4, 120)).toBeCloseTo(0.5);
    expect(stepTime(1, 120, 0.5)).toBeCloseTo(0.125 + 0.0625);
    expect(stepTime(2, 120, 0.5)).toBeCloseTo(0.25);
  });
});

describe('defaultPitchOf', () => {
  it('is C3 for synths, a sample’s root, or a multisample’s lowest note', () => {
    expect(defaultPitchOf({ kind: 'synth', preset: 'acid' })).toBe('C3');
    expect(defaultPitchOf({ kind: 'sampler', sample: '/a.wav', root: 'F#3' })).toBe('F#3');
    expect(defaultPitchOf({ kind: 'sampler', sample: '/a.wav' })).toBe('C3');
    expect(defaultPitchOf({ kind: 'sampler', sample: { B1: '/b.wav', 'C#1': '/c.wav' } })).toBe('C#1');
  });

  it('is what pitchless sampler notes play', () => {
    const s = parseSong({
      format: 'ttm-song',
      version: 1,
      title: 't',
      bpm: 120,
      tracks: [{ id: 'hit', name: 'Hit', instrument: { kind: 'sampler', sample: '/hit.wav', root: 'A2' }, patterns: { a: { grid: 'x...' } } }],
      arrangement: [{ name: 'A', bars: 1, play: { hit: 'a' } }],
    });
    expect(schedule(s).events[0]!.pitch).toBe(45);
  });
});
