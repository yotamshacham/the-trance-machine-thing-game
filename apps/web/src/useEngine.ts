// The audio engine for the app's lifetime. Created in an effect, not during render, so React's
// StrictMode double-mount disposes the first one instead of leaking it.

import { Engine } from '@ttm/engine';
import { useEffect, useRef, useState } from 'react';
import type { Section, Song } from '@ttm/song';

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

  useEffect(() => {
    engine.current?.setSong(song, loop);
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
  };
}
