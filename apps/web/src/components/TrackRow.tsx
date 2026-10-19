import { noteName, toMidi, type Track } from '@ttm/song';
import { DRUM_CHOICES, PEN_PITCHES, SYNTH_CHOICES, choiceKey, instrumentForKey } from '../instruments.ts';
import type { Action } from '../state.ts';
import { StepGrid } from './StepGrid.tsx';

interface Props {
  track: Track;
  /** the pattern this track plays in the section being edited, if any */
  patternId: string | undefined;
  playing: number;
  solo: boolean;
  pen: string;
  dispatch(action: Action): void;
  onSolo(on: boolean): void;
  onPen(pitch: string): void;
  onPreview(pitch: number | null): void;
}

export function TrackRow({ track, patternId, playing, solo, pen, dispatch, onSolo, onPen, onPreview }: Props) {
  const pattern = patternId ? track.patterns[patternId] : undefined;
  const drum = track.instrument.kind === 'drum';
  const update = (change: Partial<Omit<Track, 'id' | 'patterns'>>) => dispatch({ type: 'update-track', trackId: track.id, change });

  return (
    <div className={`track ${track.mute ? 'muted' : ''}`}>
      <div className="track-head">
        <div className="track-line">
          <button className={`toggle ${track.mute ? 'active' : ''}`} onClick={() => update({ mute: !track.mute })} title="Mute">
            M
          </button>
          <button className={`toggle solo ${solo ? 'active' : ''}`} onClick={() => onSolo(!solo)} title="Solo">
            S
          </button>
          <input className="track-name" value={track.name} onChange={(e) => update({ name: e.target.value })} aria-label="Track name" />
          <button className="icon" onClick={() => dispatch({ type: 'remove-track', trackId: track.id })} title="Remove track (undo brings it back)">
            ×
          </button>
        </div>
        <div className="track-line">
          <select
            value={choiceKey(track.instrument)}
            onChange={(e) => update({ instrument: instrumentForKey(e.target.value, track.instrument) })}
            aria-label="Sound"
          >
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
          <input
            type="range"
            min={-30}
            max={6}
            step={0.5}
            value={track.gain ?? 0}
            onChange={(e) => update({ gain: Number(e.target.value) })}
            title={`Volume ${track.gain ?? 0} dB`}
            aria-label="Volume"
          />
        </div>
        {track.instrument.kind === 'sampler' && (
          <div className="track-line">
            <input
              className="sample-url"
              value={track.instrument.sample}
              onChange={(e) => update({ instrument: { ...(track.instrument as Extract<Track['instrument'], { kind: 'sampler' }>), sample: e.target.value } })}
              aria-label="Sample URL"
              placeholder="/samples/….wav"
            />
          </div>
        )}
        <div className="track-line">
          <select
            value={patternId ?? ''}
            onChange={(e) => {
              const v = e.target.value;
              if (v === '+new') dispatch({ type: 'new-pattern', trackId: track.id });
              else if (v === '+copy') dispatch({ type: 'new-pattern', trackId: track.id, copyOf: patternId });
              else dispatch({ type: 'set-pattern', trackId: track.id, patternId: v || null });
            }}
            aria-label="Pattern"
          >
            <option value="">— silent —</option>
            {Object.keys(track.patterns).map((id) => (
              <option key={id} value={id}>Pattern {id}</option>
            ))}
            <option value="+new">+ new pattern</option>
            {patternId && <option value="+copy">+ copy of {patternId}</option>}
          </select>
          {!drum && (
            <select value={pen} onChange={(e) => onPen(e.target.value)} aria-label="Note to write" title="Clicking a step writes this note (or moves the note there to it)">
              {PEN_PITCHES.map((m) => (
                <option key={m} value={noteName(m)}>{noteName(m)}</option>
              ))}
            </select>
          )}
        </div>
        {!drum && patternId && (
          <div className="track-line">
            <span className="muted-text">Transpose</span>
            {[-12, -1, 1, 12].map((semitones) => (
              <button
                key={semitones}
                onClick={() => dispatch({ type: 'transpose', trackId: track.id, patternId, semitones })}
                title={`Move the whole pattern ${Math.abs(semitones) === 12 ? 'an octave' : 'a semitone'} ${semitones > 0 ? 'up' : 'down'}`}
              >
                {semitones === -12 ? '−oct' : semitones === -1 ? '−1' : semitones === 1 ? '+1' : '+oct'}
              </button>
            ))}
          </div>
        )}
      </div>
      {pattern ? (
        <StepGrid
          pattern={pattern}
          drum={drum}
          playing={playing}
          onStep={(step) => {
            const at = pattern.notes.filter((n) => n.step === step);
            const removing = at.length > 0 && (drum || at.some((n) => n.pitch === pen));
            dispatch({ type: 'toggle-step', trackId: track.id, patternId: patternId!, step, pitch: drum ? undefined : pen });
            if (!removing) onPreview(drum ? null : toMidi(pen));
          }}
        />
      ) : (
        <div className="silent">Silent in this section — pick a pattern to play.</div>
      )}
    </div>
  );
}
