// Every file format a song can be imported from, picked by file extension.

import type { Song } from '@ttm/song';
import { songFromMidi } from './midi/song.ts';

export interface Importer {
  name: string;
  /** lowercase, without the dot */
  extensions: string[];
  read(bytes: Uint8Array, title: string): Song;
}

export const importers: Importer[] = [
  { name: 'Standard MIDI', extensions: ['mid', 'midi'], read: (bytes, title) => songFromMidi(bytes, { title }) },
];

export const importableExtensions = (): string[] => importers.flatMap((i) => i.extensions.map((e) => `.${e}`));

/** The song in a file, by the importer for its extension. */
export function importFile(bytes: Uint8Array, fileName: string): Song {
  const dot = fileName.lastIndexOf('.');
  const ext = dot < 0 ? '' : fileName.slice(dot + 1).toLowerCase();
  const importer = importers.find((i) => i.extensions.includes(ext));
  if (!importer) throw new Error(`Can't import .${ext} files yet (can: ${importableExtensions().join(', ')})`);
  return importer.read(bytes, dot < 0 ? fileName : fileName.slice(0, dot));
}
