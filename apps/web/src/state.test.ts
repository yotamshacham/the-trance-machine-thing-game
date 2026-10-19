import { emptySong } from '@ttm/song';
import { describe, expect, it } from 'vitest';
import { initialState, reducer, type Action, type EditorState } from './state.ts';

const run = (state: EditorState, ...actions: Action[]) => actions.reduce(reducer, state);
const start = () => run(initialState(emptySong()), { type: 'add-track', name: 'Kick', instrument: { kind: 'drum', voice: 'kick' } });

describe('editor state', () => {
  it('a new track plays its first pattern in the section being edited', () => {
    expect(start().song.arrangement[0]!.play).toEqual({ kick: 'a' });
  });

  it('undoes and redoes every edit', () => {
    const s = run(start(), { type: 'toggle-step', trackId: 'kick', patternId: 'a', step: 0 });
    expect(s.song.tracks[0]!.patterns.a!.notes).toHaveLength(1);
    const undone = reducer(s, { type: 'undo' });
    expect(undone.song.tracks[0]!.patterns.a!.notes).toHaveLength(0);
    expect(reducer(undone, { type: 'redo' }).song).toEqual(s.song);
    expect(run(undone, { type: 'undo' }, { type: 'undo' }).song.tracks).toEqual([]);
  });

  it('selecting a section is not an edit', () => {
    const s = run(start(), { type: 'add-section' }, { type: 'select-section', index: 0 });
    expect(s.section).toBe(0);
    expect(reducer(s, { type: 'undo' }).song.arrangement).toHaveLength(1);
  });

  it('repitches a note in place', () => {
    const s = run(
      initialState(emptySong()),
      { type: 'add-track', name: 'Bass', instrument: { kind: 'synth', preset: 'rolling-bass' } },
      { type: 'toggle-step', trackId: 'bass', patternId: 'a', step: 1, pitch: 'F#1' },
      { type: 'toggle-step', trackId: 'bass', patternId: 'a', step: 1, pitch: 'A1' },
    );
    expect(s.song.tracks[0]!.patterns.a!.notes).toEqual([{ step: 1, pitch: 'A1' }]);
  });

  it('new and copied patterns go straight into the section', () => {
    const s = run(start(), { type: 'toggle-step', trackId: 'kick', patternId: 'a', step: 0 }, { type: 'new-pattern', trackId: 'kick', copyOf: 'a' });
    expect(s.song.arrangement[0]!.play.kick).toBe('b');
    expect(s.song.tracks[0]!.patterns.b!.notes).toEqual([{ step: 0 }]);
  });

  it('keeps the selection on the moved, added or removed section', () => {
    let s = run(start(), { type: 'add-section' });
    expect(s.section).toBe(1);
    s = run(s, { type: 'move-section', by: -1 });
    expect(s.section).toBe(0);
    s = run(s, { type: 'move-section', by: -1 });
    expect(s.section).toBe(0);
    s = run(s, { type: 'select-section', index: 1 }, { type: 'remove-section' });
    expect(s.section).toBe(0);
    expect(s.song.arrangement).toHaveLength(1);
  });

  it('undoes a run of the same change at once', () => {
    let s = start();
    for (const gain of [-1, -2, -3]) s = reducer(s, { type: 'update-track', trackId: 'kick', change: { gain } });
    s = reducer(s, { type: 'update-track', trackId: 'kick', change: { name: 'Big kick' } });
    expect(reducer(s, { type: 'undo' }).song.tracks[0]).toMatchObject({ gain: -3, name: 'Kick' });
    expect(run(s, { type: 'undo' }, { type: 'undo' }).song.tracks[0]!.gain).toBeUndefined();
  });

  it('keeps bpm in range', () => {
    expect(reducer(start(), { type: 'set-bpm', bpm: 9999 }).song.bpm).toBe(300);
  });
});
