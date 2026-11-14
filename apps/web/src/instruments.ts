// The sounds offered for a track, in groups: the drum machine, the synths, and each sample bank's
// groups (kicks, basses, leads …). A group key picks a category; a bank group's sounds are then
// stepped through one by one.

import { DRUM_VOICES, SYNTH_PRESETS, type Instrument, type Track } from '@ttm/song';
import { findSound, groupsOf, type Bank, type BankSound } from './bank.ts';

/** A loop: a sample with its own tempo. It plays its own riff, so it can't play a melody. */
export const isLoop = (instrument: Instrument): boolean => instrument.kind === 'sampler' && instrument.bpm !== undefined;

/** A melody track plays more than one pitch. */
export function isMelodic(track: Track): boolean {
  const pitches = new Set(Object.values(track.patterns).flatMap((p) => p.notes.map((n) => n.pitch)));
  pitches.delete(undefined);
  return pitches.size > 1;
}

/** For a melody track, sounds that aren't loops. */
export interface ForTrack {
  melodic?: boolean;
}

/** A bank group's sounds a track may use. */
export const soundsOf = (bank: Bank, group: string, { melodic = false }: ForTrack = {}): BankSound[] =>
  bank.sounds.filter((s) => s.group === group && !(melodic && isLoop(s.instrument)));

export interface SoundOption {
  key: string;
  label: string;
}

export interface SoundGroup {
  label: string;
  options: SoundOption[];
}

const title = (s: string) => s.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase());
const bankKey = (bankId: string, group: string) => `bank:${bankId}:${group}`;

export function soundGroups(banks: Bank[], forTrack: ForTrack = {}): SoundGroup[] {
  return [
    { label: 'Drum machine', options: DRUM_VOICES.map((v) => ({ key: `drum:${v}`, label: title(v) })) },
    { label: 'Synth', options: SYNTH_PRESETS.map((p) => ({ key: `synth:${p}`, label: title(p) })) },
    ...banks.map((b) => ({
      label: `${b.name} samples`,
      options: groupsOf(b)
        .filter((g) => soundsOf(b, g, forTrack).length)
        .map((g) => ({ key: bankKey(b.id, g), label: g })),
    })),
    { label: 'Other', options: [{ key: 'sampler', label: 'Sampler (your own URL)' }] },
  ];
}

/** Which option an instrument is. */
export function soundKey(instrument: Instrument, banks: Bank[]): string {
  if (instrument.kind === 'drum') return `drum:${instrument.voice}`;
  if (instrument.kind === 'synth') return `synth:${instrument.preset}`;
  const found = findSound(banks, instrument);
  return found ? bankKey(found.bank.id, found.sound.group) : 'sampler';
}

/** The instrument an option gives, and a name for a new track with it. */
export function soundFor(key: string, current: Instrument, banks: Bank[], forTrack: ForTrack = {}): { instrument: Instrument; name: string } {
  const [kind, a, ...rest] = key.split(':');
  if (kind === 'drum') return { instrument: { kind: 'drum', voice: a as never }, name: title(a!) };
  if (kind === 'synth') {
    // changing preset keeps a synth's own overrides
    const instrument: Instrument = current.kind === 'synth' ? { ...current, preset: a as never } : { kind: 'synth', preset: a as never };
    return { instrument, name: title(a!) };
  }
  if (kind === 'bank') {
    const group = rest.join(':');
    const bank = banks.find((b) => b.id === a);
    const sound = bank && soundsOf(bank, group, forTrack)[0];
    if (sound) return { instrument: sound.instrument, name: sound.label.split(' · ')[0]! };
  }
  return {
    instrument: current.kind === 'sampler' ? current : { kind: 'sampler', sample: '/samples/example.wav' },
    name: 'Sampler',
  };
}

/** C0 … C7, for the pitch a click writes. */
export const PEN_PITCHES = Array.from({ length: 85 }, (_, i) => i + 12);
