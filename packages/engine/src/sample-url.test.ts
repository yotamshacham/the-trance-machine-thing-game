import { describe, expect, it } from 'vitest';
import { sampleUrl } from './sample-url.ts';

describe('sampleUrl', () => {
  it('escapes spaces and # in paths, segment by segment', () => {
    expect(sampleUrl('/local-samples/fp/Basses/Chrome Bass A#.wav')).toBe('/local-samples/fp/Basses/Chrome%20Bass%20A%23.wav');
  });

  it('does not escape twice', () => {
    expect(sampleUrl('/a/Chrome%20Bass.wav')).toBe('/a/Chrome%20Bass.wav');
  });

  it('leaves full URLs alone', () => {
    expect(sampleUrl('https://example.com/a b.wav')).toBe('https://example.com/a b.wav');
  });
});
