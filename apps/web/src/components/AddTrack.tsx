import type { Bank } from '../bank.ts';
import { soundFor, soundGroups } from '../instruments.ts';
import type { Action } from '../state.ts';
import { SoundSelect } from './SoundSelect.tsx';

export function AddTrack({ banks, dispatch }: { banks: Bank[]; dispatch(action: Action): void }) {
  return (
    <div className="add-track">
      <SoundSelect
        groups={soundGroups(banks)}
        value=""
        placeholder="+ Add a track…"
        onChange={(key) => {
          const { instrument, name } = soundFor(key, { kind: 'drum', voice: 'kick' }, banks);
          dispatch({ type: 'add-track', name, instrument });
        }}
      />
    </div>
  );
}
