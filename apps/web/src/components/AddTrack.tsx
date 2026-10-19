import { DRUM_CHOICES, SYNTH_CHOICES, instrumentForKey } from '../instruments.ts';
import type { Action } from '../state.ts';

export function AddTrack({ dispatch }: { dispatch(action: Action): void }) {
  return (
    <div className="add-track">
      <select
        value=""
        onChange={(e) => {
          const key = e.target.value;
          if (!key) return;
          const choice = [...DRUM_CHOICES, ...SYNTH_CHOICES].find((c) => c.key === key);
          const instrument = instrumentForKey(key, { kind: 'drum', voice: 'kick' });
          dispatch({ type: 'add-track', name: choice?.label ?? 'Sampler', instrument });
        }}
        aria-label="Add a track"
      >
        <option value="">+ Add a track…</option>
        <optgroup label="Drum machine">
          {DRUM_CHOICES.map((c) => (
            <option key={c.key} value={c.key}>{c.label}</option>
          ))}
        </optgroup>
        <optgroup label="Synth">
          {SYNTH_CHOICES.map((c) => (
            <option key={c.key} value={c.key}>{c.label}</option>
          ))}
        </optgroup>
        <option value="sampler">Sampler</option>
      </select>
    </div>
  );
}
