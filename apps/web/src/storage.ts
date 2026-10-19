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

export function save(song: Song): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(song));
  } catch {
    // not kept this time
  }
}
