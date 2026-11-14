// The song format (see docs/song-format.md). Zod is the single source of truth: the TypeScript
// types, runtime validation and songs/schema.json (what an AI is given) all come from here.

import { z } from 'zod';
import { isNoteName } from './pitch.ts';

export const FORMAT = 'ttm-song';
export const VERSION = 1;
/** The grid is 16ths in 4/4: a step is a 16th note, a bar is 16 steps. */
export const STEPS_PER_BEAT = 4;
export const STEPS_PER_BAR = 16;

const Id = z
  .string()
  .regex(/^[a-z0-9][a-z0-9-]*$/, 'lowercase letters, digits and dashes')
  .describe('Stable identifier, e.g. "kick" or "bass-2"');

export const NoteName = z
  .string()
  .refine(isNoteName, 'a note name like "F#1", "A3" or "Bb2" (C4 is middle C)')
  .describe('Pitch as a note name; C4 is middle C. Psytrance bass usually sits around E1–A1.');

export const Note = z.object({
  step: z.number().int().min(0).describe('Step within the pattern, from 0 (16ths)'),
  pitch: NoteName.optional().describe('Omitted on drum tracks; on synth/sampler tracks the default is C3'),
  vel: z.number().min(0).max(1).optional().describe('Velocity 0–1, default 0.8 (1 = accent)'),
  len: z.number().positive().optional().describe('Length in steps, default 1'),
  slide: z.boolean().optional().describe('Glide into the next note (acid lines)'),
});

export const Pattern = z.object({
  length: z.number().int().min(1).max(1024).describe('Length in steps (16 = one bar)'),
  notes: z.array(Note),
});

/**
 * What a song file may say for a pattern: either the canonical notes or the grid shorthand
 * (docs/song-format.md#grid). parseSong turns grids into notes.
 */
export const PatternInput = z.union([
  Pattern,
  z.object({
    grid: z
      .string()
      .describe('Grid shorthand, one token per 16th step: "x...x...x...x..." or "F#1 F#1 . F#1~ G1 - . ."'),
  }),
]);

export const DRUM_VOICES = ['kick', 'clap', 'snare', 'closed-hat', 'open-hat', 'ride', 'perc', 'shaker'] as const;
export const SYNTH_PRESETS = ['rolling-bass', 'acid', 'sub', 'pad', 'lead', 'pluck'] as const;
export const WAVES = ['sawtooth', 'square', 'sine', 'triangle'] as const;

export const DrumInstrument = z
  .object({
    kind: z.literal('drum'),
    voice: z.enum(DRUM_VOICES),
    tune: z.number().min(-24).max(24).optional().describe('Semitones up or down from the voice default'),
    decay: z.number().min(0.1).max(4).optional().describe('Decay multiplier, 1 = default'),
  })
  .describe('Drum machine voice, synthesized in the browser. One voice per track.');

export const SynthInstrument = z
  .object({
    kind: z.literal('synth'),
    preset: z.enum(SYNTH_PRESETS),
    wave: z.enum(WAVES).optional(),
    cutoff: z.number().min(20).max(20000).optional().describe('Filter cutoff in Hz'),
    resonance: z.number().min(0).max(30).optional().describe('Filter Q'),
    envAmount: z.number().min(0).max(8).optional().describe('Filter envelope sweep in octaves'),
    attack: z.number().min(0).max(10).optional().describe('Seconds'),
    decay: z.number().min(0).max(10).optional().describe('Seconds'),
    sustain: z.number().min(0).max(1).optional(),
    release: z.number().min(0).max(10).optional().describe('Seconds'),
    glide: z.number().min(0).max(1).optional().describe('Portamento seconds for slid notes'),
  })
  .describe('Subtractive synth. Preset gives the sound; the other fields override it.');

export const SamplerInstrument = z
  .object({
    kind: z.literal('sampler'),
    sample: z
      .union([z.string().min(1), z.record(NoteName, z.string().min(1))])
      .describe(
        'URL or path of an audio file ("/samples/vox-hey.wav"), or a multisample: note name → file, each file recorded at that note ({"E1": "…", "F1": "…"})',
      ),
    root: NoteName.optional().describe('The pitch a single sample was recorded at, default C3'),
    gate: z.boolean().optional().describe('Cut the sample at the note length (default: play it out)'),
    bpm: z
      .number()
      .min(40)
      .max(300)
      .optional()
      .describe("A loop's own tempo: it's stretched to the song's tempo without changing pitch, and cut at the note length"),
  })
  .describe('Plays audio files, repitched by note.');

export const Instrument = z.discriminatedUnion('kind', [DrumInstrument, SynthInstrument, SamplerInstrument]);

const trackShape = {
  id: Id,
  name: z.string().min(1),
  instrument: Instrument,
  gain: z.number().min(-60).max(12).optional().describe('dB, default 0'),
  pan: z.number().min(-1).max(1).optional().describe('-1 left … 1 right, default 0'),
  mute: z.boolean().optional(),
};

export const Track = z.object({ ...trackShape, patterns: z.record(Id, Pattern) });
export const TrackInput = z.object({ ...trackShape, patterns: z.record(Id, PatternInput) });

export const Section = z.object({
  name: z.string().min(1).describe('e.g. "intro", "build", "drop", "break"'),
  bars: z.number().int().min(1).max(512),
  play: z
    .record(Id, Id)
    .describe('track id → pattern id. Tracks left out are silent. Shorter patterns loop.'),
});

const songShape = {
  format: z.literal(FORMAT),
  version: z.literal(VERSION),
  title: z.string(),
  bpm: z.number().min(40).max(300).describe('Psytrance: 138–148, full-on ~145'),
  swing: z.number().min(0).max(0.5).optional().describe('Delay of every off-16th, 0–0.5 of a step'),
  key: z.string().optional().describe('Informational, e.g. "F# phrygian"'),
  description: z.string().optional(),
  arrangement: z.array(Section).min(1),
};

export const Song = z.object({ ...songShape, tracks: z.array(Track) });
export const SongInput = z.object({ $schema: z.string().optional(), ...songShape, tracks: z.array(TrackInput) });

export type Note = z.infer<typeof Note>;
export type Pattern = z.infer<typeof Pattern>;
export type PatternInput = z.infer<typeof PatternInput>;
export type DrumVoice = (typeof DRUM_VOICES)[number];
export type SynthPreset = (typeof SYNTH_PRESETS)[number];
export type DrumInstrument = z.infer<typeof DrumInstrument>;
export type SynthInstrument = z.infer<typeof SynthInstrument>;
export type SamplerInstrument = z.infer<typeof SamplerInstrument>;
export type Instrument = z.infer<typeof Instrument>;
export type Track = z.infer<typeof Track>;
export type TrackInput = z.infer<typeof TrackInput>;
export type Section = z.infer<typeof Section>;
export type Song = z.infer<typeof Song>;
export type SongInput = z.infer<typeof SongInput>;
