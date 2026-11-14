// The mix: what each track sends to the song's shared effects, and the effects' settings, with
// the defaults filled in. What the engine builds its delay, reverb and ducking from.

import type { Song, Track } from './schema.ts';

export interface SongEffects {
  /** echo time in steps (3 = a dotted 8th), and how much each echo repeats */
  delay: { steps: number; feedback: number };
  /** seconds */
  reverb: { decay: number };
  /** the track whose hits make others dip (if the song has it), and seconds to come back up */
  duck: { by: string; release: number };
}

export function effectsOf(song: Song): SongEffects {
  const e = song.effects ?? {};
  return {
    delay: { steps: e.delay?.steps ?? 3, feedback: e.delay?.feedback ?? 0.35 },
    reverb: { decay: e.reverb?.decay ?? 2.5 },
    duck: { by: e.duck?.by ?? 'kick', release: e.duck?.release ?? 0.18 },
  };
}

export interface TrackMix {
  /** sends, 0–1 */
  delay: number;
  reverb: number;
  /** how far the track dips on each ducking hit, 0–1 */
  duck: number;
  /** Hz, if filtered */
  lowpass: number | undefined;
  highpass: number | undefined;
}

export const mixOf = (track: Track): TrackMix => ({
  delay: track.delay ?? 0,
  reverb: track.reverb ?? 0,
  duck: track.duck ?? 0,
  lowpass: track.lowpass,
  highpass: track.highpass,
});
