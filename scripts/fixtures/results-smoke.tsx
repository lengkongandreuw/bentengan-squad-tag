import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {RoundStatsOverlay} from '../../modules/ui/round-stats-overlay';
import {initialSnapshot} from '../../modules/game-core/snapshot-types';
import type {StatsBoard} from '../../modules/game-core/snapshot-types';
import type {ProgressionResult} from '../../lib/player-profile/match-progression';
import type {LocalPlayerProfile} from '../../lib/player-profile/types';
import {getCurrentLevelProgress} from '../../lib/player-profile/xp-engine';
import '../../app/globals.css';
const empty=()=>{};
const profile: LocalPlayerProfile = {schemaVersion:1,id:'qa',username:'QA',firstJoin:'',menang:1,kalah:0,
  featuredCharacterId:'bebe',kda:{tagMusuh:2,masukPenjara:1,rescueTeam:3}};
const arenas=[{id:'kampung',name:'Kampung Merdeka'},{id:'pasar',name:'Pasar Senggol'},
  {id:'taman',name:'Taman Kota'},{id:'kanal',name:'Alun Kanal Nusantara'}];
const base: ProgressionResult = {profile,applied:true,reason:'applied',xpEarned:160,tokenEarned:15,
  tokenBreakdown:{match:10,victory:5,tag:0,rescue:0},previousTokenBalance:120,currentTokenBalance:135,
  xpBreakdown:{match:100,victory:60,tag:0,rescue:0},levelProgress:getCurrentLevelProgress(260),
  nextCharacter:{characterId:'ciici',minLevel:3,requiredXP:450,currentXP:260,currentLevel:2,
    unlocked:false,xpRemaining:190,progress:260/450},
  previousXP:100,currentXP:260,previousLevel:1,currentLevel:2,
  newlyUnlockedCharacters:['bebe'],newlyUnlockedArenaIds:['pasar'],roundsPlayed:2};
const results: Record<string, ProgressionResult | null> = {
  levelup: base,
  plain: {...base,newlyUnlockedCharacters:[],newlyUnlockedArenaIds:[],
    nextCharacter:{characterId:'bebe',minLevel:2,requiredXP:200,currentXP:160,currentLevel:1,
      unlocked:false,xpRemaining:40,progress:0.8},
    previousXP:100,currentXP:160,previousLevel:1,currentLevel:1,
    levelProgress:getCurrentLevelProgress(160),xpEarned:60,
    xpBreakdown:{match:100,victory:0,tag:0,rescue:0},tokenEarned:10,
    tokenBreakdown:{match:10,victory:0,tag:0,rescue:0},currentTokenBalance:130},
  max: {...base,previousXP:5900,currentXP:6000,previousLevel:12,currentLevel:13,
    levelProgress:getCurrentLevelProgress(6000),nextCharacter:null,
    newlyUnlockedCharacters:[],newlyUnlockedArenaIds:[]},
  duplicate: {...base,applied:false,reason:'duplicate',xpEarned:0,tokenEarned:0,
    xpBreakdown:{match:0,victory:0,tag:0,rescue:0},
    tokenBreakdown:{match:0,victory:0,tag:0,rescue:0},
    newlyUnlockedCharacters:[],newlyUnlockedArenaIds:[],currentTokenBalance:120},
  incomplete: {...base,applied:false,reason:'incomplete',xpEarned:0,tokenEarned:0,
    xpBreakdown:{match:0,victory:0,tag:0,rescue:0},
    tokenBreakdown:{match:0,victory:0,tag:0,rescue:0},
    newlyUnlockedCharacters:[],newlyUnlockedArenaIds:[],currentTokenBalance:120},
  none: null,
};
function Fixture(){
  const [mode,setMode]=useState('final');
  const [reward,setReward]=useState('levelup');
  const [dismissed,setDismissed]=useState(false);
  const pick=(m:string)=>{setMode(m);setDismissed(false);};
  const pickReward=(r:string)=>{setReward(r);setDismissed(false);};
  const board:StatsBoard={...initialSnapshot.statsBoard,visible:mode!=='leaderboard',final:mode==='final',winner:'blue',round:2,mapName:'QA Arena',duration:80,score:{blue:2,red:0},teams:{
    blue:Array.from({length:5},(_,i)=>({id:'blue'+i,name:'Player '+i,characterId:'bebe',controlled:i===0,contribution:50,mvp:i===0,tags:2,prisons:1,rescues:3})),
    red:Array.from({length:5},(_,i)=>({id:'red'+i,name:'Player '+i,characterId:'ciici',contribution:20,mvp:false,tags:1,prisons:2,rescues:1})),
  }};
  return <><nav style={{position:'fixed',zIndex:1000,bottom:0,left:0}}>{['final','round','leaderboard'].map(m=><button key={m} onClick={()=>pick(m)}>{m}</button>)}</nav>
    <nav style={{position:'fixed',zIndex:1000,bottom:0,right:0}}>{Object.keys(results).map(r=><button key={r} onClick={()=>pickReward(r)}>{r}</button>)}</nav>
    <div className="game-stage" style={{position:'fixed',inset:0,width:'100%',height:'100%',background:'#8bb56f'}}>
      <RoundStatsOverlay statsBoard={board} leaderboardOpen={mode==='leaderboard'} onCloseLeaderboard={empty} onRequestNextRound={empty} onRematch={empty} onBackToCharacterSelect={empty} onBackToFieldSelect={empty} onQuit={empty}
        result={results[reward]} arenas={arenas} unlockDismissed={dismissed} onDismiss={()=>setDismissed(true)} />
    </div></>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
