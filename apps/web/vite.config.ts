import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { futurephonic } from './dev/futurephonic.ts';
import { localSamples } from './dev/localSamples.ts';

/** v0.1.<commits>: it goes up with every commit; "+" when built from uncommitted changes. */
function appVersion(): string {
  try {
    const commits = execSync('git rev-list --count HEAD').toString().trim();
    const dirty = execSync('git status --porcelain').toString().trim() !== '';
    return `v0.1.${commits}${dirty ? '+' : ''}`;
  } catch {
    return 'v0.1';
  }
}

export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(appVersion()) },
  // sample packs on this computer, for the dev server only (docs/samples.md)
  plugins: [react(), localSamples(fileURLToPath(new URL('../../samples/private', import.meta.url)), [futurephonic])],
  build: { chunkSizeWarningLimit: 1000 }, // Tone.js is most of it
  server: {
    host: true, // listen on the LAN, so a tablet or phone can open the Mac's dev server
    port: 5180,
    strictPort: true,
  },
});
