import { useRef } from 'react';

interface Props {
  /** px */
  value: number;
  min: number;
  max: number;
  onChange(px: number): void;
  /** called once a drag ends, to keep the width */
  onDone(px: number): void;
}

/** A vertical divider between the tracks' controls and their grids: drag it, or focus it and use ← →. */
export function Splitter({ value, min, max, onChange, onDone }: Props) {
  const drag = useRef<{ x: number; from: number } | null>(null);
  const clamp = (px: number) => Math.min(max, Math.max(min, px));
  return (
    <div
      className="splitter"
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize the track controls"
      aria-valuenow={Math.round(value)}
      aria-valuemin={min}
      aria-valuemax={max}
      tabIndex={0}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        drag.current = { x: e.clientX, from: value };
      }}
      onPointerMove={(e) => {
        if (drag.current) onChange(clamp(drag.current.from + e.clientX - drag.current.x));
      }}
      onPointerUp={() => {
        drag.current = null;
        onDone(value);
      }}
      onKeyDown={(e) => {
        const by = e.key === 'ArrowLeft' ? -16 : e.key === 'ArrowRight' ? 16 : 0;
        if (!by) return;
        e.preventDefault();
        const next = clamp(value + by);
        onChange(next);
        onDone(next);
      }}
    />
  );
}
