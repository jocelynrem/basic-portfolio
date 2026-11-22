import {NAMES,tileName,visibleTileCounts,winning} from './engine.mjs?v=win-source-1';
import {selectionAdvice,spareTiles,suggestTiles} from './coaching.mjs?v=coach-layout-1';
import {assessHand,compareFit} from './recommendations.mjs?v=hand-outlook-1';

const and=new Intl.ListFormat('en',{type:'conjunction'});
const or=new Intl.ListFormat('en',{type:'disjunction'});
const tileList=tiles=>and.format(tiles.map(t=>tileName(t.k)));
const countTiles=n=>n+' tile'+(n===1?'':'s');

function roundChoice(game,lines){
 if(game.phase==='charleston')return {text:game.passRound===1?
  'Finish the first three passes. Then you can stop before the second Charleston.':
  'The second Charleston has already started. Finish its three passes, then choose how many tiles to exchange across.'};
 if(!lines.length)return {text:'The second Charleston is optional. Start it if you have three tiles you’re willing to pass.'};
 const spares=spareTiles(game.hands[0],game.exposed[0],lines);
 if(spares.length===3)return {text:'I’d start the second Charleston. You can pass '+tileList(spares)+' and keep '+and.format(lines.map(r=>r.target.name))+' open.'};
 return {text:'I’d stop here. A full pass would weaken '+(lines.length===1?lines[0].target.name:'at least one of your two lines')+'. You can still make a courtesy pass.'};
}

function passNote(n,blind,courtesy){
 const left=3-n;
 if(!left)return '';
 if(courtesy)return 'You can exchange just '+countTiles(n)+'.';
 if(blind)return 'You can pass the other '+countTiles(left)+' blind from the incoming tiles.';
 return 'Choose '+left+' more to make the required pass of three.';
}

// Named tiles describe a hypothetical pass. A question about "these tiles"
// uses the physical selection, including multiple copies of the same tile.
function reviewPass(game,lines,packet,blind,courtesy,selectedPacket){
 const hand=game.hands[0],exposed=game.exposed[0];
 const review=selectionAdvice(hand,exposed,lines,packet,true);
 const ids=new Set(packet.map(t=>t.id)),left=hand.filter(t=>!ids.has(t.id));
 const visible=visibleTileCounts(game);
 let reason=review.text;
 if(packet.length===1){
  const key=packet[0].k;
  for(const row of lines){
   const after=assessHand(left,exposed,row.target,visible);
   const gap=after.gaps.find(g=>g.key===key);
   if(gap&&gap.need>(row.gaps.find(g=>g.key===key)?.need??0)){
    reason='Keeping '+tileName(key)+' protects a '+(gap.pair?'pair':'single')+' on '+row.target.name+'. A joker can’t fill that spot.';
    break;
   }
  }
 }
 const replacing=reason!==review.text||reason.startsWith('I’d keep')||reason.startsWith('Tight rack');
 const note=replacing?(blind?'You can fill the pass with unseen incoming tiles.':courtesy?'You can exchange fewer tiles, or skip.':''):
  selectedPacket?passNote(packet.length,blind,courtesy):'';
 return {text:reason+(note?' '+note:''),details:['Tiles considered for this pass · '+tileList(packet)+'.',...review.details]};
}

function comparePassTiles(game,lines,tiles){
 const visible=visibleTileCounts(game);
 const options=tiles.map(tile=>{
  const left=game.hands[0].filter(t=>t.id!==tile.id);
  return {tile,rows:lines.map(row=>assessHand(left,game.exposed[0],row.target,visible))};
 });
 const byFit=(a,b)=>{
  for(let i=0;i<lines.length;i++){
   const order=compareFit(a.rows[i],b.rows[i]);
   if(order)return order;
  }
  return 0;
 };
 options.sort(byFit);
 const best=options[0];
 const tied=options.filter(o=>byFit(o,best)===0);
 const details=options.flatMap(o=>o.rows.map(r=>'Passing '+tileName(o.tile.k)+' · '+r.target.name+' · '+r.away+' tiles away · '+r.naturalsNeeded+' missing for singles and pairs.'));
 if(tied.length===options.length)return {text:(options.length===2?'Either works. ':'Any of these works. ')+'Passing '+or.format(tiles.map(t=>tileName(t.k)))+' leaves the same fit for '+and.format(lines.map(r=>r.target.name))+'.',details};
 const rival=options.find(o=>byFit(o,best)!==0);
 const row=best.rows.find((r,i)=>compareFit(r,rival.rows[i])!==0);
 const names=or.format(tied.map(o=>tileName(o.tile.k)));
 return {text:'I’d pass '+names+' and keep '+tileName(rival.tile.k)+' for '+row.target.name+'.',details};
}

export function charlestonQuestion(game,lines,q,keys,tileKey,selectedIds){
 const choice=game.phase==='charlestonChoice';
 const courtesy=game.phase==='courtesy'||game.phase==='courtesyChoice';
 if(!choice&&!courtesy&&game.phase!=='charleston')return null;

 const decision=/\b(stop|skip|continue|start the second|second charleston|keep going|keep passing|sit .*out)\b/.test(q);
 const blindQuestion=/\bblind\b/.test(q);
 const direction=/\b(who|whom|which way|what direction|which direction)\b/.test(q)&&/\b(pass\w*|send\w*|giv\w*)\b/.test(q);
 const countQuestion=/\bhow many\b/.test(q)&&/\b(pass\w*|send\w*|exchange\w*)\b/.test(q);
 const packetQuestion=/\b(pass\w*|send\w*|give|giving|exchange\w*|discard\w*|keep\w*|toss\w*|throw\w*|drop\w*|hold\w*|let go|hang on|packet|selection|selected|these tiles|what should i do|any advice|what do you (?:suggest|recommend))\b/.test(q)||
  (keys.length||tileKey)&&/\b(what about|what if|why not|why this|useful|spare|recommend\w*|suggest\w*)\b/.test(q);
 if(!decision&&!blindQuestion&&!direction&&!countQuestion&&!packetQuestion)return null;

 if(game.deadHand?.player===0)return {text:'Your hand is out for this round.'};
 const hand=game.hands[0],exposed=game.exposed[0],playable=lines.filter(r=>!r.blocked);
 if(game.phase==='charleston'&&game.dealer===0&&game.passRound===1&&game.passStep===0){
  const win=winning(hand,exposed);
  if(win)return {text:'Your rack completes '+win.name+'. Declare Mahjong before passing.'};
 }
 if(choice||decision&&!courtesy)return roundChoice(game,playable);
 const blind=!courtesy&&game.passStep===2;
 if(courtesy&&decision)return {text:'Yes, you can skip the courtesy pass. Select zero tiles to keep your rack, or exchange up to three with Rose.'};
 if(direction){
  const dest=courtesy?2:(game.passRound===2?[3,2,1]:[1,2,3])[game.passStep];
  return {text:'Pass '+['','right','across','left'][dest]+' to '+NAMES[dest]+'.'};
 }
 if(blindQuestion&&!blind)return {text:courtesy?'Choose zero to three tiles from your rack for the courtesy pass.':'Blind passing is available on the third pass of each Charleston. This pass takes three tiles from your rack.'};
 const selected=new Set(selectedIds);
 let packet=hand.filter(t=>selected.has(t.id));
 if(keys.length){
  packet=keys.map(k=>hand.find(t=>t.k===k));
  const missing=keys.find((k,i)=>!packet[i]);
  if(missing)return {text:tileName(missing)+' isn’t on your rack. Choose a rack tile to check a pass.'};
 }else if(!packet.length&&tileKey&&/\b(this|that|it)\b/.test(q)){
  packet=hand.filter(t=>t.k===tileKey).slice(0,1);
 }
 if(packet.some(t=>t.k==='J'))return {text:'Keep the joker. Jokers stay on your rack during every Charleston and courtesy pass.'};
 if(packet.length>3)return {text:'Choose up to three tiles to consider for one pass.'};
 if(!playable.length)return {text:'Choose a playable line so I can check which tiles you can pass.'};
 if(packet.length>1&&keys.length>1&&/\bor\b/.test(q))return comparePassTiles(game,playable,packet);
 if(packet.length&&!countQuestion)return reviewPass(game,playable,packet,blind,courtesy,packet.every(t=>selected.has(t.id)));
 const suggested=blind||courtesy?spareTiles(hand,exposed,playable):suggestTiles(hand,exposed,playable,3,true);
 if(!suggested.length)return {text:courtesy?'I’d skip the courtesy pass. Every tile helps one of your lines.':'Keep your rack and pass all three incoming tiles blind.'};
 const review=selectionAdvice(hand,exposed,playable,suggested,true);
 const note=passNote(suggested.length,blind,courtesy);
 const why=review.text.startsWith('You can spare')&&review.text.includes(' and keep ')?'That keeps '+and.format(playable.map(r=>r.target.name))+' open.':review.text;
 return {text:'I’d pass '+tileList(suggested)+'. '+why+(note?' '+note:''),details:review.details};
}
