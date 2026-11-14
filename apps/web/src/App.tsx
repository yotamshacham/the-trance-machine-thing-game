import { STEPS_PER_BAR, defaultPitchOf, sectionStarts, type Song } from '@ttm/song';
import { loadBanks, type Bank } from './bank.ts';
import { useEffect, useMemo, useReducer, useState } from 'react';
import { AddTrack } from './components/AddTrack.tsx';
import { Arrangement } from './components/Arrangement.tsx';
import { Header, type LoopMode } from './components/Header.tsx';
import { TrackRow } from './components/TrackRow.tsx';
import { initialState, reducer } from './state.ts';
import { save } from './storage.ts';
import { useEngine } from './useEngine.ts';

export function App({ initial }: { initial: Song }) {
  const [state, dispatch] = useReducer(reducer, initial, initialState);
  const { song, section } = state;
  const [loopMode, setLoopMode] = useState<LoopMode>('section');
  const [solo, setSolo] = useState<Set<string>>(new Set());
  const [pens, setPens] = useState<Record<string, string>>({});
  const [error, setError] = useState<string>();
  const [banks, setBanks] = useState<Bank[]>([]);

  useEffect(() => {
    void loadBanks().then(setBanks);
  }, []);

  const current = song.arrangement[section]!;
  const loop = useMemo(() => (loopMode === 'section' ? [current] : undefined), [loopMode, current]);
  const engine = useEngine(song, loop);

  // where the playhead is: which section, and how far into it
  const { starts } = useMemo(() => sectionStarts(song), [song]);
  let playingSection = -1;
  let stepInSection = -1;
  if (engine.step >= 0) {
    if (loopMode === 'section') [playingSection, stepInSection] = [section, engine.step];
    else {
      playingSection = starts.findLastIndex((s) => s <= engine.step);
      stepInSection = engine.step - starts[playingSection]!;
    }
  }

  // playing the whole song, the editor follows the playhead
  useEffect(() => {
    if (loopMode === 'song' && engine.playing && playingSection >= 0 && playingSection !== section) {
      dispatch({ type: 'select-section', index: playingSection });
    }
  }, [loopMode, engine.playing, playingSection, section]);

  useEffect(() => {
    const t = setTimeout(() => save(song), 300);
    return () => clearTimeout(t);
  }, [song]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || e.target instanceof HTMLTextAreaElement;
      if (e.code === 'Space' && !typing) {
        e.preventDefault();
        if (engine.playing) engine.stop();
        else void engine.play();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && !typing) {
        e.preventDefault();
        dispatch({ type: e.shiftKey ? 'redo' : 'undo' });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [engine]);

  const penFor = (trackId: string) => {
    if (pens[trackId]) return pens[trackId];
    // the pitch the track uses most, so a click continues its line
    const counts = new Map<string, number>();
    const track = song.tracks.find((t) => t.id === trackId)!;
    for (const p of Object.values(track.patterns)) {
      for (const n of p.notes) if (n.pitch) counts.set(n.pitch, (counts.get(n.pitch) ?? 0) + 1);
    }
    return [...counts].sort((a, b) => b[1] - a[1])[0]?.[0] ?? defaultPitchOf(track.instrument);
  };

  return (
    <div className="app">
      <Header
        song={song}
        playing={engine.playing}
        loopMode={loopMode}
        canUndo={state.past.length > 0}
        canRedo={state.future.length > 0}
        dispatch={dispatch}
        onPlay={() => void engine.play()}
        onStop={engine.stop}
        onLoopMode={setLoopMode}
        onError={setError}
      />
      {error && (
        <div className="error" role="alert">
          {error}
          <button className="icon" onClick={() => setError(undefined)} aria-label="Dismiss">×</button>
        </div>
      )}
      <Arrangement song={song} selected={section} playingSection={playingSection} dispatch={dispatch} />
      <main className="tracks">
        {song.tracks.map((track) => {
          const patternId = current.play[track.id];
          const pattern = patternId ? track.patterns[patternId] : undefined;
          const playing = pattern && playingSection === section && stepInSection >= 0 ? stepInSection % pattern.length : -1;
          return (
            <TrackRow
              key={track.id}
              track={track}
              patternId={patternId}
              playing={playing}
              solo={solo.has(track.id)}
              pen={penFor(track.id)}
              dispatch={dispatch}
              onSolo={(on) => {
                engine.setSolo(track.id, on);
                setSolo((s) => {
                  const next = new Set(s);
                  if (on) next.add(track.id);
                  else next.delete(track.id);
                  return next;
                });
              }}
              onPen={(pitch) => setPens((p) => ({ ...p, [track.id]: pitch }))}
              onPreview={(pitch) => void engine.preview(track.id, pitch)}
              onAudition={() => engine.audition(track.id)}
              banks={banks}
            />
          );
        })}
        <AddTrack banks={banks} dispatch={dispatch} />
      </main>
      <footer className="footer">
        <span>
          {current.bars} bars · {current.bars * STEPS_PER_BAR} steps · click a step to add a note, again to remove it; pick a note first to write or repitch · space plays
        </span>
        <span className="latency">
          <span title="If the playhead moves before you hear the beat, push it later (+); if after, earlier (−). Kept for this browser.">
            sync
            <button className="tiny" onClick={() => engine.setSyncOffset(engine.syncOffset - 10)} aria-label="Playhead earlier">−</button>
            {engine.syncOffset > 0 ? '+' : ''}
            {engine.syncOffset} ms
            <button className="tiny" onClick={() => engine.setSyncOffset(engine.syncOffset + 10)} aria-label="Playhead later">+</button>
          </span>
          {engine.latency && (
            <span title="Audio output latency the browser reports, and how far the playhead is drawn from when that says you hear each step">
              audio out {Math.round(engine.latency.output * 1000)} ms · playhead {Math.abs(Math.round(engine.latency.picture * 1000))} ms{' '}
              {engine.latency.picture >= 0 ? 'late' : 'early'}
            </span>
          )}
          <span>{__APP_VERSION__}</span>
        </span>
      </footer>
    </div>
  );
}
