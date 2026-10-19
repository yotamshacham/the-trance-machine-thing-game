// Tone.js nodes for each kind of instrument: the drum machine, the synth, the sampler.

import * as Tone from 'tone';
import { toMidi, type Instrument, type NoteEvent } from '@ttm/song';
import { drumSettings, synthSettings, type DrumSettings, type SynthSettings } from './presets.ts';

export interface Voice {
  output: Tone.ToneAudioNode;
  /** play one scheduled note; `seconds` is its length */
  play(e: NoteEvent, time: number, seconds: number): void;
  dispose(): void;
}

export function createVoice(instrument: Instrument): Voice {
  switch (instrument.kind) {
    case 'drum':
      return drumVoice(drumSettings(instrument));
    case 'synth':
      return synthVoice(synthSettings(instrument));
    case 'sampler':
      return samplerVoice(instrument.sample, toMidi(instrument.root ?? 'C3'), instrument.gate ?? false);
  }
}

function drumVoice({ body, noise }: DrumSettings): Voice {
  const output = new Tone.Gain(1);
  const nodes: Tone.ToneAudioNode[] = [output];
  let membrane: Tone.MembraneSynth | undefined;
  let noiseSynth: Tone.NoiseSynth | undefined;
  if (body) {
    membrane = new Tone.MembraneSynth({
      pitchDecay: body.sweepTime,
      octaves: body.sweepOctaves,
      envelope: { attack: 0.001, decay: body.decay, sustain: 0, release: 0.02 },
    }).connect(output);
    nodes.push(membrane);
  }
  if (noise) {
    const filter = new Tone.Filter({ type: noise.filter, frequency: noise.freq, Q: noise.q });
    const level = new Tone.Gain(noise.level).connect(output);
    filter.connect(level);
    noiseSynth = new Tone.NoiseSynth({
      noise: { type: noise.color },
      envelope: { attack: 0.001, decay: noise.decay, sustain: 0, release: 0.01 },
    }).connect(filter);
    nodes.push(filter, level, noiseSynth);
  }
  const pitch = body ? Tone.mtof(body.pitch as Tone.Unit.MidiNote) : 0;
  return {
    output,
    play(e, time) {
      membrane?.triggerAttackRelease(pitch, body!.decay, time, e.vel);
      if (noiseSynth) {
        const bursts = noise!.bursts;
        for (let b = 0; b < bursts; b++) noiseSynth.triggerAttackRelease(0.008, time + b * 0.011, e.vel * 0.7);
        noiseSynth.triggerAttackRelease(noise!.decay, time + bursts * 0.011, e.vel);
      }
    },
    dispose: () => nodes.forEach((n) => n.dispose()),
  };
}

function synthVoice(s: SynthSettings): Voice {
  const options = {
    oscillator: s.fat ? { type: `fat${s.wave}` as const, count: 3, spread: 24 } : { type: s.wave },
    filter: { type: 'lowpass' as const, Q: s.resonance, rolloff: -24 as const },
    envelope: { attack: s.attack, decay: s.decay, sustain: s.sustain, release: s.release },
    filterEnvelope: {
      attack: Math.min(s.attack, 0.01),
      decay: s.filterDecay,
      sustain: 0,
      release: s.release,
      baseFrequency: s.cutoff,
      octaves: s.envAmount,
    },
  } as Partial<Tone.MonoSynthOptions>;

  if (s.mono) {
    const output = new Tone.Gain(1);
    const synth = new Tone.MonoSynth(options).connect(output);
    const layers: (Tone.MonoSynth | Tone.Synth)[] = [synth];
    if (s.sub > 0) {
      const sub = new Tone.Synth({
        oscillator: { type: 'sine' },
        envelope: { attack: s.attack, decay: s.decay, sustain: s.sustain, release: s.release },
        volume: Tone.gainToDb(s.sub),
      }).connect(output);
      layers.push(sub);
    }
    return {
      output,
      play(e, time, seconds) {
        const freq = Tone.mtof(e.pitch as Tone.Unit.MidiNote);
        for (const layer of layers) {
          if (e.slideIn) {
            layer.portamento = s.glide;
            layer.setNote(freq, time);
          } else {
            layer.portamento = 0;
            layer.triggerAttack(freq, time, e.vel);
          }
          if (!e.slideOut) layer.triggerRelease(time + seconds);
        }
      },
      dispose: () => {
        for (const layer of layers) layer.dispose();
        output.dispose();
      },
    };
  }
  const synth = new Tone.PolySynth(Tone.MonoSynth, options);
  synth.maxPolyphony = 16;
  return {
    output: synth,
    play(e, time, seconds) {
      synth.triggerAttackRelease(Tone.mtof(e.pitch as Tone.Unit.MidiNote), seconds, time, e.vel);
    },
    dispose: () => synth.dispose(),
  };
}

function samplerVoice(url: string, root: number, gate: boolean): Voice {
  const sampler = new Tone.Sampler({ urls: { [root]: url } });
  return {
    output: sampler,
    play(e, time, seconds) {
      if (!sampler.loaded) return;
      const freq = Tone.mtof((e.pitch ?? root) as Tone.Unit.MidiNote);
      if (gate) sampler.triggerAttackRelease(freq, seconds, time, e.vel);
      else sampler.triggerAttack(freq, time, e.vel);
    },
    dispose: () => sampler.dispose(),
  };
}
