import * as G from './engine.mjs?v=win-source-1';
import {recommendHands} from './recommendations.mjs?v=hand-outlook-1';

const rackIds=hand=>hand.map(tile=>tile.id).sort((a,b)=>a-b).join(',');

export function currentLineMove(s){
 const move=s.lineMove;
 return move&&move.rack===rackIds(s.hands[0])?move:null;
}

function recordLineMove(s,previousHand,action){
 const hand=s.hands[0],rack=rackIds(hand);
 if(rack===rackIds(previousHand)){delete s.lineMove;return;}
 // Compare the best variation by card line, even if a different variation leads
 // after the move. Include filtered lines so opening the picker later still works.
 function distances(tiles){
  const visible=s.guidedPlay?G.visibleTileCounts({...s,hands:[tiles]}):null;
  const rows=recommendHands(tiles,s.exposed[0],{visible});
  return new Map(rows.map(row=>[row.target.id,row.away]));
 }
 const before=distances(previousHand),changes={};
 for(const [id,after] of distances(hand)){
  const prior=before.get(id);
  if(prior!==undefined&&prior!==after)changes[id]={before:prior,after};
 }
 s.lineMove={action,rack,changes};
}

export function passTiles(s,ids){
 const before=[...s.hands[0]];
 G.pass(s,ids);
 recordLineMove(s,before,'pass');
}

function drawPlayerTile(s){
 const before=[...s.hands[0]];
 G.draw(s);
 s.pendingWallDraw=s.phase==='wallPush';
 if(s.hands[0].length>before.length)recordLineMove(s,before,'draw');
}

export function lineVariations(lineId,exposed){
 return G.TARGETS.filter(target=>target.id===lineId&&G.compatible(target,exposed));
}

export function discardClaims(s,lineId=null){
 if(s.phase!=='claim'&&!(s.phase==='draw'&&s.turn===0))return [];
 if(s.discards.at(-1)?.passedByPlayer)return [];
 const options=G.claimOptions(s,0);
 if(!lineId||!options.length)return options;
 const hand=s.hands[0],exposed=s.exposed[0],discard=s.discards.at(-1).tile;
 const variations=lineVariations(lineId,exposed).filter(variation=>!variation.concealed).map(variation=>({
  target:variation,groups:G.compatible(variation,exposed),baseline:G.evaluate(hand,exposed,variation).matched
 }));
 const naturals=hand.filter(tile=>tile.k===discard.k),jokers=hand.filter(tile=>tile.k==='J');
 return options.filter(option=>{
  if(option.win)return true;
  const eligible=variations.filter(({groups})=>groups.some(([key,count])=>key===option.k&&count===option.n));
  if(!eligible.length)return false;
  const needed=option.n-1;
  // Every mix has the same effect for a given number of natural tiles and jokers.
  for(let count=Math.min(naturals.length,needed);count>=Math.max(0,needed-jokers.length);count--){
   const used=[...naturals.slice(0,count),...jokers.slice(0,needed-count)];
   const remaining=hand.filter(tile=>!used.includes(tile));
   const next=[...exposed,{k:option.k,tiles:[...used,discard]}];
   if(eligible.some(({target,baseline})=>G.evaluate(remaining,next,target).matched>baseline))return true;
  }
  return false;
 });
}
export function prepareDiscardClaims(s,lineId){
 const options=discardClaims(s,lineId);
 if(s.phase!=='claim'||options.length)return options;
 G.resolveDiscard(s,true);
 return discardClaims(s,lineId);
}
export function passDiscard(s){
 const options=discardClaims(s);
 if(!options.length||options.some(option=>option.win))return false;
 // Close the call in both the claim window and the player's draw step.
 s.discards.at(-1).passedByPlayer=true;
 if(s.phase==='claim')G.resolveDiscard(s,true);
 return true;
}
export function canDrawWall(s,claims=discardClaims(s)){
 if(G.isDeadHand(s)||claims.some(option=>option.win))return false;
 if(s.turn===0&&s.phase==='draw')return true;
 const last=s.discards.at(-1);
 return Boolean(s.phase==='claim'&&last&&!last.claimed&&G.nextActivePlayer(s,last.player)===0);
}
export function canPickDiscard(s){
 return discardClaims(s).length>0;
}
export function drawFromWall(s){
 if(!canDrawWall(s))return false;
 if(s.phase==='claim')G.resolveDiscard(s,true);
 // Another player's legal call can take priority over drawing.
 if(s.phase!=='draw'||s.turn!==0)return false;
 drawPlayerTile(s);return true;
}
export function finishWallPush(s){
 G.pushWall(s);
 if(s.pendingWallDraw&&s.turn===0&&s.phase==='draw'){
  drawPlayerTile(s);
 }
}
export function exchangeJoker(s,jokerId){
 if(s.turn!==0||s.phase!=='discard')return false;
 const option=G.exchanges(s).find(o=>s.exposed[o.owner][o.group].tiles.some(t=>t.id===jokerId&&t.k==='J'));
 return option?G.exchange(s,{...option,joker:jokerId}):false;
}

// Finish transient engine phases before the table chooses its next controls.
export function prepareTable(s){
 const received=s.phase==='passReview'?(s.lastPass?.received.map(t=>t.id)||[]):null;
 if(s.phase==='passReview')G.finishReview(s);
 if(s.phase==='wallSetup')G.finishSetup(s);
 if(s.phase==='wallPush')finishWallPush(s);
 if(s.phase==='courtesyChoice')G.prepareCourtesy(s);
 return received;
}
