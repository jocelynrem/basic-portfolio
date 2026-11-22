import {compatible,evaluate,tileName,winning} from './engine.mjs?v=win-source-1';
import {compareFit} from './recommendations.mjs?v=hand-outlook-1';

const line=row=>row.target.name;
function gapName(gap){
 const tile=tileName(gap.key);
 if(gap.pair&&gap.required===2)return gap.need===2?'a pair of '+tile+'s':'another '+tile+' for its pair';
 return 'a natural '+tile;
}

export function handComparison(focus,alternative){
 const a=line(focus),b=alternative&&line(alternative);
 if(focus.blocked){
  const gap=focus.gaps.find(g=>g.blocked);
  const reason=focus.incompatible?'Your exposed tiles don’t fit '+a+'.':
   'Too few copies of '+tileName(gap.key)+' remain for '+a+' to complete its singles or pairs.';
  return {kind:'blocked',title:'Blocked',reason:reason+(alternative&&!alternative.blocked?' '+b+' is still possible.':'')};
 }
 if(!alternative||alternative.blocked)return {kind:'fit',title:'Good fit',reason:'I’d stick with '+a+' here.'};
 const [lead,next]=compareFit(focus,alternative)<=0?[focus,alternative]:[alternative,focus];
 const distance=next.away-lead.away;
 if(!distance&&lead.naturalsNeeded===next.naturalsNeeded&&lead.tight===next.tight&&lead.jokerDebt===next.jokerDebt){
  const shared=Object.keys(focus.kept).find(key=>focus.kept[key]>0&&alternative.kept[key]>0);
  return {kind:'even',title:'Even',reason:a+' and '+b+' are neck and neck.'+(shared?' Your '+tileName(shared)+' works for either.':'')};
 }
 let reason;
 if(!distance){
  const rival=lead.target.section===next.target.section?'Line '+next.target.line:line(next);
  const gap=next.gaps.find(g=>g.need===g.unseen)??next.gaps[0];
  const need=lead.jokerDebt<next.jokerDebt?'more jokers':gapName(gap);
  reason='I’d play '+line(lead)+'. '+rival+' still needs '+need+'.';
 }else{
  reason=lead.naturalsNeeded>next.naturalsNeeded?line(lead)+' still needs '+gapName(lead.gaps[0])+'. '+line(next)+' is further away.':'You’re closer to '+line(lead)+' than '+line(next)+'.';
 }
 const clear=distance>=2&&lead.naturalsNeeded<=next.naturalsNeeded;
 return {kind:clear?'clear':'edge',title:clear?'Clear edge':'Slight edge',leader:line(lead),reason};
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
  text='I’d keep the '+tileName(swap.keep.k)+'. '+verb+' the '+tileName(swap.send.k)+' to '+why+'.';
 }else if(loss>=0)text='Tight rack. This costs you a tile toward '+line(lines[loss])+'.';
 else if(passing&&risk)text='You can spare these. Just watch the matching tiles you’re sending together.';
 else text=passing?'You can spare '+(picked.length===1?'this tile':'these tiles')+' and keep '+lines.map(line).join(' and ')+' open.':'You can let the '+tileName(picked[0].k)+' go and keep '+line(lines[0])+'.';
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
    return 'That new '+tileName(tile.k)+' works for '+line(row)+'. ';
   }
  }
 }
 return '';
}

function explainMissedCall(s,primary,key){
 const pass='Pass on the '+tileName(key)+'. ';
 const name=line(primary);
 if(primary.target.concealed)return pass+name+' must stay concealed until Mahjong.';
 const groups=compatible(primary.target,s.exposed[0])??[];
 const matching=groups.filter(([k])=>k===key);
 const sizes=matching.map(([,size])=>size).filter(size=>size>=3);
 if(!sizes.length){
  if(matching.length)return pass+name+' uses it only in a single or pair. You can call it to win.';
  return pass+'This variation of '+name+' has no set for that discard.';
 }
 const required=Math.min(...sizes);
 const available=1+s.hands[0].filter(t=>t.k===key||t.k==='J').length;
 if(available<required)return pass+'With it, you can expose '+available+' of the '+required+' needed for '+name+'.';
 return pass+'This exposure doesn’t fit '+name+'.';
}

function callAdvice(s,lines,claims,picked,staging){
 const tile=s.discards.at(-1).tile;
 if(claims.some(c=>c.win))return {text:'That '+tileName(tile.k)+' is your winning tile. Call it for Mahjong!'};
 const hand=s.hands[0],exposures=s.exposed[0];
 const staged=staging&&picked.length>0;
 const selected=new Set(staged?picked.map(t=>t.id):[]);
 // Preserve the player's selection when previewing a larger or smaller set.
 const candidates=hand.filter(t=>t.k===tile.k||t.k==='J').sort((a,b)=>
  Number(selected.has(b.id))-Number(selected.has(a.id))||Number(a.k==='J')-Number(b.k==='J'));
 const primary=lines[0];
 const projections=[];
 for(const choice of claims.filter(c=>!c.dead)){
  const used=candidates.slice(0,choice.n-1);
  const remaining=without(hand,used);
  if(!remaining.length)continue;
  const exposed=[...exposures,{k:tile.k,tiles:[tile,...used]}];
  for(const row of lines){
   if(!compatible(row.target,exposed))continue;
   const away=Math.min(...remaining.map(t=>evaluate(without(remaining,[t]),exposed,row.target).missing));
   projections.push({row,away,size:choice.n,exact:!staged||choice.n===picked.length+1});
  }
 }
 // Prefer a useful call at the selected size, then a useful resize, then a pass.
 projections.sort((a,b)=>a.away-b.away);
 const focus=projections.filter(p=>p.row===primary);
 const improving=focus.filter(p=>p.away<primary.away);
 const fit=improving.find(p=>p.exact)??improving[0]??focus.find(p=>p.exact)??focus[0]??projections.find(p=>p.exact);
 const details=[];
 if(fit)details.push('Exposure of '+fit.size+' × '+tileName(tile.k)+' · '+line(fit.row)+': '+fit.row.away+' → '+fit.away+' tiles away after discarding.');
 const choices=staged?claims.filter(c=>c.n===picked.length+1):claims;
 if(choices.length&&choices.every(c=>c.dead))details.push('This exposure fits no line on the card and would make your hand dead.');
 if(fit?.row!==primary)return {text:explainMissedCall(s,primary,tile.k),details};
 if(fit.away>=primary.away){
  const needed=compatible(primary.target,exposures).reduce((total,[key,n])=>total+(key===tile.k?n:0),0);
  const held=hand.filter(t=>t.k===tile.k).length;
  if(held>=needed)return {text:'Pass. You already have all '+needed+' '+tileName(tile.k)+'s you need. Keep them concealed.',details};
  return {text:'Pass on the '+tileName(tile.k)+'. Exposing this set '+(fit.away===primary.away?'won’t bring you closer to Mahjong.':'would leave you farther from Mahjong.'),details};
 }
 if(!fit.exact){
  const change=fit.size-1-picked.length;
  const count=Math.abs(change);
  return {text:(change>0?'Add ':'Remove ')+count+' '+(change>0?'more ':'')+(count===1?'tile':'tiles')+' to expose '+fit.size+' for '+line(primary)+'.',details};
 }
 return {text:'I’d call that '+tileName(tile.k)+' for '+line(primary)+'.',details};
}

export function turnAdvice(s,lines,{selected,claims,staging,receivedIds,swaps,describedLine}){
 const rack=s.hands[0],exposed=s.exposed[0],picked=rack.filter(t=>selected.has(t.id));
 if(s.deadHand?.player===0)return {text:'Watch which exposed sets and discards reveal the other players’ hands.'};
 if(claims.some(c=>c.win))return callAdvice(s,lines,claims,picked,staging);
 const mayDeclare=s.phase==='discard'&&s.turn===0||s.phase==='charleston'&&s.dealer===0&&s.passRound===1&&s.passStep===0;
 const win=mayDeclare&&winning(rack,exposed);
 if(win)return {text:'That’s '+win.name+'! Declare Mahjong.'};
 if(!lines.length)return {text:'Choose a different card line to find a hand you can still build.'};
 const primary=lines[0];
 const arrivals=lines.filter(row=>row.target.id!==describedLine);
 if(claims.length)return callAdvice(s,lines,claims,picked,staging);
 const passing=s.phase==='charleston'||s.phase==='courtesy';
 if(picked.length&&(passing||s.phase==='discard'&&s.turn===0))return selectionAdvice(rack,exposed,lines,picked,passing);
 if(s.phase==='charlestonChoice'||s.phase==='courtesy'){
  const spares=spareTiles(rack,exposed,lines);
  const text=s.phase==='courtesy'?(spares.length?'Just send what you can spare.':'I’d sit this exchange out. You can use every tile.'):
   spares.length===3?'You can pass three tiles and keep '+lines.map(line).join(' and ')+' open.':'I’d stop here. A full pass costs you a tile for '+lines.map(line).join(' or ')+'.';
  return {text:newTileTip(rack,exposed,arrivals,receivedIds)+text,details:['One pass that preserves these hands: '+(spares.map(t=>tileName(t.k)).join(', ')||'none')+'.']};
 }
 if(passing){
  const blindTip=s.passStep===2?'Short on spares? You can pass incoming tiles blind.':'';
  return {text:(newTileTip(rack,exposed,arrivals,receivedIds)+blindTip).trim()};
 }
 if(s.turn!==0)return {text:''};
 if(s.phase==='draw')return {text:'Your draw. Take a tile from the wall.'};
 if(swaps.length)return {text:'You can exchange '+tileName(swaps[0].k)+' for an exposed joker before discarding.'};
 const candidate=suggestTiles(rack,exposed,lines,1,false)[0];
 const spared=candidate&&distances(without(rack,[candidate]),exposed,lines)[0]===primary.away?candidate:null;
 const fresh=s.drawn!=null?new Set([s.drawn]):s.turns===0?receivedIds:new Set();
 const tip=newTileTip(rack,exposed,arrivals,fresh);
 return {text:tip+(spared?'I’d let the '+tileName(spared.k)+' go. '+line(primary)+' stays open.':'Which tile can you spare? Try a discard to see what it costs.')};
}
