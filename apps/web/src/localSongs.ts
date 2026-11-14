// songs/local/ on this computer, through the dev server (apps/web/dev/localSongs.ts): where the
// app and an agent hand a song back and forth. On the deployed site there is no such folder, and
// `listLocalSongs` says so with `undefined`.

import { parseSong, stringifySong, type Song } from '@ttm/song';

export interface LocalSong {
  file: string;
  song: Song;
}

/** The songs in songs/local, or undefined when there's no dev server to ask. */
export async function listLocalSongs(): Promise<LocalSong[] | undefined> {
  try {
    const response = await fetch('/local-songs/');
    if (!response.ok || !response.headers.get('content-type')?.includes('json')) return undefined;
    const { songs } = (await response.json()) as { songs: unknown[] };
    return songs.flatMap((s) => {
      try {
        const { file, song } = s as { file: string; song: unknown };
        return [{ file, song: parseSong(song) }];
      } catch {
        return [];
      }
    });
  } catch {
    return undefined;
  }
}

export async function readLocalSong(file: string): Promise<Song> {
  const response = await fetch(`/local-songs/${file}`);
  if (!response.ok) throw new Error(`songs/local/${file} couldn't be read`);
  return parseSong(await response.json());
}

export async function saveLocalSong(file: string, song: Song): Promise<void> {
  const response = await fetch(`/local-songs/${file}`, { method: 'PUT', body: stringifySong(song) });
  if (!response.ok) throw new Error(((await response.json().catch(() => ({}))) as { error?: string }).error ?? `HTTP ${response.status}`);
}

/** Called with a file's name whenever something in songs/local changes. Returns the unsubscribe. */
export function onLocalSongChanged(callback: (file: string) => void): () => void {
  const hot = import.meta.hot;
  if (!hot) return () => {};
  const listener = ({ file }: { file: string }) => callback(file);
  hot.on('local-songs:changed', listener);
  return () => hot.off('local-songs:changed', listener);
}

/** The file a song saves to when it isn't one yet: its title, slugged. */
export const localFileFor = (song: Song): string =>
  `${song.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'song'}.json`;
