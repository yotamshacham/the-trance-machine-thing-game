import { emptySong, type Song } from '@ttm/song';
import { importableExtensions } from '@ttm/formats';
import { useRef } from 'react';
import { downloadJson, downloadMidi, openSongFile } from '../files.ts';
import { bundledSongs } from '../songs.ts';
import type { LocalSong } from '../localSongs.ts';
import type { Ask } from '../requests.ts';
import { AskClaude } from './AskClaude.tsx';
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
  /** songs/local, when the dev server has it */
  localSongs: LocalSong[] | undefined;
  /** the songs/local file this song is kept in step with */
  linked: string | undefined;
  onOpenLocal(file: string): void;
  onSaveToProject(): void;
  /** a song not from songs/local was loaded */
  onUnlink(): void;
  /** send a request about the whole song to the agent (only with a linked song) */
  ask: Ask | undefined;
}

export function Header({ song, playing, loopMode, canUndo, canRedo, dispatch, onPlay, onStop, onLoopMode, onError, localSongs, linked, onOpenLocal, onSaveToProject, onUnlink, ask }: Props) {
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
      <AskClaude ask={ask} target={{ kind: 'song' }} about="the whole song" label="Ask about the song" />
      <div className="file-actions">
        <button onClick={() => dispatch({ type: 'undo' })} disabled={!canUndo} title="Undo (⌘Z)">↶</button>
        <button onClick={() => dispatch({ type: 'redo' })} disabled={!canRedo} title="Redo (⇧⌘Z)">↷</button>
        <select
          value=""
          onChange={(e) => {
            const v = e.target.value;
            if (v.startsWith('local:')) return onOpenLocal(v.slice('local:'.length));
            const found = bundledSongs.find((s) => s.file === v);
            if (v === '+empty' || found) onUnlink();
            if (v === '+empty') dispatch({ type: 'load', song: emptySong() });
            else if (found) dispatch({ type: 'load', song: structuredClone(found.song) });
          }}
          aria-label="Load a song"
        >
          <option value="">Songs…</option>
          <optgroup label="Examples">
            {bundledSongs.map((s) => (
              <option key={s.file} value={s.file}>{s.song.title}</option>
            ))}
            <option value="+empty">Empty song</option>
          </optgroup>
          {localSongs && localSongs.length > 0 && (
            <optgroup label="songs/local (this computer)">
              {localSongs.map((s) => (
                <option key={s.file} value={`local:${s.file}`}>{s.song.title} · {s.file}</option>
              ))}
            </optgroup>
          )}
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
              const opened = await openSongFile(file);
              onUnlink();
              dispatch({ type: 'load', song: opened });
            } catch (err) {
              onError(`Couldn't open ${file.name}: ${(err as Error).message}`);
            }
          }}
        />
        {localSongs && (
          linked ? (
            <span className="linked" title="Kept in step with this file: edits here are written to it, and changes made to it (by an agent) load here">
              ↔ songs/local/{linked}
            </span>
          ) : (
            <button onClick={onSaveToProject} title="Write this song to songs/local/ and keep it in step: edits here save there, edits there load here">
              Save to project
            </button>
          )
        )}
        <button onClick={() => downloadJson(song)} title="Save the song as a .json file">Save</button>
        <button onClick={() => downloadMidi(song)} title="Export a MIDI file (for a DAW)">MIDI</button>
      </div>
    </header>
  );
}
