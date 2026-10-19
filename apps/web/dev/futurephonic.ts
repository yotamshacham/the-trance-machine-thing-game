// The Futurephonic packs (Future Geometrics, Sonic Formations) as a bank. Licensed to the user
// only: the audio stays on this computer (samples/private, gitignored) and is never deployed.
// samples/private/futurephonic-fg and -sf are links to the unpacked packs (docs/samples.md).

import type { BankDefinition } from './banks.ts';

const FG = 'futurephonic-fg';
const SF = 'futurephonic-sf';
const SECRET = `${SF}/Bonen - Major7 - X-Noize - Secret Selection/Bonen - Major7 - X-Noize - Secret Selection`;

export const futurephonic: BankDefinition = {
  id: 'futurephonic',
  name: 'Futurephonic',
  groups: [
    { group: 'Kicks', kind: 'one-shot', dirs: [`${FG}/Kicks`, `${SECRET}/Kicks`, `${SF}/Drum Colours/Drum Colours/Reverb Kicks`] },
    { group: 'Basses', kind: 'multisample', dirs: [`${FG}/Basses/*`, `${SF}/Basses/*`, `${SECRET}/Basses/*`] },
    { group: 'Snares & claps', kind: 'one-shot', dirs: [`${FG}/Snares`, `${SECRET}/Snares`, `${SECRET}/Claps`] },
    { group: 'Hats', kind: 'one-shot', dirs: [`${SECRET}/Hats`] },
    {
      group: 'Percussion',
      kind: 'one-shot',
      dirs: [`${SECRET}/Percussion Hits`, `${SF}/Drum Colours/Drum Colours/Concussion Percussion`, `${FG}/Loops/138 Bongo Loops/Bongo Hits & Rolls`],
    },
    { group: 'Leads & arps', kind: 'loop', dirs: [`${FG}/Grids & Leads`, `${SF}/Leads & Lines/Leads & Lines`, `${SF}/Grids & Glitches/Grids & Glitches`] },
    { group: 'Pads & atmospheres', kind: 'loop', dirs: [`${FG}/Pads Atmos`, `${SF}/Pads & Atmospheres/Pads & Atmospheres`] },
    { group: 'Tonal hits', kind: 'loop', dirs: [`${FG}/Hits & One Shots/Tonal Hits`] },
    { group: 'Top loops', kind: 'loop', dirs: [`${FG}/Loops/138 Top Loops`, `${SF}/Rare Metals Toploops/Rare Metals Toploops`, `${SECRET}/Loops`] },
    { group: 'FX & risers', kind: 'one-shot', dirs: [`${FG}/Build & Tension`, `${SF}/Single Shots and FX/Single Shots and FX/*`] },
  ],
};
