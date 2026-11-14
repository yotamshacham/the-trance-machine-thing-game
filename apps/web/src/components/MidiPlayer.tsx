import type { MidiPlayerState } from '../useMidiPlayer.ts';

interface Props {
  player: MidiPlayerState;
  onPlay(): void;
  onImport(file: File): void;
}

const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/** Listen to a MIDI file before importing it: play, scrub, mute channels. */
export function MidiPlayer({ player, onPlay, onImport }: Props) {
  const { midi, playing, position, muted } = player;
  if (!midi) return null;
  const { parts, duration } = midi.performance;
  return (
    <section className="midi-player" aria-label="MIDI player">
      <div className="midi-line">
        <button className={`play ${playing ? 'active' : ''}`} onClick={playing ? player.stop : onPlay} title="Play / stop the MIDI file">
          {playing ? '■' : '▶'}
        </button>
        <span className="midi-name" title={midi.file.name}>{midi.file.name}</span>
        <input
          className="midi-seek"
          type="range"
          min={0}
          max={duration}
          step={0.1}
          value={position}
          onChange={(e) => player.seek(Number(e.target.value))}
          aria-label="Position"
        />
        <span className="muted-text midi-clock">
          {clock(position)} / {clock(duration)}
        </span>
        <button onClick={() => onImport(midi.file)} title="Turn this file into a song: notes on the 16th grid, four-bar patterns">
          Import as song
        </button>
        <button className="icon" onClick={player.close} aria-label="Close the MIDI player">×</button>
      </div>
      <div className="midi-parts" role="group" aria-label="Channels: click to mute">
        {parts.map((p) => (
          <button
            key={p.channel}
            className={`midi-part ${muted.has(p.channel) ? '' : 'active'}`}
            onClick={() => player.toggleMute(p.channel)}
            aria-pressed={!muted.has(p.channel)}
            title={muted.has(p.channel) ? 'Muted: click to hear it' : 'Click to mute'}
          >
            {p.drums ? 'Drums (ch 10)' : p.name === `Channel ${p.channel + 1}` ? p.name : `${p.name} (ch ${p.channel + 1})`}
            <span className="muted-text"> {p.notes.length}</span>
          </button>
        ))}
        <span className="muted-text midi-hint">As the file plays, unquantized; square and triangle waves stand in for its sounds.</span>
      </div>
    </section>
  );
}
