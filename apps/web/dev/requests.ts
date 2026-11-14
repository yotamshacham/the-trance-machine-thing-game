// Requests from the app to an agent: "make this bass darker", sent from a track, a section or the
// whole song. They wait in songs/local/.requests.json; an agent claims one (`pnpm song requests wait`),
// edits the linked song file, and finishes it with a reply (`pnpm song requests done <id> <reply>`).
// Pure functions here; reading and writing the file below them.

import { readFileSync, renameSync, writeFileSync } from 'node:fs';

export type RequestTarget =
  | { kind: 'track'; trackId: string; name: string }
  | { kind: 'section'; index: number; name: string }
  | { kind: 'song' };

export type RequestStatus = 'pending' | 'working' | 'done' | 'failed';

export interface Request {
  id: string;
  /** the songs/local file the request is about */
  file: string;
  target: RequestTarget;
  text: string;
  status: RequestStatus;
  /** ms since the epoch */
  at: number;
  reply?: string;
  doneAt?: number;
}

const KEEP = 50;

/** In songs/local/; the leading dot keeps it out of the songs list. */
export const REQUESTS_FILE = '.requests.json';

export function addRequest(list: Request[], ask: Pick<Request, 'file' | 'target' | 'text'>, at: number, id: string): Request[] {
  const text = ask.text.trim();
  if (!text) throw new Error('A request can not be empty.');
  return [...list, { id, ...ask, text, status: 'pending' as const, at }].slice(-KEEP);
}

/** The oldest waiting request, now being worked on. */
export function claimNext(list: Request[]): { list: Request[]; request?: Request } {
  const next = list.find((r) => r.status === 'pending');
  if (!next) return { list };
  const request = { ...next, status: 'working' as const };
  return { list: list.map((r) => (r === next ? request : r)), request };
}

export function finishRequest(list: Request[], id: string, status: 'done' | 'failed', reply: string, at: number): Request[] {
  if (!list.some((r) => r.id === id)) throw new Error(`There is no request "${id}".`);
  return list.map((r) => (r.id === id ? { ...r, status, reply, doneAt: at } : r));
}

export function readRequests(path: string): Request[] {
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as Request[];
  } catch {
    return [];
  }
}

/** Written whole and renamed into place, so a reader never sees half a file. */
export function writeRequests(path: string, list: Request[]): void {
  writeFileSync(`${path}.tmp`, JSON.stringify(list, null, 2) + '\n');
  renameSync(`${path}.tmp`, path);
}
