import { synthSettings } from '@ttm/engine';
import { FILTER_TYPES, LFO_TARGETS, WAVES, type Lfo, type SynthInstrument } from '@ttm/song';
import { useState } from 'react';

interface Props {
  instrument: SynthInstrument;
  onChange(instrument: SynthInstrument): void;
}

/** LFO rates offered, in steps: a 16th up to 4 bars. */
const RATES: [number, string][] = [
  [1, '1/16'],
  [2, '1/8'],
  [3, '1/8 dotted'],
  [4, '1/4'],
  [8, '1/2'],
  [16, '1 bar'],
  [32, '2 bars'],
  [64, '4 bars'],
];

/** A synth's patch: oscillator, filter, envelope, extras and two tempo-synced LFOs. Folded by default. */
export function SynthPanel({ instrument, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const s = synthSettings(instrument);
  const set = (change: Partial<SynthInstrument>) => onChange({ ...instrument, ...change });
  const lfos = instrument.lfo ?? s.lfos;
  const setLfo = (i: number, lfo: Lfo | undefined) => {
    const next = [...lfos];
    if (lfo) next[i] = lfo;
    else next.splice(i, 1);
    set({ lfo: next.length ? next : undefined });
  };

  return (
    <div className="synth-panel">
      <button className="synth-toggle" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span className="fold">{open ? '▾' : '▸'}</span> Synth
        {!open && <span className="muted-text"> · {s.filterType} {Math.round(s.cutoff)} Hz{s.voices > 1 ? ` · ${s.voices} voices` : ''}{lfos.length ? ` · ${lfos.length} LFO` : ''}</span>}
      </button>
      {open && (
        <>
          <div className="knobs">
            <Choice label="Wave" value={s.wave} options={WAVES} onChange={(wave) => set({ wave })} />
            <Knob label="Unison" value={s.voices} min={1} max={16} step={1} show={String} onChange={(unison) => set({ unison })} />
            <Knob label="Detune" value={s.spread} min={0} max={100} step={1} show={(v) => `${v}¢`} onChange={(detune) => set({ detune })} />
            <Knob label="Sub" value={s.sub} min={0} max={1} step={0.05} show={pct} onChange={(sub) => set({ sub })} />
            <Knob label="Noise" value={s.noise} min={0} max={1} step={0.05} show={pct} onChange={(noise) => set({ noise })} />
            <label className="knob" title="Each note fades in from silence over its whole length: risers, pad swells">
              <span>Swell</span>
              <input type="checkbox" checked={s.swell} onChange={(e) => set({ swell: e.target.checked || undefined })} />
            </label>
            <Knob label="Drive" value={s.drive} min={0} max={1} step={0.05} show={pct} onChange={(drive) => set({ drive })} />
          </div>
          <div className="knobs">
            <Choice label="Filter" value={s.filterType} options={FILTER_TYPES} onChange={(filter) => set({ filter })} />
            <Knob
              label="Cutoff"
              value={Math.log2(s.cutoff / 20)}
              min={0}
              max={Math.log2(1000)}
              step={0.01}
              show={(v) => `${Math.round(20 * 2 ** v)} Hz`}
              onChange={(v) => set({ cutoff: Math.round(20 * 2 ** v) })}
            />
            <Knob label="Reso" value={s.resonance} min={0} max={20} step={0.5} show={String} onChange={(resonance) => set({ resonance })} />
            <Knob label="Env" value={s.envAmount} min={0} max={6} step={0.1} show={(v) => `${v} oct`} onChange={(envAmount) => set({ envAmount })} />
            <Knob label="F.decay" value={s.filterDecay} min={0.01} max={2} step={0.01} show={sec} onChange={(filterDecay) => set({ filterDecay })} />
            <Knob label="F.sustain" value={s.filterSustain} min={0} max={1} step={0.05} show={pct} onChange={(filterSustain) => set({ filterSustain })} />
          </div>
          <div className="knobs">
            <Knob label="Attack" value={s.attack} min={0} max={2} step={0.005} show={sec} onChange={(attack) => set({ attack })} />
            <Knob label="Decay" value={s.decay} min={0.01} max={2} step={0.01} show={sec} onChange={(decay) => set({ decay })} />
            <Knob label="Sustain" value={s.sustain} min={0} max={1} step={0.05} show={pct} onChange={(sustain) => set({ sustain })} />
            <Knob label="Release" value={s.release} min={0.01} max={4} step={0.01} show={sec} onChange={(release) => set({ release })} />
          </div>
          {[0, 1].map((i) => {
            const lfo = lfos[i];
            if (!lfo && i > lfos.length) return null;
            return (
              <div className="knobs" key={i}>
                <Choice
                  label={`LFO ${i + 1}`}
                  value={lfo?.target ?? 'off'}
                  options={['off', ...LFO_TARGETS]}
                  onChange={(target) => setLfo(i, target === 'off' ? undefined : { rate: 4, depth: 0.5, ...lfo, target })}
                />
                {lfo && (
                  <>
                    <label className="knob">
                      <span>Rate</span>
                      <select value={lfo.rate} onChange={(e) => setLfo(i, { ...lfo, rate: Number(e.target.value) })}>
                        {RATES.map(([steps, name]) => (
                          <option key={steps} value={steps}>{name}</option>
                        ))}
                      </select>
                    </label>
                    <Knob label="Depth" value={lfo.depth} min={0} max={1} step={0.05} show={pct} onChange={(depth) => setLfo(i, { ...lfo, depth })} />
                    <Choice label="Shape" value={lfo.shape ?? 'sine'} options={WAVES} onChange={(shape) => setLfo(i, { ...lfo, shape })} />
                  </>
                )}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

const pct = (v: number) => `${Math.round(v * 100)}%`;
const sec = (v: number) => (v < 1 ? `${Math.round(v * 1000)} ms` : `${v.toFixed(2)} s`);

function Knob(props: { label: string; value: number; min: number; max: number; step: number; show(v: number): string; onChange(v: number): void }) {
  return (
    <label className="knob" title={`${props.label}: ${props.show(props.value)}`}>
      <span>
        {props.label} <span className="muted-text">{props.show(props.value)}</span>
      </span>
      <input type="range" min={props.min} max={props.max} step={props.step} value={props.value} onChange={(e) => props.onChange(Number(e.target.value))} />
    </label>
  );
}

function Choice<T extends string>(props: { label: string; value: T; options: readonly T[]; onChange(v: T): void }) {
  return (
    <label className="knob">
      <span>{props.label}</span>
      <select value={props.value} onChange={(e) => props.onChange(e.target.value as T)}>
        {props.options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </label>
  );
}
