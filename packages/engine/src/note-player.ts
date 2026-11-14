// Plays notes timed in seconds, not on our step grid: for listening to a file (a MIDI rip) as it
// is before it's imported. Simple chip-like sounds: square leads, a triangle bass, our drum machine.
// Scheduled a little ahead on a timer, so it can be stopped, muted per part and started anywhere.

import * as Tone from 'tone';
import type { DrumVoice, NoteEvent } from '@ttm/song';
import { createVoice, type Voice } from './voices.ts';

export interface TimedNote {
  /** seconds from the start */
  time: number;
  duration: number;
  /** MIDI note number */
  pitch: number;
  /** 0 to 1 */
  velocity: number;
  /** a drum hit, played on this drum machine voice */
  voice?: DrumVoice;
}

export interface TimedPart {
  /** what mutes it: any number, unique among the parts */
  channel: number;
  drums: boolean;
  notes: TimedNote[];
}

const LOOKAHEAD = 0.2;
const TICK_MS = 40;

interface Live {
  output: Tone.Gain;
  strips: Map<number, Tone.Channel>;
  play: Map<number, (n: TimedNote, at: number) => void>;
  dispose: () => void;
}

export class NotePlayer {
  /** called once the last note has played out */
  onEnd: (() => void) | undefined;

  private parts: TimedPart[] = [];
  private duration = 0;
  private readonly muted = new Set<number>();
  private live: Live | undefined;
  private timer: ReturnType<typeof setInterval> | undefined;
  /** audio-clock time of second 0 of the piece */
  private origin = 0;

  get playing(): boolean {
    return this.timer !== undefined;
  }

  setParts(parts: TimedPart[], duration: number): void {
    this.stop();
    this.parts = parts;
    this.duration = duration;
    this.muted.clear();
  }

  setMuted(channel: number, muted: boolean): void {
    if (muted) this.muted.add(channel);
    else this.muted.delete(channel);
    const strip = this.live?.strips.get(channel);
    if (strip) strip.mute = muted;
  }

  /** Seconds into the piece that are sounding now (0 when stopped). */
  position(): number {
    return this.playing ? Math.min(this.duration, Math.max(0, Tone.now() - this.origin)) : 0;
  }

  /** Start `from` seconds in. Call from a click (audio needs one to start). */
  async play(from = 0): Promise<void> {
    await Tone.start();
    this.stop();
    const live = this.build();
    this.live = live;
    this.origin = Tone.now() + 0.05 - from;
    const next = this.parts.map((p) => p.notes.findIndex((n) => n.time >= from));
    const tick = () => {
      const until = Tone.now() + LOOKAHEAD - this.origin;
      this.parts.forEach((part, i) => {
        const play = live.play.get(part.channel)!;
        let j = next[i]!;
        if (j < 0) return;
        while (j < part.notes.length && part.notes[j]!.time < until) play(part.notes[j++]!, this.origin);
        next[i] = j < part.notes.length ? j : -1;
      });
      if (Tone.now() - this.origin > this.duration + 0.5) {
        this.stop();
        this.onEnd?.();
      }
    };
    tick();
    this.timer = setInterval(tick, TICK_MS);
  }

  stop(): void {
    if (this.timer !== undefined) clearInterval(this.timer);
    this.timer = undefined;
    const live = this.live;
    this.live = undefined;
    if (!live) return;
    // notes already handed to the audio clock still sound: fade out, then throw the nodes away
    live.output.gain.rampTo(0, 0.03);
    setTimeout(live.dispose, 400);
  }

  dispose(): void {
    this.stop();
  }

  private build(): Live {
    const output = new Tone.Gain(1);
    const limiter = new Tone.Limiter(-1).toDestination();
    output.connect(limiter);
    const nodes: { dispose(): void }[] = [output, limiter];
    const strips = new Map<number, Tone.Channel>();
    const play = new Map<number, (n: TimedNote, at: number) => void>();

    const melodic = this.parts.filter((p) => !p.drums && p.notes.length);
    const mean = (p: TimedPart) => p.notes.reduce((a, n) => a + n.pitch, 0) / p.notes.length;
    const bass = melodic.length > 1 ? melodic.reduce((lo, p) => (mean(p) < mean(lo) ? p : lo)) : undefined;

    for (const part of this.parts) {
      const strip = new Tone.Channel({ volume: -10, mute: this.muted.has(part.channel) }).connect(output);
      strips.set(part.channel, strip);
      nodes.push(strip);
      if (part.drums) {
        const voices = new Map<DrumVoice, Voice>();
        play.set(part.channel, (n, origin) => {
          const name = n.voice ?? 'perc';
          let voice = voices.get(name);
          if (!voice) {
            voice = createVoice({ kind: 'drum', voice: name });
            voice.output.connect(strip);
            voices.set(name, voice);
            nodes.push(voice);
          }
          const e: NoteEvent = { step: 0, trackId: '', pitch: null, vel: n.velocity, len: 1, slideIn: false, slideOut: false };
          voice.play(e, origin + n.time, n.duration);
        });
        continue;
      }
      const synth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: part === bass ? 'triangle' : 'square' },
        envelope: { attack: 0.003, decay: 0.1, sustain: 0.7, release: 0.04 },
        volume: part === bass ? 0 : -8,
      }).connect(strip);
      synth.maxPolyphony = 24;
      nodes.push(synth);
      play.set(part.channel, (n, origin) => {
        synth.triggerAttackRelease(Tone.mtof(n.pitch as Tone.Unit.MidiNote), Math.max(0.02, n.duration), origin + n.time, n.velocity);
      });
    }
    return { output, strips, play, dispose: () => nodes.forEach((n) => n.dispose()) };
  }
}
