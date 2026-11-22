import {isDeadHand,NAMES,tileName,unseenCopies,visibleTileCounts,winning} from './engine.mjs?v=win-source-1';
import {assessHand} from './recommendations.mjs?v=hand-outlook-1';
import {handComparison} from './coaching.mjs?v=ask-coach-1';
import {naturalWaitDetails} from './natural-outlook.mjs?v=ask-coach-1';

const list=new Intl.ListFormat('en',{type:'conjunction'});
const numbers=['one','two','three','four','five','six','seven','eight','nine'];
const suits='bam(?:boo)?s?|bamboos?|craks?|cracks?|characters?|dots?|circles?';
const honors={flower:'F',joker:'J',soap:'H',white:'H',green:'G',red:'R',east:'E',west:'W',north:'N',south:'S'};
const fallback='I can compare your lines, explain a rack discard, count tiles you could draw, or read an opponent’s exposures.';

function tileKeys(q){
 const keys=new Set();
 const suitCode=s=>s.startsWith('b')?'B':s.startsWith('d')||s.startsWith('ci')?'D':'C';
 for(const m of q.matchAll(new RegExp('\\b([1-9])\\s*('+suits+')\\b','g')))keys.add(suitCode(m[2])+m[1]);
 for(const m of q.matchAll(new RegExp('\\b('+suits+')\\s*([1-9])\\b','g')))keys.add(suitCode(m[1])+m[2]);
 for(const m of q.matchAll(/\b([bcd])([1-9])\b/g))keys.add(m[1].toUpperCase()+m[2]);
 for(const m of q.matchAll(/\b([1-9])([bcd])\b/g))keys.add(m[2].toUpperCase()+m[1]);
 for(const m of q.matchAll(/\b(flower|joker|soap|white|green|red|east|west|north|south)s?\b/g))keys.add(honors[m[1]]);
 return [...keys];
}

function lineAnswer(lines,tradeoff){
 if(!lines.length)return {text:'Choose a card line so we can compare it with a backup.'};
 if(tradeoff){
  const preferred=tradeoff.preferred?.target.name;
  const lean=preferred?'I’d lean toward '+preferred+'. ':'I’d keep both options open. ';
  const reason=preferred&&tradeoff.reason.startsWith(preferred+' is ')?'It’s '+tradeoff.reason.slice(preferred.length+4):tradeoff.reason;
  return {text:lean+reason,details:tradeoff.details};
 }
 const comparison=handComparison(lines[0],lines[1]);
 return {text:comparison.reason,details:lines.map(r=>r.target.name+' · '+r.away+' tiles away · '+r.naturalsNeeded+' missing for singles and pairs.')};
}

function chances(game,lines,key){
 if(key){
  const visible=visibleTileCounts(game),count=unseenCopies(visible,key),name=tileName(key);
  const total=152-Object.values(visible).reduce((a,b)=>a+b,0);
  const details=game.wall.length&&total>0?['Next wall draw · '+count+' of '+total+' unseen tiles, about '+Math.round(100*count/total)+'%, assuming equally likely hidden positions.']:[];
  const gaps=lines.filter(r=>r.gaps.some(g=>g.key===key));
  const use=gaps.length?' '+list.format(gaps.map(r=>r.target.name))+(gaps.length===1?' still needs ':' still need ')+name+' for a natural single or pair.':'';
  return {text:name+' has '+count+' unseen '+(count===1?'copy':'copies')+' across the wall and concealed racks.'+use,details};
 }
 if(!lines.length)return {text:'Choose a card line to check its natural singles and pairs.'};
 const details=lines.flatMap(r=>naturalWaitDetails(game,r).map(d=>r.target.name+' · '+d));
 const text=lines.map(r=>{
  if(r.incompatible)return r.target.name+' conflicts with your exposures.';
  if(!r.gaps.length)return r.target.name+' has all its required singles and pairs.';
  const waits=r.gaps.map(g=>tileName(g.key)+' ('+g.unseen+' unseen)');
  return r.target.name+' still needs '+list.format(waits)+'.';
 }).join(' ');
 return {text,details};
}

function opponents(game,table,key,name){
 const details=(table?.details??[]).filter(t=>!name||t.startsWith(name+'’s'));
 const threat=key&&table?.risks.get(key);
 if(key){
  const tile=tileName(key),held=game.hands[0].some(t=>t.k===key);
  if(!held)return {text:tile+' isn’t on your rack.'+(details.length?' '+details[0]:''),details:details.slice(1)};
  if(threat&&(!name||threat.reason.includes(name)))return {text:threat.reason,details};
  if(key==='J')return {text:'A discarded joker cannot be called.',details};
 }
 if(!details.length)return {text:name?'There’s no clear read on '+name+' from the exposed tiles.':'There’s no clear read on the other players from the exposed tiles.'};
 if(key)return {text:'The exposures give no clear warning about '+tileName(key)+'. Concealed tiles could still make it useful.',details};
 return {text:details[0],details:details.slice(1)};
}

function discardAnswer(game,lines,key,table,advice){
 const hand=game.hands[0],tile=hand.find(t=>t.k===key),name=key&&tileName(key);
 if(game.phase==='claim'){
  const offered=tileName(game.discards.at(-1).tile.k);
  return {text:'The current decision is whether to call '+offered+'. '+(advice?.text??'Choose Call or Pass before discarding.')};
 }
 if(game.turn!==0||game.phase!=='discard'||isDeadHand(game))return {text:'When it’s your turn to discard, I can compare the tiles on your rack.'};
 const win=winning(hand,game.exposed[0]);
 if(win)return {text:'You can declare Mahjong on '+win.name+' with this rack.'};
 if(!key)return {text:'Which rack tile? Select it or type its name, such as “Why keep 5 Bam?”'};
 if(!tile)return {text:name+' isn’t on your rack. Choose a rack tile to compare.'};
 const playable=lines.filter(r=>!r.blocked);
 if(!playable.length)return {text:'Choose a playable line so I can check where '+name+' fits.'};
 const visible=visibleTileCounts(game);
 const project=t=>playable.map(r=>assessHand(hand.filter(v=>v.id!==t.id),game.exposed[0],r.target,visible));
 const after=project(tile);
 const alternatives=[...new Map(hand.filter(t=>t.k!==key&&t.k!=='J').map(t=>[t.k,t])).values()]
  .map(t=>({tile:t,rows:project(t)}));
 const hurt=after.findIndex((r,i)=>r.away>playable[i].away);
 const details=after.map((r,i)=>r.target.name+' · '+playable[i].away+' → '+r.away+' tiles away after discarding '+name+' · '+r.naturalsNeeded+' missing for singles and pairs in this variation.');
 const spared=playable.filter((r,i)=>after[i].away===r.away);
 const parts=[],article=key==='F'?'the Flower':name;
 const threat=table?.risks.get(key);
 const betterChoice=alternatives.some(c=>c.rows.every((r,i)=>r.away<=after[i].away&&r.naturalsNeeded<=after[i].naturalsNeeded)&&
  c.rows.some((r,i)=>r.away<after[i].away||r.naturalsNeeded<after[i].naturalsNeeded));
 if(spared.length){
  const safeForHand=spared.includes(playable[0])&&!threat&&!betterChoice;
  const names=list.format(spared.map(r=>r.target.name));
  parts.push('Discarding '+article+(safeForHand?' makes sense for '+names+'.':' keeps '+names+' just as close.'));
 }
 if(hurt>=0){
  const row=after[hurt],gap=row.gaps.find(g=>g.key===key);
  if(gap&&row.naturalsNeeded>playable[hurt].naturalsNeeded)parts.push('Keeping '+name+' protects a natural '+(gap.pair?'pair':'single')+' on '+row.target.name+'. A joker can’t fill that spot.');
  else if(key==='J')parts.push('Keeping the joker helps fill an unfinished set on '+row.target.name+'.');
  else{
   const singles=row.target.groups.filter(([,n])=>n===1).map(([k])=>k);
   if(!row.naturalsNeeded&&singles.length>=2&&singles.length<=5&&singles.every(k=>/^[BCD][1-9]$/.test(k)&&k[0]===singles[0][0])){
    const held=singles.map(k=>k[1]).join('–')+' '+tileName(singles[0]).slice(2);
    parts.push('Your '+held+' singles stay intact for '+row.target.name+'.');
   }else parts.push('Keeping '+article+' helps a set on '+row.target.name+'.');
   parts.push(unseenCopies(visible,key)?'You can refill its '+name+' set with another '+name+' or a joker.':'Only a joker could refill that spot.');
  }
  // Show the cost of keeping the questioned tile. Prioritize the line it
  // supports, then preserve the other line and avoid breaking natural groups.
  const keepOptions=alternatives.filter(c=>c.rows[hurt].away<row.away);
  const score=c=>[Number(c.rows.some(r=>r.blocked)),c.rows[hurt].away,c.rows.reduce((n,r)=>n+r.away,0),c.rows.reduce((n,r)=>n+r.naturalsNeeded,0),table?.risks.get(c.tile.k)?.rank??0];
  keepOptions.sort((a,b)=>{const x=score(a),y=score(b);for(let i=0;i<x.length;i++)if(x[i]!==y[i])return x[i]-y[i];return 0;});
  const alt=keepOptions[0];
  if(alt){
   const cost=playable.find((r,i)=>alt.rows[i].away>after[i].away);
   const duplicate=hand.filter(t=>t.k===alt.tile.k).length>1;
   parts.push('To favor '+row.target.name+', discard '+(duplicate?'one of your ':'')+tileName(alt.tile.k)+(duplicate?'s':'')+' instead.');
   if(cost)details.push('Keeping '+article+' this way costs a tile toward '+cost.target.name+'.');
   details.push(...alt.rows.map(r=>r.target.name+' · '+r.away+' tiles away after discarding '+tileName(alt.tile.k)+'.'));
  }
 }
 if(threat)parts.push(threat.reason);
 return {text:parts.join(' '),details};
}

export function answerCoachQuestion(game,lines,{question='',tileKey=null,table,tradeoff,advice}={}){
 const q=String(question).toLowerCase().replace(/[’‘]/g,"'").replace(/[-–]/g,' ').replace(/\b(one|two|three|four|five|six|seven|eight|nine)\b/g,n=>String(numbers.indexOf(n)+1));
 const named=tileKeys(q),key=named[0]??tileKey;
 const person=NAMES.slice(1).find(n=>new RegExp('\\b'+n+'\\b','i').test(q));
 const tableQuestion=/\b(danger\w*|risk\w*|safe\w*|feed\w*|opponents?|defen[cs]e)\b/.test(q)||person||/\b(they|others?|other players?)\b.*\b(want|need|collect|go|going|build|play|call)/.test(q);
 if(/\b(pivot|switch|stick|commit|closer|line choice|compare (?:my |the )?(?:lines|hands)|which (?:line|hand)|change (?:lines|hands))\b/.test(q))return lineAnswer(lines,tradeoff);
 if(!tableQuestion&&(/\b(odds|chance\w*|probabilit\w*|likel\w*|unseen|live|availability|left|remain\w*)\b/.test(q)||/\b(missing|need)\b.*\b(singles?|pairs?)\b/.test(q))){
  if(named.length>1){
   const facts=named.map(k=>chances(game,lines,k));
   return {text:facts.map(f=>f.text).join(' '),details:facts.flatMap((f,i)=>f.details.map(d=>tileName(named[i])+' · '+d))};
  }
  return chances(game,lines,named[0]??(/\b(this|that|selected) tile\b/.test(q)?tileKey:null));
 }
 if(named.length>1)return {text:'Ask about one tile at a time so I can show what it changes for each line.'};
 if(tableQuestion||/\b(exposures?|exposed)\b/.test(q)){
  return opponents(game,table,named[0]??(/\b(this|that|selected|tile|discard)\b/.test(q)?tileKey:null),person);
 }
 if(/\b(call(?:ing)?|claim(?:ing)?|pass on)\b/.test(q)){
  const k=game.discards.at(-1)?.tile.k;
  if(game.phase==='claim'&&(!named.length||key===k))return {text:advice?.text||'You can decide whether to call '+tileName(k)+'.',details:advice?.details??[]};
  return {text:game.phase==='claim'?'The tile on offer is '+tileName(k)+'.':'There’s no discard on offer to call right now.'};
 }
 if(/\b(discard\w*|keep\w*|drop\w*|toss\w*|throw\w*|release|let go|hang on|hold\w*)\b/.test(q)||key&&/\b(what about|what if|why not|why this|why that|recommend\w*|suggest\w*)\b/.test(q)){
  if(!key&&advice?.text&&game.phase==='discard'&&game.turn===0&&!/\b(this|that|selected)\b/.test(q))return {text:advice.text,details:advice.details??[]};
  return discardAnswer(game,lines,key,table,advice);
 }
 return {text:fallback};
}
