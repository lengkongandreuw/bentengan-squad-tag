import type { Team } from '../world/map-data/field-types';
import type { PlayerAction, PlayerState } from '../game-core/match-types';
import type { CharacterId } from '../../lib/characters';
import {
  CHARACTER_BY_ID,
  ULTIMATE_CHARACTER_IDS,
  characterMirrorsWest,
  characterUsesDedicatedEast,
} from '../../lib/characters.ts';
import { clamp } from '../../lib/math.ts';
import {
  directionFromVelocity,
  directionalRow,
  shouldMirrorSprite,
  sprintEffectRotation,
} from '../../lib/sprite-motion.js';
import { characterAnimationMapping } from '../../lib/character-animation.js';
import { seriesFrame } from '../../lib/series-animation.js';
import { spritePlacement } from '../../lib/sprite-studio-model.js';
import type { createStudioResolver } from '../../lib/sprite-studio';
import { TEAM_COLOR } from '../world/team-tables.ts';
import { relationColor } from './relation-color.ts';
import { roundedOn } from './canvas-shapes.ts';

type MatchPhase = 'COUNTDOWN' | 'PLAYING' | 'ROUND_OVER' | 'MATCH_OVER';

// 7×6 source-sheet frame; reads exactly seven columns (HEAD math verbatim).
const spriteFrame = (
  width: number,
  height: number,
  column: number,
  row: number,
) => {
  const x = Math.round((column * width) / 7),
    y = Math.round((row * height) / 6);
  const right = Math.round(((column + 1) * width) / 7),
    bottom = Math.round(((row + 1) * height) / 6);
  return { x, y, width: right - x, height: bottom - y };
};

// Per-frame player renderer. All runtime state arrives through live
// getters (the composition root reassigns phase/meters/ctx); sprite
// sheets and ultimate strip images come from the owner's caches.
export type DrawPlayerWorld = {
  getContext: () => CanvasRenderingContext2D;
  kanal: boolean;
  isWaterAt: (x: number, y: number) => boolean;
  getPhase: () => MatchPhase;
  getRoundWinner: () => Team | undefined;
  getTeamCombos: () => Record<Team, { surgeUntil: number }>;
  getUltimateBuffUntil: () => number;
  getUltimateMeter: () => number;
  rajaCastMs: number;
  kakaCastMs: number;
  kakaFrames: number;
  getSpriteImage: (id: CharacterId) => HTMLImageElement;
  getSeriesImage: (id: CharacterId) => HTMLImageElement;
  getSprintDustImage: () => HTMLImageElement;
  getKakaUltimateImage: () => HTMLImageElement;
  studioResolve: ReturnType<typeof createStudioResolver>;
};

export type DrawPlayerFacet = {
  id: string;
  name: string;
  team: Team;
  characterId: CharacterId;
  controlled?: boolean;
  state: PlayerState;
  x: number;
  y: number;
  vx: number;
  vy: number;
  boost: number;
  baseCharge: number;
  fortCharge: number;
  exitOrder: number;
  aiSeed: number;
  action?: PlayerAction;
  actionUntil: number;
  parkourUntil: number;
  ultimateShieldUntil: number;
  rescueShieldUntil: number;
  fallNoticeUntil: number;
  waterEnteredAt: number;
  waterFallUntil: number;
  visualTagVector?: { x: number; y: number };
};

export const createDrawPlayer = (world: DrawPlayerWorld) => {
  return (p: DrawPlayerFacet, me: DrawPlayerFacet, now: number): void => {
    const ctx = world.getContext();
    const studioResolve = world.studioResolve;
    const isWaterAt = world.isWaterAt;
    const phase = world.getPhase();
    const roundWinner = world.getRoundWinner();
    const ultimateBuffUntil = world.getUltimateBuffUntil();
    const ultimateMeter = world.getUltimateMeter();
    const RAJA_ULTIMATE_CAST_MS = world.rajaCastMs;
    const KAKA_ULTIMATE_CAST_MS = world.kakaCastMs;
    const KAKA_ULTIMATE_FRAME_COUNT = world.kakaFrames;
    const getSpriteImage = world.getSpriteImage;
    const getSeriesImage = world.getSeriesImage;
    const getSprintDustImage = world.getSprintDustImage;
    const getKakaUltimateImage = world.getKakaUltimateImage;
    const rounded = (x: number, y: number, w: number, h: number, r: number) => roundedOn(ctx, x, y, w, h, r);
      const color = TEAM_COLOR[p.team],
        outline = relationColor(p, me, now),
        sinking = world.kanal && p.waterEnteredAt > 0,
        waterFall = now < p.waterFallUntil,
        fallProgress = sinking
          ? clamp((now - p.waterEnteredAt) / 720, 0, 1)
          : waterFall ? 1 - (p.waterFallUntil - now) / 720 : 0,
        bob = now < p.parkourUntil
          ? -15
          : waterFall
            ? Math.sin(fallProgress * Math.PI / 2) * 12
            : 0;
      const stats = CHARACTER_BY_ID[p.characterId],
        image = getSpriteImage(p.characterId),
        speed = Math.hypot(p.vx, p.vy);
      const inWater =
        p.state !== 'PRISONER' &&
        now >= p.parkourUntil &&
        isWaterAt(p.x, p.y);
      const animation = characterAnimationMapping(p.characterId);
      // Visual-only roster proportions; keep physics and the foot anchor unchanged.
      const headOffset = 74 * (stats.visualScale - 1);
      const dust = getSprintDustImage();
      const direction = directionFromVelocity(p.vx, p.vy);
      const sprinting = speed > stats.speed * 1.16;
      const shieldUltimateActive =
        CHARACTER_BY_ID[p.characterId]?.ultimate?.kind === 'shield' &&
        p.action === 'ultimate' &&
        now < p.actionUntil;
      const dedicatedEast = characterUsesDedicatedEast(p.characterId);
      let row = animation.directionRows[direction] ?? directionalRow(direction),
        columns: readonly number[] = [0];
      let mirror = characterMirrorsWest(p.characterId)
        ? direction === 'west'
        : shouldMirrorSprite(direction, dedicatedEast);
      let oneShotColumn: number | undefined;
      if (phase === 'ROUND_OVER' || phase === 'MATCH_OVER') {
        const result =
          roundWinner === p.team ? animation.victory : animation.defeat;
        row = result.row;
        columns = result.columns;
        mirror = false;
      } else if (p.state === 'PRISONER') {
        row = animation.prisoner.row;
        columns = animation.prisoner.columns;
        mirror = false;
      } else if (p.action && now < p.actionUntil) {
        if (shieldUltimateActive) {
          mirror = false;
        } else if (p.action === 'ultimate' && animation.ultimate) {
          row = animation.ultimate.row;
          columns = animation.ultimate.columns;
          const elapsed = clamp(
            now - (p.actionUntil - RAJA_ULTIMATE_CAST_MS),
            0,
            RAJA_ULTIMATE_CAST_MS - 1,
          );
          oneShotColumn =
            columns[
              Math.min(
                columns.length - 1,
                Math.floor(elapsed / (RAJA_ULTIMATE_CAST_MS / columns.length)),
              )
            ];
        } else if (p.action === 'tag' && animation.tagByDirection) {
          row = animation.tag.row;
          columns = [animation.tagByDirection[direction]];
        } else {
          const action = p.action === 'tag' ? animation.tag : animation.rescue;
          row = action.row;
          columns = action.columns;
        }
        mirror = false;
      } else if (now < p.parkourUntil && animation.parkour) {
        const parkour = animation.parkourByDirection?.[direction] ?? animation.parkour;
        row = parkour.row;
        columns = parkour.columns;
        mirror = characterMirrorsWest(p.characterId)
          ? direction === 'west'
          : shouldMirrorSprite(direction, dedicatedEast);
      } else if (speed > 8) {
        const directionalColumns = sprinting
          ? animation.boostColumnsByDirection?.[direction]
          : animation.runColumnsByDirection?.[direction];
        columns = directionalColumns ?? (sprinting ? animation.boostColumns : animation.runColumns);
      }
      const frameDuration = sprinting ? 62 : columns.length > 1 ? 92 : 180;
      let renderImage = image;
      let frame = spriteFrame(
        image.naturalWidth || 896,
        image.naturalHeight || 816,
        oneShotColumn ??
          columns[Math.floor(now / frameDuration) % columns.length],
        row,
      );
      if (shieldUltimateActive) {
        renderImage = getKakaUltimateImage();
        const stripWidth = renderImage.naturalWidth || 4608;
        const stripHeight = renderImage.naturalHeight || 424;
        const cellWidth = stripWidth / KAKA_ULTIMATE_FRAME_COUNT;
        const elapsed = clamp(
          now - (p.actionUntil - KAKA_ULTIMATE_CAST_MS),
          0,
          KAKA_ULTIMATE_CAST_MS - 1,
        );
        const frameIndex = Math.min(
          KAKA_ULTIMATE_FRAME_COUNT - 1,
          Math.floor(
            elapsed /
              (KAKA_ULTIMATE_CAST_MS / KAKA_ULTIMATE_FRAME_COUNT),
          ),
        );
        frame = {
          x: Math.round(frameIndex * cellWidth),
          y: 0,
          width: Math.round(cellWidth),
          height: stripHeight,
        };
      }
      const series = seriesFrame(p.characterId, {
        vx: p.vx, vy: p.vy, now, sprinting, state: p.state,
        result: phase === 'ROUND_OVER' || phase === 'MATCH_OVER'
          ? roundWinner === p.team ? 'win' : 'lose' : null,
        action: now < p.actionUntil ? p.action : null,
        parkour: now < p.parkourUntil,
        tagX: p.visualTagVector?.x, tagY: p.visualTagVector?.y,
      });
      if (series) {
        renderImage = getSeriesImage(p.characterId);
        frame = series;
        mirror = series.mirror;
      }
      const studio = studioResolve(p.characterId, p.id, {
        vx: p.vx, vy: p.vy, now, state: p.state, ready: phase === 'COUNTDOWN',
        result: phase === 'ROUND_OVER' || phase === 'MATCH_OVER'
          ? roundWinner === p.team ? 'win' : 'lose' : null,
        action: now < p.actionUntil ? p.action ?? null : null,
        parkour: now < p.parkourUntil,
        tagX: p.visualTagVector?.x, tagY: p.visualTagVector?.y,
      });
      if (studio) { renderImage = studio.image; frame = studio.frame; mirror = studio.clip.mirror; }

      if (!sinking && p.state !== 'PRISONER' && world.getTeamCombos()[p.team].surgeUntil > now) {
        const pulse = 25 + Math.sin(now / 95 + p.aiSeed) * 4;
        ctx.save();
        ctx.globalAlpha = 0.7;
        ctx.strokeStyle = '#f5cf45';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(p.x, p.y - 4 + bob, pulse, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 0.16;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(p.x, p.y - 4 + bob, pulse + 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      if (
        !sinking &&
        p.state === 'ACTIVE' &&
        p.team === me.team &&
        now < ultimateBuffUntil
      ) {
        const trailLength = 20 + Math.min(28, speed * 0.08);
        ctx.save();
        ctx.globalAlpha = 0.72;
        ctx.strokeStyle = '#ff263f';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(p.x - p.vx * 0.04, p.y - p.vy * 0.04);
        ctx.lineTo(
          p.x - p.vx * 0.04 - trailLength,
          p.y - p.vy * 0.04 + Math.sin(now / 45 + p.aiSeed) * 7,
        );
        ctx.stroke();
        ctx.globalAlpha = 0.34;
        ctx.strokeStyle = '#ffb0a0';
        ctx.beginPath();
        ctx.arc(
          p.x,
          p.y - 4 + bob,
          24 + Math.sin(now / 70) * 3,
          0,
          Math.PI * 2,
        );
        ctx.stroke();
        ctx.restore();
      }

      if (!sinking && now < p.ultimateShieldUntil) {
        const pulse = 31 + Math.sin(now / 90 + p.aiSeed) * 3;
        ctx.save();
        ctx.globalAlpha = 0.22;
        ctx.fillStyle = '#39f57a';
        ctx.beginPath();
        ctx.arc(p.x, p.y - 7 + bob, pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.92;
        ctx.strokeStyle = '#63ff93';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(p.x, p.y - 7 + bob, pulse, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      if (!sinking && sprinting && dust.complete && dust.naturalWidth) {
        const dustColumn = Math.floor(now / 78) % 4;
        ctx.save();
        ctx.globalAlpha = 0.58;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.translate(p.x, p.y + 3);
        ctx.rotate(sprintEffectRotation(direction));
        ctx.drawImage(dust, dustColumn * 256, 0, 256, 192, -78, -29, 92, 69);
        ctx.restore();
      }
      if (inWater) {
        const ripple = 19 + Math.sin(now / 130 + p.aiSeed) * 3;
        ctx.save();
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = '#36c8f0';
        ctx.beginPath();
        ctx.ellipse(p.x, p.y + 12, ripple + 7, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.86;
        ctx.strokeStyle = '#b8f8ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y + 12, ripple, 6, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 0.48;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y + 12, ripple + 12, 10, 0, 0, Math.PI * 2);
        ctx.stroke();
        if (waterFall) {
          ctx.globalAlpha = 0.86 - fallProgress * 0.34;
          ctx.lineWidth = 3;
          for (const offset of [-13, 0, 13]) {
            ctx.beginPath();
            ctx.moveTo(p.x + offset, p.y + 11);
            ctx.quadraticCurveTo(
              p.x + offset + (offset ? -offset / 2 : 0),
              p.y - 11 - Math.sin(fallProgress * Math.PI) * 13,
              p.x + offset / 2,
              p.y - 2,
            );
            ctx.stroke();
          }
        }
        ctx.restore();
      }
      ctx.save();
      if (sinking) ctx.globalAlpha = Math.max(0, 1 - fallProgress);
      ctx.fillStyle = 'rgba(0,0,0,.34)';
      ctx.beginPath();
      ctx.ellipse(p.x, p.y + 15, 22 * stats.visualScale, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = outline;
      ctx.lineWidth = p.controlled ? 5 : 3;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y + 10, 21 * stats.visualScale, 10, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y + 10, 16 * stats.visualScale, 7, 0, 0, Math.PI * 2);
      ctx.stroke();
      if (p.state === 'PRISONER') {
        ctx.strokeStyle = '#d5d0c4';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(p.x - 20, p.y + 2);
        ctx.lineTo(p.x + 20, p.y + 2);
        ctx.stroke();
      }

      if (renderImage.complete && renderImage.naturalWidth) {
        const height = shieldUltimateActive
            ? 238 * stats.visualScale * (frame.height / frame.width)
            : (74 * stats.visualScale * frame.height) / 136 * (series ? 116 / 136 : 1),
          width = shieldUltimateActive
            ? 238 * stats.visualScale
            : (height * frame.width) / frame.height;
        const fallScale = sinking ? 1 - fallProgress * 0.8 : 1;
        const drawHeight = height * fallScale;
        const drawWidth = width * fallScale;
        ctx.save();
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        if (studio) {
          const placement = spritePlacement(studio.clip, frame, 74 * stats.visualScale);
          ctx.translate(p.x + studio.clip.x, p.y + 18 + bob + studio.clip.y);
          if (mirror) ctx.scale(-1, 1);
          ctx.drawImage(renderImage, frame.x, frame.y, frame.width, frame.height,
            -placement.width * studio.clip.pivotX, -placement.height * studio.clip.pivotY,
            placement.width, placement.height);
        } else {
        if (mirror) {
          ctx.translate(p.x * 2, 0);
          ctx.scale(-1, 1);
        }
        ctx.drawImage(
          renderImage,
          frame.x,
          frame.y,
          frame.width,
          frame.height,
          p.x - drawWidth / 2,
          p.y + 18 - drawHeight + bob,
          drawWidth,
          drawHeight,
        );
        }
        ctx.restore();
      } else {
        ctx.fillStyle = color;
        ctx.strokeStyle = outline;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(p.x, p.y - 2 + bob, 14 * (sinking ? 1 - fallProgress * 0.8 : 1), 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
      if (inWater) {
        // A waterline over the lower body makes the character feel submerged,
        // while the ripple below communicates that movement is still possible.
        ctx.save();
        ctx.globalAlpha = 0.42;
        ctx.fillStyle = '#159cc5';
        ctx.beginPath();
        ctx.ellipse(p.x, p.y + 9 + bob, 19 * stats.visualScale, 7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      if (sinking) return;
      if (now < p.ultimateShieldUntil) {
        const shieldX = p.x - 24;
        const shieldY = p.y - 49 - headOffset + bob;
        ctx.save();
        ctx.fillStyle = 'rgba(10,54,25,.9)';
        ctx.strokeStyle = '#86ffab';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(shieldX, shieldY - 9);
        ctx.lineTo(shieldX + 8, shieldY - 5);
        ctx.lineTo(shieldX + 7, shieldY + 4);
        ctx.quadraticCurveTo(shieldX, shieldY + 12, shieldX - 7, shieldY + 4);
        ctx.lineTo(shieldX - 8, shieldY - 5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
      if (p.controlled) {
        const hasUltimate = ULTIMATE_CHARACTER_IDS.has(p.characterId);
        const hudWidth = 54;
        const hudX = p.x - hudWidth / 2;
        const hudY = p.y - 83 - headOffset + bob;
        const stamina = Math.max(0, Math.min(1, p.boost / stats.boost));
        const ultimate = Math.max(0, Math.min(1, ultimateMeter / 100));

        ctx.save();
        ctx.fillStyle = 'rgba(7,12,9,.9)';
        rounded(hudX - 3, hudY - 3, hudWidth + 6, hasUltimate ? 18 : 11, 4);
        ctx.fill();
        ctx.fillStyle = '#1b251d';
        rounded(hudX, hudY, hudWidth, 5, 2);
        ctx.fill();
        ctx.fillStyle = stamina > .3 ? '#f3ead4' : '#f5cf45';
        rounded(hudX, hudY, hudWidth * stamina, 5, 2);
        ctx.fill();
        if (hasUltimate) {
          const ultimateTrack = CHARACTER_BY_ID[p.characterId].ultimate;
          const ultimateY = hudY + 8;
          ctx.fillStyle = ultimateTrack?.trackEdge ?? '#2b2208';
          rounded(hudX, ultimateY, hudWidth, 4, 2);
          ctx.fill();
          ctx.fillStyle = ultimateTrack?.trackFill ?? '#f5cf45';
          rounded(hudX, ultimateY, hudWidth * ultimate, 4, 2);
          ctx.fill();
        }
        ctx.restore();

        ctx.fillStyle = '#fff4d1';
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - 51 - headOffset + bob);
        ctx.lineTo(p.x - 7, p.y - 62 - headOffset + bob);
        ctx.lineTo(p.x + 7, p.y - 62 - headOffset + bob);
        ctx.fill();
      }
      const label = p.controlled ? `★ ${p.name}` : p.name;
      ctx.font = '900 9px Arial';
      const labelWidth = Math.max(38, ctx.measureText(label).width + 14);
      ctx.fillStyle = 'rgba(13,18,14,.92)';
      rounded(p.x - labelWidth / 2, p.y + 23, labelWidth, 17, 5);
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = p.controlled ? 2.5 : 1.5;
      ctx.stroke();
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff';
      ctx.fillText(label, p.x, p.y + 35);
      if (inWater) {
        ctx.fillStyle = '#b8f8ff';
        ctx.font = '900 7px Arial';
        ctx.fillText('AIR DALAM · PARKOUR', p.x, p.y + 49);
      }
      if (p.state === 'ACTIVE') {
        ctx.fillStyle = '#141a15';
        ctx.beginPath();
        ctx.arc(p.x + 23, p.y - 35 - headOffset + bob, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = outline;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.font = '800 9px Arial';
        ctx.fillText(String(p.exitOrder), p.x + 23, p.y - 32 - headOffset + bob);
      }
      if (p.state === 'RETURNING') {
        ctx.fillStyle = now < p.rescueShieldUntil ? '#60e6ff' : '#f5cf45';
        ctx.font = '800 8px Arial';
        ctx.fillText(
          now < p.rescueShieldUntil ? 'GHOST' : 'KEMBALI',
          p.x,
          p.y - 55 - headOffset,
        );
      }
      if (now < p.fallNoticeUntil) {
        const noticeY = p.y - 78 - headOffset + bob;
        ctx.font = '900 10px Arial';
        const noticeWidth = ctx.measureText('OOOPSS... HATI-HATI').width + 18;
        ctx.fillStyle = 'rgba(18,25,20,.94)';
        rounded(p.x - noticeWidth / 2, noticeY - 15, noticeWidth, 21, 7);
        ctx.fill();
        ctx.strokeStyle = '#f5cf45';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = '#fff4d1';
        ctx.textAlign = 'center';
        ctx.fillText('OOOPSS... HATI-HATI', p.x, noticeY);
      }
      if (p.state === 'IN_BASE' && p.baseCharge < stats.baseChargeTime) {
        ctx.fillStyle = '#9b9d91';
        ctx.fillRect(p.x - 18, p.y + 40, 36, 4);
        ctx.fillStyle = '#60e6ff';
        ctx.fillRect(
          p.x - 18,
          p.y + 40,
          (36 * p.baseCharge) / stats.baseChargeTime,
          4,
        );
      }
      if (p.fortCharge > 0) {
        ctx.fillStyle = '#f5cf45';
        ctx.fillRect(
          p.x - 18,
          p.y + 40,
          36 * Math.min(1, p.fortCharge / 1.5),
          4,
        );
      }
  };
};
