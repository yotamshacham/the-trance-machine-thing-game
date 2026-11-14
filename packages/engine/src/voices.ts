// Tone.js nodes for each kind of instrument: the drum machine, the synth, the sampler.

import * as Tone from 'tone';
import { toMidi, type Instrument, type NoteEvent, type SamplerInstrument } from '@ttm/song';
import { sampleUrl } from './sample-url.ts';
import { drumSettings, synthSettings, type DrumSettings, type SynthSettings } from './presets.ts';

export interface Voice {
  output: Tone.ToneAudioNode;
  /** play one scheduled note; `seconds` is its length */
  play(e: NoteEvent, time: number, seconds: number): void;
  /** the song's tempo, for voices that follow it (tempo-synced loops) */
  setTempo?(bpm: number): void;
  dispose(): void;
}

export function createVoice(instrument: Instrument): Voice {
  switch (instrument.kind) {
    case 'drum':
      return drumVoice(drumSettings(instrument));
    case 'synth':
      return synthVoice(synthSettings(instrument));
    case 'sampler':
      return instrument.bpm ? loopVoice(instrument) : samplerVoice(instrument);
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

/** One sample repitched, or a multisample (the nearest recorded note repitched). */
function samplerVoice(instrument: SamplerInstrument): Voice {
  const urls: Record<string, string> =
    typeof instrument.sample === 'string'
      ? { [instrument.root ?? 'C3']: sampleUrl(instrument.sample) }
      : Object.fromEntries(Object.entries(instrument.sample).map(([note, url]) => [note, sampleUrl(url)]));
  const sampler = new Tone.Sampler({ urls, release: 0.02, onerror: (e) => console.warn('Sample failed to load', e) });
  const gate = instrument.gate ?? false;
  return {
    output: sampler,
    play(e, time, seconds) {
      if (!sampler.loaded || e.pitch === null) return;
      const freq = Tone.mtof(e.pitch as Tone.Unit.MidiNote);
      if (gate) sampler.triggerAttackRelease(freq, seconds, time, e.vel);
      else sampler.triggerAttack(freq, time, e.vel);
    },
    dispose: () => sampler.dispose(),
  };
}

/** A loop: stretched from its own tempo to the song's (pitch kept), transposed by note, cut at the note length. */
function loopVoice(instrument: SamplerInstrument): Voice {
  const url = typeof instrument.sample === 'string' ? instrument.sample : Object.values(instrument.sample)[0]!;
  const root = toMidi(instrument.root ?? 'C3');
  const output = new Tone.Gain(1);
  const player = new Tone.GrainPlayer({ url: sampleUrl(url), grainSize: 0.08, overlap: 0.04 }).connect(output);
  let rate = 1;
  return {
    output,
    play(e, time, seconds) {
      if (!player.loaded || e.pitch === null) return;
      player.playbackRate = rate;
      player.detune = (e.pitch - root) * 100;
      output.gain.setValueAtTime(e.vel, time);
      player.start(time).stop(time + seconds);
    },
    setTempo(bpm) {
      rate = bpm / instrument.bpm!;
    },
    dispose: () => {
      player.dispose();
      output.dispose();
    },
  };
}
