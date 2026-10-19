// The audio engine for the app's lifetime. Created in an effect, not during render, so React's
// StrictMode double-mount disposes the first one instead of leaking it.

import { Engine } from '@ttm/engine';
import { useEffect, useRef, useState } from 'react';
import { defaultPitchOf, toMidi, type Section, type Song } from '@ttm/song';

export function useEngine(song: Song, loop: Section[] | undefined) {
  const engine = useRef<Engine | null>(null);
  const [step, setStep] = useState(-1);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const e = new Engine();
    e.onStep = setStep;
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
    async play() {
      await Engine.unlock();
      engine.current?.play();
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
