import {compatible,evaluate,tileName,winning} from './engine.mjs?v=win-source-1';
import {compareFit} from './recommendations.mjs?v=guided-play-1';

const line=row=>row.target.name;
function gapName(gap){
 const tile=tileName(gap.key);
 if(gap.pair&&gap.required===2)return gap.need===2?'a pair of '+tile+'s':'another '+tile+' for its pair';
 return 'a natural '+tile;
}

export function handComparison(focus,alternative,pinned){
 const a=line(focus),b=alternative&&line(alternative);
 if(focus.blocked){
  const gap=focus.gaps.find(g=>g.blocked);
  const reason=focus.incompatible?'Your exposed tiles don’t fit this line.':
   'Too few copies of '+tileName(gap.key)+' are still available for the required singles or pairs.';
  return {title:'Reconsider '+a,reason:reason+(alternative&&!alternative.blocked?' Try '+b+'.':'')};
 }
 if(!alternative||alternative.blocked)return {title:a+' fits your rack',reason:'Your tiles fit this line. '+(pinned?'Keep building the highlighted groups.':'Choose it to highlight the groups on your rack.')};
 const [lead,next]=compareFit(focus,alternative)<=0?[focus,alternative]:[alternative,focus];
 const distance=next.away-lead.away;
 if(!distance&&lead.naturalsNeeded===next.naturalsNeeded){
  const shared=Object.keys(focus.kept).find(key=>focus.kept[key]>0&&alternative.kept[key]>0);
  const tip=shared?' Keep '+tileName(shared)+' for either hand.':' Let the next tiles guide your choice.';
  return {title:'Either hand works',reason:(pinned?'Your pick, '+a+', is as close as '+b:a+' and '+b+' are equally close')+'.'+tip};
 }
 const label=distance>=2&&lead.naturalsNeeded<=next.naturalsNeeded?'Clear favorite':'Slight edge';
 const gap=(distance&&lead.naturalsNeeded>next.naturalsNeeded?lead:next).gaps[0];
 let reason;
 if(!distance)reason='Both are equally close. '+line(next)+' still needs '+gapName(gap)+'. A joker can’t fill that gap.';
 else if(lead.naturalsNeeded>next.naturalsNeeded)reason='It uses more of your rack, though it still needs '+gapName(gap)+'. '+line(next)+' needs fewer natural tiles for singles and pairs.';
 else{
  const extra=Object.keys(lead.kept).find(key=>lead.kept[key]>(next.kept[key]||0));
  reason='More of your rack fits this hand than '+line(next)+'.'+(extra?' Keeping '+tileName(extra)+' helps build its lead.':'');
 }
 const verdict=pinned&&lead===focus?(label==='Clear favorite'?'Your pick is the clear favorite':'Your pick has a slight edge'):label;
 return {title:verdict+' · '+line(lead),reason};
}

function distances(rack,exposed,lines){
 return lines.map(row=>evaluate(rack,exposed,row.target).missing);
}

function firstDifference(a,b){
 for(let i=0;i<a.length;i++)if(a[i]!==b[i])return a[i]-b[i];
 return 0;
}

function passRisk(tiles){
 const keys=tiles.map(t=>t.k);
 return keys.length-new Set(keys).size;
}

function without(rack,tiles){
 const ids=new Set(tiles.map(t=>t.id));
 return rack.filter(t=>!ids.has(t.id));
}

// Compare complete selections before looking at incoming tiles. Moving a single tile
// in or out of the packet gives the player an actionable alternative.
export function selectionAdvice(hand,exposed,lines,picked,passing){
 const after=distances(without(hand,picked),exposed,lines);
 const risk=passing?passRisk(picked):Number(picked[0].k==='J');
 let best=[...after,risk],swap=null;
 for(const keep of picked){
  for(const send of without(hand,picked)){
   if(keep.k===send.k||(passing&&send.k==='J'))continue;
   const trial=picked.map(t=>t===keep?send:t);
   const fit=distances(without(hand,trial),exposed,lines);
   const score=[...fit,passing?passRisk(trial):Number(send.k==='J')];
   if(firstDifference(score,best)<0){best=score;swap={keep,send};}
  }
 }
 const loss=after.findIndex((d,i)=>d>lines[i].away);
 const verb=passing?'Pass':'Discard';
 let text;
 if(swap){
  const helped=after.findIndex((d,i)=>d>best[i]);
  const why=helped>=0?'keep '+line(lines[helped])+' closer':passing?'send fewer matching tiles together':'save the joker for a later set';
  text='Keep '+tileName(swap.keep.k)+'. '+verb+' '+tileName(swap.send.k)+' instead to '+why+'.';
 }else if(loss>=0)text='This selection gives up a tile toward '+line(lines[loss])+'. No single swap better protects '+line(lines[0])+'.';
 else if(passing&&risk)text='Your hand keeps its shape. This pass sends matching tiles to the same player.';
 else text=passing?(lines.length>1?'These tiles keep both hands open.':'These tiles preserve your target hand.'):'Discarding '+tileName(picked[0].k)+' leaves '+line(lines[0])+' intact.';
 return {text,details:lines.map((row,i)=>line(row)+' after '+(passing?'passing':'discarding')+' the selection: '+after[i]+' tiles away.')};
}

// Rank whole packets so two tiles competing for the same slot are counted once.
export function suggestTiles(hand,exposed,lines,count,passing){
 const candidates=hand.filter(tile=>!passing||tile.k!=='J');
 const ideal=[...lines.map(row=>row.away),0];
 let choice=[],best=null;
 function visit(start,packet){
  if(packet.length===count){
   const risk=passing?passRisk(packet):Number(packet[0]?.k==='J');
   const score=[...distances(without(hand,packet),exposed,lines),risk];
   if(!best||firstDifference(score,best)<0){best=score;choice=packet;}
   return;
  }
  for(let i=start;i<=candidates.length-(count-packet.length);i++){
   visit(i+1,[...packet,candidates[i]]);
   if(best&&firstDifference(best,ideal)===0)break;
  }
 }
 visit(0,[]);
 return choice;
}

export function spareTiles(hand,exposed,lines){
 for(let count=3;count>0;count--){
  const packet=suggestTiles(hand,exposed,lines,count,true);
  const after=distances(without(hand,packet),exposed,lines);
  if(packet.length===count&&after.every((d,i)=>d===lines[i].away))return packet;
 }
 return [];
}

function newTileTip(hand,exposed,lines,ids){
 const arrived=hand.filter(t=>ids.has(t.id));
 for(const row of lines){
  const before=without(hand,arrived);
  for(const tile of arrived){
   if(evaluate([...before,tile],exposed,row.target).missing<evaluate(before,exposed,row.target).missing){
    return 'The new '+tileName(tile.k)+' helps '+line(row)+'. ';
   }
  }
 }
 return '';
}

function callAdvice(s,lines,claims,picked,staging){
 const tile=s.discards.at(-1).tile;
 if(claims.some(c=>c.win))return {text:tileName(tile.k)+' completes a hand. Call it for Mahjong.'};
 const choices=staging&&picked.length?claims.filter(c=>c.n===picked.length+1):claims;
 if(!choices.length)return {text:'Choose matching tiles or a joker to preview the exposure.'};
 if(choices.every(c=>c.dead))return {text:'Pass this discard. That exposure fits no line on the card.'};
 const primary=lines[0];
 const projections=[];
 for(const choice of choices.filter(c=>!c.dead)){
  const used=staging&&picked.length?picked:s.hands[0].filter(t=>choice.ids.includes(t.id));
  const remaining=without(s.hands[0],used);
  const exposed=[...s.exposed[0],{k:tile.k,tiles:[tile,...used]}];
  for(const row of lines){
   if(compatible(row.target,exposed))projections.push({row,away:evaluate(remaining,exposed,row.target).missing,size:choice.n});
  }
 }
 const fit=projections.find(p=>p.row===primary&&p.away<primary.away)??projections.find(p=>p.row===primary)??projections[0];
 if(!fit)return {text:'Pass to keep '+line(primary)+'. Exposing '+tileName(tile.k)+' would rule out this variation.'};
 const fitsPrimary=fit.row===primary;
 const text=fitsPrimary?(fit.away<primary.away?'Calling '+tileName(tile.k)+' brings '+line(primary)+' closer.':'This call fits '+line(primary)+', but makes no immediate gain.'):
  'This exposure fits '+line(fit.row)+'. Pass if you want to stay with '+line(primary)+'.';
 return {text,details:['Exposure of '+fit.size+' × '+tileName(tile.k)+' · '+line(fit.row)+': '+fit.row.away+' → '+fit.away+' tiles away before discarding.']};
}

export function turnAdvice(s,lines,{selected,claims,staging,receivedIds,swaps}){
 const rack=s.hands[0],exposed=s.exposed[0],picked=rack.filter(t=>selected.has(t.id));
 if(s.deadHand?.player===0)return {text:'Watch which exposed sets and discards reveal the other players’ hands.'};
 if(claims.some(c=>c.win))return callAdvice(s,lines,claims,picked,staging);
 const mayDeclare=s.phase==='discard'&&s.turn===0||s.phase==='charleston'&&s.dealer===0&&s.passRound===1&&s.passStep===0;
 const win=mayDeclare&&winning(rack,exposed);
 if(win)return {text:'Your rack completes '+win.name+'. Declare Mahjong.'};
 if(!lines.length)return {text:'Choose a different card line to find a hand you can still build.'};
 const primary=lines[0];
 if(claims.length)return callAdvice(s,lines,claims,picked,staging);
 const passing=s.phase==='charleston'||s.phase==='courtesy';
 if(picked.length&&(passing||s.phase==='discard'&&s.turn===0))return selectionAdvice(rack,exposed,lines,picked,passing);
 if(s.phase==='charlestonChoice'||s.phase==='courtesy'){
  const spares=spareTiles(rack,exposed,lines);
  const text=s.phase==='courtesy'?(spares.length?'Offer only tiles you can spare.':'Skip this exchange to preserve your hands.'):
   spares.length===3?'Continue the Charleston. You have a full pass that keeps your options open.':'Consider stopping. A full pass would weaken one of these hands.';
  return {text:newTileTip(rack,exposed,lines,receivedIds)+text,details:['One pass that preserves these hands: '+(spares.map(t=>tileName(t.k)).join(', ')||'none')+'.']};
 }
 if(passing){
  const prompt=s.passStep===2?'You can pass incoming tiles blind to protect a needed tile.':'Choose tiles to see what your pass keeps open.';
  return {text:newTileTip(rack,exposed,lines,receivedIds)+prompt};
 }
 if(s.turn!==0)return {text:'Watch the discards for tiles your hand still needs.'};
 if(s.phase==='draw')return {text:'Draw from the wall, then see where the new tile fits.'};
 if(swaps.length)return {text:'You can exchange '+tileName(swaps[0].k)+' for an exposed joker before discarding.'};
 const candidate=suggestTiles(rack,exposed,lines,1,false)[0];
 const spared=candidate&&distances(without(rack,[candidate]),exposed,lines)[0]===primary.away?candidate:null;
 const fresh=s.drawn!=null?new Set([s.drawn]):s.turns===0?receivedIds:new Set();
 const tip=newTileTip(rack,exposed,lines,fresh);
 return {text:tip+(spared?'Consider discarding '+tileName(spared.k)+' to preserve '+line(primary)+'.':'Select a discard to compare what each hand would give up.')};
}
