// The songs in the repo's songs/ folder (the template, and what's been written there by hand or by AI).

import { parseSong, type Song } from '@ttm/song';

const files = import.meta.glob<unknown>(['../../../songs/*.json', '!../../../songs/schema.json'], {
  eager: true,
  import: 'default',
});

export const bundledSongs: { file: string; song: Song }[] = Object.entries(files)
  .flatMap(([path, json]) => {
    try {
      return [{ file: path.split('/').pop()!, song: parseSong(json) }];
    } catch (e) {
      console.error(`songs/${path.split('/').pop()} is not a valid song`, e);
      return [];
    }
  })
  .sort((a, b) => (a.file === 'basic-psy.json' ? -1 : b.file === 'basic-psy.json' ? 1 : a.file.localeCompare(b.file)));

export const templateSong = (): Song => structuredClone(bundledSongs[0]!.song);
