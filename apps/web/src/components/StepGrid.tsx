import { STEPS_PER_BAR, type Pattern } from '@ttm/song';

interface Props {
  pattern: Pattern;
  drum: boolean;
  /** the step of this pattern sounding now, or -1 */
  playing: number;
  onStep(step: number): void;
}

/** A pattern's steps, a bar to a row, beats shaded. */
export function StepGrid({ pattern, drum, playing, onStep }: Props) {
  const byStep = new Map<number, Pattern['notes']>();
  const held = new Set<number>();
  for (const n of pattern.notes) {
    byStep.set(n.step, [...(byStep.get(n.step) ?? []), n]);
    for (let s = n.step + 1; s < n.step + (n.len ?? 1); s++) held.add(s);
  }
  const bars = Math.ceil(pattern.length / STEPS_PER_BAR);
  return (
    <div className="grid">
      {Array.from({ length: bars }, (_, bar) => (
        <div className="bar" key={bar}>
          {Array.from({ length: Math.min(STEPS_PER_BAR, pattern.length - bar * STEPS_PER_BAR) }, (_, i) => {
            const step = bar * STEPS_PER_BAR + i;
            const notes = byStep.get(step);
            const accent = notes?.some((n) => n.vel === 1);
            const label = drum || !notes ? '' : notes.map((n) => n.pitch ?? '•').join(' ');
            const classes = [
              'cell',
              Math.floor(i / 4) % 2 ? 'odd-beat' : '',
              notes ? 'on' : held.has(step) ? 'held' : '',
              accent ? 'accent' : '',
              notes?.some((n) => n.slide) ? 'slide' : '',
              step === playing ? 'now' : '',
            ];
            return (
              <button
                key={step}
                className={classes.filter(Boolean).join(' ')}
                onClick={() => onStep(step)}
                title={`Step ${step + 1}${label ? `: ${label}` : ''}`}
                aria-pressed={!!notes}
              >
                {label}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
