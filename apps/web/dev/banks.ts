// Builds a sample bank from a pack's folders on disk, by rules naming which folders hold what
// (dev/futurephonic.ts). Pure: the folder listing is passed in, so tests use made-up folders.

import type { SamplerInstrument } from '@ttm/song';
import type { Bank, BankSound } from '../src/bank.ts';

export type GroupKind =
  /** each file a hit, played as recorded */
  | 'one-shot'
  /** each folder one instrument, a file per note ("Chrome Bass A#.wav") */
  | 'multisample'
  /** each file a loop or long sound; "135 F# …" names give its tempo and key */
  | 'loop';

export interface GroupRule {
  group: string;
  kind: GroupKind;
  /** folders under the samples root; a trailing "/*" means each folder inside it */
  dirs: string[];
}

export interface BankDefinition {
  id: string;
  name: string;
  groups: GroupRule[];
}

export interface Listing {
  files: string[];
  dirs: string[];
}

/** What's in a folder under the samples root (nothing, if it isn't there). */
export type ListDir = (dir: string) => Listing;

const AUDIO = /\.(wav|aiff?|mp3|ogg|flac)$/i;
/** the URL prefix the dev server serves the samples root at */
export const URL_PREFIX = '/local-samples';

export function buildBank(def: BankDefinition, list: ListDir): Bank {
  const sounds: BankSound[] = [];
  for (const rule of def.groups) {
    for (const dir of rule.dirs.flatMap((d) => expand(d, list))) {
      const files = list(dir).files.filter((f) => AUDIO.test(f)).sort((a, b) => a.localeCompare(b));
      if (rule.kind === 'multisample') {
        const sample: Record<string, string> = {};
        for (const f of files) {
          const note = multisampleNote(f);
          if (note) sample[note] = url(dir, f);
        }
        if (Object.keys(sample).length) {
          sounds.push({ group: rule.group, label: dir.split('/').pop()!, instrument: { kind: 'sampler', sample, gate: true } });
        }
        continue;
      }
      for (const f of files) sounds.push(soundFor(rule, dir, f));
    }
  }
  return { id: def.id, name: def.name, sounds };
}

function expand(dir: string, list: ListDir): string[] {
  if (!dir.endsWith('/*')) return [dir];
  const parent = dir.slice(0, -2);
  return list(parent).dirs.sort((a, b) => a.localeCompare(b)).map((d) => `${parent}/${d}`);
}

const url = (dir: string, file: string) => `${URL_PREFIX}/${dir}/${file}`;

function soundFor(rule: GroupRule, dir: string, file: string): BankSound {
  const sample = url(dir, file);
  const { name, bpm, key } = parseSampleName(file);
  const label = [name, [bpm, key].filter(Boolean).join(' ')].filter(Boolean).join(' · ');
  if (rule.kind === 'one-shot') return { group: rule.group, label, instrument: { kind: 'sampler', sample } };
  const instrument: SamplerInstrument = { kind: 'sampler', sample, gate: true };
  if (key) instrument.root = `${key}3`;
  if (bpm) instrument.bpm = bpm;
  return { group: rule.group, label, instrument };
}

/**
 * A sample's name, tempo and key from its file name, in the two styles packs use:
 * "FP_FG 135 F# Echo Chamber.wav" and "133 - F - Wideboy.wav" ("X" for none).
 */
export function parseSampleName(file: string): { name: string; bpm?: number; key?: string } {
  const base = file.replace(AUDIO, '').replace(/^FP[A-Z_]*\s+/, '').trim();
  const dashed = /^(\d{2,3}|X)\s*-\s*([A-G]#?|X)\s*-\s*(.+)$/.exec(base);
  const spaced = /^(?:(\d{2,3})\s+)?(?:([A-G]#?|X)\s+)?(.+)$/.exec(base)!;
  const [, bpm, key, name] = dashed ?? spaced;
  return {
    name: name!.trim(),
    ...(bpm && bpm !== 'X' ? { bpm: Number(bpm) } : {}),
    ...(key && key !== 'X' ? { key } : {}),
  };
}

/**
 * The note a multisample file was recorded at. Bass packs name notes without an octave and
 * record them in octave 1 (C1–B1, measured); "C0"/"C1" mark the low and high C (C1, C2).
 */
export function multisampleNote(file: string): string | undefined {
  const m = /\s([A-G]#?)(\d)?\.[a-z0-9]+$/i.exec(file);
  if (!m) return undefined;
  const [, note, octave] = m;
  return `${note}${octave === undefined ? 1 : Number(octave) + 1}`;
}
