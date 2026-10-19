// What each drum voice and synth preset sounds like, as plain numbers. voices.ts builds Tone
// nodes from these; tuning a sound means changing a row here.

import type { DrumInstrument, DrumVoice, SynthInstrument, SynthPreset } from '@ttm/song';

export type Wave = NonNullable<SynthInstrument['wave']>;

export interface SynthSettings {
  /** one note at a time, gliding on slides (bass, acid); otherwise polyphonic */
  mono: boolean;
  wave: Wave;
  /** detuned stacked oscillators, for width (pads, leads) */
  fat: boolean;
  cutoff: number;
  resonance: number;
  /** octaves the filter envelope opens above the cutoff */
  envAmount: number;
  attack: number;
  decay: number;
  sustain: number;
  release: number;
  /** seconds the filter takes to close after opening: the "pluck" */
  filterDecay: number;
  /** level of a sine at the same pitch under the oscillator, for low-end weight (0 = none) */
  sub: number;
  glide: number;
}

export const SYNTH_PRESETS: Record<SynthPreset, SynthSettings> = {
  // short, plucky 16ths that sit between the kicks
  // a full 16th of body, a fast filter pluck on top, a sine underneath for weight
  'rolling-bass': { mono: true, wave: 'sawtooth', fat: false, cutoff: 110, resonance: 3, envAmount: 4, attack: 0.002, decay: 0.12, sustain: 0.55, release: 0.025, filterDecay: 0.07, sub: 0.7, glide: 0.04 },
  acid: { mono: true, wave: 'sawtooth', fat: false, cutoff: 220, resonance: 14, envAmount: 4, attack: 0.002, decay: 0.25, sustain: 0.35, release: 0.05, filterDecay: 0.2, sub: 0, glide: 0.06 },
  sub: { mono: true, wave: 'sine', fat: false, cutoff: 400, resonance: 0.5, envAmount: 0, attack: 0.005, decay: 0.2, sustain: 0.9, release: 0.08, filterDecay: 0.2, sub: 0, glide: 0.05 },
  pad: { mono: false, wave: 'sawtooth', fat: true, cutoff: 1400, resonance: 1, envAmount: 0.5, attack: 1.2, decay: 1, sustain: 0.7, release: 2.5, filterDecay: 1, sub: 0, glide: 0 },
  lead: { mono: false, wave: 'sawtooth', fat: true, cutoff: 2600, resonance: 3, envAmount: 1.5, attack: 0.01, decay: 0.25, sustain: 0.6, release: 0.3, filterDecay: 0.25, sub: 0, glide: 0 },
  pluck: { mono: false, wave: 'square', fat: false, cutoff: 1800, resonance: 2, envAmount: 2, attack: 0.002, decay: 0.22, sustain: 0, release: 0.2, filterDecay: 0.22, sub: 0, glide: 0 },
};

/** A preset with the instrument's own overrides on top. */
export function synthSettings(instrument: SynthInstrument): SynthSettings {
  const base = SYNTH_PRESETS[instrument.preset];
  const pick = <K extends keyof SynthSettings>(k: K): SynthSettings[K] =>
    (instrument as Partial<SynthSettings>)[k] ?? base[k];
  return {
    mono: base.mono,
    fat: base.fat,
    filterDecay: base.filterDecay,
    sub: base.sub,
    wave: pick('wave'),
    cutoff: pick('cutoff'),
    resonance: pick('resonance'),
    envAmount: pick('envAmount'),
    attack: pick('attack'),
    decay: pick('decay'),
    sustain: pick('sustain'),
    release: pick('release'),
    glide: pick('glide'),
  };
}

/** A drum voice: a pitched body (membrane), a noise burst through a filter, or both. */
export interface DrumSettings {
  body?: { pitch: number; sweepOctaves: number; sweepTime: number; decay: number };
  noise?: {
    color: 'white' | 'pink';
    filter: 'highpass' | 'bandpass' | 'lowpass';
    freq: number;
    q: number;
    decay: number;
    /** quick repeats before the tail, seconds apart (a clap's several hands) */
    bursts: number;
    level: number;
  };
}

export const DRUM_VOICES: Record<DrumVoice, DrumSettings> = {
  // a tight, clicky psytrance kick around F1
  kick: { body: { pitch: 29, sweepOctaves: 5, sweepTime: 0.045, decay: 0.32 } },
  clap: { noise: { color: 'white', filter: 'bandpass', freq: 1300, q: 1.2, decay: 0.16, bursts: 3, level: 1 } },
  snare: {
    body: { pitch: 50, sweepOctaves: 1.5, sweepTime: 0.03, decay: 0.12 },
    noise: { color: 'white', filter: 'highpass', freq: 1500, q: 0.7, decay: 0.17, bursts: 0, level: 0.8 },
  },
  'closed-hat': { noise: { color: 'white', filter: 'highpass', freq: 8000, q: 0.8, decay: 0.035, bursts: 0, level: 0.9 } },
  'open-hat': { noise: { color: 'white', filter: 'highpass', freq: 7000, q: 0.8, decay: 0.28, bursts: 0, level: 0.8 } },
  ride: { noise: { color: 'white', filter: 'bandpass', freq: 6000, q: 2, decay: 0.9, bursts: 0, level: 0.6 } },
  perc: { body: { pitch: 64, sweepOctaves: 1, sweepTime: 0.02, decay: 0.1 } },
  shaker: { noise: { color: 'pink', filter: 'highpass', freq: 5500, q: 1, decay: 0.06, bursts: 0, level: 0.7 } },
};

/** The voice with the instrument's tune (semitones) and decay (multiplier) applied. */
export function drumSettings(instrument: DrumInstrument): DrumSettings {
  const base = DRUM_VOICES[instrument.voice];
  const tune = instrument.tune ?? 0;
  const decay = instrument.decay ?? 1;
  return {
    ...(base.body && { body: { ...base.body, pitch: base.body.pitch + tune, decay: base.body.decay * decay } }),
    ...(base.noise && {
      noise: { ...base.noise, freq: base.noise.freq * 2 ** (tune / 12), decay: base.noise.decay * decay },
    }),
  };
}
