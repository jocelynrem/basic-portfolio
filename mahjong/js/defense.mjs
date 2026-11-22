import {compatible,isDeadHand,NAMES,TARGETS,tileName,unseenCopies,visibleTileCounts} from './engine.mjs?v=win-source-1';

const sets=['','','','pung','kong','quint','sextet'];
const and=new Intl.ListFormat('en',{type:'conjunction'});
const or=new Intl.ListFormat('en',{type:'disjunction'});
const byExposure=new Map();
for(const target of TARGETS.filter(t=>!t.concealed)){
 for(const signature of new Set(target.groups.map(([k,n])=>k+'-'+n))){
  if(!byExposure.has(signature))byExposure.set(signature,[]);
  byExposure.get(signature).push(target);
 }
}

function requirements(groups){
 const needs=new Map();
 for(const [key,size] of groups){
  const need=needs.get(key)??{key,total:0,natural:0,pair:false,callSize:Infinity};
  need.total+=size;
  if(size<3){need.natural+=size;need.pair||=size===2;}
  else need.callSize=Math.min(need.callSize,size);
  needs.set(key,need);
 }
 return needs;
}

// A player could call sets over several turns, but can take a discard for
// their singles or pairs only on the winning call. Two naturals locked on
// our rack cannot both reach them that way. Jokers cannot cover either one.
function possiblePlan(needs,visible,rackCounts,jokers){
 let lastNatural=0,jokersNeeded=0;
 for(const {key,total,natural} of needs.values()){
  const unseen=unseenCopies(visible,key),held=rackCounts[key]||0;
  if(natural>unseen+held)return false;
  lastNatural+=Math.max(0,natural-unseen);
  jokersNeeded+=Math.max(0,total-unseen-held);
 }
 return lastNatural<=1&&jokersNeeded<=jokers;
}

function possibleWin(needs,visible,discard){
 let jokersNeeded=0;
 for(const {key,total,natural} of needs.values()){
  const available=unseenCopies(visible,key)+Number(key===discard);
  if(natural>available)return false;
  jokersNeeded+=Math.max(0,total-available);
 }
 return jokersNeeded<=unseenCopies(visible,'J');
}

function tableRead(name,exposures,plans){
 const shown=and.format(exposures.map(({k,tiles})=>sets[tiles.length]+' of '+tileName(k)));
 const lines=[...new Set(plans.map(p=>p.target.name))];
 const prefix=name+'’s '+shown+(exposures.length===1?' fits ':' fit ');
 let detail;
 if(lines.length===1){
  detail=prefix+lines[0]+'.';
  const shared=[...plans[0].needs.keys()].filter(k=>plans.every(p=>p.needs.has(k)));
  if(shared.length&&shared.length<=3)detail+=' Watch '+and.format(shared.map(tileName))+' for the remaining groups.';
 }else if(lines.length===2)detail=prefix+or.format(lines)+'.';
 else detail=prefix+lines.length+' card lines.';
 return {detail,lines};
}

export function readTable(s,visible=visibleTileCounts(s)){
 const risks=new Map(),reads=[];
 const rackCounts={};
 for(const {k} of s.hands[0])rackCounts[k]=(rackCounts[k]||0)+1;
 // Exposed jokers may return to a rack later. They cannot supply the tiles
 // alongside the discard on this turn.
 const exposedJokers={};
 for(const group of s.exposed.flat())for(const tile of group.tiles){
  if(tile.k==='J')exposedJokers[group.k]=(exposedJokers[group.k]||0)+1;
 }
 const unseenJokers=unseenCopies(visible,'J');
 const redeemable=Object.entries(exposedJokers).reduce((n,[k,count])=>n+Math.min(count,unseenCopies(visible,k)+(rackCounts[k]||0)),0);
 for(let player=1;player<s.exposed.length;player++){
  const exposures=s.exposed[player];
  if(!exposures.length||isDeadHand(s,player))continue;
  const candidates=byExposure.get(exposures[0].k+'-'+exposures[0].tiles.length)??[];
  const plans=[];
  for(const target of candidates){
   const groups=compatible(target,exposures);
   if(!groups)continue;
   const needs=requirements(groups);
   if(possiblePlan(needs,visible,rackCounts,unseenJokers+redeemable))plans.push({target,needs});
  }
  if(!plans.length)continue;
  const name=NAMES[player],{detail,lines}=tableRead(name,exposures,plans);
  reads.push({detail,count:lines.length,exposures:exposures.length});
  for(const k of Object.keys(rackCounts)){
   if(k==='J')continue;
   const matched=new Set(),roles=new Set(),callTargets=[],winTargets=[];
   for(const {target,needs} of plans){
    const need=needs.get(k);
    if(!need)continue;
    const canCall=unseenCopies(visible,k)+unseenJokers+1>=need.callSize;
    if(!canCall&&!possibleWin(needs,visible,k))continue;
    if(canCall)callTargets.push(target);
    else winTargets.push(target);
    matched.add(target.name);
    roles.add(need.pair?'pair':need.natural?'single':'set');
   }
   const fits=callTargets.length+winTargets.length;
   if(!fits)continue;
   // Broad matches from a lone exposure rarely distinguish two discards.
   const certain=plans.length===fits;
   const broadSupport=matched.size>lines.length/2&&fits>plans.length/2;
   const rank=certain?3:(exposures.length>1||lines.length===1)?2:broadSupport?1:0;
   if(!rank||(risks.get(k)?.rank??0)>=rank)continue;
   const subject=tileName(k);
   const line=matched.size===1?[...matched][0]:null;
   const reason=callTargets.length?name+' could call '+subject+' for a set'+(line?' on '+line:' that fits the exposures')+'.':
    subject+' could give '+name+' Mahjong'+(line?' on '+line:'')+'. '+(roles.size===1&&!roles.has('set')?'It would finish a '+[...roles][0]+'.':'Only a winning call fits.');
   const risk={rank,reason};
   // Keep only variations that support the kind of call described in the warning.
   if(line)risk.preview={player,tileKey:k,lineName:line,targets:callTargets.length?callTargets:winTargets};
   risks.set(k,risk);
  }
 }
 reads.sort((a,b)=>a.count-b.count||b.exposures-a.exposures);
 return {risks,details:reads.map(r=>r.detail)};
}
