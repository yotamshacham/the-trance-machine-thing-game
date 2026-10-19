// Opening and saving files: song JSON, and whatever @ttm/formats can import.

import { importFile, songToMidi } from '@ttm/formats';
import { parseSong, stringifySong, type Song } from '@ttm/song';

export async function openSongFile(file: File): Promise<Song> {
  if (file.name.toLowerCase().endsWith('.json')) return parseSong(await file.text());
  return importFile(new Uint8Array(await file.arrayBuffer()), file.name);
}

export function downloadJson(song: Song): void {
  download(new Blob([stringifySong(song)], { type: 'application/json' }), `${slug(song.title)}.json`);
}

export function downloadMidi(song: Song): void {
  download(new Blob([songToMidi(song)], { type: 'audio/midi' }), `${slug(song.title)}.mid`);
}

const slug = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'song';

function download(blob: Blob, name: string): void {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
