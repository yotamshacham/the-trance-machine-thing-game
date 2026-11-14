import type { ReactNode } from 'react';

interface Props {
  name: string;
  count: number;
  folded: boolean;
  onFold(folded: boolean): void;
  children: ReactNode;
}

/** A part of the mix (kick & bass, drums, leads …): a header that folds its tracks away. */
export function TrackGroup({ name, count, folded, onFold, children }: Props) {
  return (
    <section className={`track-group ${folded ? 'folded' : ''}`}>
      <button className="group-head" onClick={() => onFold(!folded)} aria-expanded={!folded}>
        <span className="fold">{folded ? '▸' : '▾'}</span>
        <span className="group-name">{name}</span>
        <span className="muted-text">
          {count} track{count === 1 ? '' : 's'}
        </span>
      </button>
      {!folded && <div className="group-tracks">{children}</div>}
    </section>
  );
}
