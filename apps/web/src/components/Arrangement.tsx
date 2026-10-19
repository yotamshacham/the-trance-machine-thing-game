import type { Song } from '@ttm/song';
import type { Action } from '../state.ts';

interface Props {
  song: Song;
  selected: number;
  /** the section sounding now, or -1 */
  playingSection: number;
  dispatch(action: Action): void;
}

/** The song's sections in order: click one to edit it. */
export function Arrangement({ song, selected, playingSection, dispatch }: Props) {
  const section = song.arrangement[selected]!;
  const totalBars = song.arrangement.reduce((a, s) => a + s.bars, 0);
  return (
    <section className="arrangement">
      <div className="sections">
        {song.arrangement.map((s, i) => (
          <button
            key={i}
            className={`section-chip ${i === selected ? 'selected' : ''} ${i === playingSection ? 'now' : ''}`}
            style={{ flexGrow: s.bars }}
            onClick={() => dispatch({ type: 'select-section', index: i })}
            title={`${s.name}: ${s.bars} bars`}
          >
            <span className="chip-name">{s.name}</span>
            <span className="chip-bars">{s.bars}</span>
          </button>
        ))}
      </div>
      <div className="section-edit">
        <label>
          Section
          <input value={section.name} onChange={(e) => dispatch({ type: 'update-section', change: { name: e.target.value } })} />
        </label>
        <label>
          Bars
          <input
            type="number"
            min={1}
            max={512}
            value={section.bars}
            onChange={(e) => {
              const bars = Math.round(Number(e.target.value));
              if (bars >= 1 && bars <= 512) dispatch({ type: 'update-section', change: { bars } });
            }}
          />
        </label>
        <button onClick={() => dispatch({ type: 'move-section', by: -1 })} disabled={selected === 0} title="Move earlier">◀</button>
        <button onClick={() => dispatch({ type: 'move-section', by: 1 })} disabled={selected === song.arrangement.length - 1} title="Move later">▶</button>
        <button onClick={() => dispatch({ type: 'add-section' })} title="Add a copy of this section after it">+ Duplicate</button>
        <button onClick={() => dispatch({ type: 'remove-section' })} disabled={song.arrangement.length === 1}>Remove</button>
        <span className="muted-text">{totalBars} bars in all</span>
      </div>
    </section>
  );
}
