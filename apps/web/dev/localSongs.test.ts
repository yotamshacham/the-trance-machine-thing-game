import { describe, expect, it } from 'vitest';
import { localSongFile } from './localSongs.ts';

describe('localSongFile', () => {
  it('takes a plain song file name', () => {
    expect(localSongFile('/contra-jungle.json')).toBe('contra-jungle.json');
    expect(localSongFile('contra-jungle.json?t=1')).toBe('contra-jungle.json');
  });

  it('refuses anything that could leave the folder or is not a song file', () => {
    for (const bad of ['/../package.json', '/a/b.json', '/notes.txt', '/.json', '/%2e%2e%2fx.json', '/Has Space.json']) {
      expect(localSongFile(bad)).toBeUndefined();
    }
  });
});
