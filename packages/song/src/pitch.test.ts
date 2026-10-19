import { describe, expect, it } from 'vitest';
import { isNoteName, normalizeNoteName, noteName, toMidi } from './pitch.ts';

describe('pitch', () => {
  it('reads note names with middle C as C4 = 60', () => {
    expect(toMidi('C4')).toBe(60);
    expect(toMidi('A4')).toBe(69);
    expect(toMidi('F#1')).toBe(30);
    expect(toMidi('C-1')).toBe(0);
    expect(toMidi('G9')).toBe(127);
  });

  it('reads flats and spells with sharps', () => {
    expect(toMidi('Gb1')).toBe(30);
    expect(normalizeNoteName('Bb2')).toBe('A#2');
    expect(normalizeNoteName('f#1')).toBe('F#1');
  });

  it('round-trips every MIDI note', () => {
    for (let m = 0; m < 128; m++) expect(toMidi(noteName(m))).toBe(m);
  });

  it('rejects what is not a note in MIDI range', () => {
    expect(isNoteName('H2')).toBe(false);
    expect(isNoteName('x')).toBe(false);
    expect(isNoteName('G#9')).toBe(false);
    expect(isNoteName('Cb-1')).toBe(false);
    expect(() => toMidi('nope')).toThrow(/Not a note name/);
  });
});
