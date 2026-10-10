import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {RoundStatsOverlay} from '../../modules/ui/round-stats-overlay';
import {MatchProgressionSummary} from '../../modules/ui/match-progression-summary';
import {initialSnapshot} from '../../modules/game-core/snapshot-types';
import type {StatsBoard} from '../../modules/game-core/snapshot-types';
import '../../app/globals.css';
const empty=()=>{};
function Fixture(){
  const [mode,setMode]=useState('final');
  const board:StatsBoard={...initialSnapshot.statsBoard,visible:mode!=='leaderboard',final:mode==='final',winner:'blue',round:2,mapName:'QA Arena',duration:80,score:{blue:2,red:0},teams:{
    blue:Array.from({length:5},(_,i)=>({id:'blue'+i,name:'Player '+i,characterId:'bebe',controlled:i===0,contribution:50,mvp:i===0,tags:2,prisons:1,rescues:3})),
    red:Array.from({length:5},(_,i)=>({id:'red'+i,name:'Player '+i,characterId:'ciici',contribution:20,mvp:false,tags:1,prisons:2,rescues:1})),
  }};
  return <><nav style={{position:'fixed',zIndex:1000,bottom:0,left:0}}>{['final','round','leaderboard'].map(m=><button key={m} onClick={()=>setMode(m)}>{m}</button>)}</nav>
    <div className="game-stage" style={{position:'fixed',inset:0,width:'100%',height:'100%',background:'#8bb56f'}}>
      <RoundStatsOverlay statsBoard={board} leaderboardOpen={mode==='leaderboard'} onCloseLeaderboard={empty} onRequestNextRound={empty} onRematch={empty} onBackToCharacterSelect={empty} onBackToFieldSelect={empty} onQuit={empty}>
        <MatchProgressionSummary result={null}/>
      </RoundStatsOverlay>
    </div></>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
