import { useState } from 'react';
import type { Ask, RequestTarget } from '../requests.ts';

interface Props {
  ask: Ask | undefined;
  target: RequestTarget;
  /** what the request is about, for the placeholder */
  about: string;
}

/** A button that opens a one-line request to the agent about a track, a section or the song. */
export function AskClaude({ ask, target, about }: Props) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [error, setError] = useState<string>();
  if (!ask) return null;
  const send = async () => {
    try {
      await ask(target, text);
      setText('');
      setOpen(false);
      setError(undefined);
    } catch (e) {
      setError((e as Error).message);
    }
  };
  if (!open) {
    return (
      <button className="ask-button" onClick={() => setOpen(true)} title={`Ask Claude to change ${about}`}>
        ✦ Ask
      </button>
    );
  }
  return (
    <form
      className="ask-form"
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
