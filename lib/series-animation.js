export const hasSpriteSeries = id => id === 'maria' || id === 'boke';

// Rows start at south and proceed clockwise on screen. Other characters retain
// their four-direction resolver. This only chooses artwork, not movement.
export function seriesDirection(vx, vy) {
  if (Math.hypot(vx, vy) < .01) return 0;
  return (Math.round(Math.atan2(-vx, vy) / (Math.PI / 4)) + 8) % 8;
}

export function seriesFrame(id, {vx, vy, now, sprinting, state, result, action, parkour, tagX, tagY}) {
  if (!hasSpriteSeries(id) || (!result && state !== 'PRISONER' && (parkour || (action && action !== 'tag')))) return null;
  let row, column, mirror = false;
  if (result) {
    row = 10; column = id === 'maria' ? (result === 'win' ? 3 : 4) : (result === 'win' ? 1 : 2);
  } else if (state === 'PRISONER') {
    row = 10; column = id === 'maria' ? Math.floor(now / 1600) % 3 : 0;
  } else if (action === 'tag') {
    row = 9;
    const x = tagX ?? vx, y = tagY ?? vy;
    const side = Math.abs(x) > Math.abs(y);
    column = id === 'maria' ? (side ? 0 : y < 0 ? 1 : 2) : (side ? x < 0 ? 0 : 3 : y < 0 ? 1 : 2);
    mirror = id === 'maria' && side && x < 0;
  } else if (Math.hypot(vx, vy) <= 8) {
    row = 8; column = Math.floor(now / 1800) % 3;
  } else {
    row = seriesDirection(vx, vy);
    const count = row === 2 || row === 6 ? 8 : id === 'maria' && (row === 3 || row === 5) ? 3 : 4;
    column = Math.floor(now / ((sprinting ? 440 : 640) / count)) % count;
    // Mirrored full source sheets also reverse the horizontal frame order.
    if (row === 1 || row === 3 || row === 6) column = count - 1 - column;
  }
  return {x:column*160, y:row*160, width:160, height:160, mirror};
}
