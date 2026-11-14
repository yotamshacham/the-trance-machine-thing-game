// Dev-server only: songs/ sits outside the app's root, so Vite doesn't notice songs being added
// or removed there (by hand or by an agent). Watch it and reload the songs list when it changes.

import { dirname } from 'node:path';
import type { Plugin } from 'vite';

export function songsFolder(dir: string): Plugin {
  return {
    name: 'songs-folder',
    apply: 'serve',
    configureServer(server) {
      server.watcher.add(dir);
      const changed = (file: string) => {
        if (dirname(file) !== dir || !file.endsWith('.json')) return; // not songs/local/: that's localSongs.ts
        const songsModule = [...server.moduleGraph.idToModuleMap.values()].find((m) => m.id?.endsWith('/src/songs.ts'));
        if (songsModule) server.moduleGraph.invalidateModule(songsModule);
        server.ws.send({ type: 'full-reload' });
      };
      server.watcher.on('add', changed);
      server.watcher.on('unlink', changed);
    },
  };
}
