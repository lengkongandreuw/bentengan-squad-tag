'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { BatteryCharging, Flag, Gauge, Pause, Play, RotateCcw, Shield, Volume2, Wrench, Zap } from 'lucide-react';
import { CharacterWorkshop } from '../components/character-workshop';
import { CHARACTERS, CHARACTER_BY_ID, CharacterId, characterAsset, publicAsset } from '../lib/characters';

type Team = 'blue' | 'red';
type PlayerState = 'IN_BASE' | 'ACTIVE' | 'PRISONER' | 'RETURNING';
type PlayerAction = 'tag' | 'rescue';
type Grade = 25 | 50 | 100;
type Player = {
  id: string; name: string; team: Team; characterId: CharacterId; controlled?: boolean; x: number; y: number;
  vx: number; vy: number; state: PlayerState; exitOrder: number; boost: number;
  baseCharge: number; exitDeadline: number; tagCooldown: number; parkourUntil: number; boostReadyAt: number;
  fortCharge: number; prisonOwner?: Team; prisonIndex: number; captures: number; aiSeed: number;
  rescueShieldUntil: number; capturedIds: string[];
  action?: PlayerAction; actionUntil: number;
};
type Obstacle = { x: number; y: number; w: number; h: number; kind: 'fence' | 'canal' | 'stall' | 'chairs' };
type Refill = { id: number; x: number; y: number; grade: Grade; lane: 0 | 1 | 2; expiresAt: number };
type Mission = { refresh: boolean; boost: boolean; parkour: boolean; tag: boolean; rescue: boolean };
type Snapshot = {
  blue: number; red: number; round: number; timer: number; boost: number; boostCountdown: number;
  order: number; state: PlayerState; paused: boolean; logs: string[]; mission: Mission;
  team: Array<{ name: string; characterId: CharacterId; state: PlayerState; boost: number }>;
  blueHeld: number; redHeld: number; pickupCount: number; fortLock: string; baseGrace: number; suddenDeath: boolean;
};

const W = 1440;
const H = 800;
const BASE_RADIUS = 74;
const BASES = { blue: { x: 112, y: 410 }, red: { x: 1328, y: 390 } };
const TEAM_COLOR = { blue: '#2f87ff', red: '#f0473e' };
const OBSTACLES: Obstacle[] = [
  { x: 244, y: 122, w: 146, h: 24, kind: 'fence' }, { x: 1044, y: 628, w: 142, h: 24, kind: 'fence' },
  { x: 538, y: 148, w: 102, h: 58, kind: 'stall' }, { x: 812, y: 596, w: 112, h: 48, kind: 'chairs' },
  { x: 402, y: 354, w: 168, h: 36, kind: 'canal' }, { x: 870, y: 410, w: 168, h: 36, kind: 'canal' },
  { x: 286, y: 598, w: 114, h: 24, kind: 'fence' }, { x: 1044, y: 166, w: 114, h: 24, kind: 'fence' },
  { x: 648, y: 296, w: 138, h: 54, kind: 'stall' }, { x: 652, y: 502, w: 136, h: 44, kind: 'chairs' },
  { x: 474, y: 666, w: 146, h: 24, kind: 'fence' }, { x: 820, y: 94, w: 146, h: 24, kind: 'fence' },
];
const initialSnapshot: Snapshot = {
  blue: 0, red: 0, round: 1, timer: 240, boost: 100, boostCountdown: 0, order: 0,
  state: 'IN_BASE', paused: false, logs: ['Prototype 5v5 siap.'],
  mission: { refresh: false, boost: false, parkour: false, tag: false, rescue: false }, team: [],
  blueHeld: 0, redHeld: 0, pickupCount: 0, fortLock: 'Benteng terbuka', baseGrace: 0, suddenDeath: false,
};

const other = (team: Team): Team => team === 'blue' ? 'red' : 'blue';
const distance = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const formatTime = (seconds: number) => {
  const s = Math.max(0, Math.ceil(seconds));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};
const statPercent = (value: number, min: number, max: number) => `${Math.round(clamp((value - min) / (max - min), 0, 1) * 100)}%`;

const ATLAS_WIDTH = 1448;
const ATLAS_HEIGHT = 1086;
const spriteImages = new Map<CharacterId, HTMLImageElement>();
const spriteFrame = (column: number, row: number) => {
  const x = Math.round(column * ATLAS_WIDTH / 8), y = Math.round(row * ATLAS_HEIGHT / 5);
  const right = Math.round((column + 1) * ATLAS_WIDTH / 8), bottom = Math.round((row + 1) * ATLAS_HEIGHT / 5);
  return { x, y, width: right - x, height: bottom - y };
};

const getSpriteImage = (id: CharacterId) => {
  const cached = spriteImages.get(id);
  if (cached) return cached;
  const image = new Image(); image.src = characterAsset(id, 'atlas.webp'); spriteImages.set(id, image); return image;
};

export function BentenganPrototype() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const keys = useRef<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<CharacterId>('kaka');
  const [mode, setMode] = useState<'menu' | 'playing'>('menu');
  const [view, setView] = useState<'game' | 'workshop'>('game');
  const [run, setRun] = useState(0);
  const [snapshot, setSnapshot] = useState<Snapshot>(initialSnapshot);
  const selected = CHARACTER_BY_ID[selectedId];
  const squad = useMemo(() => [selectedId, ...CHARACTERS.map(character => character.id).filter(id => id !== selectedId)].slice(0, 5), [selectedId]);

  useEffect(() => { CHARACTERS.forEach(character => getSpriteImage(character.id)); }, []);

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
    let raf = 0, last = performance.now(), lastHud = 0;
    let phase: 'COUNTDOWN' | 'PLAYING' | 'ROUND_OVER' | 'MATCH_OVER' = 'COUNTDOWN';
    let phaseUntil = performance.now() + 3000, timer = 240, round = 1, exitCounter = 0;
    let score = { blue: 0, red: 0 }, paused = false, announcement = mode === 'playing' ? 'BERSIAP!' : '', roundWinner: Team | undefined;
    let logs = ['5v5 · pemain yang keluar terakhir memiliki prioritas tangkap tertinggi.'];
    let mission: Mission = { refresh: false, boost: false, parkour: false, tag: false, rescue: false };
    let totalCapture = { blue: 0, red: 0 }, nextRefillSpawn = performance.now() + 8000, refillId = 0, suddenDeath = false;
    let particles: Array<{ x: number; y: number; vx: number; vy: number; life: number; color: string }> = [];
    let refills: Refill[] = [], audio: AudioContext | null = null, parkourLatch = false;

    const beep = (frequency: number, duration = .08) => {
      try {
        audio ??= new AudioContext(); const oscillator = audio.createOscillator(); const gain = audio.createGain();
        oscillator.frequency.value = frequency; gain.gain.value = .035; oscillator.connect(gain); gain.connect(audio.destination);
        oscillator.start(); gain.gain.exponentialRampToValueAtTime(.001, audio.currentTime + duration);
        oscillator.stop(audio.currentTime + duration);
      } catch { /* optional */ }
    };
    const makePlayer = (id: string, characterId: CharacterId, team: Team, slot: number, controlled = false): Player => {
      const b = BASES[team];
      const character = CHARACTER_BY_ID[characterId];
      return {
        id, name: character.name.toUpperCase(), team, characterId, controlled, x: b.x + (slot % 2) * (team === 'blue' ? 18 : -18), y: b.y - 52 + slot * 26,
        vx: 0, vy: 0, state: 'IN_BASE', exitOrder: 0, boost: character.boost,
        baseCharge: 0, exitDeadline: 0, tagCooldown: 0, parkourUntil: 0, boostReadyAt: 0, fortCharge: 0,
        prisonIndex: 0, captures: 0, rescueShieldUntil: 0, capturedIds: [], actionUntil: 0,
        aiSeed: .35 + slot * 1.17 + (team === 'red' ? 5.3 : 0),
      };
    };
    const makePlayers = () => {
      const ids = CHARACTERS.map(character => character.id);
      const blueRoster = [selectedId, ...ids.filter(id => id !== selectedId)].slice(0, 5);
      const redRoster = ids.slice().reverse().slice(0, 5);
      return [
        ...blueRoster.map((characterId, slot) => makePlayer(slot === 0 ? 'you' : `b${slot + 1}`, characterId, 'blue', slot, slot === 0)),
        ...redRoster.map((characterId, slot) => makePlayer(`r${slot + 1}`, characterId, 'red', slot)),
      ];
    };
    let players = makePlayers();
    const log = (text: string) => { logs = [text, ...logs].slice(0, 5); };
    const burst = (x: number, y: number, color: string, count = 12) => {
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        particles.push({ x, y, vx: Math.cos(a) * (30 + Math.random() * 80), vy: Math.sin(a) * (30 + Math.random() * 80), life: .65, color });
      }
    };
    const randomGrade = (): Grade => { const roll = Math.random(); return roll < .7 ? 25 : roll < .93 ? 50 : 100; };
    const spawnRefill = (now = performance.now()) => {
      const laneCounts = ([0, 1, 2] as const).map(lane => refills.filter(item => item.lane === lane).length);
      const minimum = Math.min(...laneCounts); const lane = laneCounts.indexOf(minimum) as 0 | 1 | 2;
      const laneBounds = [[92, 292], [300, 516], [524, 712]] as const;
      for (let tries = 0; tries < 30; tries++) {
        const x = 236 + Math.random() * (W - 472), y = laneBounds[lane][0] + Math.random() * (laneBounds[lane][1] - laneBounds[lane][0]);
        if (OBSTACLES.every(o => x < o.x - 28 || x > o.x + o.w + 28 || y < o.y - 28 || y > o.y + o.h + 28)) {
          refills.push({ id: ++refillId, x, y, grade: randomGrade(), lane, expiresAt: now + 25000 }); return;
        }
      }
    };
    const seedRefills = () => { refills = []; const now = performance.now(); for (let i = 0; i < 6; i++) spawnRefill(now); };
    seedRefills();
    const resetRound = () => {
      players = makePlayers(); seedRefills(); timer = 240; exitCounter = 0; totalCapture = { blue: 0, red: 0 }; suddenDeath = false; roundWinner = undefined;
      phase = 'COUNTDOWN'; phaseUntil = performance.now() + 2800; announcement = `RONDE ${round}`;
      log(`Ronde ${round}: 10 pemain menyusun urutan keluar.`);
    };
    const winRound = (team: Team, reason: string) => {
      if (phase !== 'PLAYING') return;
      score[team]++; roundWinner = team; phase = score[team] >= 2 ? 'MATCH_OVER' : 'ROUND_OVER';
      phaseUntil = performance.now() + (phase === 'MATCH_OVER' ? 7000 : 3800);
      announcement = phase === 'MATCH_OVER' ? `${team === 'blue' ? 'BIRU' : 'MERAH'} MENANG MATCH` : `${team === 'blue' ? 'BIRU' : 'MERAH'} MENANG · ${reason}`;
      beep(team === 'blue' ? 720 : 320, .25); burst(W / 2, H / 2, TEAM_COLOR[team], 38); log(announcement);
    };
    const fortOccupant = (baseTeam: Team, exceptId?: string) =>
      players.find(p => p.id !== exceptId && p.state === 'ACTIVE' && p.team !== baseTeam && distance(p, BASES[baseTeam]) < BASE_RADIUS);
    const tieHash = (id: string) => {
      let value = (2166136261 ^ round) >>> 0;
      for (let i = 0; i < id.length; i++) { value ^= id.charCodeAt(i); value = Math.imul(value, 16777619) >>> 0; }
      value ^= value >>> 16; value = Math.imul(value, 0x7feb352d) >>> 0; value ^= value >>> 15;
      return value >>> 0;
    };
    const segmentHitsRect = (a: Player, b: Player, o: Obstacle) => {
      if (o.kind === 'canal') return false;
      const steps = 8;
      for (let i = 1; i < steps; i++) {
        const t = i / steps, x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t;
        if (x >= o.x && x <= o.x + o.w && y >= o.y && y <= o.y + o.h) return true;
      }
      return false;
    };
    const hasLineOfSight = (a: Player, b: Player) => !OBSTACLES.some(o => segmentHitsRect(a, b, o));
    const blocked = (x: number, y: number, p: Player, now: number) => {
      if (now >= p.parkourUntil && OBSTACLES.some(o => x + 13 > o.x && x - 13 < o.x + o.w && y + 13 > o.y && y - 13 < o.y + o.h)) return true;
      if (p.state === 'IN_BASE' && p.baseCharge < CHARACTER_BY_ID[p.characterId].baseChargeTime && distance(p, BASES[p.team]) < BASE_RADIUS && distance({ x, y }, BASES[p.team]) >= BASE_RADIUS) return true;
      for (const team of ['blue', 'red'] as Team[]) {
        const entering = distance({ x, y }, BASES[team]) < BASE_RADIUS && distance(p, BASES[team]) >= BASE_RADIUS;
        if (entering && p.team !== team && fortOccupant(team, p.id)) return true;
      }
      return false;
    };
    const move = (p: Player, dx: number, dy: number, speed: number, dt: number, now: number) => {
      const len = Math.hypot(dx, dy) || 1; p.vx = dx / len * speed; p.vy = dy / len * speed;
      const nx = clamp(p.x + p.vx * dt, 34, W - 34), ny = clamp(p.y + p.vy * dt, 58, H - 32);
      if (!blocked(nx, p.y, p, now)) p.x = nx; if (!blocked(p.x, ny, p, now)) p.y = ny;
    };
    const baseVector = (p: Player) => ({ x: BASES[p.team].x - p.x, y: BASES[p.team].y - p.y });
    const aiVector = (p: Player, now: number) => {
      if (p.state === 'RETURNING') return baseVector(p);
      if (p.state === 'IN_BASE') return { x: W / 2 - p.x, y: H / 2 + Math.sin(now / 920 + p.aiSeed) * 230 - p.y };
      const held = players.filter(q => q.team === p.team && q.state === 'PRISONER').sort((a, b) => b.prisonIndex - a.prisonIndex);
      if (held.length && (p.aiSeed % 3 < 2.2 || held.length >= 3)) return { x: held[0].x - p.x, y: held[0].y - p.y };
      if (p.boost < 34) {
        const item = refills.slice().sort((a, b) => distance(p, a) - distance(p, b))[0];
        if (item && distance(p, item) < 360) return { x: item.x - p.x, y: item.y - p.y };
      }
      const threat = players.filter(q => q.team !== p.team && q.state === 'ACTIVE' && q.exitOrder > p.exitOrder).sort((a, b) => distance(p, a) - distance(p, b))[0];
      if (threat && distance(p, threat) < 175) return { x: p.x - threat.x, y: p.y - threat.y };
      const target = players.filter(q => q.team !== p.team && q.state === 'ACTIVE' && q.exitOrder < p.exitOrder).sort((a, b) => distance(p, a) - distance(p, b))[0];
      if (target) return { x: target.x - p.x, y: target.y - p.y };
      if (p.boost < 18 || Math.sin(now / 4300 + p.aiSeed) > .86) return baseVector(p);
      const enemy = BASES[other(p.team)]; return { x: enemy.x - p.x, y: enemy.y - p.y + Math.sin(now / 740 + p.aiSeed) * 150 };
    };
    const layoutPrisons = () => {
      (['blue', 'red'] as Team[]).forEach(owner => {
        players.filter(p => p.state === 'PRISONER' && p.prisonOwner === owner).forEach((p, i) => {
          p.prisonIndex = i; p.x = owner === 'blue' ? 214 + i * 34 : 1226 - i * 34; p.y = owner === 'blue' ? 492 + i * 11 : 288 - i * 11;
        });
      });
    };
    const capture = (winner: Player, loser: Player, now: number) => {
      const targetable = loser.state === 'ACTIVE' || (loser.state === 'RETURNING' && now >= loser.rescueShieldUntil);
      if (winner.state !== 'ACTIVE' || now < winner.parkourUntil || now < loser.parkourUntil || winner.tagCooldown > now || !targetable || winner.exitOrder <= loser.exitOrder) return;
      winner.tagCooldown = now + 500; winner.captures++; if (!winner.capturedIds.includes(loser.id)) winner.capturedIds.push(loser.id);
      winner.action = 'tag'; winner.actionUntil = now + 420;
      loser.state = 'PRISONER'; loser.prisonOwner = winner.team; loser.fortCharge = 0; loser.rescueShieldUntil = 0;
      burst(loser.x, loser.y, TEAM_COLOR[winner.team]); beep(winner.controlled ? 820 : 250);
      log(`${winner.name} #${winner.exitOrder} menangkap ${loser.name} #${loser.exitOrder}.`);
      if (winner.controlled) mission.tag = true; layoutPrisons();
      if (suddenDeath) winRound(winner.team, 'SUDDEN DEATH TAG');
    };
    const tagCheck = (now: number) => {
      const contacts: Array<{ attacker: Player; target: Player }> = [];
      for (let i = 0; i < players.length; i++) for (let j = i + 1; j < players.length; j++) {
        const a = players[i], b = players[j], contactDistance = distance(a, b);
        if (a.team === b.team || !hasLineOfSight(a, b) || now < a.parkourUntil || now < b.parkourUntil) continue;
        const aTargetable = a.state === 'ACTIVE' || (a.state === 'RETURNING' && now >= a.rescueShieldUntil);
        const bTargetable = b.state === 'ACTIVE' || (b.state === 'RETURNING' && now >= b.rescueShieldUntil);
        if (a.state === 'ACTIVE' && bTargetable && a.exitOrder > b.exitOrder && contactDistance <= CHARACTER_BY_ID[a.characterId].tagRange) contacts.push({ attacker: a, target: b });
        else if (b.state === 'ACTIVE' && aTargetable && b.exitOrder > a.exitOrder && contactDistance <= CHARACTER_BY_ID[b.characterId].tagRange) contacts.push({ attacker: b, target: a });
      }
      contacts.sort((a, b) => b.attacker.exitOrder - a.attacker.exitOrder || b.target.exitOrder - a.target.exitOrder || a.attacker.id.localeCompare(b.attacker.id));
      const resolved = new Set<string>();
      contacts.forEach(({ attacker, target }) => {
        if (resolved.has(attacker.id) || resolved.has(target.id)) return;
        const before = target.state; capture(attacker, target, now);
        if (before !== 'PRISONER' && target.state === 'PRISONER') { resolved.add(attacker.id); resolved.add(target.id); }
      });
    };
    const rescueCheck = (now: number) => {
      players.filter(p => p.state === 'ACTIVE').forEach(rescuer => {
        const held = players.filter(p => p.team === rescuer.team && p.state === 'PRISONER').sort((a, b) => b.prisonIndex - a.prisonIndex);
        const rescuerStats = CHARACTER_BY_ID[rescuer.characterId];
        if (held[0] && distance(rescuer, held[0]) < rescuerStats.rescueRange) {
          held.forEach(p => { p.state = 'RETURNING'; p.prisonOwner = undefined; p.rescueShieldUntil = now + rescuerStats.rescueShieldMs; p.x += rescuer.team === 'blue' ? -22 : 22; });
          rescuer.action = 'rescue'; rescuer.actionUntil = now + 460;
          burst(held[0].x, held[0].y, '#b9ee3d', 26); beep(620, .16); log(`${rescuer.name} membebaskan ${held.length} rekan.`);
          if (rescuer.controlled) mission.rescue = true;
        }
      });
    };
    const refillCheck = () => {
      players.filter(p => p.state === 'ACTIVE' && p.boost < CHARACTER_BY_ID[p.characterId].boost).forEach(p => {
        const item = refills.find(i => distance(p, i) < 27); if (!item) return;
        const maxBoost = CHARACTER_BY_ID[p.characterId].boost;
        p.boost = Math.min(maxBoost, p.boost + maxBoost * item.grade / 100); refills = refills.filter(i => i.id !== item.id);
        burst(item.x, item.y, item.grade === 100 ? '#ef75ff' : item.grade === 50 ? '#60e6ff' : '#b9ee3d', 18);
        beep(560 + item.grade * 2, .12); if (p.controlled) mission.boost = true; log(`${p.name} mengambil refill boost ${item.grade}%.`);
      });
    };
    const baseCheck = (p: Player, dt: number, now: number, exitCandidates: Player[]) => {
      if (p.state === 'PRISONER') return;
      const stats = CHARACTER_BY_ID[p.characterId], insideOwn = distance(p, BASES[p.team]) < BASE_RADIUS, maxBoost = stats.boost, chargeTime = stats.baseChargeTime;
      const contested = Boolean(fortOccupant(p.team));
      if (insideOwn) {
        if (contested) {
          if (p.state === 'IN_BASE' || p.state === 'RETURNING') exitCandidates.push(p);
        } else {
          if (p.state !== 'IN_BASE') { p.state = 'IN_BASE'; p.baseCharge = 0; p.exitDeadline = 0; p.fortCharge = 0; }
          const charging = players
            .filter(q => q.team === p.team && q.state === 'IN_BASE' && distance(q, BASES[q.team]) < BASE_RADIUS)
            .sort((a, b) => b.baseCharge - a.baseCharge || tieHash(a.id) - tieHash(b.id)).slice(0, 3);
          if (charging.some(q => q.id === p.id) && p.baseCharge < chargeTime) {
            p.baseCharge = Math.min(chargeTime, p.baseCharge + dt);
            if (p.baseCharge >= chargeTime && !p.exitDeadline) p.exitDeadline = now + 5000;
          }
          p.boost = maxBoost; p.boostReadyAt = 0;
          if (p.baseCharge >= chargeTime && p.exitDeadline > 0 && now >= p.exitDeadline) {
            p.x = BASES[p.team].x + (p.team === 'blue' ? BASE_RADIUS + 5 : -BASE_RADIUS - 5);
            exitCandidates.push(p); log(`${p.name} dipaksa keluar—grace 5 detik habis.`);
          }
        }
      } else if (p.state === 'IN_BASE' && p.baseCharge >= chargeTime) {
        exitCandidates.push(p);
      }
      if (p.state === 'ACTIVE' && distance(p, BASES[other(p.team)]) < BASE_RADIUS) {
        const defending = players.some(q => q.team !== p.team && q.state === 'ACTIVE' && distance(q, BASES[other(p.team)]) < BASE_RADIUS);
        p.fortCharge = defending ? 0 : p.fortCharge + dt;
        if (p.fortCharge >= 1.5) winRound(p.team, 'BENTENG DIREBUT');
      } else p.fortCharge = 0;
      if (p.boost < maxBoost && p.boostReadyAt > 0 && now >= p.boostReadyAt) {
        p.boost = maxBoost; p.boostReadyAt = 0; if (p.controlled) { log(`Boost ${p.name} pulih penuh setelah 20 detik.`); beep(690, .13); }
      }
    };
    const update = (dt: number, now: number) => {
      if (keys.current.has('p')) { keys.current.delete('p'); paused = !paused; }
      if (paused || mode !== 'playing') return;
      if (phase === 'COUNTDOWN') {
        announcement = `${Math.max(1, Math.ceil((phaseUntil - now) / 1000))}`;
        if (now >= phaseUntil) { phase = 'PLAYING'; announcement = 'MULAI!'; setTimeout(() => { if (phase === 'PLAYING') announcement = ''; }, 800); }
        return;
      }
      if (phase === 'ROUND_OVER' && now >= phaseUntil) { round++; resetRound(); return; }
      if (phase === 'MATCH_OVER') { if (now >= phaseUntil) { score = { blue: 0, red: 0 }; round = 1; resetRound(); } return; }
      if (!suddenDeath) timer -= dt;
      if (!suddenDeath && timer <= 0) {
        const blueHeld = players.filter(p => p.team === 'red' && p.state === 'PRISONER').length;
        const redHeld = players.filter(p => p.team === 'blue' && p.state === 'PRISONER').length;
        const blueUnique = new Set(players.filter(p => p.team === 'blue').flatMap(p => p.capturedIds)).size;
        const redUnique = new Set(players.filter(p => p.team === 'red').flatMap(p => p.capturedIds)).size;
        if (blueHeld !== redHeld) winRound(blueHeld > redHeld ? 'blue' : 'red', 'WAKTU HABIS');
        else if (blueUnique !== redUnique) winRound(blueUnique > redUnique ? 'blue' : 'red', 'TANGKAPAN UNIK');
        else { suddenDeath = true; timer = 0; announcement = 'SUDDEN DEATH'; log('Skor seri—tag atau rebut benteng berikutnya menang.'); beep(760, .22); }
      }
      refills = refills.filter(item => item.expiresAt > now);
      if (now >= nextRefillSpawn && refills.length < 9) { spawnRefill(now); nextRefillSpawn = now + 8000 + Math.random() * 4000; }
      const me = players[0]; let dx = 0, dy = 0;
      if (keys.current.has('a') || keys.current.has('arrowleft')) dx--;
      if (keys.current.has('d') || keys.current.has('arrowright')) dx++;
      if (keys.current.has('w') || keys.current.has('arrowup')) dy--;
      if (keys.current.has('s') || keys.current.has('arrowdown')) dy++;
      const boosting = keys.current.has('shift') && me.boost > 0 && (dx || dy) && (me.state === 'ACTIVE' || me.state === 'IN_BASE');
      if (boosting) { me.boost = Math.max(0, me.boost - selected.boostDrain * dt); me.boostReadyAt = now + 20000; mission.boost = true; }
      const space = keys.current.has(' ');
      const parkourCost = 8 / selected.agility;
      if (space && !parkourLatch && me.boost >= parkourCost && now > me.parkourUntil && (dx || dy) && (me.state === 'ACTIVE' || me.state === 'IN_BASE')) {
        const near = OBSTACLES.some(o => me.x + 44 > o.x && me.x - 44 < o.x + o.w && me.y + 44 > o.y && me.y - 44 < o.y + o.h);
        if (near) {
          const parkourDistance = 54 * selected.agility;
          me.parkourUntil = now + 320; me.boost = Math.max(0, me.boost - parkourCost); me.boostReadyAt = now + 20000;
          me.x = clamp(me.x + dx * parkourDistance, 34, W - 34); me.y = clamp(me.y + dy * parkourDistance, 58, H - 32);
          mission.parkour = true; burst(me.x, me.y, '#f4df9a', 9); beep(460);
        }
      }
      parkourLatch = space;
      if (me.state === 'RETURNING') { const vector = baseVector(me); move(me, vector.x, vector.y, selected.speed, dt, now); }
      else if ((dx || dy) && me.state !== 'PRISONER') move(me, dx, dy, selected.speed * (boosting ? selected.boostMultiplier : 1), dt, now);
      else { me.vx = 0; me.vy = 0; }
      players.slice(1).forEach(p => {
        if (p.state === 'PRISONER') { p.vx = 0; p.vy = 0; return; }
        const stats = CHARACTER_BY_ID[p.characterId];
        const vector = aiVector(p, now), far = Math.hypot(vector.x, vector.y) > 165;
        const boostAi = p.state === 'ACTIVE' && p.boost > 12 && far && Math.sin(now / 950 + p.aiSeed) > -.15;
        if (boostAi) { p.boost = Math.max(0, p.boost - stats.boostDrain * .66 * dt); p.boostReadyAt = now + 20000; }
        move(p, vector.x, vector.y, stats.speed * .89 * (boostAi ? stats.boostMultiplier : 1), dt, now);
      });
      const exitCandidates: Player[] = [];
      players.forEach(p => baseCheck(p, dt, now, exitCandidates));
      Array.from(new Map(exitCandidates.map(p => [p.id, p])).values()).sort((a, b) => tieHash(a.id) - tieHash(b.id)).forEach(p => {
        p.state = 'ACTIVE'; p.exitOrder = ++exitCounter; p.baseCharge = 0; p.exitDeadline = 0; p.rescueShieldUntil = 0;
        if (p.controlled && p.exitOrder > 5) mission.refresh = true;
        log(`${p.name} keluar sebagai urutan #${p.exitOrder}.`); beep(p.controlled ? 520 : 380);
      });
      refillCheck(); tagCheck(now); rescueCheck(now); layoutPrisons();
      (['blue', 'red'] as Team[]).forEach(team => {
        const allHeld = players.filter(p => p.team === other(team)).every(p => p.state === 'PRISONER' && p.prisonOwner === team);
        totalCapture[team] = allHeld ? totalCapture[team] + dt : 0;
        if (totalCapture[team] >= 2) winRound(team, 'SEMUA LAWAN DITANGKAP');
      });
      particles.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= .94; p.vy *= .94; p.life -= dt; });
      particles = particles.filter(p => p.life > 0);
    };

    const rounded = (x: number, y: number, w: number, h: number, r: number) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); };
    const drawMap = () => {
      const ground = ctx.createLinearGradient(0, 0, 0, H); ground.addColorStop(0, '#cdbb92'); ground.addColorStop(.45, '#87925d'); ground.addColorStop(1, '#43563d');
      ctx.fillStyle = ground; ctx.fillRect(0, 0, W, H); ctx.fillStyle = 'rgba(242,216,165,.2)';
      for (let y = 80; y < H; y += 48) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y - 130); ctx.lineTo(W, y - 102); ctx.lineTo(0, y + 28); ctx.fill(); }
      ctx.strokeStyle = 'rgba(255,255,255,.12)'; for (let x = -H; x < W; x += 48) { ctx.beginPath(); ctx.moveTo(x, H); ctx.lineTo(x + H, 0); ctx.stroke(); }
      ctx.fillStyle = '#233726'; ctx.fillRect(0, 34, W, 30); ctx.fillRect(0, H - 32, W, 32);
      ctx.font = '800 15px var(--font-heading)'; ctx.fillStyle = '#f1e3c3'; ctx.textAlign = 'center'; ctx.fillText('KAMPUNG MERDEKA · ARENA 5v5', W / 2, 55);
      for (let x = 28; x < W; x += 62) { ctx.fillStyle = x % 124 ? '#f4e2bd' : '#d83a33'; ctx.beginPath(); ctx.moveTo(x, 38); ctx.lineTo(x + 18, 38); ctx.lineTo(x + 9, 59); ctx.fill(); }
      const building = (x: number, y: number, w: number, h: number, color: string, label: string) => {
        ctx.fillStyle = 'rgba(0,0,0,.22)'; rounded(x + 10, y + 11, w, h, 8); ctx.fill(); ctx.fillStyle = color; rounded(x, y, w, h, 8); ctx.fill();
        ctx.fillStyle = '#3e3025'; ctx.fillRect(x, y, w, 14); ctx.fillStyle = '#f4e3bd'; ctx.font = '800 10px Arial'; ctx.textAlign = 'left'; ctx.fillText(label, x + 10, y + 38);
      };
      building(60, 78, 164, 78, '#aa6b3b', 'WARUNG BU SRI'); building(1200, 616, 170, 82, '#a45e34', 'POS RONDA'); building(1136, 76, 160, 74, '#84623d', 'BALAI WARGA');
      OBSTACLES.forEach(o => {
        if (o.kind === 'canal') { ctx.fillStyle = '#294e54'; ctx.fillRect(o.x, o.y, o.w, o.h); ctx.strokeStyle = '#81b2ae'; ctx.setLineDash([10, 8]); ctx.strokeRect(o.x, o.y, o.w, o.h); ctx.setLineDash([]); }
        else if (o.kind === 'stall') { ctx.fillStyle = '#762d2b'; rounded(o.x, o.y, o.w, o.h, 5); ctx.fill(); ctx.fillStyle = '#f0d16f'; ctx.fillRect(o.x + 8, o.y + 8, o.w - 16, 10); }
        else if (o.kind === 'chairs') { ctx.fillStyle = '#327b62'; for (let x = o.x; x < o.x + o.w; x += 23) { rounded(x, o.y, 18, o.h, 4); ctx.fill(); } }
        else { ctx.fillStyle = '#ddd2ad'; ctx.fillRect(o.x, o.y, o.w, o.h); ctx.strokeStyle = '#473c2e'; ctx.lineWidth = 3; for (let x = o.x + 8; x < o.x + o.w; x += 22) { ctx.beginPath(); ctx.moveTo(x, o.y); ctx.lineTo(x, o.y + o.h); ctx.stroke(); } }
      });
      ctx.fillStyle = 'rgba(23,29,24,.7)'; rounded(168, 462, 218, 92, 10); ctx.fill(); rounded(1054, 226, 218, 92, 10); ctx.fill();
      ctx.fillStyle = '#f5e8c6'; ctx.font = '800 11px Arial'; ctx.textAlign = 'center'; ctx.fillText('PENJARA BIRU', 277, 481); ctx.fillText('PENJARA MERAH', 1163, 245);
    };
    const drawBase = (team: Team) => {
      const b = BASES[team], color = TEAM_COLOR[team], occupant = fortOccupant(team);
      ctx.fillStyle = `${color}${occupant ? '42' : '27'}`; ctx.beginPath(); ctx.arc(b.x, b.y, BASE_RADIUS, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = occupant ? '#f5cf45' : color; ctx.lineWidth = occupant ? 7 : 4; ctx.setLineDash(occupant ? [3, 5] : [8, 7]); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#171d18'; rounded(b.x - 31, b.y - 34, 62, 68, 8); ctx.fill(); ctx.fillStyle = color; ctx.fillRect(b.x - 4, b.y - 58, 8, 59);
      ctx.beginPath(); ctx.moveTo(b.x + 4, b.y - 56); ctx.lineTo(b.x + (team === 'blue' ? 34 : -34), b.y - 45); ctx.lineTo(b.x + 4, b.y - 31); ctx.fill();
      ctx.fillStyle = '#fff3d0'; ctx.font = '800 10px Arial'; ctx.textAlign = 'center'; ctx.fillText(team === 'blue' ? 'BENTENG BIRU' : 'BENTENG MERAH', b.x, b.y + 53);
      if (occupant) { ctx.fillStyle = '#f5cf45'; ctx.font = '900 9px Arial'; ctx.fillText(`TERKUNCI · ${occupant.name}`, b.x, b.y + 70); }
    };
    const drawRefill = (item: Refill, now: number) => {
      const color = item.grade === 100 ? '#ef75ff' : item.grade === 50 ? '#60e6ff' : '#b9ee3d', pulse = 1 + Math.sin(now / 220 + item.id) * .12;
      ctx.save(); ctx.translate(item.x, item.y); ctx.scale(pulse, pulse); ctx.shadowColor = color; ctx.shadowBlur = 16;
      ctx.fillStyle = '#172019'; ctx.strokeStyle = color; ctx.lineWidth = 3; rounded(-17, -17, 34, 34, 9); ctx.fill(); ctx.stroke();
      ctx.shadowBlur = 0; ctx.fillStyle = color; ctx.font = '900 10px Arial'; ctx.textAlign = 'center'; ctx.fillText(`+${item.grade}`, 0, 4); ctx.restore();
    };
    const relationColor = (p: Player, me: Player, now: number) => {
      if (p.team === me.team) return '#9fd0ff'; if (p.state === 'PRISONER') return '#8f8d84';
      if (p.state === 'RETURNING' && now < p.rescueShieldUntil) return '#60e6ff';
      if (me.state !== 'ACTIVE') return '#f1d46c';
      if ((p.state === 'ACTIVE' || p.state === 'RETURNING') && me.exitOrder > p.exitOrder) return '#b9ee3d';
      return p.state === 'ACTIVE' && p.exitOrder > me.exitOrder ? '#ff544b' : '#f1d46c';
    };
    const drawPlayer = (p: Player, me: Player, now: number) => {
      const color = TEAM_COLOR[p.team], outline = relationColor(p, me, now), bob = now < p.parkourUntil ? -15 : 0;
      const stats = CHARACTER_BY_ID[p.characterId], image = getSpriteImage(p.characterId), speed = Math.hypot(p.vx, p.vy);
      const horizontal = Math.abs(p.vx) > Math.abs(p.vy);
      const direction = horizontal ? (p.vx >= 0 ? 'east' : 'west') : p.vy < 0 ? 'north' : 'south';
      let row = direction === 'north' ? 2 : direction === 'south' ? 0 : 1, columns = [0], mirror = direction === 'east';
      if (phase === 'ROUND_OVER' || phase === 'MATCH_OVER') { row = 4; columns = roundWinner === p.team ? [2, 3, 4] : [5, 6, 7]; mirror = false; }
      else if (p.state === 'PRISONER') { row = 4; columns = [0, 1]; mirror = false; }
      else if (p.action && now < p.actionUntil) { row = 3; columns = p.action === 'tag' ? [0, 1, 2, 3] : [4, 5, 6, 7]; mirror = false; }
      else if (speed > 8) columns = speed > stats.speed * 1.16 ? [7] : [1, 2, 3, 4, 5, 6];
      const frame = spriteFrame(columns[Math.floor(now / (columns.length > 1 ? 92 : 180)) % columns.length], row);

      ctx.fillStyle = 'rgba(0,0,0,.34)'; ctx.beginPath(); ctx.ellipse(p.x, p.y + 15, 22 * stats.visualScale, 8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = outline; ctx.lineWidth = p.controlled ? 5 : 3; ctx.beginPath(); ctx.ellipse(p.x, p.y + 10, 21 * stats.visualScale, 10, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(p.x, p.y + 10, 16 * stats.visualScale, 7, 0, 0, Math.PI * 2); ctx.stroke();
      if (p.state === 'PRISONER') { ctx.strokeStyle = '#d5d0c4'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(p.x - 20, p.y + 2); ctx.lineTo(p.x + 20, p.y + 2); ctx.stroke(); }

      if (image.complete && image.naturalWidth) {
        const height = 74 * stats.visualScale, width = height * frame.width / frame.height;
        ctx.save(); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
        if (mirror) { ctx.translate(p.x * 2, 0); ctx.scale(-1, 1); }
        ctx.drawImage(image, frame.x, frame.y, frame.width, frame.height, p.x - width / 2, p.y + 18 - height + bob, width, height);
        ctx.restore();
      } else {
        ctx.fillStyle = color; ctx.strokeStyle = outline; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(p.x, p.y - 2 + bob, 14, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
      if (p.controlled) { ctx.fillStyle = '#fff4d1'; ctx.beginPath(); ctx.moveTo(p.x, p.y - 58 + bob); ctx.lineTo(p.x - 7, p.y - 69 + bob); ctx.lineTo(p.x + 7, p.y - 69 + bob); ctx.fill(); }
      ctx.font = '800 9px Arial'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.strokeStyle = '#111612'; ctx.lineWidth = 3; ctx.strokeText(p.name, p.x, p.y + 34); ctx.fillText(p.name, p.x, p.y + 34);
      if (p.state === 'ACTIVE') {
        ctx.fillStyle = '#141a15'; ctx.beginPath(); ctx.arc(p.x + 23, p.y - 35 + bob, 10, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = outline; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.font = '800 9px Arial'; ctx.fillText(String(p.exitOrder), p.x + 23, p.y - 32 + bob);
      }
      if (p.state === 'RETURNING') { ctx.fillStyle = now < p.rescueShieldUntil ? '#60e6ff' : '#f5cf45'; ctx.font = '800 8px Arial'; ctx.fillText(now < p.rescueShieldUntil ? 'GHOST' : 'KEMBALI', p.x, p.y - 55); }
      if (p.state === 'IN_BASE' && p.baseCharge < stats.baseChargeTime) { ctx.fillStyle = '#9b9d91'; ctx.fillRect(p.x - 18, p.y + 40, 36, 4); ctx.fillStyle = '#60e6ff'; ctx.fillRect(p.x - 18, p.y + 40, 36 * p.baseCharge / stats.baseChargeTime, 4); }
      if (p.fortCharge > 0) { ctx.fillStyle = '#f5cf45'; ctx.fillRect(p.x - 18, p.y + 40, 36 * Math.min(1, p.fortCharge / 1.5), 4); }
    };
    const draw = (now: number) => {
      const rect = canvas.getBoundingClientRect(), dpr = Math.max(1, window.devicePixelRatio || 1), cw = rect.width, ch = rect.height;
      if (canvas.width !== Math.round(cw * dpr) || canvas.height !== Math.round(ch * dpr)) { canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr); }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, cw, ch);
      const me = players[0];
      const scale = mode === 'playing' ? Math.max(cw / 980, ch / 620) : Math.min(cw / W, ch / H);
      const halfW = cw / (2 * scale), halfH = ch / (2 * scale);
      const camX = mode === 'playing' ? clamp(me.x, halfW, W - halfW) : W / 2;
      const camY = mode === 'playing' ? clamp(me.y, halfH, H - halfH) : H / 2;
      ctx.save(); ctx.translate(cw / 2, ch / 2); ctx.scale(scale, scale); ctx.translate(-camX, -camY);
      drawMap(); refills.forEach(item => drawRefill(item, now)); drawBase('blue'); drawBase('red');
      players.slice().sort((a, b) => a.y - b.y).forEach(p => drawPlayer(p, me, now));
      particles.forEach(p => { ctx.globalAlpha = Math.max(0, p.life / .65); ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill(); }); ctx.globalAlpha = 1;
      ctx.restore();
      if (mode === 'playing') {
        const marker = (point: { x: number; y: number }, label: string, color: string) => {
          const sx = (point.x - camX) * scale + cw / 2, sy = (point.y - camY) * scale + ch / 2;
          if (sx > 36 && sx < cw - 36 && sy > 70 && sy < ch - 36) return;
          const x = clamp(sx, 28, cw - 28), y = clamp(sy, 72, ch - 28);
          ctx.fillStyle = '#111812dd'; ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 16, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          ctx.fillStyle = color; ctx.font = '900 9px Arial'; ctx.textAlign = 'center'; ctx.fillText(label, x, y + 3);
        };
        marker(BASES.blue, 'B', TEAM_COLOR.blue); marker(BASES.red, 'M', TEAM_COLOR.red);
        const outerPrisoner = players.filter(p => p.team === me.team && p.state === 'PRISONER').sort((a, b) => b.prisonIndex - a.prisonIndex)[0];
        if (outerPrisoner) marker(outerPrisoner, 'P', '#b9ee3d');
      }
      if (phase !== 'PLAYING') {
        ctx.fillStyle = 'rgba(12,17,13,.52)'; ctx.fillRect(0, 0, cw, ch); ctx.fillStyle = '#fff4d1';
        ctx.font = `800 ${phase === 'COUNTDOWN' ? 90 : 54}px var(--font-heading)`; ctx.textAlign = 'center'; ctx.fillText(announcement, cw / 2, ch / 2);
      }
    };
    const loop = (now: number) => {
      const dt = Math.min(.033, (now - last) / 1000); last = now; update(dt, now); draw(now);
      if (now - lastHud > 100) {
        lastHud = now; const me = players[0], blueLock = fortOccupant('blue'), redLock = fortOccupant('red');
        setSnapshot({
          blue: score.blue, red: score.red, round, timer, boost: me.boost / selected.boost * 100,
          boostCountdown: me.boost >= selected.boost || !me.boostReadyAt ? 0 : Math.max(0, Math.ceil((me.boostReadyAt - now) / 1000)),
          order: me.exitOrder, state: me.state, paused, logs, mission: { ...mission },
          team: players.filter(p => p.team === 'blue').map(p => ({ name: p.name, characterId: p.characterId, state: p.state, boost: p.boost / CHARACTER_BY_ID[p.characterId].boost * 100 })),
          blueHeld: players.filter(p => p.team === 'red' && p.state === 'PRISONER').length,
          redHeld: players.filter(p => p.team === 'blue' && p.state === 'PRISONER').length,
          pickupCount: refills.length,
          fortLock: blueLock ? `Biru dikunci ${blueLock.name}` : redLock ? `Merah dikunci ${redLock.name}` : 'Benteng terbuka',
          baseGrace: me.state === 'IN_BASE' && me.exitDeadline ? Math.max(0, Math.ceil((me.exitDeadline - now) / 1000)) : 0,
          suddenDeath,
        });
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); audio?.close(); };
  }, [mode, run, selected, selectedId]);

  const missionCount = useMemo(() => Object.values(snapshot.mission).filter(Boolean).length, [snapshot.mission]);
  const start = () => { setSnapshot(initialSnapshot); setMode('playing'); setRun(v => v + 1); };
  if (view === 'workshop') return <main className="game-shell"><CharacterWorkshop onClose={() => setView('game')} /></main>;
  return (
    <main className="game-shell">
      <header className="game-topbar">
        <div className="brand-lockup"><span className="brand-kicker">Playable rules prototype</span><strong>BENTENGAN</strong><span>Squad Tag</span></div>
        <div className="top-actions"><div className="build-chip"><span /> Characters v2 · Distinct roles</div><button className="tool-button" onClick={() => setView('workshop')}><Wrench size={15} /> Character Workshop</button>{mode === 'playing' && <><button className="icon-button" onClick={() => keys.current.add('p')} aria-label="Jeda"><Pause size={16} /></button><button className="icon-button" onClick={() => setRun(v => v + 1)} aria-label="Mulai ulang"><RotateCcw size={16} /></button></>}</div>
      </header>
      <section className="prototype-grid">
        <div className="stage-card">
          <canvas ref={canvasRef} aria-label="Arena Kampung Merdeka 5 lawan 5 yang dapat dimainkan" />
          <div className="stage-hud"><div><b>BIRU</b><span>{snapshot.blue}</span><small>{snapshot.blueHeld}/5 ditahan</small></div><time>{snapshot.suddenDeath ? 'SD' : formatTime(snapshot.timer)}</time><div><small>{snapshot.redHeld}/5 ditahan</small><span>{snapshot.red}</span><b>MERAH</b></div></div>
          {mode === 'menu' && <div className="start-panel character-select">
            <div className="character-select-heading"><div><p>ROSTER 5v5 · PILIH KARAKTER</p><h1>Keluar terakhir.<br />Tangkap lebih dulu.</h1></div><span>Setiap karakter kini memiliki trade-off dan passive yang benar-benar aktif di arena.</span></div>
            <div className="character-row">{CHARACTERS.map(character => <button key={character.id} className={selectedId === character.id ? 'selected' : ''} onClick={() => setSelectedId(character.id)} aria-pressed={selectedId === character.id}><img src={characterAsset(character.id, 'portrait.webp')} alt="" /><span><b>{character.name}</b><small>{character.role}</small><em>{character.passiveName}</em></span></button>)}</div>
            <div className="selected-character" style={{ borderColor: selected.accent }}>
              <img src={characterAsset(selected.id, 'portrait.webp')} alt={`Portrait ${selected.name}`} />
              <div className="selected-summary"><span>{selected.role}</span><b>{selected.name}</b><small>{selected.copy}</small><div className="character-passive"><strong>{selected.passiveName}</strong><i>{selected.passiveCopy}</i></div></div>
              <dl>
                <div><dt>Speed <b>{selected.speed}</b></dt><dd><i><span style={{ width: statPercent(selected.speed, 190, 240) }} /></i></dd></div>
                <div><dt>Boost <b>{selected.boost}</b></dt><dd><i><span style={{ width: statPercent(selected.boost, 84, 124) }} /></i></dd></div>
                <div><dt>Agility <b>{selected.agility.toFixed(2)}</b></dt><dd><i><span style={{ width: statPercent(selected.agility, .82, 1.25) }} /></i></dd></div>
              </dl>
            </div>
            <div className="squad-preview"><span>SKUAD BIRU</span><div>{squad.map((id, index) => <figure key={id} className={index === 0 ? 'controlled' : ''}><img src={characterAsset(id, 'portrait.webp')} alt={CHARACTER_BY_ID[id].name} /><figcaption>{index === 0 ? 'KAMU' : CHARACTER_BY_ID[id].name}</figcaption></figure>)}</div><button className="start-button" onClick={start}><Play size={18} fill="currentColor" /> Main sebagai {selected.name}</button></div>
          </div>}
          {mode === 'playing' && <><div className="status-ribbon"><span className={`state-dot ${snapshot.state.toLowerCase()}`} />{snapshot.state.replace('_', ' ')}<b>PRIORITAS #{snapshot.order || '—'}</b>{snapshot.baseGrace > 0 && <strong>KELUAR {snapshot.baseGrace}s</strong>}<em>{snapshot.fortLock}</em></div><div className="character-hud"><img src={characterAsset(selected.id, 'portrait.webp')} alt="" /><span><b>{selected.name}</b><small>{selected.passiveName}</small></span></div><div className="boost-stack"><div className="boost-label"><span>BOOST</span><b>{Math.round(snapshot.boost)}%</b><em>{snapshot.boostCountdown ? `PULIH ${snapshot.boostCountdown}s` : 'SIAP'}</em></div><div className="stamina-bar"><span style={{ width: `${snapshot.boost}%` }} /></div></div><div className="pickup-legend"><span className="grade-25">+25%</span><span className="grade-50">+50%</span><span className="grade-100">+100%</span><em>{snapshot.pickupCount} item</em></div><div className="control-ribbon"><b>WASD</b> gerak <b>SHIFT</b> boost <b>SPACE</b> parkour <b>P</b> jeda</div></>}
        </div>
        <aside className="mission-panel">
          <div className="mission-head"><span>Rules test · {missionCount}/5</span><h2>{mode === 'menu' ? 'Kuasai aturan baru' : 'Buktikan core loop'}</h2></div>
          <div className="mission-progress"><span style={{ width: `${missionCount * 20}%` }} /></div>
          <ul className="mission-list">
            <li className={snapshot.mission.refresh ? 'done' : ''}><Flag size={18} /><div><b>Refresh prioritas</b><span>Kembali ke benteng dan keluar lagi sebagai urutan terbaru.</span></div></li>
            <li className={snapshot.mission.boost ? 'done' : ''}><BatteryCharging size={18} /><div><b>Kelola boost</b><span>Shift untuk boost. Pulih 20 detik, ambil +25/+50/+100, atau pulang.</span></div></li>
            <li className={snapshot.mission.parkour ? 'done' : ''}><Gauge size={18} /><div><b>Parkour kontekstual</b><span>Tekan Space di dekat rintangan.</span></div></li>
            <li className={snapshot.mission.tag ? 'done' : ''}><Zap size={18} /><div><b>Menangkap target</b><span>Outline hijau = keluar lebih dulu dan boleh ditangkap.</span></div></li>
            <li className={snapshot.mission.rescue ? 'done' : ''}><Shield size={18} /><div><b>Bebaskan penjara</b><span>Jangkau rekan terluar untuk membebaskan seluruh rantai.</span></div></li>
          </ul>
          {mode === 'playing' ? <><div className="team-status"><span>TIM BIRU · 5 PEMAIN</span>{snapshot.team.map((member, index) => <div key={`${member.name}-${index}`}><img src={characterAsset(member.characterId, 'portrait.webp')} alt="" /><b>{member.name}</b><i style={{ width: `${Math.min(100, member.boost)}%` }} /><em>{member.state.replace('_', ' ')}</em></div>)}</div><div className="event-feed">{snapshot.logs.map((entry, index) => <p key={`${entry}-${index}`}>{entry}</p>)}</div></> : <div className="reference-card"><img src={publicAsset('characters.png')} alt="Referensi karakter Bentengan Squad Tag" /><div><b>Enam sprite produksi terpasang</b><span>Atlas, portrait, animasi arah, tag, rescue, tahanan, menang, dan kalah.</span></div></div>}
          <div className="audio-note"><Volume2 size={13} /> Cue audio aktif setelah game dimulai.</div>
        </aside>
      </section>
    </main>
  );
}
