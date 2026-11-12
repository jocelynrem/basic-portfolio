import * as G from './engine.mjs?v=wind-sort-1';

export function discardClaims(s,target=null){
 if(s.phase!=='claim'&&!(s.phase==='draw'&&s.turn===0))return [];
 if(s.discards.at(-1)?.passedByPlayer)return [];
 const options=G.claimOptions(s,0);
 if(!target||!options.length)return options;
 const hand=s.hands[0],exposed=s.exposed[0],discard=s.discards.at(-1).tile;
 const groups=G.compatible(target,exposed);
 if(target.concealed||!groups)return options.filter(option=>option.win);
 const {matched:baseline}=G.evaluate(hand,exposed,target);
 const naturals=hand.filter(tile=>tile.k===discard.k),jokers=hand.filter(tile=>tile.k==='J');
 return options.filter(option=>{
  if(option.win)return true;
  if(!groups.some(([key,count])=>key===option.k&&count===option.n))return false;
  const needed=option.n-1;
  // Every mix has the same effect for a given number of natural tiles and jokers.
  for(let count=Math.min(naturals.length,needed);count>=Math.max(0,needed-jokers.length);count--){
   const used=[...naturals.slice(0,count),...jokers.slice(0,needed-count)];
   const remaining=hand.filter(tile=>!used.includes(tile));
   const next=[...exposed,{k:option.k,tiles:[...used,discard]}];
   if(G.evaluate(remaining,next,target).matched>baseline)return true;
  }
  return false;
 });
}
export function prepareDiscardClaims(s,target){
 const options=discardClaims(s,target);
 if(!target||s.phase!=='claim'||options.length)return options;
 G.resolveDiscard(s,true);
 return discardClaims(s,target);
}
export function passDiscard(s){
 if(s.phase!=='claim')return false;
 const options=discardClaims(s);
 if(!options.length||options.some(option=>option.win))return false;
 // An explicit pass closes this call even if the player draws next.
 s.discards.at(-1).passedByPlayer=true;
 G.resolveDiscard(s,true);
 return true;
}
export function canDrawWall(s,claims=discardClaims(s)){
 if(claims.some(option=>option.win))return false;
 if(s.turn===0&&s.phase==='draw')return true;
 const last=s.discards.at(-1);
 return Boolean(s.phase==='claim'&&last&&!last.claimed&&(last.player+1)%4===0);
}
export function canPickDiscard(s){
 return discardClaims(s).length>0;
}
export function drawFromWall(s){
 if(!canDrawWall(s))return false;
 if(s.phase==='claim')G.resolveDiscard(s,true);
 // Another player's legal call can take priority over drawing.
 if(s.phase!=='draw'||s.turn!==0)return false;
 G.draw(s);s.pendingWallDraw=s.phase==='wallPush';return true;
}
export function finishWallPush(s){
 G.pushWall(s);
 if(s.pendingWallDraw&&s.turn===0&&s.phase==='draw'){
  s.pendingWallDraw=false;G.draw(s);s.pendingWallDraw=s.phase==='wallPush';
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
