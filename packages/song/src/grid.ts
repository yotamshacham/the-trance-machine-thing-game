// The grid shorthand for a pattern (docs/song-format.md#grid): one token per 16th step.
//   .      rest
//   x  X   a hit without pitch (drums), X accented
//   F#1    a note; "F#1!" accented, "F#1~" slides into the next note
//   -      hold: the previous note lasts one more step
//   |      bar line, ignored
// Tokens are separated by spaces; a run of x X . - may be written without them: "x...x...".

import { STEPS_PER_BAR, type Note, type Pattern } from './schema.ts';
import { isNoteName, normalizeNoteName } from './pitch.ts';

const COMPACT = /^[xX.-]+$/;
const PITCHED = /^(.+?)(!?)(~?)$/;

export function parseGrid(grid: string): Pattern {
  const tokens = grid
    .split(/[\s|]+/)
    .filter(Boolean)
    .flatMap((chunk) => (COMPACT.test(chunk) ? [...chunk] : [chunk]));
  const notes: Note[] = [];
  let last: Note | undefined; // the note a "-" extends
  tokens.forEach((token, step) => {
    if (token === '.') {
      last = undefined;
    } else if (token === '-') {
      if (!last) throw new Error(`Grid step ${step}: "-" holds a note, but there is none before it`);
      last.len = (last.len ?? 1) + 1;
    } else if (token === 'x' || token === 'X') {
      last = token === 'X' ? { step, vel: 1 } : { step };
      notes.push(last);
    } else {
      const [, pitch, accent, slide] = PITCHED.exec(token)!;
      if (!isNoteName(pitch!)) throw new Error(`Grid step ${step}: "${token}" is not a note, ".", "-", "x" or "X"`);
      last = { step, pitch: normalizeNoteName(pitch!) };
      if (accent) last.vel = 1;
      if (slide) last.slide = true;
      notes.push(last);
    }
  });
  if (!tokens.length) throw new Error('Grid is empty');
  return { length: tokens.length, notes };
}

/** The pattern as a grid, or null when the grid can't say it (odd velocities, overlaps, off-grid). */
export function formatGrid(pattern: Pattern): string | null {
  const tokens: string[] = Array(pattern.length).fill('.');
  for (const n of pattern.notes) {
    const len = n.len ?? 1;
    const vel = n.vel ?? 0.8;
    if (!Number.isInteger(len) || n.step + len > pattern.length) return null;
    if (vel !== 0.8 && vel !== 1) return null;
    if (n.slide && !n.pitch) return null;
    for (let s = n.step; s < n.step + len; s++) if (tokens[s] !== '.') return null;
    const accent = vel === 1 ? '!' : '';
    tokens[n.step] = n.pitch ? `${n.pitch}${accent}${n.slide ? '~' : ''}` : vel === 1 ? 'X' : 'x';
    for (let s = n.step + 1; s < n.step + len; s++) tokens[s] = '-';
  }
  const compact = tokens.every((t) => t.length === 1);
  const bars: string[] = [];
  for (let s = 0; s < tokens.length; s += STEPS_PER_BAR) {
    bars.push(tokens.slice(s, s + STEPS_PER_BAR).join(compact ? '' : ' '));
  }
  return bars.join(compact ? '|' : ' | ');
}
