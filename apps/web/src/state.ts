// The editor's state: the song, the section being edited, and undo/redo over every edit.

import {
  addPattern,
  addSection,
  addTrack,
  moveSection,
  removeSection,
  removeTrack,
  setSectionPattern,
  toggleStep,
  transposePattern,
  updateSection,
  updateTrack,
  type Instrument,
  type Section,
  type Song,
  type Track,
} from '@ttm/song';

export interface EditorState {
  song: Song;
  /** index of the section being edited */
  section: number;
  past: Song[];
  future: Song[];
  /** what the last edit changed, so a run of the same change (a slider dragged, a name typed) undoes at once */
  lastChange?: string;
}

export type Action =
  | { type: 'load'; song: Song }
  | { type: 'select-section'; index: number }
  | { type: 'set-bpm'; bpm: number }
  | { type: 'set-title'; title: string }
  | { type: 'toggle-step'; trackId: string; patternId: string; step: number; pitch?: string }
  | { type: 'transpose'; trackId: string; patternId: string; semitones: number }
  | { type: 'set-pattern'; trackId: string; patternId: string | null }
  | { type: 'new-pattern'; trackId: string; copyOf?: string }
  | { type: 'add-track'; name: string; instrument: Instrument }
  | { type: 'remove-track'; trackId: string }
  | { type: 'update-track'; trackId: string; change: Partial<Omit<Track, 'id' | 'patterns'>> }
  | { type: 'add-section' }
  | { type: 'remove-section' }
  | { type: 'move-section'; by: -1 | 1 }
  | { type: 'update-section'; change: Partial<Omit<Section, 'play'>> }
  | { type: 'undo' }
  | { type: 'redo' };

const HISTORY = 200;

export const initialState = (song: Song): EditorState => ({ song, section: 0, past: [], future: [] });

export function reducer(state: EditorState, action: Action): EditorState {
  const { song, section } = state;
  const edit = (next: Song, nextSection = section, change?: string): EditorState => {
    if (next === song) return state;
    const merge = change !== undefined && change === state.lastChange && state.past.length > 0;
    return {
      song: next,
      section: Math.min(nextSection, next.arrangement.length - 1),
      past: merge ? state.past : [...state.past.slice(-HISTORY + 1), song],
      future: [],
      lastChange: change,
    };
  };

  switch (action.type) {
    case 'load':
      return edit(action.song, 0);
    case 'select-section':
      return { ...state, section: Math.max(0, Math.min(action.index, song.arrangement.length - 1)) };
    case 'set-bpm':
      return edit({ ...song, bpm: Math.max(40, Math.min(300, action.bpm)) }, section, 'bpm');
    case 'set-title':
      return edit({ ...song, title: action.title }, section, 'title');
    case 'toggle-step':
      return edit(toggleStep(song, action.trackId, action.patternId, action.step, action.pitch));
    case 'transpose':
      return edit(transposePattern(song, action.trackId, action.patternId, action.semitones));
    case 'set-pattern':
      return edit(setSectionPattern(song, section, action.trackId, action.patternId));
    case 'new-pattern': {
      const added = addPattern(song, action.trackId, action.copyOf);
      return edit(setSectionPattern(added.song, section, action.trackId, added.patternId));
    }
    case 'add-track': {
      const added = addTrack(song, action.name, action.instrument);
      return edit(setSectionPattern(added.song, section, added.trackId, 'a'));
    }
    case 'remove-track':
      return edit(removeTrack(song, action.trackId));
    case 'update-track':
      return edit(updateTrack(song, action.trackId, action.change), section, `track:${action.trackId}:${Object.keys(action.change)}`);
    case 'add-section':
      return edit(addSection(song, section), section + 1);
    case 'remove-section':
      return edit(removeSection(song, section), Math.max(0, section - 1));
    case 'move-section': {
      const to = section + action.by;
      if (to < 0 || to >= song.arrangement.length) return state;
      return edit(moveSection(song, section, to), to);
    }
    case 'update-section':
      return edit(updateSection(song, section, action.change), section, `section:${section}:${Object.keys(action.change)}`);
    case 'undo': {
      const previous = state.past.at(-1);
      if (!previous) return state;
      return {
        song: previous,
        section: Math.min(section, previous.arrangement.length - 1),
        past: state.past.slice(0, -1),
        future: [song, ...state.future],
      };
    }
    case 'redo': {
      const [next, ...future] = state.future;
      if (!next) return state;
      return { song: next, section: Math.min(section, next.arrangement.length - 1), past: [...state.past, song], future };
    }
  }
}
