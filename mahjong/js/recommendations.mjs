import {TARGETS,evaluate} from './engine.mjs?v=wind-sort-1';
import {matchHandTiles} from './hand-match.mjs?v=wind-sort-1';

export const MAX_TILES_AWAY=9;

export function recommendHands(hand,exposed,{section='All sections',hideConcealed=false,chosenKey=null,jokerPlacements={}}={}){
 const options=new Map();
 for(const target of TARGETS){
  if((hideConcealed&&target.concealed)||(section!=='All sections'&&target.section!==section))continue;
  const {matched,missing:away}=evaluate(hand,exposed,target);
  if(matched<0||away>MAX_TILES_AWAY)continue;
  const optionId=`${target.id}:${target.variant}`;
  const previous=options.get(optionId);
  if(previous&&previous.away<away)continue;
  const plan=matchHandTiles(hand,exposed,target,jokerPlacements[target.key]??{});
  if(!previous||away<previous.away||plan.matched>previous.matched||
     (plan.matched===previous.matched&&target.key===chosenKey)){
   options.set(optionId,{target,away,matched:plan.matched});
  }
 }
 return [...options.values()].sort((a,b)=>a.away-b.away||b.matched-a.matched);
}
