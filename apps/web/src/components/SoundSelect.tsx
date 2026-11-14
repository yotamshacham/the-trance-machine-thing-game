import type { SoundGroup } from '../instruments.ts';

interface Props {
  groups: SoundGroup[];
  value: string;
  placeholder?: string;
  onChange(key: string): void;
}

export function SoundSelect({ groups, value, placeholder, onChange }: Props) {
  return (
    <select value={value} onChange={(e) => e.target.value && onChange(e.target.value)} aria-label={placeholder ?? 'Sound'}>
      {placeholder && <option value="">{placeholder}</option>}
      {groups.map((g) => (
        <optgroup key={g.label} label={g.label}>
          {g.options.map((o) => (
            <option key={o.key} value={o.key}>{o.label}</option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
