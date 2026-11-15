// What each drum voice and synth preset sounds like, as plain numbers. voices.ts builds Tone
// nodes from these; tuning a sound means changing a row here.

import { stepSeconds, type DrumInstrument, type DrumVoice, type FilterType, type Lfo, type SynthInstrument, type SynthPreset } from '@ttm/song';

export type Wave = NonNullable<SynthInstrument['wave']>;

export interface SynthSettings {
  /** one note at a time, gliding on slides (bass, acid); otherwise polyphonic */
  mono: boolean;
  wave: Wave;
  /** detuned stacked oscillators, for width (pads, leads) */
  fat: boolean;
  /** when fat: how many oscillators, and how far apart in cents */
  voices: number;
  spread: number;
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
  filterType: FilterType;
  filterAttack: number;
  /** how open the filter stays while a note holds, 0–1 of the envelope */
  filterSustain: number;
  /** white noise level, shaped by the volume envelope */
  noise: number;
  lfos: Lfo[];
  /** the oscillator's level, 0–1: 0 leaves only the noise */
  tone: number;
  /** each note fades in from silence over its whole length (the riser) */
  swell: boolean;
  /** level of a sine at the same pitch under the oscillator, for low-end weight (0 = none) */
  sub: number;
  /** saturation after the filter, 0–1 (0 = clean): grit for acid */
  drive: number;
  /** how much an accent (velocity 1) opens the filter further, in octaves: the acid squelch */
  accent: number;
  glide: number;
}

export const SYNTH_PRESETS: Record<SynthPreset, SynthSettings> = {
  // short, plucky 16ths that sit between the kicks
  // a full 16th of body, a fast filter pluck on top, a sine underneath for weight
  'rolling-bass': { mono: true, wave: 'sawtooth', fat: false, voices: 1, spread: 24, cutoff: 110, resonance: 3, envAmount: 4, attack: 0.002, decay: 0.12, sustain: 0.55, release: 0.025, filterDecay: 0.07, filterType: 'lowpass', filterAttack: 0, filterSustain: 0, noise: 0, lfos: [], tone: 1, swell: false, sub: 0.7, drive: 0, accent: 0, glide: 0.04 },
  // a 303-ish line: a resonant filter that snaps shut, opened further by accents, then some grit
  acid: { mono: true, wave: 'sawtooth', fat: false, voices: 1, spread: 24, cutoff: 280, resonance: 8, envAmount: 3, attack: 0.002, decay: 0.2, sustain: 0.25, release: 0.04, filterDecay: 0.16, filterType: 'lowpass', filterAttack: 0, filterSustain: 0, noise: 0, lfos: [], tone: 1, swell: false, sub: 0, drive: 0.4, accent: 1.5, glide: 0.07 },
  sub: { mono: true, wave: 'sine', fat: false, voices: 1, spread: 24, cutoff: 400, resonance: 0.5, envAmount: 0, attack: 0.005, decay: 0.2, sustain: 0.9, release: 0.08, filterDecay: 0.2, filterType: 'lowpass', filterAttack: 0, filterSustain: 0, noise: 0, lfos: [], tone: 1, swell: false, sub: 0, drive: 0, accent: 0, glide: 0.05 },
  pad: { mono: false, wave: 'sawtooth', fat: true, voices: 3, spread: 24, cutoff: 1400, resonance: 1, envAmount: 0.5, attack: 1.2, decay: 1, sustain: 0.7, release: 2.5, filterDecay: 1, filterType: 'lowpass', filterAttack: 0, filterSustain: 0, noise: 0, lfos: [], tone: 1, swell: false, sub: 0, drive: 0, accent: 0, glide: 0 },
  lead: { mono: false, wave: 'sawtooth', fat: true, voices: 3, spread: 24, cutoff: 2600, resonance: 3, envAmount: 1.5, attack: 0.01, decay: 0.25, sustain: 0.6, release: 0.3, filterDecay: 0.25, filterType: 'lowpass', filterAttack: 0, filterSustain: 0, noise: 0, lfos: [], tone: 1, swell: false, sub: 0, drive: 0, accent: 0, glide: 0 },
  // a wide, bright lead: seven detuned saws
  supersaw: { mono: false, wave: 'sawtooth', fat: true, voices: 7, spread: 45, cutoff: 5000, resonance: 1, envAmount: 1, attack: 0.005, decay: 0.3, sustain: 0.7, release: 0.35, filterDecay: 0.3, filterType: 'lowpass', filterAttack: 0, filterSustain: 0, noise: 0, lfos: [], tone: 1, swell: false, sub: 0, drive: 0, accent: 0, glide: 0 },
  // short and squelchy, for 16th-note lines: a resonant filter snapping shut
  'psy-pluck': { mono: false, wave: 'sawtooth', fat: false, voices: 1, spread: 24, cutoff: 900, resonance: 6, envAmount: 3.5, attack: 0.001, decay: 0.14, sustain: 0, release: 0.12, filterDecay: 0.12, filterType: 'lowpass', filterAttack: 0, filterSustain: 0, noise: 0, lfos: [], tone: 1, swell: false, sub: 0, drive: 0, accent: 0, glide: 0 },
  // the NES pulse, thickened a touch
  'square-lead': { mono: false, wave: 'square', fat: true, voices: 2, spread: 8, cutoff: 4000, resonance: 1, envAmount: 0.5, attack: 0.003, decay: 0.1, sustain: 0.8, release: 0.08, filterDecay: 0.1, filterType: 'lowpass', filterAttack: 0, filterSustain: 0, noise: 0, lfos: [], tone: 1, swell: false, sub: 0, drive: 0, accent: 0, glide: 0 },
  // a slower, darker saw for breakdowns
  'soft-saw': { mono: false, wave: 'sawtooth', fat: true, voices: 3, spread: 20, cutoff: 1500, resonance: 0.7, envAmount: 0.8, attack: 0.04, decay: 0.4, sustain: 0.6, release: 0.6, filterDecay: 0.4, filterType: 'lowpass', filterAttack: 0, filterSustain: 0, noise: 0, lfos: [], tone: 1, swell: false, sub: 0, drive: 0, accent: 0, glide: 0 },
  // a riser: noise only, rising from silence over each note's length
  'noise-rise': { mono: false, wave: 'sine', fat: false, voices: 1, spread: 0, cutoff: 20000, resonance: 0, envAmount: 0, attack: 0.005, decay: 0.1, sustain: 1, release: 0.15, filterDecay: 0.1, filterType: 'lowpass', filterAttack: 0, filterSustain: 0, noise: 1, lfos: [], tone: 0, swell: true, sub: 0, drive: 0, accent: 0, glide: 0 },
  pluck: { mono: false, wave: 'square', fat: false, voices: 1, spread: 24, cutoff: 1800, resonance: 2, envAmount: 2, attack: 0.002, decay: 0.22, sustain: 0, release: 0.2, filterDecay: 0.22, filterType: 'lowpass', filterAttack: 0, filterSustain: 0, noise: 0, lfos: [], tone: 1, swell: false, sub: 0, drive: 0, accent: 0, glide: 0 },
};

/** A preset with the instrument's own patch on top. */
export function synthSettings(instrument: SynthInstrument): SynthSettings {
  const base = SYNTH_PRESETS[instrument.preset];
  const pick = <K extends keyof SynthSettings>(k: K): SynthSettings[K] =>
    (instrument as Partial<SynthSettings>)[k] ?? base[k];
  const voices = instrument.unison ?? (base.fat ? base.voices : 1);
  return {
    mono: base.mono,
    fat: voices > 1,
    voices: Math.max(voices, 1),
    spread: instrument.detune ?? base.spread,
    filterDecay: pick('filterDecay'),
    filterType: instrument.filter ?? base.filterType,
    filterAttack: pick('filterAttack'),
    filterSustain: pick('filterSustain'),
    noise: pick('noise'),
    lfos: instrument.lfo ?? base.lfos,
    tone: base.tone,
    swell: base.swell,
    sub: pick('sub'),
    drive: pick('drive'),
    accent: base.accent,
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

/** Seconds a loop note fades in and out over, so its edges don't click. */
export const LOOP_FADE = 0.008;

export interface LfoRange {
  /** cycles a second at this tempo */
  hz: number;
  /** what it swings between: Hz for cutoff, gain for volume, cents for pitch, -1…1 for pan */
  min: number;
  max: number;
  shape: NonNullable<Lfo['shape']>;
}

/** An LFO's speed at this tempo and the range it swings what it targets through. */
export function lfoRange(lfo: Lfo, cutoff: number, bpm: number): LfoRange {
  const hz = 1 / (lfo.rate * stepSeconds(bpm));
  const d = lfo.depth;
  const shape = lfo.shape ?? 'sine';
  switch (lfo.target) {
    case 'cutoff':
      return { hz, min: Math.max(20, cutoff * 2 ** (-3 * d)), max: Math.min(20000, cutoff * 2 ** (3 * d)), shape };
    case 'volume':
      return { hz, min: 1 - d, max: 1, shape };
    case 'pitch':
      return { hz, min: -100 * d, max: 100 * d, shape };
    case 'pan':
      return { hz, min: -d, max: d, shape };
  }
}
