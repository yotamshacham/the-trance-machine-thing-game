// The audio engine for the app's lifetime. Created in an effect, not during render, so React's
// StrictMode double-mount disposes the first one instead of leaking it.

import { Engine } from '@ttm/engine';
import { useEffect, useRef, useState } from 'react';
import { loadSyncOffset, saveSyncOffset } from './storage.ts';
import { defaultPitchOf, toMidi, type Section, type Song } from '@ttm/song';

/** Seconds from the playhead's draw callback to the cell being on screen (React render + paint), measured. */
const DRAW_TIME = 0.012;

export function useEngine(song: Song, loop: Section[] | undefined) {
  const engine = useRef<Engine | null>(null);
  const [step, setStep] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const stepAt = useRef(0);
  const lags = useRef<number[]>([]);
  const [latency, setLatency] = useState<{ output: number; picture: number } | null>(null);
  /** ms the user moves the playhead by, for speakers that report less latency than they have */
  const [syncOffset, setSyncOffsetState] = useState(loadSyncOffset);

  // the playhead waits for the sound to come out of the speakers
  const applyVisualDelay = (e: Engine, offsetMs = syncOffset) => {
    // may be negative: notes are scheduled ~100 ms ahead, so drawing a little early is possible
    e.visualDelay = Math.max(-0.05, e.outputLatency() + offsetMs / 1000 - DRAW_TIME);
    lags.current = [];
  };

  // How far the playhead's paint lands from the sound: after each step is drawn, the audio clock
  // against when that step comes out of the speakers (as reported). Averaged over the last bar.
  useEffect(() => {
    const e = engine.current;
    if (!e || step < 0) return;
    const at = stepAt.current;
    const frame = requestAnimationFrame(() => {
      const output = e.outputLatency();
      lags.current = [...lags.current.slice(-15), e.audioTime() - (at + output)];
      if (lags.current.length % 4 === 0) {
        setLatency({ output, picture: lags.current.reduce((a, b) => a + b, 0) / lags.current.length });
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [step]);

  useEffect(() => {
    const e = new Engine();
    e.onStep = (s, at) => {
      stepAt.current = at;
      setStep(s);
    };
    engine.current = e;
    return () => {
      e.dispose();
      engine.current = null;
    };
  }, []);

  // a track whose new sound should be heard as soon as it's loaded
  const audition = useRef<string | null>(null);

  useEffect(() => {
    const e = engine.current;
    if (!e) return;
    e.setSong(song, loop);
    const trackId = audition.current;
    audition.current = null;
    const track = song.tracks.find((t) => t.id === trackId);
    if (track && !e.playing) {
      const pitch = track.instrument.kind === 'drum' ? null : toMidi(defaultPitchOf(track.instrument));
      void e.loaded().then(() => e.preview(track.id, pitch));
    }
  }, [song, loop]);

  return {
    step,
    playing,
    latency,
    syncOffset,
    setSyncOffset(ms: number) {
      setSyncOffsetState(ms);
      saveSyncOffset(ms);
      if (engine.current) applyVisualDelay(engine.current, ms);
    },
    async play() {
      await Engine.unlock();
      const e = engine.current;
      if (!e) return;
      applyVisualDelay(e);
      e.play();
      setPlaying(true);
    },
    stop() {
      engine.current?.stop();
      setPlaying(false);
    },
    async preview(trackId: string, pitch: number | null) {
      await Engine.unlock();
      engine.current?.preview(trackId, pitch);
    },
    setSolo: (trackId: string, on: boolean) => engine.current?.setSolo(trackId, on),
    /** play this track's sound once the change about to be made has loaded */
    audition(trackId: string) {
      audition.current = trackId;
      void Engine.unlock();
    },
  };
}
