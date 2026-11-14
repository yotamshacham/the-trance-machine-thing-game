// Plays a song: a channel strip per track into a master limiter, driven by the transport one
// 16th at a time. Songs can be swapped while playing; the loop carries on from the same step.

import * as Tone from 'tone';
import {
  effectsOf,
  mixOf,
  schedule,
  scheduleSections,
  stepSeconds,
  type NoteEvent,
  type Section,
  type Song,
  type SongEffects,
} from '@ttm/song';
import { createVoice, type Voice } from './voices.ts';

/**
 * A track's path to the speakers: voice → highpass → lowpass → duck → channel (gain, pan, mute)
 * → master, and from the channel to the shared delay and reverb by its sends.
 */
interface Strip {
  /** the instrument the voice was built from, to know when to rebuild it */
  instrument: string;
  voice: Voice;
  highpass: Tone.Filter;
  lowpass: Tone.Filter;
  /** dips on each hit of the ducking track */
  duck: Tone.Gain;
  depth: number;
  channel: Tone.Channel;
  delaySend: Tone.Gain;
  reverbSend: Tone.Gain;
}

/** Filters left open are set past what they'd touch. */
const OPEN_HIGHPASS = 10;
const OPEN_LOWPASS = 22000;

export class Engine {
  /** called (on the animation frame) with each step as it sounds, and the audio-clock time it sounds at */
  onStep: ((step: number, at: number) => void) | undefined;
  /** seconds the playhead waits after a note's scheduled time, to land when it's heard */
  visualDelay = 0;

  private readonly master = new Tone.Limiter(-1).toDestination();
  private readonly delay = new Tone.FeedbackDelay({ delayTime: 0.3, feedback: 0.35, wet: 1 }).connect(this.master);
  private readonly reverb = new Tone.Reverb({ decay: 2.5, wet: 1 }).connect(this.master);
  private effects: SongEffects | undefined;
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
        disposeStrip(strip);
        this.strips.delete(id);
      }
    }
    this.setEffects(effectsOf(song), song.bpm);
    for (const track of song.tracks) {
      const instrument = JSON.stringify(track.instrument);
      let strip = this.strips.get(track.id);
      if (strip && strip.instrument !== instrument) {
        strip.voice.dispose();
        strip.voice = createVoice(track.instrument);
        strip.voice.output.connect(strip.highpass);
        strip.instrument = instrument;
      }
      if (!strip) {
        strip = this.createStrip(instrument, createVoice(track.instrument));
        this.strips.set(track.id, strip);
      }
      const mix = mixOf(track);
      strip.highpass.frequency.value = mix.highpass ?? OPEN_HIGHPASS;
      strip.lowpass.frequency.value = mix.lowpass ?? OPEN_LOWPASS;
      strip.delaySend.gain.value = mix.delay;
      strip.reverbSend.gain.value = mix.reverb;
      strip.depth = mix.duck;
      strip.channel.volume.value = track.gain ?? 0;
      strip.channel.pan.value = track.pan ?? 0;
      strip.channel.mute = track.mute ?? false;
      strip.channel.solo = this.solo.has(track.id);
      strip.voice.setTempo?.(song.bpm);
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
    const at = Tone.now() + 0.05;
    for (const s of this.strips.values()) s.voice.restart?.(at);
    transport.start(at);
  }

  stop(): void {
    const transport = Tone.getTransport();
    transport.stop();
    if (this.repeatId !== undefined) transport.clear(this.repeatId);
    this.repeatId = undefined;
    this.onStep?.(-1, 0);
  }

  /** Play one track's note now, e.g. when a step is switched on. */
  preview(trackId: string, pitch: number | null): void {
    const strip = this.strips.get(trackId);
    if (!strip || !this.song) return;
    const e: NoteEvent = { step: 0, trackId, pitch, vel: 0.8, len: 1, slideIn: false, slideOut: false };
    strip.voice.play(e, Tone.now() + 0.01, stepSeconds(this.song.bpm) * 2);
  }

  /** The audio clock, in seconds: what note times are measured against. */
  audioTime(): number {
    return Tone.getContext().rawContext.currentTime;
  }

  /** Seconds from the audio clock reaching a time to it coming out of the speakers, as the browser reports it. */
  outputLatency(): number {
    const raw = Tone.getContext().rawContext as AudioContext;
    return (raw.baseLatency ?? 0) + (raw.outputLatency ?? 0);
  }

  /** Resolves once every sample asked for so far has loaded (or failed). */
  async loaded(): Promise<void> {
    try {
      await Tone.loaded();
    } catch {
      // a missing sample is a silent track, not a broken engine
    }
  }

  dispose(): void {
    this.stop();
    for (const s of this.strips.values()) disposeStrip(s);
    this.strips.clear();
    this.delay.dispose();
    this.reverb.dispose();
    this.master.dispose();
  }

  private createStrip(instrument: string, voice: Voice): Strip {
    const channel = new Tone.Channel().connect(this.master);
    const duck = new Tone.Gain(1).connect(channel);
    const lowpass = new Tone.Filter(OPEN_LOWPASS, 'lowpass').connect(duck);
    const highpass = new Tone.Filter(OPEN_HIGHPASS, 'highpass').connect(lowpass);
    voice.output.connect(highpass);
    const delaySend = new Tone.Gain(0).connect(this.delay);
    const reverbSend = new Tone.Gain(0).connect(this.reverb);
    channel.connect(delaySend);
    channel.connect(reverbSend);
    return { instrument, voice, highpass, lowpass, duck, depth: 0, channel, delaySend, reverbSend };
  }

  private setEffects(effects: SongEffects, bpm: number): void {
    const before = this.effects;
    this.effects = effects;
    this.delay.delayTime.value = effects.delay.steps * stepSeconds(bpm);
    this.delay.feedback.value = effects.delay.feedback;
    // a new decay means a new impulse response: only when it changed
    if (before?.reverb.decay !== effects.reverb.decay) this.reverb.decay = effects.reverb.decay;
  }

  /** Each strip that ducks dips at `at`, then comes back up. */
  private duckAt(at: number): void {
    const release = this.effects?.duck.release ?? 0.18;
    for (const s of this.strips.values()) {
      if (s.depth <= 0) continue;
      const g = s.duck.gain;
      g.cancelAndHoldAtTime(at);
      g.linearRampToValueAtTime(1 - s.depth, at + 0.004);
      g.setTargetAtTime(1, at + 0.02, release / 3);
    }
  }

  private tick(time: number): void {
    if (!this.song || this.length === 0) return;
    const step = this.step % this.length;
    this.step = step + 1;
    const d = stepSeconds(this.song.bpm);
    const at = time + (step % 2 === 1 ? (this.song.swing ?? 0) * d : 0);
    const ducker = this.effects?.duck.by;
    let ducked = false;
    for (const e of this.byStep.get(step) ?? []) {
      const strip = this.strips.get(e.trackId);
      strip?.voice.play(e, at, e.len * d);
      // the ducking track ducks the rest only while it's heard
      if (!ducked && e.trackId === ducker && strip && !strip.channel.muted) {
        this.duckAt(at);
        ducked = true;
      }
    }
    Tone.getDraw().schedule(() => this.onStep?.(step, at), at + this.visualDelay);
  }
}

function disposeStrip(s: Strip): void {
  for (const node of [s.voice, s.highpass, s.lowpass, s.duck, s.channel, s.delaySend, s.reverbSend]) node.dispose();
}
