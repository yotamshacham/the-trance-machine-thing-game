import { describe, expect, it } from 'vitest';
import { formatGrid, parseGrid } from './grid.ts';

describe('parseGrid', () => {
  it('reads a compact drum grid', () => {
    expect(parseGrid('x...X...')).toEqual({ length: 8, notes: [{ step: 0 }, { step: 4, vel: 1 }] });
  });

  it('reads notes, holds, accents and slides', () => {
    expect(parseGrid('F#1 - . Bb2!~ C3')).toEqual({
      length: 5,
      notes: [
        { step: 0, pitch: 'F#1', len: 2 },
        { step: 3, pitch: 'A#2', vel: 1, slide: true },
        { step: 4, pitch: 'C3' },
      ],
    });
  });

  it('ignores bar lines and mixes compact runs with spaced tokens', () => {
    expect(parseGrid('x... | ..x.').length).toBe(8);
    expect(parseGrid('. F#1 ..').notes).toEqual([{ step: 1, pitch: 'F#1' }]);
  });

  it('says what is wrong', () => {
    expect(() => parseGrid('. - x')).toThrow(/step 1: "-" holds a note/);
    expect(() => parseGrid('x H2')).toThrow(/step 1: "H2" is not a note/);
    expect(() => parseGrid('  ')).toThrow(/empty/);
  });
});

describe('formatGrid', () => {
  it('writes drums compactly, a bar line every 16 steps', () => {
    expect(formatGrid(parseGrid('x...x...x...x...x...'))).toBe('x...x...x...x...|x...');
  });

  it('round-trips pitched grids', () => {
    const grid = '. F#1 F#1! - . G1~ A1 .';
    expect(formatGrid(parseGrid(grid))).toBe(grid);
  });

  it('gives up on what a grid cannot say', () => {
    expect(formatGrid({ length: 4, notes: [{ step: 0, vel: 0.5 }] })).toBeNull();
    expect(formatGrid({ length: 4, notes: [{ step: 0, pitch: 'C3', len: 2 }, { step: 1, pitch: 'E3' }] })).toBeNull();
    expect(formatGrid({ length: 4, notes: [{ step: 0, pitch: 'C3', len: 1.5 }] })).toBeNull();
    expect(formatGrid({ length: 4, notes: [{ step: 3, pitch: 'C3', len: 2 }] })).toBeNull();
  });
});
