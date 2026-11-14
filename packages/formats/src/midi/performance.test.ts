import { describe, expect, it } from 'vitest';
import { midiPerformance } from './performance.ts';
import { writeSmf } from './smf.ts';

describe('midiPerformance: a MIDI file as it plays, in seconds', () => {
  it('times notes in seconds from the tempo, unquantized', () => {
    // 120 bpm, 96 ticks a beat: a beat is half a second
    const bytes = writeSmf(96, 120, [
      { name: 'Lead', notes: [{ tick: 7, end: 96, pitch: 72, channel: 0, velocity: 127 }] },
    ]);
    const { parts, duration } = midiPerformance(bytes);
    expect(parts).toHaveLength(1);
    const [note] = parts[0]!.notes;
    expect(note!.time).toBeCloseTo((7 / 96) * 0.5, 6);
    expect(note!.duration).toBeCloseTo((89 / 96) * 0.5, 6);
    expect(note!.pitch).toBe(72);
    expect(note!.velocity).toBe(1);
    expect(duration).toBeCloseTo(0.5, 6);
  });

  it('follows tempo changes', () => {
    // 120 bpm for two beats (1 s), then 60 bpm: a beat later is 2 s in
    const bytes = writeSmf(
      96,
      120,
      [{ notes: [{ tick: 288, end: 384, pitch: 60, channel: 0, velocity: 100 }] }],
      [{ tick: 192, bpm: 60 }],
    );
    const note = midiPerformance(bytes).parts[0]!.notes[0]!;
    expect(note.time).toBeCloseTo(2, 6);
    expect(note.duration).toBeCloseTo(1, 6);
  });

  it('plays at 120 bpm when the file names no tempo', () => {
    const bytes = writeSmf(96, 120, [{ notes: [{ tick: 96, end: 192, pitch: 60, channel: 0, velocity: 100 }] }]);
    // strip the tempo track: header says one fewer track, and the first MTrk chunk goes
    const tempoChunk = 8 + 11;
    const noTempo = new Uint8Array([...bytes.subarray(0, 10), 0, 1, ...bytes.subarray(12, 14), ...bytes.subarray(14 + tempoChunk)]);
    expect(midiPerformance(noTempo).parts[0]!.notes[0]!.time).toBeCloseTo(0.5, 6);
  });

  it('gives one part per channel, named from its track, drums mapped to our voices', () => {
    const bytes = writeSmf(96, 120, [
      { name: 'Bass', notes: [{ tick: 0, end: 24, pitch: 36, channel: 2, velocity: 100 }] },
      {
        name: 'Both',
        notes: [
          { tick: 0, end: 24, pitch: 36, channel: 9, velocity: 100 },
          { tick: 24, end: 48, pitch: 42, channel: 9, velocity: 100 },
          { tick: 0, end: 24, pitch: 76, channel: 0, velocity: 100 },
        ],
      },
    ]);
    const { parts } = midiPerformance(bytes);
    expect(parts.map((p) => [p.channel, p.name, p.drums])).toEqual([
      [0, 'Channel 1', false],
      [2, 'Bass', false],
      [9, 'Drums', true],
    ]);
    expect(parts[2]!.notes.map((n) => n.voice)).toEqual(['kick', 'closed-hat']);
    expect(parts[1]!.notes[0]!.voice).toBeUndefined();
  });

  it('keeps notes in time order within a part', () => {
    const bytes = writeSmf(96, 120, [
      { notes: [{ tick: 96, end: 120, pitch: 60, channel: 0, velocity: 100 }] },
      { notes: [{ tick: 0, end: 24, pitch: 64, channel: 0, velocity: 100 }] },
    ]);
    expect(midiPerformance(bytes).parts[0]!.notes.map((n) => n.pitch)).toEqual([64, 60]);
  });
});
