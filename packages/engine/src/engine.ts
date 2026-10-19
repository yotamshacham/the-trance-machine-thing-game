// Plays a song: a channel strip per track into a master limiter, driven by the transport one
// 16th at a time. Songs can be swapped while playing; the loop carries on from the same step.

import * as Tone from 'tone';
import { schedule, scheduleSections, stepSeconds, type NoteEvent, type Section, type Song } from '@ttm/song';
import { createVoice, type Voice } from './voices.ts';

interface Strip {
  /** the instrument the voice was built from, to know when to rebuild it */
  instrument: string;
  voice: Voice;
  channel: Tone.Channel;
}

export class Engine {
  /** called (on the animation frame) with each step as it sounds */
  onStep: ((step: number) => void) | undefined;

  private readonly master = new Tone.Limiter(-1).toDestination();
  private readonly strips = new Map<string, Strip>();
  private readonly solo = new Set<string>();
  private song: Song | undefined;
  private byStep = new Map<number, NoteEvent[]>();
  private length = 0;
  private step = 0;
  private repeatId: number | undefined;

  /** Audio can only start after a click or key press: call this from one. */
  static async unlock(): Promise<void> {
    await Tone.start();
  }

  get playing(): boolean {
    return this.repeatId !== undefined;
  }

  /** The song to play, and which sections to loop (all of them by default). */
  setSong(song: Song, sections?: Section[]): void {
    this.song = song;
    Tone.getTransport().bpm.value = song.bpm;

    for (const [id, strip] of this.strips) {
      if (!song.tracks.some((t) => t.id === id)) {
        strip.voice.dispose();
        strip.channel.dispose();
        this.strips.delete(id);
      }
    }
    for (const track of song.tracks) {
      const instrument = JSON.stringify(track.instrument);
      let strip = this.strips.get(track.id);
      if (strip && strip.instrument !== instrument) {
        strip.voice.dispose();
        strip.voice = createVoice(track.instrument);
        strip.voice.output.connect(strip.channel);
        strip.instrument = instrument;
      }
      if (!strip) {
        const channel = new Tone.Channel().connect(this.master);
        const voice = createVoice(track.instrument);
        voice.output.connect(channel);
        strip = { instrument, voice, channel };
        this.strips.set(track.id, strip);
      }
      strip.channel.volume.value = track.gain ?? 0;
      strip.channel.pan.value = track.pan ?? 0;
      strip.channel.mute = track.mute ?? false;
      strip.channel.solo = this.solo.has(track.id);
    }

    const { events, length } = sections ? scheduleSections(song, sections) : schedule(song);
    this.byStep = new Map();
    for (const e of events) this.byStep.set(e.step, [...(this.byStep.get(e.step) ?? []), e]);
    this.length = length;
  }

  setSolo(trackId: string, on: boolean): void {
    if (on) this.solo.add(trackId);
    else this.solo.delete(trackId);
    const strip = this.strips.get(trackId);
    if (strip) strip.channel.solo = on;
  }

  /** Start from `step` (the start of the loop by default). */
  play(step = 0): void {
    if (this.playing) this.stop();
    this.step = step;
    const transport = Tone.getTransport();
    this.repeatId = transport.scheduleRepeat((time) => this.tick(time), '16n');
    transport.start('+0.05');
  }

  stop(): void {
    const transport = Tone.getTransport();
    transport.stop();
    if (this.repeatId !== undefined) transport.clear(this.repeatId);
    this.repeatId = undefined;
    this.onStep?.(-1);
  }

  /** Play one track's note now, e.g. when a step is switched on. */
  preview(trackId: string, pitch: number | null): void {
    const strip = this.strips.get(trackId);
    if (!strip || !this.song) return;
    const e: NoteEvent = { step: 0, trackId, pitch, vel: 0.8, len: 1, slideIn: false, slideOut: false };
    strip.voice.play(e, Tone.now() + 0.01, stepSeconds(this.song.bpm) * 2);
  }

  dispose(): void {
    this.stop();
    for (const s of this.strips.values()) {
      s.voice.dispose();
      s.channel.dispose();
    }
    this.strips.clear();
    this.master.dispose();
  }

  private tick(time: number): void {
    if (!this.song || this.length === 0) return;
    const step = this.step % this.length;
    this.step = step + 1;
    const d = stepSeconds(this.song.bpm);
    const at = time + (step % 2 === 1 ? (this.song.swing ?? 0) * d : 0);
    for (const e of this.byStep.get(step) ?? []) this.strips.get(e.trackId)?.voice.play(e, at, e.len * d);
    Tone.getDraw().schedule(() => this.onStep?.(step), at);
  }
}
