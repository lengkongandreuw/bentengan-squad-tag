// UI particle for burst effects. Owned by render; produced here.
export type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
};

// Radial particle burst. Pure: same input shape (plus Math.random) always
// yields `count` particles with the HEAD velocity envelope (30..110) and
// a 0.65s life. The caller decides where the particles go.
export const burst = (
  x: number,
  y: number,
  color: string,
  count = 12,
): Particle[] => {
  const out: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    out.push({
      x,
      y,
      vx: Math.cos(a) * (30 + Math.random() * 80),
      vy: Math.sin(a) * (30 + Math.random() * 80),
      life: 0.65,
      color,
    });
  }
  return out;
};

// Advances particle physics one tick (exponential 0.94 velocity decay,
// HEAD numbers verbatim) and drops dead ones. Mutates in place, then
// returns the surviving list for the owner to store.
export const stepParticles = (
  particles: Particle[],
  dt: number,
): Particle[] => {
  for (const p of particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.94;
    p.vy *= 0.94;
    p.life -= dt;
  }
  return particles.filter((p) => p.life > 0);
};

// Renders live particles as fading dots and resets global alpha afterwards.
export const drawParticles = (
  target: CanvasRenderingContext2D,
  particles: Particle[],
): void => {
  particles.forEach((p) => {
    target.globalAlpha = Math.max(0, p.life / 0.65);
    target.fillStyle = p.color;
    target.beginPath();
    target.arc(p.x, p.y, 3, 0, Math.PI * 2);
    target.fill();
  });
  target.globalAlpha = 1;
};
