// Authored map boundary query. The preserved mask is independent of ground art.
export function createSolidMask(image: HTMLImageElement | null, width: number, height: number, worldWidth: number, worldHeight: number, radius = 13) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  let pixels: Uint8ClampedArray | null = null;
  const cache = () => {
    if (!image?.naturalWidth || !context) return;
    context.clearRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);
    pixels = context.getImageData(0, 0, width, height).data;
  };
  const at = (x: number, y: number) => {
    if (!pixels) cache();
    if (!pixels) return false;
    const mx = Math.max(0, Math.min(width - 1, Math.round(x / worldWidth * (width - 1))));
    const my = Math.max(0, Math.min(height - 1, Math.round(y / worldHeight * (height - 1))));
    return pixels[(my * width + mx) * 4] > 127;
  };
  const hits = (x: number, y: number) => {
    if (!image) return false;
    if (at(x, y)) return true;
    for (let i = 0; i < 8; i++) if (at(x + Math.cos(i * Math.PI / 4) * radius * .78, y + Math.sin(i * Math.PI / 4) * radius * .78)) return true;
    return false;
  };
  const segment = (a: {x:number;y:number}, b: {x:number;y:number}) => {
    if (!image) return false;
    const steps = Math.max(1, Math.ceil(Math.hypot(b.x-a.x, b.y-a.y)/12));
    for (let i=0; i<=steps; i++) if (at(a.x+(b.x-a.x)*i/steps, a.y+(b.y-a.y)*i/steps)) return true;
    return false;
  };
  return {canvas,cache,at,hits,segment,get pixels(){return pixels;}};
}
