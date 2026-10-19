// Reading and writing song files: validation, cross-references, grid shorthand in and out.

import { z } from 'zod';
import { formatGrid, parseGrid } from './grid.ts';
import { normalizeNoteName } from './pitch.ts';
import {
  FORMAT,
  STEPS_PER_BAR,
  SongInput,
  VERSION,
  type Pattern,
  type PatternInput,
  type Song,
} from './schema.ts';

export class SongError extends Error {
  readonly issues: string[];
  constructor(issues: string[]) {
    super(`Invalid song:\n${issues.map((i) => `  - ${i}`).join('\n')}`);
    this.issues = issues;
  }
}

/**
 * A song file (JSON text or an already-parsed object) → a valid Song in canonical form: grids
 * expanded to notes, note names spelled with sharps. Throws SongError listing every problem.
 */
export function parseSong(input: unknown): Song {
  const raw = typeof input === 'string' ? JSON.parse(input) : input;
  const result = SongInput.safeParse(raw);
  if (!result.success) throw new SongError(result.error.issues.map(describeIssue));

  const issues: string[] = [];
  const { $schema: _, ...rest } = result.data;
  const song: Song = {
    ...rest,
    tracks: rest.tracks.map((t) => ({
      ...t,
      patterns: Object.fromEntries(
        Object.entries(t.patterns).map(([id, p]) => {
          try {
            return [id, canonicalPattern(p)];
          } catch (e) {
            issues.push(`tracks.${t.id}.patterns.${id}: ${(e as Error).message}`);
            return [id, { length: STEPS_PER_BAR, notes: [] }];
          }
        }),
      ),
    })),
  };
  issues.push(...crossReferenceIssues(song));
  if (issues.length) throw new SongError(issues);
  return song;
}

function canonicalPattern(p: PatternInput): Pattern {
  const pattern = 'grid' in p ? parseGrid(p.grid) : p;
  const notes = pattern.notes
    .map((n) => (n.pitch ? { ...n, pitch: normalizeNoteName(n.pitch) } : n))
    .sort((a, b) => a.step - b.step);
  const outside = notes.find((n) => n.step >= pattern.length);
  if (outside) throw new Error(`a note at step ${outside.step} is past the pattern's ${pattern.length} steps`);
  return { length: pattern.length, notes };
}

function crossReferenceIssues(song: Song): string[] {
  const issues: string[] = [];
  const tracks = new Map(song.tracks.map((t) => [t.id, t]));
  if (tracks.size !== song.tracks.length) issues.push('tracks: two tracks share an id');
  song.arrangement.forEach((section, i) => {
    for (const [trackId, patternId] of Object.entries(section.play)) {
      const track = tracks.get(trackId);
      if (!track) issues.push(`arrangement.${i} (${section.name}): no track "${trackId}"`);
      else if (!track.patterns[patternId]) {
        issues.push(`arrangement.${i} (${section.name}): track "${trackId}" has no pattern "${patternId}"`);
      }
    }
  });
  return issues;
}

function describeIssue(issue: z.core.$ZodIssue): string {
  return `${issue.path.join('.') || '(song)'}: ${issue.message}`;
}

/** The song as a file: patterns the grid can say exactly are written as grids. */
export function compactSong(song: Song): object {
  return {
    $schema: './schema.json',
    ...song,
    tracks: song.tracks.map((t) => ({
      ...t,
      patterns: Object.fromEntries(
        Object.entries(t.patterns).map(([id, p]) => {
          const grid = formatGrid(p);
          return [id, grid !== null && p.notes.length ? { grid } : p];
        }),
      ),
    })),
  };
}

export const stringifySong = (song: Song): string => JSON.stringify(compactSong(song), null, 2) + '\n';

/** A song with nothing in it yet. */
export function emptySong(title = 'Untitled'): Song {
  return { format: FORMAT, version: VERSION, title, bpm: 145, tracks: [], arrangement: [{ name: 'A', bars: 4, play: {} }] };
}
