import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { songJsonSchema } from './json-schema.ts';
import { SongError, compactSong, emptySong, parseSong, stringifySong } from './song.ts';

const songsDir = new URL('../../../songs/', import.meta.url);
const read = (name: string) => readFileSync(new URL(name, songsDir), 'utf8');

const minimal = {
  format: 'ttm-song',
  version: 1,
  title: 't',
  bpm: 145,
  tracks: [{ id: 'kick', name: 'Kick', instrument: { kind: 'drum', voice: 'kick' }, patterns: { a: { grid: 'x...' } } }],
  arrangement: [{ name: 'A', bars: 1, play: { kick: 'a' } }],
};

describe('parseSong', () => {
  it('expands grids into notes', () => {
    const song = parseSong(minimal);
    expect(song.tracks[0]!.patterns.a).toEqual({ length: 4, notes: [{ step: 0 }] });
  });

  it('accepts JSON text', () => {
    expect(parseSong(JSON.stringify(minimal)).title).toBe('t');
  });

  it('lists every problem, with where it is', () => {
    const bad = {
      ...minimal,
      bpm: 1000,
      tracks: [{ ...minimal.tracks[0], patterns: { a: { grid: 'x Q' } } }],
    };
    expect(() => parseSong(bad)).toThrow(SongError);
    try {
      parseSong(bad);
    } catch (e) {
      expect((e as SongError).issues).toEqual([expect.stringMatching(/^bpm:/)]);
    }
    try {
      parseSong({ ...minimal, tracks: [{ ...minimal.tracks[0], patterns: { a: { grid: 'x Q' } } }] });
    } catch (e) {
      expect((e as SongError).issues).toEqual(['tracks.kick.patterns.a: Grid step 1: "Q" is not a note, ".", "-", "x" or "X"']);
    }
  });

  it('checks that sections play tracks and patterns that exist', () => {
    const bad = { ...minimal, arrangement: [{ name: 'A', bars: 1, play: { kick: 'z', snare: 'a' } }] };
    expect(() => parseSong(bad)).toThrow(/track "kick" has no pattern "z"[\s\S]*no track "snare"/);
  });

  it('rejects notes past the end of their pattern', () => {
    const bad = { ...minimal, tracks: [{ ...minimal.tracks[0], patterns: { a: { length: 4, notes: [{ step: 4 }] } } }] };
    expect(() => parseSong(bad)).toThrow(/step 4 is past the pattern's 4 steps/);
  });
});

describe('song files', () => {
  const files = readdirSync(songsDir).filter((f) => f.endsWith('.json') && f !== 'schema.json');

  it.each(files)('%s is a valid song', (file) => {
    expect(() => parseSong(read(file))).not.toThrow();
  });

  it.each(files)('%s survives being written and read back', (file) => {
    const song = parseSong(read(file));
    expect(parseSong(stringifySong(song))).toEqual(song);
  });

  it('songs/schema.json is up to date (pnpm song schema)', () => {
    expect(JSON.parse(read('schema.json'))).toEqual(songJsonSchema());
  });
});

describe('compactSong', () => {
  it('writes grids where they say the pattern exactly, notes elsewhere', () => {
    const song = parseSong(read('basic-psy.json'));
    const tracks = (compactSong(song) as { tracks: { id: string; patterns: Record<string, object> }[] }).tracks;
    expect(tracks.find((t) => t.id === 'kick')!.patterns.a).toEqual({ grid: 'x...x...x...x...' });
    expect(tracks.find((t) => t.id === 'pad')!.patterns.a).toHaveProperty('notes');
  });
});

it('an empty song is valid', () => {
  expect(parseSong(emptySong())).toEqual(emptySong());
});
