// Requests to an agent, through the dev server (apps/web/dev/requests.ts): sent from the app,
// picked up by an agent watching songs/local, finished with a reply.

import { useEffect, useState } from 'react';
import type { Request, RequestTarget } from '../dev/requests.ts';

export type { Request, RequestTarget };

async function list(): Promise<Request[]> {
  try {
    const response = await fetch('/local-songs/requests');
    if (!response.ok) return [];
    return ((await response.json()) as { requests: Request[] }).requests;
  } catch {
    return [];
  }
}

/** The requests about `file`, kept up to date; and how to send one. */
export function useRequests(file: string | undefined) {
  const [requests, setRequests] = useState<Request[]>([]);
  useEffect(() => {
    const refresh = () => void list().then(setRequests);
    refresh();
    const hot = import.meta.hot;
    hot?.on('local-requests:changed', refresh);
    return () => hot?.off('local-requests:changed', refresh);
  }, []);
  return {
    requests: requests.filter((r) => r.file === file),
    /** undefined when there's no linked file to ask about */
    ask: file
      ? {
          async send(target: RequestTarget, text: string) {
            const response = await fetch('/local-songs/requests', { method: 'POST', body: JSON.stringify({ file, target, text }) });
            if (!response.ok) throw new Error(((await response.json()) as { error: string }).error);
            setRequests(await list());
          },
          latest: (target: RequestTarget) => requests.findLast((r) => r.file === file && sameTarget(r.target, target)),
        }
      : undefined,
  };
}

export interface Ask {
  send(target: RequestTarget, text: string): Promise<void>;
  /** the last request about this target, to show how it's going */
  latest(target: RequestTarget): Request | undefined;
}

const sameTarget = (a: RequestTarget, b: RequestTarget) =>
  a.kind === b.kind &&
  (a.kind === 'song' || (a.kind === 'track' && b.kind === 'track' && a.trackId === b.trackId) || (a.kind === 'section' && b.kind === 'section' && a.index === b.index));
