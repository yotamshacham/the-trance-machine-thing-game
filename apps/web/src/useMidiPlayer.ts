// Listening to a MIDI file as it is, before importing it: unquantized, every channel on a chip-like sound.

import { midiPerformance, type Performance } from '@ttm/formats';
import { NotePlayer } from '@ttm/engine';
import { useEffect, useRef, useState } from 'react';

export interface LoadedMidi {
  file: File;
  performance: Performance;
}

export function useMidiPlayer() {
  const player = useRef<NotePlayer | null>(null);
  const [midi, setMidi] = useState<LoadedMidi>();
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [muted, setMuted] = useState<Set<number>>(new Set());

  useEffect(() => {
    const p = new NotePlayer();
    p.onEnd = () => {
      setPlaying(false);
      setPosition(0);
    };
    player.current = p;
    return () => {
      p.dispose();
      player.current = null;
    };
  }, []);

  // the clock moves while it plays
  useEffect(() => {
    if (!playing) return;
    let frame = requestAnimationFrame(function update() {
      setPosition(player.current?.position() ?? 0);
      frame = requestAnimationFrame(update);
    });
    return () => cancelAnimationFrame(frame);
  }, [playing]);

  const play = async (from: number) => {
    const p = player.current;
    if (!p) return;
    await p.play(from);
    setPosition(from);
    setPlaying(true);
  };

  return {
    midi,
    playing,
    position,
    muted,
    /** read a file; throws when it isn't MIDI */
    async open(file: File) {
      const performance = midiPerformance(new Uint8Array(await file.arrayBuffer()));
      player.current?.setParts(performance.parts, performance.duration);
      setMidi({ file, performance });
      setPlaying(false);
      setPosition(0);
      setMuted(new Set());
    },
    play,
    stop() {
      player.current?.stop();
      setPlaying(false);
    },
    /** jump to a time; keeps playing if it was */
    seek(seconds: number) {
      setPosition(seconds);
      if (playing) void play(seconds);
    },
    toggleMute(channel: number) {
      const on = !muted.has(channel);
      player.current?.setMuted(channel, on);
      setMuted((m) => {
        const next = new Set(m);
        if (on) next.add(channel);
        else next.delete(channel);
        return next;
      });
    },
    close() {
      player.current?.stop();
      setPlaying(false);
      setMidi(undefined);
    },
  };
}

export type MidiPlayerState = ReturnType<typeof useMidiPlayer>;
