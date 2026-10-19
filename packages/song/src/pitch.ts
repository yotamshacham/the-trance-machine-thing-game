// Note names ↔ MIDI note numbers. Middle C is C4 = 60; sharps are canonical, flats are read.

const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;
const LETTER: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** e.g. "F#1", "Bb2", "C-1" */
export const NOTE_NAME = /^([A-Ga-g])([#b]?)(-?\d)$/;

export function isNoteName(s: string): boolean {
  const m = NOTE_NAME.exec(s);
  if (!m) return false;
  const midi = toMidiUnchecked(m);
  return midi >= 0 && midi <= 127;
}

export function toMidi(name: string): number {
  const m = NOTE_NAME.exec(name);
  if (!m) throw new Error(`Not a note name: "${name}"`);
  const midi = toMidiUnchecked(m);
  if (midi < 0 || midi > 127) throw new Error(`Note out of MIDI range: "${name}"`);
  return midi;
}

function toMidiUnchecked(m: RegExpExecArray): number {
  const [, letter, accidental, octave] = m;
  const shift = accidental === '#' ? 1 : accidental === 'b' ? -1 : 0;
  return (Number(octave) + 1) * 12 + LETTER[letter!.toUpperCase()]! + shift;
}

export function noteName(midi: number): string {
  return `${NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;
}

/** The canonical spelling of a note name: "Gb1" → "F#1". */
export const normalizeNoteName = (name: string): string => noteName(toMidi(name));
