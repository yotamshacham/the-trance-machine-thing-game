import { useEffect, useState } from 'react';
import type { Ask, RequestTarget } from '../requests.ts';

interface Props {
  ask: Ask | undefined;
  target: RequestTarget;
  /** what the request is about, for the placeholder */
  about: string;
  /** the button's text: say what it asks about when that isn't obvious from where it sits */
  label?: string;
  /** a small ✦ that fits in a line of other controls; its form opens on a line of its own */
  compact?: boolean;
}

const RECENT_MS = 60_000;

/** A button that opens a one-line request to the agent about a track, a section or the song. */
export function AskClaude({ ask, target, about, label = 'Ask', compact = false }: Props) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [error, setError] = useState<string>();
  const latest = ask?.latest(target);
  // a finished request shows for a while, then the button is just a button again
  const [, tick] = useState(0);
  useEffect(() => {
    if (!latest?.doneAt) return;
    const left = latest.doneAt + RECENT_MS - Date.now();
    if (left <= 0) return;
    const t = setTimeout(() => tick((n) => n + 1), left);
    return () => clearTimeout(t);
  }, [latest?.doneAt]);
  if (!ask) return null;
  const busy = latest?.status === 'pending' || latest?.status === 'working';
  const recent = latest?.doneAt !== undefined && Date.now() - latest.doneAt < RECENT_MS;
  const send = async () => {
    try {
      await ask.send(target, text);
      setText('');
      setOpen(false);
      setError(undefined);
    } catch (e) {
      setError((e as Error).message);
    }
  };
  if (!open) {
    if (busy) {
      return (
        <span className="ask-status working" title={`${latest!.text}: ${latest!.status === 'pending' ? 'waiting for Claude' : 'Claude is working on it'}`}>
          ✦ {compact ? '…' : latest!.status === 'pending' ? 'waiting for Claude…' : 'Claude is working…'}
        </span>
      );
    }
    return (
      <span className="ask-line">
        <button className={`ask-button ${compact ? 'compact' : ''}`} onClick={() => setOpen(true)} title={`Ask Claude to change ${about}`} aria-label={`Ask Claude about ${about}`}>
          ✦{compact ? '' : ` ${label}`}
        </button>
        {recent && (
          <span className={`ask-status ${latest!.status}`} title={latest!.reply}>
            {latest!.status === 'done' ? '✓' : '✗'}
            {compact ? '' : ` ${latest!.status === 'done' ? 'done' : "couldn't"}: ${latest!.reply}`}
          </span>
        )}
      </span>
    );
  }
  return (
    <form
      className={`ask-form ${compact ? 'compact' : ''}`}
      onSubmit={(e) => {
        e.preventDefault();
        void send();
      }}
    >
      <input
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
        placeholder={`What should change in ${about}?`}
        aria-label={`Request about ${about}`}
      />
      <button type="submit" className="active" disabled={!text.trim()}>Send</button>
      <button type="button" className="icon" onClick={() => setOpen(false)} aria-label="Cancel">×</button>
      {error && <span className="ask-error">{error}</span>}
    </form>
  );
}
