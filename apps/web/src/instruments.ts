// The instruments offered when adding a track or changing its sound.

import { DRUM_VOICES, SYNTH_PRESETS, type Instrument } from '@ttm/song';

export interface InstrumentChoice {
  key: string;
  label: string;
  instrument: Instrument;
}

const title = (s: string) => s.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase());

export const DRUM_CHOICES: InstrumentChoice[] = DRUM_VOICES.map((voice) => ({
  key: `drum:${voice}`,
  label: title(voice),
  instrument: { kind: 'drum', voice },
}));

export const SYNTH_CHOICES: InstrumentChoice[] = SYNTH_PRESETS.map((preset) => ({
  key: `synth:${preset}`,
  label: title(preset),
  instrument: { kind: 'synth', preset },
}));

export const choiceKey = (i: Instrument): string =>
  i.kind === 'drum' ? `drum:${i.voice}` : i.kind === 'synth' ? `synth:${i.preset}` : 'sampler';

export function instrumentForKey(key: string, current: Instrument): Instrument {
  if (key === 'sampler') return current.kind === 'sampler' ? current : { kind: 'sampler', sample: '/samples/example.wav' };
  const choice = [...DRUM_CHOICES, ...SYNTH_CHOICES].find((c) => c.key === key)!;
  // changing preset keeps a synth's own overrides
  if (current.kind === 'synth' && choice.instrument.kind === 'synth') return { ...current, preset: choice.instrument.preset };
  return choice.instrument;
}

/** C0 … C7, for the pitch a click writes. */
export const PEN_PITCHES = Array.from({ length: 85 }, (_, i) => i + 12);
