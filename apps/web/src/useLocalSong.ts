// Keeping the song in step with a file in songs/local (dev server only): once linked, edits here
// are written to the file, and when the file changes on disk (an agent edited it) the song reloads
// as one undoable edit.

import { stringifySong, type Song } from '@ttm/song';
import { useEffect, useRef, useState } from 'react';
import { listLocalSongs, localFileFor, onLocalSongChanged, readLocalSong, saveLocalSong, type LocalSong } from './localSongs.ts';
import { loadLinkedFile, saveLinkedFile } from './storage.ts';
import type { Action } from './state.ts';

export function useLocalSong(song: Song, dispatch: (action: Action) => void, onError: (message: string) => void) {
  /** undefined: no dev server, so no songs/local */
  const [songs, setSongs] = useState<LocalSong[]>();
  const [linked, setLinkedState] = useState(loadLinkedFile);
  const current = useRef({ song, linked });
  current.current = { song, linked };
  /** what the file holds as far as we know, so our own writes don't come back as reloads */
  const onDisk = useRef<string | undefined>(undefined);

  const setLinked = (file: string | undefined) => {
    setLinkedState(file);
    saveLinkedFile(file);
  };

  useEffect(() => {
    void listLocalSongs().then((list) => {
      setSongs(list);
      const file = current.current.linked;
      if (!file) return;
      // the file may have changed while the app was closed: it wins (and undo brings this back)
      const found = list?.find((s) => s.file === file);
      if (!found) return setLinked(undefined);
      onDisk.current = stringifySong(found.song);
      if (onDisk.current !== stringifySong(current.current.song)) dispatch({ type: 'reload', song: found.song });
    });
    return onLocalSongChanged(async (file) => {
      setSongs(await listLocalSongs());
      if (file !== current.current.linked) return;
      try {
        const fresh = await readLocalSong(file);
        const text = stringifySong(fresh);
        onDisk.current = text;
        if (text !== stringifySong(current.current.song)) dispatch({ type: 'reload', song: fresh });
      } catch {
        // deleted, or half-written: the next change event brings it back
      }
    });
  }, []);

  // edits here go to the linked file
  useEffect(() => {
    if (!linked || !songs) return;
    const text = stringifySong(song);
    if (text === onDisk.current) return;
    const t = setTimeout(() => {
      onDisk.current = text;
      saveLocalSong(linked, song).catch((e: Error) => onError(`Couldn't save songs/local/${linked}: ${e.message}`));
    }, 300);
    return () => clearTimeout(t);
  }, [song, linked, songs]);

  return {
    /** the songs in songs/local, or undefined when this isn't the dev server */
    songs,
    linked,
    /** open a songs/local file and keep the song in step with it */
    open(file: string) {
      const found = songs?.find((s) => s.file === file);
      if (!found) return;
      onDisk.current = stringifySong(found.song);
      setLinked(file);
      dispatch({ type: 'load', song: structuredClone(found.song) });
    },
    /** write the song to songs/local (under its title if it isn't linked yet) and keep it in step */
    async saveToProject() {
      const file = linked ?? freeName(localFileFor(song), songs ?? []);
      try {
        await saveLocalSong(file, song);
        onDisk.current = stringifySong(song);
        setLinked(file);
        setSongs(await listLocalSongs());
      } catch (e) {
        onError(`Couldn't save songs/local/${file}: ${(e as Error).message}`);
      }
    },
    /** another song was loaded: stop writing to the file */
    unlink: () => setLinked(undefined),
  };
}

/** `name.json`, or `name-2.json`… when a different song already has that file */
function freeName(file: string, songs: LocalSong[]): string {
  const taken = new Set(songs.map((s) => s.file));
  const base = file.replace(/\.json$/, '');
  let name = file;
  for (let n = 2; taken.has(name); n++) name = `${base}-${n}.json`;
  return name;
}
