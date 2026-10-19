import { emptySong, type Song } from '@ttm/song';
import { importableExtensions } from '@ttm/formats';
import { useRef } from 'react';
import { downloadJson, downloadMidi, openSongFile } from '../files.ts';
import { bundledSongs } from '../songs.ts';
import type { Action } from '../state.ts';

export type LoopMode = 'section' | 'song';

interface Props {
  song: Song;
  playing: boolean;
  loopMode: LoopMode;
  canUndo: boolean;
  canRedo: boolean;
  dispatch(action: Action): void;
  onPlay(): void;
  onStop(): void;
  onLoopMode(mode: LoopMode): void;
  onError(message: string): void;
}

export function Header({ song, playing, loopMode, canUndo, canRedo, dispatch, onPlay, onStop, onLoopMode, onError }: Props) {
  const fileInput = useRef<HTMLInputElement>(null);
  return (
    <header className="header">
      <div className="transport">
        <button className={`play ${playing ? 'active' : ''}`} onClick={playing ? onStop : onPlay} title="Play / stop (space)">
          {playing ? '■' : '▶'}
        </button>
        <div className="segmented" role="radiogroup" aria-label="What to play">
          {(['section', 'song'] as const).map((m) => (
            <button key={m} className={loopMode === m ? 'active' : ''} onClick={() => onLoopMode(m)} role="radio" aria-checked={loopMode === m}>
              {m === 'section' ? 'Loop section' : 'Whole song'}
            </button>
          ))}
        </div>
        <label className="bpm">
          <input
            type="number"
            min={40}
            max={300}
            value={song.bpm}
            onChange={(e) => {
              const bpm = Number(e.target.value);
              if (bpm >= 40 && bpm <= 300) dispatch({ type: 'set-bpm', bpm });
            }}
          />
          BPM
        </label>
      </div>
      <input className="title" value={song.title} onChange={(e) => dispatch({ type: 'set-title', title: e.target.value })} aria-label="Song title" />
      <div className="file-actions">
        <button onClick={() => dispatch({ type: 'undo' })} disabled={!canUndo} title="Undo (⌘Z)">↶</button>
        <button onClick={() => dispatch({ type: 'redo' })} disabled={!canRedo} title="Redo (⇧⌘Z)">↷</button>
        <select
          value=""
          onChange={(e) => {
            const v = e.target.value;
            const found = bundledSongs.find((s) => s.file === v);
            if (v === '+empty') dispatch({ type: 'load', song: emptySong() });
            else if (found) dispatch({ type: 'load', song: structuredClone(found.song) });
          }}
          aria-label="Load a song"
        >
          <option value="">Songs…</option>
          {bundledSongs.map((s) => (
            <option key={s.file} value={s.file}>{s.song.title}</option>
          ))}
          <option value="+empty">Empty song</option>
        </select>
        <button onClick={() => fileInput.current?.click()} title={`Open a song (.json) or import ${importableExtensions().join(' ')}`}>Open…</button>
        <input
          ref={fileInput}
          type="file"
          hidden
          accept={['.json', ...importableExtensions()].join(',')}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (!file) return;
            try {
              dispatch({ type: 'load', song: await openSongFile(file) });
            } catch (err) {
              onError(`Couldn't open ${file.name}: ${(err as Error).message}`);
            }
          }}
        />
        <button onClick={() => downloadJson(song)} title="Save the song as a .json file">Save</button>
        <button onClick={() => downloadMidi(song)} title="Export a MIDI file (for a DAW)">MIDI</button>
      </div>
    </header>
  );
}
