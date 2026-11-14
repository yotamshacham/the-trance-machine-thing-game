// Song files from the command line, for people and agents writing songs in songs/:
//   pnpm song check <file.json>...     validate; print a summary of each
//   pnpm song tidy <file.json>...      rewrite in canonical form (grids where possible)
//   pnpm song schema                   regenerate songs/schema.json from the zod schema
//   pnpm song export <file.json> [out.mid]   write a Standard MIDI File
//   pnpm song import <in.mid> [out.json]     a MIDI file → a song file
//   pnpm song requests                 list requests sent from the app (songs/local/.requests.json)
//   pnpm song requests wait            wait for the next one, claim it, print it (for an agent)
//   pnpm song requests done|failed <id> <reply…>   finish it; the app shows the reply
// Runs on Node's built-in TypeScript support: `node scripts/song.ts …`.

import { readFileSync, writeFileSync } from 'node:fs';
import { basename } from 'node:path';
import { REQUESTS_FILE, claimNext, finishRequest, readRequests, writeRequests, type Request } from '../apps/web/dev/requests.ts';
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
    case 'requests':
      await requests(args);
      break;
    default:
      console.error('usage: pnpm song check|tidy|schema|export|import|requests …');
      process.exitCode = 1;
  }
} catch (e) {
  console.error(e instanceof SongError ? e.message : String(e));
  process.exitCode = 1;
}

async function requests([sub, id, ...reply]: string[]): Promise<void> {
  const path = new URL(`songs/local/${REQUESTS_FILE}`, root).pathname;
  const describe = (r: Request) => {
    const on = r.target.kind === 'track' ? `track "${r.target.trackId}" (${r.target.name})` : r.target.kind === 'section' ? `section ${r.target.index} "${r.target.name}"` : 'the whole song';
    return `${r.id} [${r.status}] songs/local/${r.file} · ${on}: ${r.text}${r.reply ? `\n    → ${r.reply}` : ''}`;
  };
  if (!sub || sub === 'list') {
    for (const r of readRequests(path)) console.log(describe(r));
    return;
  }
  if (sub === 'wait') {
    for (;;) {
      const { list, request } = claimNext(readRequests(path));
      if (request) {
        writeRequests(path, list);
        console.log(describe(request));
        console.log(JSON.stringify(request));
        return;
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  if ((sub === 'done' || sub === 'failed') && id) {
    writeRequests(path, finishRequest(readRequests(path), id, sub, reply.join(' '), Date.now()));
    console.log(`${id} ${sub}`);
    return;
  }
  throw new Error('usage: pnpm song requests [list | wait | done <id> <reply…> | failed <id> <reply…>]');
}
