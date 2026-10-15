// Embedding is opt-in, only for the private loopback Engine origin.
/** @param {string | undefined} parentOrigin */
export function studioFramePolicy(parentOrigin) {
  if (!parentOrigin) return "frame-ancestors 'none'";
  const url = new URL(parentOrigin);
  if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1' || !url.port || url.origin !== parentOrigin)
    throw new Error('Engine parent must be an exact local loopback origin.');
  return `frame-ancestors ${url.origin}`;
}
