import type { Team } from '../world/map-data/field-types';
import type { CharacterId } from '../../lib/characters';
import type { MatchEvent } from './match-types';
import type { PlayerState } from './match-types';
import type { PlayerStats } from '../gameplay/bars-score';

export type Mission = {
  refresh: boolean;
  boost: boolean;
  parkour: boolean;
  tag: boolean;
  rescue: boolean;
  combo: boolean;
};

export type RoundResultAnnouncement = {
  visible: boolean;
  winner?: Team;
  final: boolean;
};

export type StatsBoard = {
  visible: boolean;
  final: boolean;
  round: number;
  winner?: Team;
  reason: string;
  countdown: number;
  duration: number;
  mapName: string;
  format: string;
  mvpId: string;
  mvpName: string;
  score: Record<Team, number>;
  teams: Record<
    Team,
    Array<
      PlayerStats & {
        id: string;
        name: string;
        characterId: CharacterId;
        controlled?: boolean;
        contribution: number;
        mvp: boolean;
      }
    >
  >;
};

export type Snapshot = {
  blue: number;
  red: number;
  round: number;
  timer: number;
  boost: number;
  boostCountdown: number;
  order: number;
  state: PlayerState;
  paused: boolean;
  parkourReady?:boolean;
  parkourHint?:string;
  parkourCooldownSeconds?:number;
  logs: string[];
  mission: Mission;
  team: Array<{
    name: string;
    characterId: CharacterId;
    state: PlayerState;
    boost: number;
  }>;
  blueHeld: number;
  redHeld: number;
  pickupCount: number;
  fortLock: string;
  baseGrace: number;
  suddenDeath: boolean;
  fieldWins: number;
  comboLevel: number;
  comboRemaining: number;
  comboSurgeRemaining: number;
  comboCallout: string;
  ultimateMeter: number;
  ultimateBuffRemaining: number;
  ultimateCasting: boolean;
  flightFlying: boolean;
  flightDebug: string;
  matchEvents: MatchEvent[];
  rescueRequestActive: boolean;
  rescueRequestRemaining: number;
  rescueRequestCooldown: number;
  roundResult: RoundResultAnnouncement;
  statsBoard: StatsBoard;
};

export const initialSnapshot: Snapshot = {
  blue: 0,
  red: 0,
  round: 1,
  timer: 240,
  boost: 100,
  boostCountdown: 0,
  order: 0,
  state: 'IN_BASE',
  paused: false,
  parkourReady:false,
  parkourHint:'Tidak ada tempat mendarat yang aman',
  parkourCooldownSeconds:0,
  logs: ['Prototype 5v5 siap.'],
  mission: {
    refresh: false,
    boost: false,
    parkour: false,
    tag: false,
    rescue: false,
    combo: false,
  },
  team: [],
  blueHeld: 0,
  redHeld: 0,
  pickupCount: 0,
  fortLock: 'Benteng terbuka',
  baseGrace: 0,
  suddenDeath: false,
  fieldWins: 0,
  comboLevel: 0,
  comboRemaining: 0,
  comboSurgeRemaining: 0,
  comboCallout: '',
  ultimateMeter: 0,
  ultimateBuffRemaining: 0,
  ultimateCasting: false,
  flightFlying: false,
  flightDebug: '',
  matchEvents: [],
  rescueRequestActive: false,
  rescueRequestRemaining: 0,
  rescueRequestCooldown: 0,
  roundResult: { visible: false, final: false },
  statsBoard: {
    visible: false,
    final: false,
    round: 1,
    reason: '',
    countdown: 0,
    duration: 0,
    mapName: '',
    format: 'Best of 3',
    mvpId: '',
    mvpName: '',
    score: { blue: 0, red: 0 },
    teams: { blue: [], red: [] },
  },
};
