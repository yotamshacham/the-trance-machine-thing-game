import { noteName, toMidi, type Track } from '@ttm/song';
import { findSound, type Bank } from '../bank.ts';
import { PEN_PITCHES, isLoop, isMelodic, soundFor, soundGroups, soundKey, soundsOf } from '../instruments.ts';
import type { Action } from '../state.ts';
import type { Ask } from '../requests.ts';
import { AskClaude } from './AskClaude.tsx';
import { SoundSelect } from './SoundSelect.tsx';
import { StepGrid } from './StepGrid.tsx';

interface Props {
  track: Track;
  /** the pattern this track plays in the section being edited, if any */
  patternId: string | undefined;
  playing: number;
  solo: boolean;
  pen: string;
  banks: Bank[];
  dispatch(action: Action): void;
  onSolo(on: boolean): void;
  onPen(pitch: string): void;
  onPreview(pitch: number | null): void;
  /** play the track's sound once it has loaded (after it was changed) */
  onAudition(): void;
  /** send a request about this track to the agent (only with a linked song) */
  ask: Ask | undefined;
  /** folded: the controls fold to one line; the steps stay */
  folded: boolean;
  onFold(folded: boolean): void;
}

export function TrackRow({ track, patternId, playing, solo, pen, banks, dispatch, onSolo, onPen, onPreview, onAudition, ask, folded, onFold }: Props) {
  const pattern = patternId ? track.patterns[patternId] : undefined;
  const drum = track.instrument.kind === 'drum';
  const update = (change: Partial<Omit<Track, 'id' | 'patterns'>>) => dispatch({ type: 'update-track', trackId: track.id, change });
  const setInstrument = (instrument: Track['instrument']) => {
    update({ instrument });
    onAudition();
  };
  // a bank sound: step through the others in its group
  const found = findSound(banks, track.instrument);
  // a melody track isn't offered loops: they play their own riff, not the notes
  const forTrack = { melodic: isMelodic(track) };
  const loopOnMelody = forTrack.melodic && isLoop(track.instrument);
  const siblings = found ? soundsOf(found.bank, found.sound.group, forTrack) : [];
  const index = found ? siblings.indexOf(found.sound) : -1;
  const step = (by: number) => {
    if (!siblings.length) return;
    const from = index < 0 ? (by > 0 ? -1 : 0) : index;
    setInstrument(siblings[(from + by + siblings.length) % siblings.length]!.instrument);
  };

  const soundName =
    found?.sound.label ??
    (track.instrument.kind === 'drum' ? track.instrument.voice : track.instrument.kind === 'synth' ? track.instrument.preset : 'sampler');

  return (
    <div className={`track ${track.mute ? 'muted' : ''} ${folded ? 'folded' : ''}`}>
      <div className="track-head">
        <div className="track-line">
          <button
            className="icon fold"
            onClick={() => onFold(!folded)}
            aria-expanded={!folded}
            title={folded ? 'Show this track’s controls' : 'Fold this track’s controls'}
          >
            {folded ? '▸' : '▾'}
          </button>
          <button className={`toggle ${track.mute ? 'active' : ''}`} onClick={() => update({ mute: !track.mute })} title="Mute">
            M
          </button>
          <button className={`toggle solo ${solo ? 'active' : ''}`} onClick={() => onSolo(!solo)} title="Solo">
            S
          </button>
          <input className="track-name" value={track.name} onChange={(e) => update({ name: e.target.value })} aria-label="Track name" />
          {folded && <span className="track-sound" title={soundName}>{soundName}</span>}
          <button className="icon" onClick={() => dispatch({ type: 'remove-track', trackId: track.id })} title="Remove track (undo brings it back)">
            ×
          </button>
        </div>
        <div className="track-line">
          <SoundSelect
            groups={soundGroups(banks, forTrack)}
            value={soundKey(track.instrument, banks)}
            onChange={(key) => setInstrument(soundFor(key, track.instrument, banks, forTrack).instrument)}
          />
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
        {found && (
          <div className="track-line">
            <button onClick={() => step(-1)} title="Previous sound">◀</button>
            <select
              value={index}
              onChange={(e) => setInstrument(siblings[Number(e.target.value)]!.instrument)}
              aria-label={found.sound.group}
              title={`${found.bank.name} · ${found.sound.group} · ${index + 1} of ${siblings.length}`}
            >
              {index < 0 && <option value={-1} disabled>{found.sound.label}</option>}
              {siblings.map((s, i) => (
                <option key={i} value={i}>{s.label}</option>
              ))}
            </select>
            <button onClick={() => step(1)} title="Next sound">▶</button>
          </div>
        )}
        {loopOnMelody && (
          <div className="track-line loop-warning">
            This is a loop: it plays its own riff, not these notes. Pick a one-shot (Tonal hits, a synth) for a melody.
          </div>
        )}
        {track.instrument.kind === 'sampler' && !found && typeof track.instrument.sample !== 'string' && (
          <div className="track-line muted-text">
            Multisample, {Object.keys(track.instrument.sample).length} notes (not found in a bank on this computer)
          </div>
        )}
        {track.instrument.kind === 'sampler' && !found && typeof track.instrument.sample === 'string' && (
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
        <div className="track-line fx-line">
          {(
            [
              ['delay', 'Delay', 'Send to the song’s delay (echo timed to the tempo)'],
              ['reverb', 'Reverb', 'Send to the song’s reverb'],
              ['duck', 'Duck', 'Dip each time the kick hits (sidechain): bass and pads, mostly'],
            ] as const
          ).map(([key, label, title]) => (
            <label key={key} className="fx" title={`${title}: ${Math.round((track[key] ?? 0) * 100)}%`}>
              <span>{label}</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={track[key] ?? 0}
                onChange={(e) => update({ [key]: Number(e.target.value) || undefined })}
              />
            </label>
          ))}
        </div>
        {ask && (
          <div className="track-line">
            <AskClaude ask={ask} target={{ kind: 'track', trackId: track.id, name: track.name }} about={track.name} />
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
