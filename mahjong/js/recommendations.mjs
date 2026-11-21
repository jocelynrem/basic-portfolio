import {TARGETS,evaluate} from './engine.mjs?v=wind-sort-1';
import {matchHandTiles} from './hand-match.mjs?v=wind-sort-1';

const naturalGroups=new Map(TARGETS.map(target=>{
 const needs={};
 for(const [key,size] of target.groups){
  if(size>2)continue;
  const group=needs[key]??={key,required:0,pair:false};
  group.required+=size;
  group.pair||=size===2;
 }
 return [target,Object.values(needs)];
}));

export function assessHand(hand,exposed,target,visible={},owned=countTiles(hand)){
 const {matched,missing,keep}=evaluate(hand,exposed,target);
 const gaps=[];
 for(const {key,required,pair} of naturalGroups.get(target)){
  const need=required-(owned[key]||0);
  if(need>0)gaps.push({key,need,required,pair,blocked:need>(key==='F'?8:4)-(visible[key]||0)});
 }
 const kept={};
 for(const [key,count] of keep)kept[key]=(kept[key]||0)+count;
 return {target,away:missing,incompatible:matched<0,kept,gaps,naturalsNeeded:gaps.reduce((sum,g)=>sum+g.need,0),
  blocked:matched<0||gaps.some(g=>g.blocked)};
}

function countTiles(hand){
 const counts={};
 for(const {k} of hand)counts[k]=(counts[k]||0)+1;
 return counts;
}

export function compareFit(a,b){
 return Number(a.blocked)-Number(b.blocked)||a.away-b.away||a.naturalsNeeded-b.naturalsNeeded;
}

export function recommendHands(hand,exposed,{section='All sections',hideConcealed=false,chosenKey=null,jokerPlacements={},visible=null}={}){
 const lines=new Map(),owned=countTiles(hand);
 const compare=visible?compareFit:(a,b)=>a.away-b.away;
 for(const target of TARGETS){
  if((hideConcealed&&target.concealed)||(section!=='All sections'&&target.section!==section))continue;
  const entry=assessHand(hand,exposed,target,visible??{},owned);
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
