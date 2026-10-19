// Sample banks: sounds from sample packs on this computer, served by the dev server
// (apps/web/dev/localSamples.ts). Packs we can't redistribute never reach the deployed site,
// so there the list is simply empty.

import type { Instrument, SamplerInstrument } from '@ttm/song';

export interface BankSound {
  group: string;
  label: string;
  instrument: SamplerInstrument;
}

export interface Bank {
  id: string;
  name: string;
  sounds: BankSound[];
}

export async function loadBanks(): Promise<Bank[]> {
  try {
    const response = await fetch('/local-samples/banks.json');
    if (!response.ok || !response.headers.get('content-type')?.includes('json')) return [];
    return ((await response.json()) as { banks: Bank[] }).banks;
  } catch {
    return [];
  }
}

/** The bank sound a track's instrument is, matched by its sample files. */
export function findSound(banks: Bank[], instrument: Instrument): { bank: Bank; sound: BankSound } | undefined {
  if (instrument.kind !== 'sampler') return undefined;
  const sample = JSON.stringify(instrument.sample);
  for (const bank of banks) {
    const sound = bank.sounds.find((s) => JSON.stringify(s.instrument.sample) === sample);
    if (sound) return { bank, sound };
  }
  return undefined;
}

export const groupsOf = (bank: Bank): string[] => [...new Set(bank.sounds.map((s) => s.group))];
