import { DRUM_VOICES as VOICE_NAMES, SYNTH_PRESETS as PRESET_NAMES } from '@ttm/song';
import { describe, expect, it } from 'vitest';
import { DRUM_VOICES, SYNTH_PRESETS, drumSettings, synthSettings } from './presets.ts';

describe('presets', () => {
  it('has a sound for every preset and voice the song format names', () => {
    expect(Object.keys(SYNTH_PRESETS).sort()).toEqual([...PRESET_NAMES].sort());
    expect(Object.keys(DRUM_VOICES).sort()).toEqual([...VOICE_NAMES].sort());
  });

  it('lays an instrument’s overrides over its preset', () => {
    const s = synthSettings({ kind: 'synth', preset: 'acid', cutoff: 500, wave: 'square' });
    expect(s).toEqual({ ...SYNTH_PRESETS.acid, cutoff: 500, wave: 'square' });
  });

  it('tunes and stretches drums', () => {
    const kick = drumSettings({ kind: 'drum', voice: 'kick', tune: 2, decay: 2 });
    expect(kick.body).toMatchObject({ pitch: 31, decay: DRUM_VOICES.kick.body!.decay * 2 });
    const hat = drumSettings({ kind: 'drum', voice: 'closed-hat', tune: 12 });
    expect(hat.noise!.freq).toBeCloseTo(DRUM_VOICES['closed-hat'].noise!.freq * 2);
    expect(hat.body).toBeUndefined();
  });
});
