import {newGame} from './engine.mjs?v=wind-sort-1';

export function normalizeMatch(s){
 if(s.practiceSession||s.matchRound)return s;
 s.matchRound=((Math.max(1,s.handNumber||1)-1)%4)+1;
 s.matchStartDealer=((s.dealer||0)-s.matchRound+5)%4;
 if((s.handNumber||1)>4&&s.scoreHistory?.length){
  const start=s.handNumber-s.matchRound+1,rounds=s.scoreHistory.filter(r=>r.handNumber>=start&&r.handNumber<=s.handNumber);
  s.scores=rounds.reduce((scores,r)=>scores.map((n,p)=>n+r.deltas[p]),[0,0,0,0]);
 }
 return s;
}
export function newMatch(difficulty){
 const dealer=Math.floor(Math.random()*4);
 return {...newGame('random',{dealer,difficulty}),matchRound:1,matchStartDealer:dealer};
}
export function nextRound(s,difficulty=s.difficulty){
 normalizeMatch(s);
 if(s.phase!=='ended'||s.practiceSession||s.matchRound>=4)throw Error('Finish this round before starting the next one.');
 return {...newGame('random',{dealer:((s.dealer||0)+1)%4,difficulty,handNumber:(s.handNumber||1)+1,scores:s.scores,scoreHistory:s.scoreHistory}),matchRound:s.matchRound+1,matchStartDealer:s.matchStartDealer};
}
export function finishMatch(s){
 normalizeMatch(s);
 if(s.practiceSession||s.phase!=='ended'||s.matchRound!==4||!s.scoreRecorded)return null;
 const scores=[...s.scores],high=Math.max(...scores),winners=scores.flatMap((n,p)=>n===high?[p]:[]),lastHand=JSON.parse(JSON.stringify(s));
 s.matchResult={scores,winners,rounds:s.scoreHistory.slice(-4),lastHand};
 s.phase='matchEnded';s.hands=[[],[],[],[]];s.exposed=[[],[],[],[]];s.discards=[];s.wall=[];s.drawn=null;
 s.goalHandId=null;s.goalTargetKey=null;s.jokerPlacements={};delete s.wallSegments;
 return s.matchResult;
}
