// Song files from the command line, for people and agents writing songs in songs/:
//   pnpm song check <file.json>...     validate; print a summary of each
//   pnpm song tidy <file.json>...      rewrite in canonical form (grids where possible)
//   pnpm song schema                   regenerate songs/schema.json from the zod schema
//   pnpm song export <file.json> [out.mid]   write a Standard MIDI File
//   pnpm song import <in.mid> [out.json]     a MIDI file → a song file
// Runs on Node's built-in TypeScript support: `node scripts/song.ts …`.

import { readFileSync, writeFileSync } from 'node:fs';
import { basename } from 'node:path';
import { songToMidi, songFromMidi } from '@ttm/formats';
import { SongError, parseSong, schedule, songJsonSchema, stepSeconds, stringifySong, type Song } from '@ttm/song';

const root = new URL('../', import.meta.url);

function load(file: string): Song {
  return parseSong(readFileSync(file, 'utf8'));
}

function summary(song: Song): string {
  const { events, length } = schedule(song);
  const seconds = Math.round(length * stepSeconds(song.bpm));
  const time = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  const sections = song.arrangement.map((s) => `${s.name} ${s.bars}`).join(', ');
  return [
    `"${song.title}" · ${song.bpm} bpm${song.key ? ` · ${song.key}` : ''} · ${length / 16} bars · ${time} · ${events.length} notes`,
    `  tracks: ${song.tracks.map((t) => `${t.id} (${t.instrument.kind === 'drum' ? t.instrument.voice : t.instrument.kind === 'synth' ? t.instrument.preset : 'sampler'})`).join(', ')}`,
    `  sections: ${sections}`,
  ].join('\n');
}

const [command, ...args] = process.argv.slice(2);
try {
  switch (command) {
    case 'check':
      if (!args.length) throw new Error('usage: pnpm song check <file.json>...');
      for (const file of args) console.log(`✓ ${file}\n${summary(load(file))}`);
      break;
    case 'tidy':
      for (const file of args) writeFileSync(file, stringifySong(load(file)));
      break;
    case 'schema':
      writeFileSync(new URL('songs/schema.json', root), JSON.stringify(songJsonSchema(), null, 2) + '\n');
      break;
    case 'export': {
      const [file, out = file!.replace(/\.json$/, '.mid')] = args;
      if (!file) throw new Error('usage: pnpm song export <file.json> [out.mid]');
      writeFileSync(out, songToMidi(load(file)));
      console.log(`wrote ${out}`);
      break;
    }
    case 'import': {
      const [file, out = file!.replace(/\.midi?$/i, '.json')] = args;
      if (!file) throw new Error('usage: pnpm song import <in.mid> [out.json]');
      const song = songFromMidi(new Uint8Array(readFileSync(file)), { title: basename(file).replace(/\.midi?$/i, '') });
      writeFileSync(out, stringifySong(song));
      console.log(`wrote ${out}\n${summary(song)}`);
      break;
    }
    default:
      console.error('usage: pnpm song check|tidy|schema|export|import …');
      process.exitCode = 1;
  }
} catch (e) {
  console.error(e instanceof SongError ? e.message : String(e));
  process.exitCode = 1;
}
