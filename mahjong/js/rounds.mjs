import * as G from './engine.mjs?v=tournament-score-1';
import {matchHandTiles} from './hand-match.mjs?v=wind-sort-1';
import {patternBlocks} from './hand-groups.mjs';
export function winningLayout(s,preferredKey=null){
 if(s.winner===null||s.winner===undefined)return null;
 const p=s.winner,exposedOnly=G.botExposedOnly(s,p);
 const preferred=G.TARGETS.find(t=>t.key===(s.scoreRecorded?s.winningTargetKey:(preferredKey||s.winningTargetKey)));
 const target=preferred&&(!exposedOnly||!preferred.concealed)&&G.evaluate(s.hands[p],s.exposed[p],preferred).matched===14?preferred:G.winning(s.hands[p],s.exposed[p],exposedOnly);
 if(!target)return null;
 const placements=p===0?s.jokerPlacements?.[target.key]:undefined;
 let match=matchHandTiles(s.hands[p],s.exposed[p],target,placements||{});
 if(match.matched!==14)match=matchHandTiles(s.hands[p],s.exposed[p],target);
 return {target,...match};
}
// Finish previously scored matches under the rules they started with.
export function scoringMode(s){
 const last=s.scoreHistory?.at(-1);
 return last&&last.mode!=='tournament'?'payments':'tournament';
}
export function finalizeRound(s,preferredKey=null){
 if(s.phase!=='ended')return null;
 const layout=winningLayout(s,preferredKey);
 if(layout){s.winningTargetKey=layout.target.key;s.winningHand=layout.target.name;}
 if(s.scoreRecorded)return layout;
 s.scores=Array.isArray(s.scores)?s.scores:[0,0,0,0];
 const mode=scoringMode(s),deltas=[0,0,0,0];
 const base=layout?.target.points??0;
 const jokerless=!!layout&&layout.target.section!=='Singles and Pairs'&&
  !s.hands[s.winner].some(t=>t.k==='J')&&!s.exposed[s.winner].some(group=>group.tiles.some(t=>t.k==='J'));
 const discardWin=!!layout&&s.winType==='discard';
 const eastOpening=!!layout&&s.turns===0&&s.winner===s.dealer;
 const selfPicked=!!layout&&!discardWin&&(mode==='payments'||
  (s.winType!=='heavenly'&&(s.drawn!=null||s.jokerSelfPick===true||eastOpening)));
 let value=0;
 if(mode==='tournament'){
  if(layout){
   value=base+(selfPicked?10:0)+(jokerless?20:0);
   deltas[s.winner]=value;
   if(discardWin)deltas[s.winningDiscarder]=-[10,10,20,25][Math.min(s.exposed[s.winner].length,3)];
  }else{
   deltas.fill(10);
  }
  if(s.deadHand)deltas[s.deadHand.player]=-10;
 }else if(layout){
  value=base*(jokerless?2:1);
  for(let p=0;p<4;p++)if(p!==s.winner){
   const payment=value*(discardWin&&p!==s.winningDiscarder?1:2);
   deltas[p]-=payment;
   deltas[s.winner]+=payment;
  }
 }
 s.scores=s.scores.map((score,p)=>score+deltas[p]);s.scoreRecorded=true;
 const winType=discardWin?'discard':selfPicked?'self-draw':s.winType==='heavenly'?'heavenly':null;
 s.scoreResult={mode,handNumber:s.handNumber||1,winner:s.winner,hand:layout?.target.name||'Wall game',base,value,jokerless,winType,discarder:s.winningDiscarder,deltas};
 s.scoreHistory=[...(s.scoreHistory||[]),s.scoreResult].slice(-30);return layout;
}
export function winningDisplayGroups(layout){
 if(!layout)return [];
 return patternBlocks(layout.target).map(indexes=>{
  const groups=indexes.map(index=>layout.groups[index]);
  return {tiles:groups.flatMap(group=>group.tiles),exposed:groups.every(group=>group.exposed)};
 });
}
export function reviewRoundHands(round){
 const winnerLayout=winningLayout(round);
 return round.hands.map((hand,player)=>{
  const exposed=round.exposed[player];
  if(G.isDeadHand(round,player)){
   const extras=[...hand];
   G.sortHand(extras);
   return {player,target:null,missing:null,groups:exposed.map(group=>({tiles:group.tiles,exposed:true})),extras};
  }
  const allTiles=[...hand,...exposed.flatMap(group=>group.tiles)];
  let layout=player===round.winner?winnerLayout:null;
  if(!layout){
   const closest=G.best(hand,exposed,null,G.botExposedOnly(round,player));
   if(closest?.matched>=0){
    const target=closest.target;
    layout={target,...matchHandTiles(hand,exposed,target)};
   }
  }
  const groups=winningDisplayGroups(layout).map(group=>({
   tiles:group.tiles.filter(Boolean),exposed:group.exposed
  })).filter(group=>group.tiles.length>0);
  const matchedIds=new Set(groups.flatMap(group=>group.tiles.map(tile=>tile.id)));
  const extras=allTiles.filter(tile=>!matchedIds.has(tile.id));
  G.sortHand(extras);
  return {player,target:layout?.target??null,missing:layout?.missing??null,groups,extras};
 });
}
export function variationSummary(target){
 const labels={B:'Bams',C:'Craks',D:'Dots'},parts=[];
 for(const suit of ['B','C','D']){const nums=[...new Set(target.groups.filter(([k])=>k[0]===suit&&/^[BCD][1-9]$/.test(k)).map(([k])=>Number(k.slice(1))))].sort((a,b)=>a-b);if(nums.length)parts.push(labels[suit]+': '+nums.join(', '));}
 const dragons=[...new Set(target.groups.filter(([k])=>['R','G','H'].includes(k)).map(([k])=>({R:'red',G:'green',H:'white'})[k]))];if(dragons.length)parts.push('Dragons: '+dragons.join(', '));return parts.join(' · ');
}
