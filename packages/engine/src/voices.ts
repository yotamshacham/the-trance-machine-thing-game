// Tone.js nodes for each kind of instrument: the drum machine, the synth, the sampler.

import * as Tone from 'tone';
import { stepSeconds, toMidi, type Instrument, type NoteEvent, type SamplerInstrument } from '@ttm/song';
import { sampleUrl } from './sample-url.ts';
import { LOOP_FADE, drumSettings, lfoRange, synthSettings, type DrumSettings, type SynthSettings } from './presets.ts';

export interface Voice {
  output: Tone.ToneAudioNode;
  /** play one scheduled note; `seconds` is its length */
  play(e: NoteEvent, time: number, seconds: number): void;
  /** the song's tempo, for voices that follow it (tempo-synced loops, LFOs) */
  setTempo?(bpm: number): void;
  /** playback starts at `time`: restart anything cycling (LFOs) so it lines up with the bar */
  restart?(time: number): void;
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
    oscillator: s.fat ? { type: `fat${s.wave}` as const, count: s.voices, spread: s.spread } : { type: s.wave },
    filter: { type: s.filterType, Q: s.resonance, rolloff: -24 as const },
    envelope: { attack: s.attack, decay: s.decay, sustain: s.sustain, release: s.release },
    filterEnvelope: {
      attack: s.filterAttack || Math.min(s.attack, 0.01),
      decay: s.filterDecay,
      sustain: s.filterSustain,
      release: s.release,
      baseFrequency: s.cutoff,
      octaves: s.envAmount,
    },
  } as Partial<Tone.MonoSynthOptions>;
  const ampEnvelope = { attack: s.attack, decay: s.decay, sustain: s.sustain, release: s.release };

  // after the notes: drive, then the LFO stages, then out
  const post = postChain(s);
  const nodes: { dispose(): void }[] = [];
  const noise =
    s.noise > 0
      ? new Tone.NoiseSynth({ noise: { type: 'white' }, envelope: ampEnvelope, volume: Tone.gainToDb(s.noise) }).connect(post.input)
      : undefined;
  if (noise) nodes.push(noise);
  const playNoise = (e: NoteEvent, time: number, seconds: number) => {
    if (noise && !e.slideIn) noise.triggerAttackRelease(seconds, time, e.vel);
  };

  if (s.mono) {
    const synth = new Tone.MonoSynth(options).connect(post.input);
    const layers: (Tone.MonoSynth | Tone.Synth)[] = [synth];
    if (s.sub > 0) {
      layers.push(new Tone.Synth({ oscillator: { type: 'sine' }, envelope: ampEnvelope, volume: Tone.gainToDb(s.sub) }).connect(post.input));
    }
    nodes.push(...layers);
    return {
      output: post.output,
      play(e, time, seconds) {
        const freq = Tone.mtof(e.pitch as Tone.Unit.MidiNote);
        for (const layer of layers) {
          if (e.slideIn) {
            layer.portamento = s.glide;
            layer.setNote(freq, time);
          } else {
            layer.portamento = 0;
            // an accent opens the filter further (set as the note is scheduled, a little ahead)
            if (layer instanceof Tone.MonoSynth && s.accent > 0) {
              layer.filterEnvelope.octaves = s.envAmount + s.accent * Math.max(0, (e.vel - 0.75) / 0.25);
            }
            layer.triggerAttack(freq, time, e.vel);
          }
          if (!e.slideOut) layer.triggerRelease(time + seconds);
        }
        playNoise(e, time, seconds);
      },
      setTempo: post.setTempo,
      restart: post.restart,
      dispose: () => {
        for (const n of nodes) n.dispose();
        post.dispose();
      },
    };
  }
  const synth = new Tone.PolySynth(Tone.MonoSynth, options).connect(post.input);
  synth.maxPolyphony = 16;
  nodes.push(synth);
  const sub =
    s.sub > 0
      ? new Tone.PolySynth(Tone.Synth, { oscillator: { type: 'sine' }, envelope: ampEnvelope, volume: Tone.gainToDb(s.sub) }).connect(post.input)
      : undefined;
  if (sub) nodes.push(sub);
  return {
    output: post.output,
    play(e, time, seconds) {
      const freq = Tone.mtof(e.pitch as Tone.Unit.MidiNote);
      synth.triggerAttackRelease(freq, seconds, time, e.vel);
      sub?.triggerAttackRelease(freq, seconds, time, e.vel);
      playNoise(e, time, seconds);
    },
    setTempo: post.setTempo,
    restart: post.restart,
    dispose: () => {
      for (const n of nodes) n.dispose();
      post.dispose();
    },
  };
}

/**
 * What follows a synth's notes: drive, then one stage per LFO (a swept filter for cutoff, a gain
 * for volume, a vibrato for pitch, a panner for pan). LFOs restart with the transport, so a gate
 * or a sweep lines up with the bar.
 */
function postChain(s: SynthSettings) {
  const input = new Tone.Gain(1);
  const stages: Tone.ToneAudioNode[] = [];
  const lfos: { lfo: Tone.LFO; rate: number; target: string }[] = [];
  if (s.drive > 0) stages.push(new Tone.Distortion({ distortion: s.drive, oversample: '2x' }));
  const bpm = Tone.getTransport().bpm.value;
  for (const l of s.lfos) {
    const r = lfoRange(l, s.cutoff, bpm);
    const lfo = new Tone.LFO({ frequency: r.hz, min: r.min, max: r.max, type: r.shape });
    let stage: Tone.ToneAudioNode;
    if (l.target === 'cutoff') {
      const filter = new Tone.Filter({ type: 'lowpass', frequency: s.cutoff, Q: 1 });
      lfo.connect(filter.frequency);
      stage = filter;
    } else if (l.target === 'volume') {
      const gain = new Tone.Gain(1);
      lfo.connect(gain.gain);
      stage = gain;
    } else if (l.target === 'pitch') {
      // a short modulated delay bends the pitch: ±1 semitone at full depth, roughly
      const vibrato = new Tone.Vibrato({ frequency: r.hz, depth: l.depth * 0.5, type: r.shape });
      stage = vibrato;
    } else {
      const panner = new Tone.Panner(0);
      lfo.connect(panner.pan);
      stage = panner;
    }
    if (l.target !== 'pitch') {
      lfo.start();
      lfos.push({ lfo, rate: l.rate, target: l.target });
    } else lfo.dispose();
    stages.push(stage);
  }
  const output = new Tone.Gain(1);
  let at: Tone.ToneAudioNode = input;
  for (const stage of stages) {
    at.connect(stage);
    at = stage;
  }
  at.connect(output);
  return {
    input,
    output,
    setTempo(bpmNow: number) {
      for (const { lfo, rate } of lfos) lfo.frequency.value = 1 / (rate * stepSeconds(bpmNow));
      for (const stage of stages) if (stage instanceof Tone.Vibrato) stage.frequency.value = lfoRange(s.lfos.find((l) => l.target === 'pitch')!, s.cutoff, bpmNow).hz;
    },
    /** start the LFOs' cycles at `time`: the top of the bar */
    restart(time: number) {
      // a stop and a start a hair later: the cycle begins again from its start
      for (const { lfo } of lfos) {
        lfo.stop(time);
        lfo.start(time + 0.0005);
      }
    },
    dispose() {
      for (const { lfo } of lfos) lfo.dispose();
      for (const stage of stages) stage.dispose();
      input.dispose();
      output.dispose();
    },
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
      // fade in and out, so a note starting or stopping mid-waveform doesn't click
      const fade = Math.min(LOOP_FADE, seconds / 3);
      const end = time + seconds;
      output.gain.cancelScheduledValues(time);
      output.gain.setValueAtTime(0, time);
      output.gain.linearRampToValueAtTime(e.vel, time + fade);
      output.gain.setValueAtTime(e.vel, end - fade);
      output.gain.linearRampToValueAtTime(0, end);
      player.start(time).stop(end);
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
