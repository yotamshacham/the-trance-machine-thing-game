// Standard MIDI Files, read and written without a library. The reader is ported from
// piano-advanced-practice-ai (packages/score/src/midi-score.ts).

export interface RawNote {
  tick: number;
  end: number;
  pitch: number;
  /** 0 to 15; 9 is General MIDI drums */
  channel: number;
  velocity: number;
}

export interface Smf {
  /** ticks per quarter note */
  ppq: number;
  /** the tracks with notes, in file order */
  tracks: RawNote[][];
  /** each such track's name, if it has one */
  trackNames: (string | undefined)[];
  /** the first tempo, if the file has one */
  bpm?: number;
}

/** A Standard MIDI File's notes by track, and its first tempo. */
export function readSmf(bytes: Uint8Array): Smf {
  const u16 = (i: number) => (bytes[i]! << 8) | bytes[i + 1]!;
  const u32 = (i: number) => ((bytes[i]! << 24) >>> 0) + (bytes[i + 1]! << 16) + (bytes[i + 2]! << 8) + bytes[i + 3]!;
  if (bytes.length < 14 || String.fromCharCode(...bytes.subarray(0, 4)) !== 'MThd') throw new Error('Not a MIDI file.');
  const ppq = u16(12);
  if (ppq & 0x8000) throw new Error('A MIDI file timed in SMPTE frames has no beats to put on a grid.');
  const smf: Smf = { ppq, tracks: [], trackNames: [] };
  let i = 8 + u32(4);
  for (let t = 0; t < u16(10) && i + 8 <= bytes.length; t++) {
    const end = Math.min(i + 8 + u32(i + 4), bytes.length);
    let j = i + 8;
    let tick = 0;
    let status = 0;
    const open = new Map<number, RawNote[]>();
    const notes: RawNote[] = [];
    let name: string | undefined;
    const vlq = () => {
      let v = 0;
      for (;;) {
        const c = bytes[j++]!;
        v = (v << 7) | (c & 0x7f);
        if (c < 0x80) return v;
      }
    };
    while (j < end) {
      tick += vlq();
      if (bytes[j] === 0xff) {
        const type = bytes[j + 1]!;
        j += 2;
        const length = vlq();
        const d = bytes.subarray(j, j + length);
        j += length;
        if (type === 0x03) name ??= String.fromCharCode(...d).trim() || undefined;
        else if (type === 0x51 && smf.bpm === undefined) smf.bpm = 60e6 / ((d[0]! << 16) | (d[1]! << 8) | d[2]!);
        continue;
      }
      if (bytes[j] === 0xf0 || bytes[j] === 0xf7) {
        j++;
        j += vlq();
        continue;
      }
      if (bytes[j]! & 0x80) status = bytes[j++]!;
      const kind = status & 0xf0;
      const [d1, d2] = [bytes[j]!, bytes[j + 1]!];
      j += kind === 0xc0 || kind === 0xd0 ? 1 : 2;
      const id = ((status & 0xf) << 8) | d1;
      if (kind === 0x90 && d2 > 0) {
        const n = { tick, end: tick, pitch: d1, channel: status & 0xf, velocity: d2 };
        notes.push(n);
        open.set(id, [...(open.get(id) ?? []), n]);
      } else if (kind === 0x80 || kind === 0x90) {
        const n = open.get(id)?.shift();
        if (n) n.end = tick;
      }
    }
    if (notes.length) {
      smf.tracks.push(notes);
      smf.trackNames.push(name);
    }
    i = end;
  }
  return smf;
}

export interface SmfTrackOut {
  name?: string;
  notes: RawNote[];
}

/** A format 1 file: a tempo track, then one track per given track. */
export function writeSmf(ppq: number, bpm: number, tracks: SmfTrackOut[]): Uint8Array<ArrayBuffer> {
  const tempo = [0, 0xff, 0x51, 3, ...be(Math.round(60e6 / bpm), 3), 0, 0xff, 0x2f, 0];
  const chunks = [tempo, ...tracks.map(trackBytes)];
  return new Uint8Array([
    ...ascii('MThd'), ...be(6, 4), ...be(1, 2), ...be(chunks.length, 2), ...be(ppq, 2),
    ...chunks.flatMap((c) => [...ascii('MTrk'), ...be(c.length, 4), ...c]),
  ]);
}

function trackBytes({ name, notes }: SmfTrackOut): number[] {
  const out: number[] = [];
  if (name) {
    const text = ascii(name.slice(0, 127));
    out.push(0, 0xff, 0x03, text.length, ...text);
  }
  // offs before ons at the same tick, so a repeated note is struck again rather than cut
  const messages = notes
    .flatMap((n) => [
      { tick: n.end, on: false, n },
      { tick: n.tick, on: true, n },
    ])
    .sort((a, b) => a.tick - b.tick || Number(a.on) - Number(b.on));
  let tick = 0;
  for (const { tick: at, on, n } of messages) {
    out.push(...vlq(at - tick), (on ? 0x90 : 0x80) | n.channel, n.pitch, on ? n.velocity : 0);
    tick = at;
  }
  out.push(0, 0xff, 0x2f, 0);
  return out;
}

function ascii(s: string): number[] {
  return Array.from(s, (c) => c.charCodeAt(0) & 0x7f);
}

function be(n: number, bytes: number): number[] {
  return Array.from({ length: bytes }, (_, i) => (n >>> (8 * (bytes - 1 - i))) & 0xff);
}

/** Variable-length quantity: 7 bits per byte, high bit set on all but the last. */
function vlq(n: number): number[] {
  const out = [n & 0x7f];
  for (n >>>= 7; n > 0; n >>>= 7) out.unshift((n & 0x7f) | 0x80);
  return out;
}
