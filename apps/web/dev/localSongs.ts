// Dev-server only: songs/local/, gitignored, is where the app and an agent hand a song back and
// forth. The app lists, reads and writes it at /local-songs/…; when a file there changes (an agent
// edited it), the app hears `local-songs:changed` and reloads it. Never part of a build, so songs
// made from material we can't publish (game rips) stay on this computer.

import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import type { Plugin } from 'vite';
import { parseSong, stringifySong } from '@ttm/song';

/** The song file a request path names, or undefined if it isn't a plain `name.json` in the folder. */
export function localSongFile(path: string): string | undefined {
  const name = path.split('?')[0]!.replace(/^\//, '');
  return /^[a-z0-9][a-z0-9-]*\.json$/.test(name) ? name : undefined;
}

export function localSongs(dir: string): Plugin {
  return {
    name: 'local-songs',
    apply: 'serve',
    configureServer(server) {
      mkdirSync(dir, { recursive: true });
      server.watcher.add(dir);
      const changed = (path: string) => {
        if (dirname(path) !== dir || !path.endsWith('.json')) return;
        server.ws.send({ type: 'custom', event: 'local-songs:changed', data: { file: basename(path) } });
      };
      server.watcher.on('add', changed);
      server.watcher.on('change', changed);
      server.watcher.on('unlink', changed);

      server.middlewares.use('/local-songs', (req, res) => {
        const send = (status: number, body?: unknown) => {
          res.statusCode = status;
          if (body === undefined) return res.end();
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify(body));
        };
        const path = req.url ?? '/';
        if (req.method === 'GET' && (path === '/' || path.startsWith('/?'))) {
          const songs = readdirSync(dir)
            .filter((f) => localSongFile(f))
            .flatMap((file) => {
              try {
                return [{ file, song: parseSong(readFileSync(join(dir, file), 'utf8')) }];
              } catch (e) {
                server.config.logger.warn(`songs/local/${file} is not a valid song: ${(e as Error).message}`);
                return [];
              }
            });
          return send(200, { songs });
        }
        const file = localSongFile(path);
        if (!file) return send(404);
        if (req.method === 'GET') {
          try {
            return send(200, parseSong(readFileSync(join(dir, file), 'utf8')));
          } catch (e) {
            return send(404, { error: (e as Error).message });
          }
        }
        if (req.method === 'PUT') {
          let body = '';
          req.on('data', (chunk: Buffer) => (body += chunk.toString()));
          req.on('end', () => {
            try {
              writeFileSync(join(dir, file), stringifySong(parseSong(body)));
              send(204);
            } catch (e) {
              send(400, { error: (e as Error).message });
            }
          });
          return;
        }
        send(405);
      });
    },
  };
}
