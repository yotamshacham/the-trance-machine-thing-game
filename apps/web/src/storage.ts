// The song being worked on, kept in this browser between visits. Storage can be missing or
// full (private windows): then the song just isn't kept, and nothing breaks.

import { parseSong, type Song } from '@ttm/song';

const KEY = 'ttm.song';

export function loadSaved(): Song | undefined {
  try {
    const text = localStorage.getItem(KEY);
    return text ? parseSong(text) : undefined;
  } catch {
    return undefined;
  }
}

const SYNC_KEY = 'ttm.syncOffset';

/** The playhead sync offset (ms) set on this browser for its speakers. */
export function loadSyncOffset(): number {
  try {
    return Number(localStorage.getItem(SYNC_KEY)) || 0;
  } catch {
    return 0;
  }
}

export function saveSyncOffset(ms: number): void {
  try {
    localStorage.setItem(SYNC_KEY, String(ms));
  } catch {
    // not kept this time
  }
}

export function save(song: Song): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(song));
  } catch {
    // not kept this time
  }
}

const LINK_KEY = 'ttm.localFile';

/** The songs/local file the song in this browser is kept in step with, if any. */
export function loadLinkedFile(): string | undefined {
  try {
    return localStorage.getItem(LINK_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

export function saveLinkedFile(file: string | undefined): void {
  try {
    if (file) localStorage.setItem(LINK_KEY, file);
    else localStorage.removeItem(LINK_KEY);
  } catch {
    // not kept this time
  }
}

const FOLDS_KEY = 'ttm.folds';

/** What's folded in the editor, on this browser: groups by part, tracks by id. Tracks start folded. */
export interface Folds {
  groups: string[];
  /** tracks unfolded: the exception, since tracks start folded */
  openTracks: string[];
}

export function loadFolds(): Folds {
  try {
    const f = JSON.parse(localStorage.getItem(FOLDS_KEY) ?? '{}') as Partial<Folds>;
    return { groups: f.groups ?? [], openTracks: f.openTracks ?? [] };
  } catch {
    return { groups: [], openTracks: [] };
  }
}

export function saveFolds(folds: Folds): void {
  try {
    localStorage.setItem(FOLDS_KEY, JSON.stringify(folds));
  } catch {
    // not kept this time
  }
}
