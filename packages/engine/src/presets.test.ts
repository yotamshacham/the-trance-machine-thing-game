import { DRUM_VOICES as VOICE_NAMES, SYNTH_PRESETS as PRESET_NAMES } from '@ttm/song';
import { describe, expect, it } from 'vitest';
import { DRUM_VOICES, SYNTH_PRESETS, drumSettings, lfoRange, synthSettings } from './presets.ts';

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

  it('a patch overrides the preset: filter, unison, noise, sub, drive', () => {
    const s = synthSettings({ kind: 'synth', preset: 'lead', filter: 'bandpass', unison: 9, detune: 40, noise: 0.1, sub: 0.4, drive: 0.2, filterSustain: 0.3 });
    expect(s).toMatchObject({ filterType: 'bandpass', fat: true, voices: 9, spread: 40, noise: 0.1, sub: 0.4, drive: 0.2, filterSustain: 0.3 });
    expect(synthSettings({ kind: 'synth', preset: 'supersaw', unison: 1 }).fat).toBe(false);
    expect(synthSettings({ kind: 'synth', preset: 'acid' })).toMatchObject({ filterType: 'lowpass', lfos: [] });
  });

  it('an LFO cycles in steps of the tempo, around what it moves', () => {
    // at 150 bpm a step is 0.1 s: a 4-step LFO cycles 2.5 times a second
    expect(lfoRange({ target: 'cutoff', rate: 4, depth: 1 }, 1000, 150)).toMatchObject({ hz: 2.5, min: 125, max: 8000 });
    expect(lfoRange({ target: 'cutoff', rate: 1, depth: 1 }, 5000, 150).max).toBe(20000);
    expect(lfoRange({ target: 'volume', rate: 1, depth: 0.75 }, 1000, 150)).toMatchObject({ hz: 10, min: 0.25, max: 1 });
    expect(lfoRange({ target: 'pan', rate: 16, depth: 0.5 }, 1000, 150)).toMatchObject({ min: -0.5, max: 0.5 });
    expect(lfoRange({ target: 'pitch', rate: 2, depth: 1, shape: 'triangle' }, 1000, 150)).toMatchObject({ min: -100, max: 100, shape: 'triangle' });
    expect(lfoRange({ target: 'pitch', rate: 2, depth: 1 }, 1000, 150).shape).toBe('sine');
  });
});
