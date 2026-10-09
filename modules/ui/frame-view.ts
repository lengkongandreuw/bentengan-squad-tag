import { clamp } from '../../lib/math.ts';

// Per-frame canvas sizing, camera transform, view state, and kanal
// letterbox matte. Pure geometry apart from the canvas resize, the
// transform/clear, and the owner's view assignment — all numbers and
// order verbatim from the frame orchestrator.
export type FrameViewInput = {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  mode: string;
  activeCamera: string;
  me: { x: number; y: number };
  worldWidth: number;
  worldHeight: number;
  kanal: boolean;
  setView: (view: { x: number; y: number; width: number; height: number; scale: number }) => void;
};

export type FrameView = {
  cw: number;
  ch: number;
  scale: number;
  followsPlayer: boolean;
  camX: number;
  camY: number;
};

export const computeFrameView = (input: FrameViewInput): FrameView => {
  const { canvas, ctx, activeCamera, me, worldWidth, worldHeight } = input;
  const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1)),
    cw = canvas.clientWidth,
    ch = canvas.clientHeight;
  if (
    canvas.width !== Math.round(cw * dpr) ||
    canvas.height !== Math.round(ch * dpr)
  ) {
    canvas.width = Math.round(cw * dpr);
    canvas.height = Math.round(ch * dpr);
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cw, ch);
  const scale =
    input.mode !== 'playing' || activeCamera === 'overview'
      ? Math.min(cw / worldWidth, ch / worldHeight)
      : activeCamera === 'tactical'
        ? Math.max(cw / 1220, ch / 720)
        : Math.max(cw / 980, ch / 620);
  const halfW = cw / (2 * scale),
    halfH = ch / (2 * scale);
  const followsPlayer = input.mode === 'playing' && activeCamera !== 'overview';
  const camX = followsPlayer
    ? clamp(me.x, halfW, worldWidth - halfW)
    : worldWidth / 2;
  const camY = followsPlayer
    ? clamp(me.y, halfH, worldHeight - halfH)
    : worldHeight / 2;
  input.setView({ x: camX, y: camY, width: cw, height: ch, scale });
  if (input.kanal && !followsPlayer) {
    // Contain-fitting is already correct. Letterboxing is necessary when
    // the viewport and map ratios differ; give it an intentional matte.
    ctx.fillStyle = '#14211c';
    ctx.fillRect(0, 0, cw, ch);
    const mapLeft=(cw-worldWidth*scale)/2, mapTop=(ch-worldHeight*scale)/2;
    ctx.strokeStyle='rgba(210,195,143,.32)';
    ctx.lineWidth=1;
    ctx.strokeRect(mapLeft-1.5, mapTop-1.5, worldWidth*scale+3, worldHeight*scale+3);
  }
  return { cw, ch, scale, followsPlayer, camX, camY };
};
