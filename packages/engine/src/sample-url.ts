/**
 * A sample path as a URL: each segment escaped, so file names with spaces and "#" ("Bass A#.wav")
 * load. Full URLs (http…, blob:, data:) are left as they are.
 */
export function sampleUrl(path: string): string {
  if (!path.startsWith('/')) return path;
  return path
    .split('/')
    .map((segment) => encodeURIComponent(safeDecode(segment)))
    .join('/');
}

function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}
