import {evaluate,tileName,claimOptions,winning,visibleTileCounts} from './engine.mjs?v=win-source-1';
export {visibleTileCounts};
export function blockedPairs(s,target){
 const visible=visibleTileCounts(s),required={},owned={};
 for(const[k,n]of target.groups)if(n<3)required[k]=(required[k]||0)+n;
 for(const tile of s.hands[0])owned[tile.k]=(owned[tile.k]||0)+1;
 return Object.entries(required).flatMap(([k,n])=>{const need=Math.max(0,n-(owned[k]||0)),unseen=Math.max(0,(k==='F'?8:4)-(visible[k]||0));return need>unseen?[{k,need,unseen}]:[];});
}
export function tileAdvice(s,target,count=1){
 if(!target)return {kind:'choose',tiles:[],reasons:[],blocked:[]};
 const passing=['charleston','courtesy'].includes(s.phase),blocked=blockedPairs(s,target);
 if(s.phase==='discard'&&s.turn===0&&winning(s.hands[0],s.exposed[0]))return {kind:'win-self',tiles:[],blocked,reasons:['Your rack already completes a legal hand.']};
 if(evaluate(s.hands[0],s.exposed[0],target).matched<0)return {kind:'change',tiles:[],blocked,reasons:['Your exposures do not fit this hand. Choose a different line.']};
 if(s.phase==='claim'){
  const win=claimOptions(s,0).some(o=>o.win);
  return {kind:win?'win':'claim',tiles:[],blocked,reasons:[win?'The last discard completes a legal hand.':target.concealed?'Your chosen hand is concealed. Exposing tiles would rule it out.':'Tap matching rack tiles to build a call. Keep any joker you do not want to expose.']};
 }
 if(!passing&&(s.turn!==0||s.phase!=='discard'))return {kind:'watch',tiles:[],blocked,reasons:[]};
 const original=s.hands[0],required={},tiles=[];let hand=[...original];
 for(const[k,n]of target.groups)required[k]=(required[k]||0)+n;
 for(const exposure of s.exposed[0])required[exposure.k]-=exposure.tiles.length;
 for(let i=0;i<(passing?count:1);i++){
  const ranked=hand.filter(t=>!passing||t.k!=='J').map(tile=>({tile,score:evaluate(hand.filter(t=>t.id!==tile.id),s.exposed[0],target).matched}));
  ranked.sort((a,b)=>b.score-a.score||(a.tile.k==='J')-(b.tile.k==='J'));if(!ranked.length)break;
  tiles.push(ranked[0].tile);hand=hand.filter(t=>t.id!==ranked[0].tile.id);
 }
 const counts={};for(const tile of original)counts[tile.k]=(counts[tile.k]||0)+1;
 const reasons=[...new Set(tiles.map(t=>t.k))].map(k=>k==='J'?'This hand cannot use the joker to improve its match.':!required[k]?`${tileName(k)} is not used in your chosen hand.`:counts[k]>required[k]?`You have ${counts[k]} copies of ${tileName(k)}; keep ${required[k]} for this hand.`:`Letting go of ${tileName(k)} preserves the most tiles toward your chosen hand.`);
 return {kind:passing?'pass':'discard',tiles,reasons,blocked};
}
