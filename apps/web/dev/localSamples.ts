// Dev-server only: serves sample packs from samples/private (links to packs on this computer) at
// /local-samples/…, and the banks built from them at /local-samples/banks.json. Never part of a
// build, so licensed audio never leaves the machine.

import { createReadStream, readdirSync, statSync } from 'node:fs';
import { extname, join, resolve, sep } from 'node:path';
import type { Plugin } from 'vite';
import { buildBank, type BankDefinition, type Listing } from './banks.ts';

const TYPES: Record<string, string> = {
  '.wav': 'audio/wav',
  '.aif': 'audio/aiff',
  '.aiff': 'audio/aiff',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.flac': 'audio/flac',
};

export function localSamples(root: string, banks: BankDefinition[]): Plugin {
  const list = (dir: string): Listing => {
    try {
      const entries = readdirSync(join(root, dir), { withFileTypes: true });
      const isDir = (name: string) => statSync(join(root, dir, name)).isDirectory(); // follows links
      return {
        files: entries.filter((e) => !isDir(e.name)).map((e) => e.name),
        dirs: entries.filter((e) => isDir(e.name)).map((e) => e.name),
      };
    } catch {
      return { files: [], dirs: [] };
    }
  };

  return {
    name: 'local-samples',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/local-samples', (req, res, next) => {
        const path = decodeURIComponent((req.url ?? '/').split('?')[0]!);
        if (path === '/banks.json') {
          const built = banks.map((b) => buildBank(b, list)).filter((b) => b.sounds.length);
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify({ banks: built }));
          return;
        }
        const file = resolve(root, `.${path}`);
        const type = TYPES[extname(file).toLowerCase()];
        if (!file.startsWith(root + sep) || !type) return next();
        try {
          const { size } = statSync(file);
          res.setHeader('content-type', type);
          res.setHeader('content-length', size);
          res.setHeader('cache-control', 'max-age=3600');
          createReadStream(file).pipe(res);
        } catch {
          res.statusCode = 404;
          res.end();
        }
      });
    },
  };
}
