import { useState } from 'react';
import type { Request } from '../requests.ts';

const STATUS: Record<Request['status'], string> = { pending: 'waiting', working: 'working…', done: 'done', failed: "couldn't" };

const where = (r: Request) => (r.target.kind === 'track' ? r.target.name : r.target.kind === 'section' ? `section “${r.target.name}”` : 'song');

/** The latest requests to the agent and how each went. */
export function Requests({ requests }: { requests: Request[] }) {
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const shown = requests.filter((r) => !hidden.has(r.id)).slice(-4);
  if (!shown.length) return null;
  return (
    <section className="requests" aria-label="Requests to Claude" aria-live="polite">
      {shown.map((r) => (
        <div key={r.id} className={`request ${r.status}`}>
          <span className="request-status">{STATUS[r.status]}</span>
          <span className="request-text">
            <b>{where(r)}:</b> {r.text}
            {r.reply && <span className="request-reply"> → {r.reply}</span>}
          </span>
          {(r.status === 'done' || r.status === 'failed') && (
            <button className="icon" onClick={() => setHidden((h) => new Set(h).add(r.id))} aria-label="Dismiss">×</button>
          )}
        </div>
      ))}
    </section>
  );
}
