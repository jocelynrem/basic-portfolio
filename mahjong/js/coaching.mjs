import {compatible,evaluate,TARGETS,tileName,unseenCopies,visibleTileCounts,winning} from './engine.mjs?v=win-source-1';
import {assessHand,compareFit} from './recommendations.mjs?v=hand-outlook-1';
import {patternBlocks} from './hand-groups.mjs?v=dragon-notation-1';
import {readTable} from './defense.mjs?v=coach-layout-1';

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

function compareDiscards(a,b){
 return compareFit(a.main,b.main)||(a.next&&b.next?compareFit(a.next,b.next):0)||
  Number(a.tile.k==='J')-Number(b.tile.k==='J')||b.routes.length-a.routes.length||b.shared-a.shared;
}

const listTiles=new Intl.ListFormat('en',{style:'long',type:'conjunction'});
const eitherTile=new Intl.ListFormat('en',{style:'long',type:'disjunction'});

function sharedNaturals(main,backup){
 const keys=backup.target.groups.filter(([k,n])=>n<3&&backup.kept[k]&&main.kept[k]).map(([k])=>k);
 return [...new Set(keys)];
}

function singleBlocks(row){
 const blocks=[];
 for(const indices of patternBlocks(row.target)){
  const groups=indices.map(i=>row.target.groups[i]);
  if(groups.length<2||groups.some(([,size])=>size!==1))continue;
  const keys=groups.map(([key])=>key);
  // A repeated tile elsewhere on a line can have its own natural requirement.
  // Only describe this block when its missing singles are unambiguous.
  if(keys.some(key=>row.target.groups.filter(([k,n])=>k===key&&n<=2).length!==1))continue;
  const held=keys.filter(k=>!row.gaps.some(g=>g.key===k));
  blocks.push({row,held,missing:keys.filter(k=>!held.includes(k))});
 }
 return blocks;
}

function singlesReason(rows,atRisk,discards){
 const blocks=rows.flatMap(singleBlocks).filter(b=>!b.held.some(k=>discards.has(k)));
 const first=blocks.find(b=>b.held.some(k=>atRisk.has(k)));
 if(!first)return '';
 const {row,held,missing}=first;
 // Name alternate suits only when the same run needs exactly one single in each.
 const keys=[...held,...missing];
 if(held.length>=2&&missing.length===1&&keys.every(k=>/^[BCD][1-9]$/.test(k)&&k[0]===keys[0][0])){
  const suits=new Map();
  for(const b of blocks){
   if(b.row.target.id!==row.target.id||b.held.length!==held.length||b.missing.length!==1)continue;
   const sequence=[...b.held,...b.missing],suit=sequence[0][0];
   if('BCD'.includes(suit)&&sequence.every((key,i)=>key===suit+keys[i][1]))suits.set(suit,b);
  }
  if(suits.size>1){
   const runs=[...suits.values()];
   const ranks=listTiles.format(held.map(k=>k[1]));
   const suitNames=listTiles.format(runs.map(b=>tileName(b.held[0]).slice(2)+'s'));
   const needed=eitherTile.format(runs.map(b=>tileName(b.missing[0])));
   return 'Keep the '+ranks+' in '+suitNames+' for '+line(row)+'. '+needed+' completes its singles.';
  }
 }
 const keep='Keep '+listTiles.format(held.map(tileName))+' for '+line(row)+'. ';
 if(!missing.length)return 'That keeps '+listTiles.format(held.map(tileName))+' together for '+line(row)+'.';
 if(missing.length===1)return keep+'Only '+tileName(missing[0])+' is missing from those singles.';
 return keep+'You still need '+listTiles.format(missing.map(tileName))+' to finish those singles.';
}

export function discardAdvice(s,lines,picked=null,table=readTable(s)){
 const hand=s.hands[0],exposed=s.exposed[0],visible=visibleTileCounts(s);
 const [focus,backup]=lines;
 // The backup is a card line. Either discard may favor a different suit variation.
 const variations=backup?TARGETS.filter(t=>t.id===backup.target.id&&compatible(t,exposed))
  .map(t=>assessHand(hand,exposed,t,visible)).filter(r=>!r.blocked):[];
 const choices=[];
 for(const tile of new Map(hand.map(t=>[t.k,t])).values()){
  const left=without(hand,[tile]);
  const main=assessHand(left,exposed,focus.target,visible);
  const ranked=variations.map(r=>assessHand(left,exposed,r.target,visible)).sort(compareFit);
  const next=ranked[0];
  // Count distinct ways to supply the singles and pairs. Suit permutations
  // that change only joker-eligible sets do not create another natural option.
  const routes=new Map();
  for(const r of ranked){
   if(r.blocked||r.away!==next.away||r.jokerDebt!==next.jokerDebt||r.tight!==next.tight||r.naturalsNeeded!==next.naturalsNeeded)continue;
   const naturals=r.target.groups.filter(([,n])=>n<3).map(([k,n])=>k+'='+n).sort().join(',');
   if(!routes.has(naturals))routes.set(naturals,r);
  }
  const options=[...routes.values()];
  // If a suit must go, favor the natural tiles that also serve the main line.
  const shared=Math.max(0,...options.map(row=>sharedNaturals(main,row).length));
  choices.push({tile,main,next,routes:options,shared});
 }
 choices.sort((a,b)=>compareDiscards(a,b)||a.tile.k.localeCompare(b.tile.k));
 const offensiveBest=choices.filter(c=>!compareDiscards(c,choices[0]));
 const risk=c=>table.risks.get(c.tile.k)?.rank??0;
 const lowestRisk=Math.min(...offensiveBest.map(risk));
 const tied=offensiveBest.filter(c=>risk(c)===lowestRisk);
 const best=tied[0];
 const chosen=picked&&choices.find(c=>c.tile.k===picked.k);
 const drawn=hand.find(t=>t.id===s.drawn);
 const fitsBackup=c=>variations.some(r=>r.away===backup.away&&r.kept[c.tile.k]>0);
 const examples=[...tied].sort((a,b)=>Number(b.tile.k===picked?.k)-Number(a.tile.k===picked?.k)||
  Number(b.tile.k===drawn?.k)-Number(a.tile.k===drawn?.k)||Number(fitsBackup(b))-Number(fitsBackup(a))).slice(0,2);
 const names=examples.map(c=>tileName(c.tile.k));
 const alternatives=names.join(' or ');
 const preview=chosen??examples[0];
 const details=[preview.main,preview.next].filter(Boolean).map(row=>line(row)+' after discarding '+tileName(preview.tile.k)+' · '+row.away+' tiles away · '+row.naturalsNeeded+' missing for singles and pairs.');
 if(best.next){
  const shared=sharedNaturals(best.main,best.next);
  if(shared.length)details.push(listTiles.format(shared.map(tileName))+' can serve either '+line(focus)+' or '+line(backup)+'.');
  if(preview.routes.length<best.routes.length)details.push(line(backup)+' · equally close arrangements of singles and pairs · '+best.routes.length+' after discarding '+tileName(best.tile.k)+', '+preview.routes.length+' after discarding '+tileName(preview.tile.k)+'.');
 }
 const riskier=offensiveBest.filter(c=>risk(c)>lowestRisk);
 const flagged=chosen&&risk(chosen)>0?chosen:riskier.sort((a,b)=>risk(b)-risk(a))[0];
 const hazard=flagged&&table.risks.get(flagged.tile.k);
 if(hazard)details.push(hazard.reason);
 const defense=chosen&&hazard?{defense:hazard.reason,preview:hazard.preview}:{};
 if(tied.length>1)details.push('Equally ranked discards for these lines · '+tied.map(c=>tileName(c.tile.k)).join(', ')+'.');
 if(riskier.length&&(!chosen||offensiveBest.includes(chosen))){
  const rival=riskier.includes(chosen)?chosen:riskier[0];
  const hazard=table.risks.get(rival.tile.k);
  return {headline:alternatives,reason:hazard.reason,text:'Discard '+alternatives+'. '+hazard.reason,preview:hazard.preview,details,tile:tied.length===1?best.tile:undefined};
 }
 // Explain why a seemingly equal discard is weaker. Use the actual missing
 // natural tiles in a viable variation, even if another suit masks the loss.
 const weakerSelection=chosen&&!tied.includes(chosen);
 const rivals=weakerSelection?[chosen]:choices.filter(c=>!offensiveBest.includes(c)&&c.main.away===best.main.away);
 const atRisk=new Set(rivals.filter(c=>hand.filter(t=>t.k===c.tile.k).length===1).map(c=>c.tile.k));
 if(atRisk.size){
  const discards=new Set(examples.map(c=>c.tile.k));
  const reason=singlesReason([examples[0].main,...examples[0].routes],atRisk,discards);
  if(reason)return {text:'Discard '+alternatives+'. '+reason,...defense,details,tile:tied.length===1?best.tile:undefined};
 }
 if(weakerSelection){
  const why=compareFit(chosen.main,best.main)?'protect '+line(focus):
   backup&&(compareFit(chosen.next,best.next)||chosen.routes.length<best.routes.length||chosen.shared<best.shared)?'protect '+line(backup):'keep your joker';
  return {text:'Keep the '+tileName(picked.k)+'. Discard '+alternatives+' to '+why+'.',...defense,details};
 }
 if(tied.length>1){
  const cost=best.main.away>focus.away?line(focus):backup&&best.next.away>backup.away?line(backup):null;
  let reason=cost?'Either costs '+cost+' one tile.':backup?'Either keeps both lines at their current distance.':'Either keeps '+line(focus)+' just as close.';
  if(!cost){
   const groups=lines.map(r=>compatible(r.target,exposed)??[]);
   const spare=examples.map(({tile})=>{
    const held=hand.filter(t=>t.k===tile.k).length;
    const needed=Math.max(...groups.map(g=>g.reduce((sum,[k,n])=>sum+(k===tile.k?n:0),0)));
    return {name:tileName(tile.k),needed,extra:tile.k!=='J'&&held>needed};
   });
   if(spare.every(t=>t.extra)){
    const unused=spare.find(t=>!t.needed),extra=spare.find(t=>t.needed);
    if(unused&&extra)reason=(backup?'Neither pattern uses ':'This pattern doesn’t use ')+unused.name+', and you have a spare '+extra.name+'.';
    else reason=backup?'Both tiles are spare for these two patterns.':'Both tiles are spare for '+line(focus)+'.';
   }
  }
  return {headline:alternatives,reason,text:'Discard '+alternatives+'. '+reason,...defense,details};
 }
 const loss=best.main.away>focus.away?focus:backup&&best.next.away>backup.away?backup:null;
 const text=loss?'Tough discard. Letting the '+tileName(best.tile.k)+' go costs a tile toward '+line(loss)+'.':
  'You can let the '+tileName(best.tile.k)+' go and keep '+line(focus)+'.';
 return {text,...defense,details,tile:best.tile};
}

// Keep an uncallable discard in view through the opponents' turns. A fresh draw
// or a new call decision takes precedence over an earlier missed tile.
function neededDiscard(s,row,activeCall){
 if(!row||!['draw','claim','discard'].includes(s.phase)||s.phase==='discard'&&s.turn===0)return null;
 const hand=s.hands[0],exposed=s.exposed[0],groups=compatible(row.target,exposed);
 if(!groups)return null;
 for(let i=s.discards.length-1;i>=0;i--){
  const discard=s.discards[i],{k}=discard.tile;
  if(discard.player===0||(activeCall&&i!==s.discards.length-1))break;
  if(discard.claimed&&exposed.some(g=>g.tiles.some(t=>t.id===discard.tile.id)))break;
  if(k==='J'||!Object.hasOwn(row.helpful,k))continue;
  const matching=groups.filter(([key])=>key===k);
  if(!matching.length)continue;
  const sizes=matching.map(([,size])=>size).filter(size=>size>=3);
  const required=Math.min(...sizes);
  const onRack=hand.filter(t=>t.k===k||t.k==='J').length;
  if(!row.target.concealed&&required<=onRack+1)continue;
  const name=tileName(k);
  const count=s.discards.slice(0,i+1).filter(d=>d.tile.k===k).length;
  const ordinal=['','first','second','third','fourth','fifth','sixth','seventh','eighth'][count]??String(count);
  const visible=visibleTileCounts(s),unseen=unseenCopies(visible,k);
  const short=required-1-onRack;
  const intro='That’s the '+ordinal+' '+name+' discarded. ';
  let reason;
  if(row.target.concealed)reason='Your concealed line can call it only for Mahjong.';
  else if(!sizes.length)reason='Your line needs it for a '+(matching.some(([,n])=>n===2)?'pair':'single')+'. You can call it only for Mahjong.';
  else if(!unseen)reason='Every copy is accounted for. Only jokers can fill the remaining slots in your set of '+required+'.';
  else if(short===1)reason='You need one more '+name+' or joker on your rack to call a set of '+required+'.';
  else reason='To call a set of '+required+', you need '+short+' more matching tiles or jokers on your rack.';
  const inPool=s.discards.filter(d=>!d.claimed&&d.tile.k===k).length;
  const showing=s.exposed.flat().reduce((total,g)=>total+g.tiles.filter(t=>t.k===k).length,0);
  return {neededDiscard:k,scarceDiscard:count>=2&&unseen<=2?k:null,text:(activeCall?'Pass. ':'')+intro+reason,details:[
   line(row)+' · '+name+' · '+inPool+' in the discard pool · '+showing+' exposed · '+unseen+' unseen.'+(sizes.length&&!row.target.concealed?' Your rack supplies '+onRack+' of the '+(required-1)+' tiles needed alongside the discard.':'')
  ]};
 }
 return null;
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
 if(choices.length&&choices.every(c=>c.dead))details.push('Exposing '+choices.map(c=>c.n).join(' or ')+' × '+tileName(tile.k)+' here would make your hand dead.');
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

export function turnAdvice(s,lines,{selected,claims,staging,receivedIds,swaps,describedLine,chosenLine,table}){
 const rack=s.hands[0],exposed=s.exposed[0],picked=rack.filter(t=>selected.has(t.id));
 if(s.deadHand?.player===0)return {text:'Watch which exposed sets and discards reveal the other players’ hands.'};
 if(claims.some(c=>c.win))return callAdvice(s,lines,claims,picked,staging);
 const mayDeclare=s.phase==='discard'&&s.turn===0||s.phase==='charleston'&&s.dealer===0&&s.passRound===1&&s.passStep===0;
 const win=mayDeclare&&winning(rack,exposed);
 if(win)return {text:'That’s '+win.name+'! Declare Mahjong.'};
 const missed=neededDiscard(s,chosenLine??lines[0],claims.length>0);
 if(missed){
  if(claims.length&&lines.length)missed.details.push(...(callAdvice(s,lines,claims,picked,staging).details??[]));
  return missed;
 }
 if(!lines.length)return {text:'Choose a different card line to find a hand you can still build.'};
 const arrivals=lines.filter(row=>row.target.id!==describedLine);
 if(claims.length)return callAdvice(s,lines,claims,picked,staging);
 const passing=s.phase==='charleston'||s.phase==='courtesy';
 if(picked.length&&passing)return selectionAdvice(rack,exposed,lines,picked,true);
 if(picked.length&&s.phase==='discard'&&s.turn===0)return discardAdvice(s,lines,picked[0],table);
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
 const discard=discardAdvice(s,lines,null,table);
 const fresh=s.drawn!=null?new Set([s.drawn]):s.turns===0?receivedIds:new Set();
 const discardingNew=discard.tile&&rack.some(t=>fresh.has(t.id)&&t.k===discard.tile.k);
 const tip=discard.tile&&!discardingNew?newTileTip(rack,exposed,arrivals,fresh):'';
 return {...discard,text:tip+discard.text};
}
