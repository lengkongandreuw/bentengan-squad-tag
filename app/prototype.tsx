'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Flag, Gauge, Pause, Play, RotateCcw, Shield, Volume2, Zap } from 'lucide-react';

type Team = 'blue' | 'red';
type PlayerState = 'IN_BASE' | 'ACTIVE' | 'PRISONER' | 'RETURNING';
type PresetKey = 'all' | 'runner' | 'guardian' | 'rescuer';
type Player = {
  id: string; name: string; team: Team; controlled?: boolean; x: number; y: number;
  vx: number; vy: number; state: PlayerState; exitOrder: number; stamina: number;
  baseCharge: number; tagCooldown: number; ghostUntil: number; parkourUntil: number;
  prisonOwner?: Team; prisonIndex: number; captures: number; aiSeed: number;
};
type Obstacle = { x: number; y: number; w: number; h: number; kind: 'fence' | 'canal' | 'stall' | 'chairs' };
type Mission = { refresh: boolean; parkour: boolean; tag: boolean; rescue: boolean };
type Snapshot = {
  blue: number; red: number; round: number; timer: number; stamina: number; order: number;
  state: PlayerState; paused: boolean; phase: string; announcement: string; logs: string[];
  mission: Mission; team: Array<{ name: string; state: PlayerState }>;
};

const W = 960;
const H = 600;
const BASES = { blue: { x: 88, y: 310 }, red: { x: 872, y: 290 } };
const TEAM_COLOR = { blue: '#2f87ff', red: '#f0473e' };
const PRESETS = {
  all: { label: 'All-rounder', speed: 196, stamina: 100, agility: 1, balance: 1, copy: 'Stabil untuk memahami aturan.' },
  runner: { label: 'Runner', speed: 218, stamina: 88, agility: 1.08, balance: .88, copy: 'Cepat untuk serbu benteng.' },
  guardian: { label: 'Guardian', speed: 181, stamina: 118, agility: .9, balance: 1.18, copy: 'Tahan sprint, kuat menjaga.' },
  rescuer: { label: 'Rescuer', speed: 199, stamina: 92, agility: 1.22, balance: .94, copy: 'Parkour cepat untuk rescue.' },
} as const;

const OBSTACLES: Obstacle[] = [
  { x: 220, y: 108, w: 108, h: 24, kind: 'fence' }, { x: 636, y: 456, w: 112, h: 24, kind: 'fence' },
  { x: 430, y: 142, w: 90, h: 54, kind: 'stall' }, { x: 438, y: 410, w: 94, h: 44, kind: 'chairs' },
  { x: 320, y: 280, w: 120, h: 34, kind: 'canal' }, { x: 536, y: 280, w: 118, h: 34, kind: 'canal' },
  { x: 248, y: 420, w: 76, h: 24, kind: 'fence' }, { x: 664, y: 146, w: 76, h: 24, kind: 'fence' },
];

const initialSnapshot: Snapshot = {
  blue: 0, red: 0, round: 1, timer: 240, stamina: 100, order: 0, state: 'IN_BASE', paused: false,
  phase: 'MENU', announcement: '', logs: ['Rules prototype siap.'], mission: { refresh: false, parkour: false, tag: false, rescue: false }, team: [],
};

function other(team: Team): Team { return team === 'blue' ? 'red' : 'blue'; }
function distance(a: { x: number; y: number }, b: { x: number; y: number }) { return Math.hypot(a.x - b.x, a.y - b.y); }
function clamp(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)); }
function formatTime(seconds: number) { const s = Math.max(0, Math.ceil(seconds)); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; }

export function BentenganPrototype() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const keys = useRef<Set<string>>(new Set());
  const [preset, setPreset] = useState<PresetKey>('all');
  const [mode, setMode] = useState<'menu' | 'playing'>('menu');
  const [run, setRun] = useState(0);
  const [snapshot, setSnapshot] = useState<Snapshot>(initialSnapshot);
  const selected = PRESETS[preset];

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'shift'].includes(key)) event.preventDefault();
      keys.current.add(key);
    };
    const up = (event: KeyboardEvent) => keys.current.delete(event.key.toLowerCase());
    window.addEventListener('keydown', down); window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    let last = performance.now();
    let lastHud = 0;
    let phase: 'COUNTDOWN' | 'PLAYING' | 'ROUND_OVER' | 'MATCH_OVER' = 'COUNTDOWN';
    let phaseUntil = performance.now() + 3000;
    let timer = 240;
    let round = 1;
    let score = { blue: 0, red: 0 };
    let exitCounter = 0;
    let paused = false;
    let announcement = mode === 'playing' ? 'BERSIAP!' : '';
    let logs = ['Keluar terakhir dari benteng = prioritas lebih tinggi.'];
    let mission: Mission = { refresh: false, parkour: false, tag: false, rescue: false };
    let totalCaptureConfirm = { blue: 0, red: 0 };
    let particles: Array<{ x: number; y: number; vx: number; vy: number; life: number; color: string }> = [];
    let audio: AudioContext | null = null;
    let parkourLatch = false;

    const beep = (frequency: number, duration = .08) => {
      try {
        audio ??= new AudioContext();
        const oscillator = audio.createOscillator();
        const gain = audio.createGain();
        oscillator.frequency.value = frequency; gain.gain.value = .035;
        oscillator.connect(gain); gain.connect(audio.destination); oscillator.start();
        gain.gain.exponentialRampToValueAtTime(.001, audio.currentTime + duration);
        oscillator.stop(audio.currentTime + duration);
      } catch { /* audio is optional */ }
    };

    const makePlayers = (): Player[] => [
      { id: 'you', name: 'RAKA', team: 'blue', controlled: true, x: 92, y: 290, vx: 0, vy: 0, state: 'IN_BASE', exitOrder: 0, stamina: selected.stamina, baseCharge: .75, tagCooldown: 0, ghostUntil: 0, parkourUntil: 0, prisonIndex: 0, captures: 0, aiSeed: .2 },
      { id: 'b2', name: 'NALA', team: 'blue', x: 104, y: 332, vx: 0, vy: 0, state: 'IN_BASE', exitOrder: 0, stamina: 100, baseCharge: .75, tagCooldown: 0, ghostUntil: 0, parkourUntil: 0, prisonIndex: 0, captures: 0, aiSeed: 1.6 },
      { id: 'r1', name: 'JATI', team: 'red', x: 858, y: 270, vx: 0, vy: 0, state: 'IN_BASE', exitOrder: 0, stamina: 100, baseCharge: .75, tagCooldown: 0, ghostUntil: 0, parkourUntil: 0, prisonIndex: 0, captures: 0, aiSeed: 2.8 },
      { id: 'r2', name: 'BARA', team: 'red', x: 882, y: 320, vx: 0, vy: 0, state: 'IN_BASE', exitOrder: 0, stamina: 100, baseCharge: .75, tagCooldown: 0, ghostUntil: 0, parkourUntil: 0, prisonIndex: 0, captures: 0, aiSeed: 4.1 },
    ];
    let players = makePlayers();

    const log = (text: string) => { logs = [text, ...logs].slice(0, 4); };
    const burst = (x: number, y: number, color: string, count = 12) => {
      for (let i = 0; i < count; i++) { const a = Math.random() * Math.PI * 2; particles.push({ x, y, vx: Math.cos(a) * (30 + Math.random() * 80), vy: Math.sin(a) * (30 + Math.random() * 80), life: .65, color }); }
    };
    const resetRound = () => {
      players = makePlayers(); timer = 240; exitCounter = 0; totalCaptureConfirm = { blue: 0, red: 0 };
      phase = 'COUNTDOWN'; phaseUntil = performance.now() + 2800; announcement = `RONDE ${round}`;
      log(`Ronde ${round}: susun urutan keluar.`);
    };
    const winRound = (team: Team, reason: string) => {
      if (phase !== 'PLAYING') return;
      score[team] += 1; phase = score[team] >= 2 ? 'MATCH_OVER' : 'ROUND_OVER'; phaseUntil = performance.now() + (phase === 'MATCH_OVER' ? 7000 : 3500);
      announcement = phase === 'MATCH_OVER' ? `${team === 'blue' ? 'BIRU' : 'MERAH'} MENANG MATCH` : `${team === 'blue' ? 'BIRU' : 'MERAH'} MENANG · ${reason}`;
      beep(team === 'blue' ? 720 : 320, .25); burst(W / 2, H / 2, TEAM_COLOR[team], 34); log(announcement);
    };
    const blocked = (x: number, y: number, player: Player, now: number) => {
      if (now < player.parkourUntil) return false;
      return OBSTACLES.some(o => x + 13 > o.x && x - 13 < o.x + o.w && y + 13 > o.y && y - 13 < o.y + o.h);
    };
    const move = (p: Player, dx: number, dy: number, speed: number, dt: number, now: number) => {
      const len = Math.hypot(dx, dy) || 1; p.vx = dx / len * speed; p.vy = dy / len * speed;
      const nx = clamp(p.x + p.vx * dt, 38, W - 38); const ny = clamp(p.y + p.vy * dt, 66, H - 42);
      if (!blocked(nx, p.y, p, now)) p.x = nx;
      if (!blocked(p.x, ny, p, now)) p.y = ny;
    };
    const baseVector = (p: Player, team = p.team) => ({ x: BASES[team].x - p.x, y: BASES[team].y - p.y });
    const aiVector = (p: Player, now: number) => {
      if (p.state === 'RETURNING') return baseVector(p);
      if (p.state === 'IN_BASE') {
        const center = { x: W / 2, y: H / 2 + Math.sin(now / 900 + p.aiSeed) * 120 };
        return { x: center.x - p.x, y: center.y - p.y };
      }
      const teammatePrisoners = players.filter(q => q.team === p.team && q.state === 'PRISONER');
      if (teammatePrisoners.length) {
        const outer = teammatePrisoners.sort((a, b) => b.prisonIndex - a.prisonIndex)[0];
        return { x: outer.x - p.x, y: outer.y - p.y };
      }
      const threats = players.filter(q => q.team !== p.team && q.state === 'ACTIVE' && q.exitOrder > p.exitOrder);
      const closeThreat = threats.sort((a, b) => distance(p, a) - distance(p, b))[0];
      if (closeThreat && distance(p, closeThreat) < 150) return { x: p.x - closeThreat.x, y: p.y - closeThreat.y };
      const targets = players.filter(q => q.team !== p.team && (q.state === 'ACTIVE' || (q.state === 'RETURNING' && now > q.ghostUntil)) && q.exitOrder < p.exitOrder);
      const target = targets.sort((a, b) => distance(p, a) - distance(p, b))[0];
      if (target) return { x: target.x - p.x, y: target.y - p.y };
      if (p.stamina < 24 || Math.sin(now / 4200 + p.aiSeed) > .83) return baseVector(p);
      const enemyBase = BASES[other(p.team)]; return { x: enemyBase.x - p.x, y: enemyBase.y - p.y + Math.sin(now / 700 + p.aiSeed) * 90 };
    };
    const layoutPrisons = () => {
      (['blue', 'red'] as Team[]).forEach(owner => {
        const held = players.filter(p => p.state === 'PRISONER' && p.prisonOwner === owner);
        held.forEach((p, index) => { p.prisonIndex = index; p.x = owner === 'blue' ? 156 + index * 32 : 804 - index * 32; p.y = owner === 'blue' ? 352 + index * 8 : 238 - index * 8; });
      });
    };
    const capture = (winner: Player, loser: Player, now: number) => {
      if (winner.tagCooldown > now || loser.state === 'PRISONER') return;
      winner.tagCooldown = now + 500; winner.captures += 1; loser.state = 'PRISONER'; loser.prisonOwner = winner.team; loser.vx = loser.vy = 0;
      burst(loser.x, loser.y, TEAM_COLOR[winner.team]); beep(winner.controlled ? 820 : 250);
      log(`${winner.name} menangkap ${loser.name} · urutan ${winner.exitOrder} > ${loser.exitOrder}`);
      if (winner.controlled) mission.tag = true;
      layoutPrisons();
    };
    const rescueCheck = (now: number) => {
      players.filter(p => p.state === 'ACTIVE').forEach(rescuer => {
        const held = players.filter(p => p.team === rescuer.team && p.state === 'PRISONER').sort((a, b) => b.prisonIndex - a.prisonIndex);
        const outerPrisoner = held[0];
        if (outerPrisoner && distance(rescuer, outerPrisoner) < 29) {
          held.forEach(p => { p.state = 'RETURNING'; p.prisonOwner = undefined; p.ghostUntil = now + 1500; p.x += rescuer.team === 'blue' ? -18 : 18; });
          burst(outerPrisoner.x, outerPrisoner.y, '#b9ee3d', 24); beep(620, .16); log(`${rescuer.name} membebaskan ${held.length} tahanan sekaligus.`);
          if (rescuer.controlled) mission.rescue = true;
        }
      });
    };
    const tagCheck = (now: number) => {
      for (let i = 0; i < players.length; i++) for (let j = i + 1; j < players.length; j++) {
        const a = players[i], b = players[j]; if (a.team === b.team || distance(a, b) > 27) continue;
        const aCan = a.state === 'ACTIVE', bCan = b.state === 'ACTIVE';
        const aTarget = b.state === 'ACTIVE' || (b.state === 'RETURNING' && now > b.ghostUntil);
        const bTarget = a.state === 'ACTIVE' || (a.state === 'RETURNING' && now > a.ghostUntil);
        if (aCan && aTarget && a.exitOrder > b.exitOrder) capture(a, b, now);
        else if (bCan && bTarget && b.exitOrder > a.exitOrder) capture(b, a, now);
      }
    };
    const baseCheck = (p: Player, dt: number, now: number) => {
      if (p.state === 'PRISONER') return;
      const own = BASES[p.team]; const inside = distance(p, own) < 58;
      if (inside) {
        if (p.state !== 'IN_BASE') { p.state = 'IN_BASE'; p.baseCharge = 0; }
        p.baseCharge = Math.min(.75, p.baseCharge + dt);
        if (p.state === 'IN_BASE') p.stamina = Math.min(p.controlled ? selected.stamina : 100, p.stamina + 14 * dt);
      } else if (p.state === 'IN_BASE' && p.baseCharge >= .75) {
        p.state = 'ACTIVE'; p.exitOrder = ++exitCounter; p.baseCharge = 0;
        if (p.controlled && p.exitOrder > 2) mission.refresh = true;
        log(`${p.name} keluar sebagai urutan #${p.exitOrder}.`); beep(p.controlled ? 520 : 380);
      }
      if (p.state === 'RETURNING' && inside) { p.state = 'IN_BASE'; p.baseCharge = .75; log(`${p.name} kembali ke benteng.`); }
      if (p.state === 'ACTIVE' && distance(p, BASES[other(p.team)]) < 35 && now > p.parkourUntil) winRound(p.team, 'BENTENG DIREBUT');
    };
    const update = (dt: number, now: number) => {
      if (keys.current.has('p')) { keys.current.delete('p'); paused = !paused; }
      if (paused || mode !== 'playing') return;
      if (phase === 'COUNTDOWN') { announcement = `${Math.max(1, Math.ceil((phaseUntil - now) / 1000))}`; if (now >= phaseUntil) { phase = 'PLAYING'; announcement = 'MULAI!'; setTimeout(() => { if (phase === 'PLAYING') announcement = ''; }, 800); } return; }
      if (phase === 'ROUND_OVER' && now >= phaseUntil) { round += 1; resetRound(); return; }
      if (phase === 'MATCH_OVER') { if (now >= phaseUntil) { score = { blue: 0, red: 0 }; round = 1; resetRound(); } return; }
      timer -= dt;
      if (timer <= 0) {
        const bluePrisoners = players.filter(p => p.team === 'red' && p.state === 'PRISONER').length;
        const redPrisoners = players.filter(p => p.team === 'blue' && p.state === 'PRISONER').length;
        if (bluePrisoners === redPrisoners) winRound(players.reduce((best, p) => p.captures > best.captures ? p : best).team, 'SUDDEN SCORE');
        else winRound(bluePrisoners > redPrisoners ? 'blue' : 'red', 'WAKTU HABIS');
      }
      const me = players[0];
      let dx = 0, dy = 0;
      if (keys.current.has('a') || keys.current.has('arrowleft')) dx--;
      if (keys.current.has('d') || keys.current.has('arrowright')) dx++;
      if (keys.current.has('w') || keys.current.has('arrowup')) dy--;
      if (keys.current.has('s') || keys.current.has('arrowdown')) dy++;
      const sprinting = keys.current.has('shift') && me.stamina > 0 && (dx || dy);
      if (sprinting) me.stamina = Math.max(0, me.stamina - 18 * dt); else me.stamina = Math.min(selected.stamina, me.stamina + 14 * dt);
      const space = keys.current.has(' ');
      if (space && !parkourLatch && me.stamina >= 8 && now > me.parkourUntil && (dx || dy)) {
        const near = OBSTACLES.some(o => me.x + 40 > o.x && me.x - 40 < o.x + o.w && me.y + 40 > o.y && me.y - 40 < o.y + o.h);
        if (near) { me.parkourUntil = now + 360 / selected.agility; me.stamina -= 10; me.x = clamp(me.x + dx * 54, 38, W - 38); me.y = clamp(me.y + dy * 54, 66, H - 42); mission.parkour = true; burst(me.x, me.y, '#f4df9a', 9); beep(460); }
      }
      parkourLatch = space;
      if ((dx || dy) && me.state !== 'PRISONER') move(me, dx, dy, selected.speed * (sprinting ? 1.48 : 1), dt, now);
      players.slice(1).forEach(p => {
        if (p.state === 'PRISONER') return;
        const vector = aiVector(p, now); const sprint = p.state === 'ACTIVE' && p.stamina > 18;
        if (sprint) p.stamina -= 10 * dt; else p.stamina = Math.min(100, p.stamina + 14 * dt);
        move(p, vector.x, vector.y, 168 * (sprint ? 1.26 : 1), dt, now);
      });
      players.forEach(p => baseCheck(p, dt, now));
      tagCheck(now); rescueCheck(now); layoutPrisons();
      (['blue', 'red'] as Team[]).forEach(team => {
        const allHeld = players.filter(p => p.team === other(team)).every(p => p.state === 'PRISONER' && p.prisonOwner === team);
        totalCaptureConfirm[team] = allHeld ? totalCaptureConfirm[team] + dt : 0;
        if (totalCaptureConfirm[team] >= 2) winRound(team, 'TANGKAP TOTAL');
      });
      particles.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= .94; p.vy *= .94; p.life -= dt; });
      particles = particles.filter(p => p.life > 0);
    };

    const pathRoundRect = (x: number, y: number, w: number, h: number, r: number) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); };
    const drawMap = () => {
      const ground = ctx.createLinearGradient(0, 0, 0, H); ground.addColorStop(0, '#cdbb92'); ground.addColorStop(.45, '#87925d'); ground.addColorStop(1, '#43563d'); ctx.fillStyle = ground; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(242,216,165,.23)'; for (let y = 82; y < H; y += 44) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y - 92); ctx.lineTo(W, y - 68); ctx.lineTo(0, y + 24); ctx.fill(); }
      ctx.strokeStyle = 'rgba(255,255,255,.13)'; ctx.lineWidth = 1; for (let x = -H; x < W; x += 42) { ctx.beginPath(); ctx.moveTo(x, H); ctx.lineTo(x + H, 0); ctx.stroke(); }
      ctx.fillStyle = '#233726'; ctx.fillRect(0, 42, W, 26); ctx.fillRect(0, H - 34, W, 34);
      ctx.font = '800 14px var(--font-heading)'; ctx.fillStyle = '#f1e3c3'; ctx.fillText('GANG MERDEKA', 372, 56);
      for (let x = 30; x < W; x += 62) { ctx.fillStyle = x % 124 ? '#f4e2bd' : '#d83a33'; ctx.beginPath(); ctx.moveTo(x, 44); ctx.lineTo(x + 17, 44); ctx.lineTo(x + 8, 61); ctx.fill(); }
      const building = (x: number, y: number, w: number, h: number, color: string, label: string) => { ctx.fillStyle = 'rgba(0,0,0,.22)'; pathRoundRect(x + 10, y + 11, w, h, 8); ctx.fill(); ctx.fillStyle = color; pathRoundRect(x, y, w, h, 8); ctx.fill(); ctx.fillStyle = '#3e3025'; ctx.fillRect(x, y, w, 14); ctx.fillStyle = '#f4e3bd'; ctx.font = '800 10px Arial'; ctx.fillText(label, x + 10, y + 36); };
      building(64, 76, 140, 70, '#aa6b3b', 'WARUNG BU SRI'); building(742, 430, 154, 76, '#a45e34', 'POS RONDA');
      OBSTACLES.forEach(o => {
        if (o.kind === 'canal') { ctx.fillStyle = '#294e54'; ctx.fillRect(o.x, o.y, o.w, o.h); ctx.strokeStyle = '#81b2ae'; ctx.setLineDash([10, 8]); ctx.strokeRect(o.x, o.y, o.w, o.h); ctx.setLineDash([]); }
        else if (o.kind === 'stall') { ctx.fillStyle = '#762d2b'; pathRoundRect(o.x, o.y, o.w, o.h, 5); ctx.fill(); ctx.fillStyle = '#f0d16f'; ctx.fillRect(o.x + 8, o.y + 8, o.w - 16, 10); }
        else if (o.kind === 'chairs') { ctx.fillStyle = '#327b62'; for (let x = o.x; x < o.x + o.w; x += 23) { pathRoundRect(x, o.y, 18, o.h, 4); ctx.fill(); } }
        else { ctx.fillStyle = '#ddd2ad'; ctx.fillRect(o.x, o.y, o.w, o.h); ctx.strokeStyle = '#473c2e'; ctx.lineWidth = 3; for (let x = o.x + 8; x < o.x + o.w; x += 22) { ctx.beginPath(); ctx.moveTo(x, o.y); ctx.lineTo(x, o.y + o.h); ctx.stroke(); } }
      });
    };
    const drawBase = (team: Team) => {
      const b = BASES[team]; const color = TEAM_COLOR[team];
      ctx.fillStyle = `${color}27`; ctx.beginPath(); ctx.arc(b.x, b.y, 62, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = color; ctx.lineWidth = 4; ctx.setLineDash([7, 6]); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#171d18'; pathRoundRect(b.x - 29, b.y - 31, 58, 62, 8); ctx.fill(); ctx.fillStyle = color; ctx.fillRect(b.x - 4, b.y - 54, 8, 55); ctx.beginPath(); ctx.moveTo(b.x + 4, b.y - 52); ctx.lineTo(b.x + (team === 'blue' ? 31 : -31), b.y - 42); ctx.lineTo(b.x + 4, b.y - 30); ctx.fill();
      ctx.fillStyle = '#fff3d0'; ctx.font = '800 10px Arial'; ctx.textAlign = 'center'; ctx.fillText(team === 'blue' ? 'BENTENG BIRU' : 'BENTENG MERAH', b.x, b.y + 49);
    };
    const relationColor = (p: Player, me: Player, now: number) => {
      if (p.team === me.team) return '#9fd0ff'; if (p.state === 'PRISONER') return '#8f8d84';
      if (me.state !== 'ACTIVE') return '#f1d46c';
      if ((p.state === 'ACTIVE' || (p.state === 'RETURNING' && now > p.ghostUntil)) && me.exitOrder > p.exitOrder) return '#b9ee3d';
      if (p.state === 'ACTIVE' && p.exitOrder > me.exitOrder) return '#ff544b'; return '#f1d46c';
    };
    const drawPlayer = (p: Player, me: Player, now: number) => {
      const color = TEAM_COLOR[p.team]; const outline = relationColor(p, me, now); const bob = now < p.parkourUntil ? -15 : 0;
      ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(p.x, p.y + 14, 17, 7, 0, 0, Math.PI * 2); ctx.fill();
      if (p.state === 'PRISONER') { ctx.strokeStyle = '#d5d0c4'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(p.x - 14, p.y); ctx.lineTo(p.x + 14, p.y); ctx.stroke(); }
      ctx.fillStyle = color; ctx.strokeStyle = outline; ctx.lineWidth = p.controlled ? 5 : 3; ctx.beginPath(); ctx.arc(p.x, p.y - 2 + bob, 14, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#20261f'; ctx.beginPath(); ctx.arc(p.x, p.y - 10 + bob, 8, Math.PI, Math.PI * 2); ctx.fill();
      if (p.controlled) { ctx.fillStyle = '#fff4d1'; ctx.beginPath(); ctx.moveTo(p.x, p.y - 31 + bob); ctx.lineTo(p.x - 7, p.y - 41 + bob); ctx.lineTo(p.x + 7, p.y - 41 + bob); ctx.fill(); }
      ctx.font = '800 9px Arial'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText(p.name, p.x, p.y + 32);
      if (p.state === 'ACTIVE') { ctx.fillStyle = '#141a15'; ctx.beginPath(); ctx.arc(p.x + 17, p.y - 18 + bob, 10, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = outline; ctx.lineWidth = 2; ctx.stroke(); ctx.fillStyle = '#fff'; ctx.font = '800 9px Arial'; ctx.fillText(String(p.exitOrder), p.x + 17, p.y - 15 + bob); }
      if (p.state === 'RETURNING') { ctx.fillStyle = now < p.ghostUntil ? '#b9ee3d' : '#f1d46c'; ctx.font = '800 8px Arial'; ctx.fillText('KEMBALI', p.x, p.y - 28); }
    };
    const draw = (now: number) => {
      const rect = canvas.getBoundingClientRect(); const dpr = Math.max(1, window.devicePixelRatio || 1); const cw = rect.width; const ch = rect.height;
      if (canvas.width !== Math.round(cw * dpr) || canvas.height !== Math.round(ch * dpr)) { canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr); }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, cw, ch);
      const scale = Math.min(cw / W, ch / H); const ox = (cw - W * scale) / 2; const oy = (ch - H * scale) / 2; ctx.save(); ctx.translate(ox, oy); ctx.scale(scale, scale);
      drawMap(); drawBase('blue'); drawBase('red');
      const me = players[0]; players.slice().sort((a, b) => a.y - b.y).forEach(p => drawPlayer(p, me, now));
      particles.forEach(p => { ctx.globalAlpha = Math.max(0, p.life / .65); ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill(); }); ctx.globalAlpha = 1;
      if (phase === 'COUNTDOWN' || phase === 'ROUND_OVER' || phase === 'MATCH_OVER') { ctx.fillStyle = 'rgba(12,17,13,.52)'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = '#fff4d1'; ctx.font = `800 ${phase === 'COUNTDOWN' ? 86 : 52}px var(--font-heading)`; ctx.textAlign = 'center'; ctx.fillText(announcement, W / 2, H / 2); }
      ctx.restore();
    };
    const loop = (now: number) => {
      const dt = Math.min(.033, (now - last) / 1000); last = now; update(dt, now); draw(now);
      if (now - lastHud > 100) { lastHud = now; const me = players[0]; setSnapshot({ blue: score.blue, red: score.red, round, timer, stamina: me.stamina / selected.stamina * 100, order: me.exitOrder, state: me.state, paused, phase, announcement, logs, mission: { ...mission }, team: players.filter(p => p.team === 'blue').map(p => ({ name: p.name, state: p.state })) }); }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); audio?.close(); };
  }, [mode, run, selected]);

  const missionCount = useMemo(() => Object.values(snapshot.mission).filter(Boolean).length, [snapshot.mission]);
  const start = () => { setSnapshot(initialSnapshot); setMode('playing'); setRun(v => v + 1); };
  const restart = () => { setRun(v => v + 1); };
  const togglePause = () => { keys.current.add('p'); };

  return (
    <main className="game-shell">
      <header className="game-topbar">
        <div className="brand-lockup"><span className="brand-kicker">Playable rules prototype</span><strong>BENTENGAN</strong><span>Squad Tag</span></div>
        <div className="top-actions"><div className="build-chip"><span /> PRD v0.1 · Local 2v2</div>{mode === 'playing' && <><button className="icon-button" onClick={togglePause} aria-label="Jeda"><Pause size={16} /></button><button className="icon-button" onClick={restart} aria-label="Mulai ulang"><RotateCcw size={16} /></button></>}</div>
      </header>
      <section className="prototype-grid">
        <div className="stage-card">
          <canvas ref={canvasRef} aria-label="Arena Kampung 17-an yang dapat dimainkan" />
          <div className="stage-hud"><div><b>BIRU</b><span>{snapshot.blue}</span></div><time>{formatTime(snapshot.timer)}</time><div><span>{snapshot.red}</span><b>MERAH</b></div></div>
          {mode === 'menu' && <div className="start-panel"><p>ATURAN UTAMA</p><h1>Keluar paling akhir.<br />Jadilah pemburu.</h1><span>Sentuh benteng, keluar, kejar lawan dengan urutan lebih rendah, lalu bebaskan rekan dari rantai.</span><div className="preset-row">{(Object.keys(PRESETS) as PresetKey[]).map(key => <button key={key} className={preset === key ? 'selected' : ''} onClick={() => setPreset(key)}><b>{PRESETS[key].label}</b><small>{PRESETS[key].copy}</small></button>)}</div><button className="start-button" onClick={start}><Play size={18} fill="currentColor" /> Mulai rules prototype</button></div>}
          {mode === 'playing' && <><div className="status-ribbon"><span className={`state-dot ${snapshot.state.toLowerCase()}`} />{snapshot.state.replace('_', ' ')}<b>PRIORITAS #{snapshot.order || '—'}</b></div><div className="stamina-bar"><span style={{ width: `${snapshot.stamina}%` }} /></div><div className="control-ribbon"><b>WASD</b> gerak <b>SHIFT</b> sprint <b>SPACE</b> parkour <b>P</b> jeda</div></>}
        </div>
        <aside className="mission-panel">
          <div className="mission-head"><span>Gate 1 · {missionCount}/4</span><h2>{mode === 'menu' ? 'Pahami dalam 60 detik' : 'Buktikan core loop'}</h2></div>
          <div className="mission-progress"><span style={{ width: `${missionCount * 25}%` }} /></div>
          <ul className="mission-list">
            <li className={snapshot.mission.refresh ? 'done' : ''}><Flag size={18} /><div><b>Refresh benteng</b><span>Kembali, charge 0,75 detik, lalu keluar lagi.</span></div></li>
            <li className={snapshot.mission.parkour ? 'done' : ''}><Gauge size={18} /><div><b>Parkour kontekstual</b><span>Tekan Space di dekat pagar, selokan, atau kursi.</span></div></li>
            <li className={snapshot.mission.tag ? 'done' : ''}><Zap size={18} /><div><b>Menangkap target</b><span>Outline hijau = urutannya lebih rendah.</span></div></li>
            <li className={snapshot.mission.rescue ? 'done' : ''}><Shield size={18} /><div><b>Rescue chain</b><span>Sentuh tahanan terluar untuk membebaskan semua.</span></div></li>
          </ul>
          {mode === 'playing' ? <><div className="team-status"><span>TIM BIRU</span>{snapshot.team.map(member => <div key={member.name}><b>{member.name}</b><em>{member.state.replace('_', ' ')}</em></div>)}</div><div className="event-feed">{snapshot.logs.map((entry, index) => <p key={`${entry}-${index}`}>{entry}</p>)}</div></> : <div className="reference-card"><img src="/characters.png" alt="Referensi karakter Bentengan Squad Tag" /><div><b>Arah visual dari concept sheet</b><span>Urban Indonesian squad · hand-inked · siluet kuat.</span></div></div>}
          <div className="audio-note"><Volume2 size={13} /> Cue audio aktif setelah game dimulai.</div>
        </aside>
      </section>
    </main>
  );
}
