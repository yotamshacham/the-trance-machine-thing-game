// The song file's JSON Schema (songs/schema.json): what editors validate against and an AI is given.

import { z } from 'zod';
import { SongInput } from './schema.ts';

export function songJsonSchema(): object {
  return {
    ...z.toJSONSchema(SongInput, { io: 'input' }),
    title: 'Trance Machine song',
    description: 'A song for the trance machine. See docs/song-format.md.',
  };
}
