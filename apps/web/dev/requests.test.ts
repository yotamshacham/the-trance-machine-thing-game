import { describe, expect, it } from 'vitest';
import { addRequest, claimNext, finishRequest, type Request } from './requests.ts';

const ask = (list: Request[], text: string, at: number) =>
  addRequest(list, { file: 'song.json', target: { kind: 'track', trackId: 'bass', name: 'Bass' }, text }, at, `r${at}`);

describe('requests to an agent', () => {
  it('a new request waits', () => {
    expect(ask([], 'darker bass', 1)).toEqual([
      { id: 'r1', file: 'song.json', target: { kind: 'track', trackId: 'bass', name: 'Bass' }, text: 'darker bass', status: 'pending', at: 1 },
    ]);
  });

  it('refuses an empty request', () => {
    expect(() => ask([], '   ', 1)).toThrow(/empty/);
  });

  it('the agent claims the oldest waiting one, which is then being worked on', () => {
    const list = ask(ask([], 'first', 1), 'second', 2);
    const { list: after, request } = claimNext(list);
    expect(request?.text).toBe('first');
    expect(after.map((r) => r.status)).toEqual(['working', 'pending']);
    expect(claimNext(after).request?.text).toBe('second');
  });

  it('nothing to claim when nothing waits', () => {
    expect(claimNext([]).request).toBeUndefined();
  });

  it('finishing records the reply', () => {
    const { list } = claimNext(ask([], 'first', 1));
    expect(finishRequest(list, 'r1', 'done', 'Swapped to Earth Bass', 5)[0]).toMatchObject({ status: 'done', reply: 'Swapped to Earth Bass', doneAt: 5 });
  });

  it('finishing an unknown request says so', () => {
    expect(() => finishRequest([], 'nope', 'done', '', 1)).toThrow(/no request "nope"/);
  });

  it('keeps the last 50', () => {
    let list: Request[] = [];
    for (let i = 0; i < 60; i++) list = ask(list, `n${i}`, i);
    expect(list).toHaveLength(50);
    expect(list[0]!.text).toBe('n10');
  });
});
