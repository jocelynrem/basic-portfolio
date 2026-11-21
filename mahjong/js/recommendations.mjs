import {TARGETS,evaluate,unseenCopies} from './engine.mjs?v=hand-outlook-1';
import {matchHandTiles} from './hand-match.mjs?v=wind-sort-1';

const requirements=new Map(TARGETS.map(target=>{
 const needs={};
 for(const [key,size] of target.groups){
  const group=needs[key]??={key,total:0,required:0,pair:false};
  group.total+=size;
  if(size>2)continue;
  group.required+=size;
  group.pair||=size===2;
 }
 return [target,Object.values(needs)];
}));

export function assessHand(hand,exposed,target,visible=null,owned=countTiles(hand)){
 const {matched,missing,keep}=evaluate(hand,exposed,target);
 const known=visible??owned,gaps=[],setKeys=[],helpful={};
 let naturalsNeeded=0,jokersRequired=0;
 const committed={};
 for(const group of exposed)committed[group.k]=(committed[group.k]||0)+group.tiles.length;
 for(const {key,total,required,pair} of requirements.get(target)){
  const held=owned[key]||0,unseen=unseenCopies(known,key);
  const need=Math.max(0,required-held);
  if(need){
   gaps.push({key,need,required,pair,unseen,blocked:need>unseen});
   naturalsNeeded+=need;
   helpful[key]=unseen;
  }
  const unfilled=total-(committed[key]||0)-held;
  if(unfilled>need){
   setKeys.push(key);
   jokersRequired+=Math.max(0,unfilled-Math.max(need,unseen));
  }
 }
 if(matched>=0&&missing>naturalsNeeded){
  for(const key of [...setKeys,'J'])helpful[key]=unseenCopies(known,key);
 }
 // Only public tiles outside our hand can make a formerly plentiful draw scarce.
 const scarceKey=Object.keys(helpful).find(key=>key!=='J'&&helpful[key]<=1&&
  (known[key]||0)-(owned[key]||0)-exposed.reduce((n,g)=>n+g.tiles.filter(t=>t.k===key).length,0)>=2);
 const kept={};
 for(const [key,count] of keep)kept[key]=(kept[key]||0)+count;
 return {target,away:missing,incompatible:matched<0,kept,gaps,naturalsNeeded,helpful,scarceKey,
  usefulCopies:Object.values(helpful).reduce((sum,n)=>sum+n,0),
  tight:gaps.filter(g=>g.need===g.unseen).length,jokerDebt:Math.max(0,jokersRequired-(owned.J||0)),
  blocked:matched<0||gaps.some(g=>g.blocked)};
}

function countTiles(hand){
 const counts={};
 for(const {k} of hand)counts[k]=(counts[k]||0)+1;
 return counts;
}

export function compareFit(a,b){
 return Number(a.blocked)-Number(b.blocked)||a.away-b.away||a.jokerDebt-b.jokerDebt||a.tight-b.tight||a.naturalsNeeded-b.naturalsNeeded||b.usefulCopies-a.usefulCopies;
}

export function recommendHands(hand,exposed,{section='All sections',hideConcealed=false,chosenKey=null,jokerPlacements={},visible=null}={}){
 const lines=new Map(),owned=countTiles(hand);
 const compare=visible?compareFit:(a,b)=>a.away-b.away;
 for(const target of TARGETS){
  if((hideConcealed&&target.concealed)||(section!=='All sections'&&target.section!==section))continue;
  const entry=assessHand(hand,exposed,target,visible,owned);
  if(entry.incompatible)continue;
  const previous=lines.get(target.id);
  const order=previous?compare(entry,previous):-1;
  if(order>0)continue;
  entry.matched=matchHandTiles(hand,exposed,target,jokerPlacements[target.key]??{}).matched;
  if(order<0||target.key===chosenKey||(previous.target.key!==chosenKey&&entry.matched>previous.matched)){
   lines.set(target.id,entry);
  }
 }
 return [...lines.values()].sort(compare);
}
