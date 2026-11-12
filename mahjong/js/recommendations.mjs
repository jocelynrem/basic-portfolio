import {TARGETS,evaluate} from './engine.mjs?v=wind-sort-1';
import {matchHandTiles} from './hand-match.mjs?v=wind-sort-1';

export function recommendHands(hand,exposed,{section='All sections',hideConcealed=false,chosenKey=null,jokerPlacements={}}={}){
 const lines=new Map();
 for(const target of TARGETS){
  if((hideConcealed&&target.concealed)||(section!=='All sections'&&target.section!==section))continue;
  const progress=evaluate(hand,exposed,target);
  const away=progress.matched<0?Infinity:progress.missing;
  const previous=lines.get(target.id);
  if(previous&&previous.away<away)continue;
  const matched=Number.isFinite(away)?matchHandTiles(hand,exposed,target,jokerPlacements[target.key]??{}).matched:-1;
  if(!previous||away<previous.away||matched>previous.matched||
     (matched===previous.matched&&target.key===chosenKey)){
   lines.set(target.id,{target,away,matched});
  }
 }
 // TARGETS starts in card order. Equal distances keep their section and line order.
 return [...lines.values()].sort((a,b)=>a.away-b.away);
}
