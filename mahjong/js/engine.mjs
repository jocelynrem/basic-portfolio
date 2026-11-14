import {CARD,TARGETS} from './card.mjs';
export {CARD,TARGETS};
export const NAMES=['You','Mabel','Rose','June'];
const opponentMoves=new WeakMap();
function recordOpponentMove(game,player,kind,key){
 if(player===0)return;
 const move={player,kind,key};
 const pending=opponentMoves.get(game);
 if(pending)pending.push(move);
 else opponentMoves.set(game,[move]);
}
export function takeOpponentMoves(game){
 const moves=opponentMoves.get(game)??[];
 opponentMoves.delete(game);
 return moves;
}
export const SUITS=['B','C','D'];
export const BOT_DIFFICULTIES=['easy','standard','hard'];
export function normalizeDifficulty(value){return BOT_DIFFICULTIES.includes(value)?value:'easy';}
export function botExposedOnly(s,p){return p!==0&&normalizeDifficulty(s.difficulty)==='easy';}
export function isDeadHand(s,player=0){return s.deadHand?.player===player;}
export function nextActivePlayer(s,player){
 const next=(player+1)%NAMES.length;
 return isDeadHand(s,next)?(next+1)%NAMES.length:next;
}
export function tileName(k){return /^[BCD]/.test(k)?`${k.slice(1)} ${{B:'Bam',C:'Crak',D:'Dot'}[k[0]]}`:({E:'East',S:'South',W:'West',N:'North',R:'Red dragon',G:'Green dragon',H:'White dragon',F:'Flower',J:'Joker'}[k]||k);}
export function shuffle(a){for(let i=a.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
export function deck(){let ks=[];for(const s of SUITS)for(let n=1;n<=9;n++)for(let j=0;j<4;j++)ks.push(s+n);for(const k of ['E','S','W','N','R','G','H'])for(let i=0;i<4;i++)ks.push(k);for(let i=0;i<8;i++)ks.push('F','J');return shuffle(ks.map((k,id)=>({k,id})));}
export function log(s,text){s.log.unshift(text);s.log=s.log.slice(0,45);}
export function compatible(target,exposed){if(target.concealed&&exposed.length)return null;let groups=target.groups.map(g=>[...g]);for(const e of exposed){const i=groups.findIndex(([k,n])=>k===e.k&&n===e.tiles.length);if(i<0)return null;groups.splice(i,1);}return groups;}
export function evaluate(hand,exposed,target){const groups=compatible(target,exposed);if(!groups)return {matched:-1,missing:14,keep:[]};const counts={};for(const t of hand)counts[t.k]=(counts[t.k]||0)+1;let jokers=counts.J||0, matched=exposed.reduce((n,e)=>n+e.tiles.length,0),keep=[];
 // Pairs consume natural tiles; jokers may only fill groups of 3+.
 const ordered=[...groups].sort((a,b)=>a[1]-b[1]);for(const [k,n]of ordered){let natural=Math.min(counts[k]||0,n);counts[k]=(counts[k]||0)-natural;let wild=n>=3?Math.min(jokers,n-natural):0;jokers-=wild;matched+=natural+wild;keep.push([k,natural]);}
 return {matched,missing:14-matched,keep};}
export function best(hand,exposed=[],cardId=null,exposedOnly=false){
 let closest;
 for(const target of TARGETS){
  if((cardId&&target.id!==cardId)||(exposedOnly&&target.concealed))continue;
  const progress=evaluate(hand,exposed,target);
  if(!closest||progress.matched>closest.matched)closest={target,...progress};
 }
 return closest;
}
export function winning(hand,exposed=[],exposedOnly=false){if(hand.length+exposed.reduce((n,e)=>n+e.tiles.length,0)!==14)return null;return TARGETS.find(t=>(!exposedOnly||!t.concealed)&&evaluate(hand,exposed,t).matched===14)||null;}
export function sortHand(hand){const order=['F','B','C','D','N','E','W','S','R','G','H','J'];hand.sort((a,b)=>order.indexOf(a.k[0])-order.indexOf(b.k[0])||Number(a.k.slice(1)||0)-Number(b.k.slice(1)||0)||a.id-b.id);}
export function windFor(player,dealer=0){return ['East','South','West','North'][(player-dealer+4)%4];}
export function wallOrder(dealer=0){return [dealer,(dealer+3)%4,(dealer+2)%4,(dealer+1)%4,dealer];}
export function newGame(mode='random',options={}){
 const dealer=((options.dealer||0)%4+4)%4;
 const wall=deck(),hands=[[],[],[],[]];
 if(mode==='guided'){
   const keys=['F','F','B2','B2','B2','C4','C4','C4','G','G','J','D1','C9','B8'];if(dealer!==0)keys.splice(keys.indexOf('C9'),1);
   for(const k of keys){let i=wall.findIndex(t=>t.k===k);hands[0].push(wall.splice(i,1)[0]);}
 }
 for(let p=0;p<4;p++)while(hands[p].length<(p===dealer?14:13))hands[p].push(wall.pop());
 hands.forEach(sortHand);
 const dice=[1+Math.floor(Math.random()*6),1+Math.floor(Math.random()*6)],reserved=2*(dice[0]+dice[1]);
 const order=wallOrder(dealer),wallSegments=order.map((owner,i)=>({owner,total:i===0?38-reserved:i===4?reserved:38,remaining:i===0?38-reserved:i===4?reserved:38,...(i===4?{reserved:true}:{})}));
 let dealt=53,wallIndex=0;for(const segment of wallSegments){const used=Math.min(dealt,segment.remaining);segment.remaining-=used;dealt-=used;if(segment.remaining===0)wallIndex++;}
 return {version:4,dealer,handNumber:options.handNumber||1,scores:[...(options.scores||[0,0,0,0])],scoreHistory:[...(options.scoreHistory||[])],scoreRecorded:false,dice,wallSegments,wallIndex,wall,hands,exposed:[[],[],[],[]],discards:[],turn:dealer,phase:'wallSetup',setupStep:0,passStep:0,passRound:1,courtesyCount:0,log:['A new table. Choose three tiles to pass right.'],winner:null,drawn:null,turns:0,mode,difficulty:normalizeDifficulty(options.difficulty)};
}
export function leastUseful(hand,exposed=[],count=1,noJoker=false,exposedOnly=false){let temp=[...hand],chosen=[];for(let n=0;n<count;n++){let candidates=temp.filter(t=>!noJoker||t.k!=='J');if(!candidates.length)break;let ranking=candidates.map(t=>({t,score:best(temp.filter(x=>x.id!==t.id),exposed,null,exposedOnly).matched}));ranking.sort((a,b)=>b.score-a.score||(a.t.k==='J')-(b.t.k==='J'));let t=ranking[0].t;chosen.push(t);temp=temp.filter(x=>x.id!==t.id);}return chosen;}
export function visibleTileCounts(s,p=0){
 const visible=new Map();
 for(const tile of s.hands[p])visible.set(tile.id,tile);
 for(const groups of s.exposed)for(const group of groups)for(const tile of group.tiles)visible.set(tile.id,tile);
 for(const discard of s.discards)if(!discard.claimed)visible.set(discard.tile.id,discard.tile);
 const counts={};
 for(const {k} of visible.values())counts[k]=(counts[k]||0)+1;
 return counts;
}
const byGroupSize=(a,b)=>a[1]-b[1];
const fullCardPlans=TARGETS.map(target=>[...target.groups].sort(byGroupSize));
function availablePlans(exposed){
 if(!exposed.length)return fullCardPlans;
 return TARGETS.map(target=>compatible(target,exposed)).filter(Boolean).map(groups=>groups.sort(byGroupSize));
}
function unseenCopies(visible,k){return Math.max(0,(k==='F'||k==='J'?8:4)-(visible[k]||0));}
function liveHandScore(hand,exposed,visible,plans=availablePlans(exposed)){
 const counts={};
 for(const {k} of hand)counts[k]=(counts[k]||0)+1;
 const exposedCount=exposed.reduce((n,group)=>n+group.tiles.length,0),unseenJokers=unseenCopies(visible,'J');
 let strongest=-Infinity;
 for(const groups of plans){
  const left={...counts},reserved={},flexible={};
  let matched=exposedCount,scarcity=0,blocked=false;
  for(const [k,n] of groups){
   const owned=Math.min(left[k]||0,n),needed=n-owned;
   left[k]=(left[k]||0)-owned;matched+=owned;
   if(!needed)continue;
   if(n>=3){flexible[k]=(flexible[k]||0)+needed;continue;}
   const available=unseenCopies(visible,k)-(reserved[k]||0);
   if(available<needed){blocked=true;break;}
   reserved[k]=(reserved[k]||0)+needed;scarcity+=needed/available;
  }
  if(blocked)continue;
  let flexibleSlots=0,naturalCapacity=0,liveChoices=0;
  for(const [k,needed] of Object.entries(flexible)){
   const available=unseenCopies(visible,k)-(reserved[k]||0);
   flexibleSlots+=needed;naturalCapacity+=Math.min(needed,available);liveChoices+=available;
  }
  const heldJokers=Math.min(counts.J||0,flexibleSlots),missing=flexibleSlots-heldJokers;
  if(missing>naturalCapacity+unseenJokers)continue;
  if(missing)scarcity+=missing/(liveChoices+unseenJokers);
  // Availability breaks ties between equally close hands.
  strongest=Math.max(strongest,matched+heldJokers-scarcity/100);
 }
 return strongest;
}
function botLeastUseful(s,p,count,noJoker){
 const hand=s.hands[p],exposed=s.exposed[p];
 if(s.difficulty!=='hard')return leastUseful(hand,exposed,count,noJoker,botExposedOnly(s,p));
 if(!count)return [];
 const visible=visibleTileCounts(s,p),plans=availablePlans(exposed),chosen=[];
 let remaining=[...hand];
 while(chosen.length<count){
  const candidates=new Map();
  for(const tile of remaining)if((!noJoker||tile.k!=='J')&&!candidates.has(tile.k))candidates.set(tile.k,tile);
  let pick=null,top=-Infinity;
  for(const tile of candidates.values()){
   const score=liveHandScore(remaining.filter(t=>t.id!==tile.id),exposed,visible,plans);
   if(score>top||(score===top&&pick?.k==='J'&&tile.k!=='J')){pick=tile;top=score;}
  }
  if(!pick)return [...chosen,...leastUseful(remaining,exposed,count-chosen.length,noJoker)];
  chosen.push(pick);remaining=remaining.filter(tile=>tile.id!==pick.id);
 }
 return chosen;
}
export function pass(s,ids){
 const isCourtesy=s.phase==='courtesy',needed=isCourtesy?s.courtesyCount:3,blindAllowed=!isCourtesy&&s.passStep===2;
 if((!blindAllowed&&ids.length!==needed)||ids.length>needed||new Set(ids).size!==ids.length)throw Error(`Select ${needed} tiles${blindAllowed?' or use a blind pass':''}.`);
 let picked=ids.map(id=>s.hands[0].find(t=>t.id===id));if(picked.some(t=>!t||t.k==='J'))throw Error('Jokers stay on your rack during the Charleston.');
 let outgoing=[picked,...[1,2,3].map(p=>botLeastUseful(s,p,isCourtesy&&p%2===1?s.otherCourtesyCount:needed,true))];
 let direction=isCourtesy?2:(s.passRound===1?[1,2,3]:[3,2,1])[s.passStep],source=(4-direction)%4;
 for(let p=0;p<4;p++)s.hands[p]=s.hands[p].filter(t=>!outgoing[p].some(x=>x.id===t.id));
 const borrowed=blindAllowed?outgoing[source].splice(0,3-picked.length):[];
 outgoing[0]=[...picked,...borrowed];
 const received=[...outgoing[source]];
 for(let p=0;p<4;p++)s.hands[(p+direction)%4].push(...outgoing[p]);s.hands.forEach(sortHand);
 const directionName=direction===1?'right':direction===2?'across':'left';
 log(s,needed?`You passed ${needed} tiles ${directionName}${borrowed.length?' ('+borrowed.length+' unseen)':''}.`:'Courtesy pass skipped.');
 if(isCourtesy){s.turn=s.dealer||0;s.phase='discard';log(s,`The Charleston is complete. ${NAMES[s.turn]} is East and discards first.`);}
 else if(++s.passStep===3){s.passStep=0;s.phase=s.passRound===1?'charlestonChoice':'courtesyChoice';}
 if(needed||(isCourtesy&&s.otherCourtesyCount)){s.resumePhase=s.phase;s.phase='passReview';s.lastPass={sent:picked,borrowed,received,direction,source,destination:direction,isCourtesy,otherCount:isCourtesy?s.otherCourtesyCount:0};}
}
export function finishReview(s){if(s.phase==='passReview'){s.phase=s.resumePhase;delete s.resumePhase;}}
export function secondCharleston(s,yes){if(s.phase!=='charlestonChoice')return;if(yes){s.passRound=2;s.phase='charleston';log(s,'Second Charleston: pass three tiles left.');}else{s.phase='courtesyChoice';log(s,'Optional second Charleston skipped.');}}
export function prepareCourtesy(s){if(s.phase!=='courtesyChoice')return;s.courtesyCount=0;s.otherCourtesyCount=3;s.phase='courtesy';}
export function courtesy(s,n){if(s.phase!=='courtesyChoice')return;s.courtesyCount=n;s.otherCourtesyCount=3;s.phase='courtesy';if(!n)pass(s,[]);}
export function draw(s){if(s.phase!=='draw'||isDeadHand(s,s.turn))throw Error('You cannot draw right now.');if(!s.wall.length){s.phase='ended';log(s,'Wall game. All tiles have been drawn.');return;}if(s.wallSegments&&s.wallSegments[s.wallIndex].remaining===0){s.wallIndex++;s.phase='wallPush';log(s,`${NAMES[s.wallSegments[s.wallIndex].owner]} must curtsy the next wall.`);return;}let t=s.wall.pop();if(s.wallSegments)s.wallSegments[s.wallIndex].remaining--;s.hands[s.turn].push(t);s.drawn=t.id;s.phase='discard';log(s,`${NAMES[s.turn]} ${s.turn===0?'drew '+tileName(t.k):'drew a tile'}.`);}
export function declare(s,p=s.turn){
 if(isDeadHand(s,p))return false;
 const target=winning(s.hands[p],s.exposed[p],botExposedOnly(s,p));
 if(!target)return false;
 s.winType||=s.phase==='charleston'?'heavenly':'self-draw';
 s.phase='ended';s.winner=p;s.winningHand=target.name;s.winningTargetKey=target.key;
 log(s,`${NAMES[p]} called Mahjong! ${target.name}.`);
 return true;
}
const exposureNames={3:'Pung',4:'Kong',5:'Quint',6:'Sextet'};
export function claimOptions(s,player){
 const discard=s.discards.at(-1);
 if(!discard||discard.claimed||discard.player===player||discard.tile.k==='J'||isDeadHand(s,player))return [];
 const hand=s.hands[player],exposed=s.exposed[player],options=[],key=discard.tile.k;
 if(winning([...hand,discard.tile],exposed,botExposedOnly(s,player)))options.push({win:true,label:'Mahjong',ids:[]});
 const naturals=hand.filter(tile=>tile.k===key),jokers=hand.filter(tile=>tile.k==='J');
 const maxSize=Math.min(6,naturals.length+jokers.length+1);
 if(maxSize<3)return options;

 const matchingSizes=new Set();
 for(const target of TARGETS){
  if(target.concealed)continue;
  for(const [tile,size] of compatible(target,exposed)??[]){
   if(tile===key&&size>=3&&size<=maxSize)matchingSizes.add(size);
  }
 }
 const addExposure=(size,dead=false)=>{
  const natural=naturals.slice(0,size-1);
  const wild=jokers.slice(0,size-1-natural.length);
  const option={k:key,n:size,ids:[...natural,...wild].map(tile=>tile.id),label:`${exposureNames[size]} of ${tileName(key)}`};
  if(dead)option.dead=true;
  options.push(option);
 };
 for(const size of matchingSizes)addExposure(size);
 if(player===0&&s.allowDeadHands!==false){
  for(let size=3;size<=maxSize;size++){
   if(!matchingSizes.has(size))addExposure(size,true);
  }
 }
 return options;
}
export function claim(s,p,option){
 const discard=s.discards.at(-1);
 if(!discard||discard.claimed||discard.player===p||discard.tile.k==='J'||isDeadHand(s,p))return;
 if(p===0&&discard.passedByPlayer)return;

 const hand=s.hands[p],priorExposures=s.exposed[p];
 if(option.win){
  if(!winning([...hand,discard.tile],priorExposures,botExposedOnly(s,p)))return;
 }else if(option.k!==discard.tile.k||!Object.hasOwn(exposureNames,option.n)||option.ids?.length!==option.n-1){
  return;
 }
 const picked=new Set(option.ids);
 const tiles=hand.filter(tile=>picked.has(tile.id));
 const exposure={k:option.k,tiles:[...tiles,discard.tile]};
 if(!option.win&&(tiles.length!==option.n-1||tiles.some(tile=>tile.k!==discard.tile.k&&tile.k!=='J')))return;
 const matchesCard=option.win||TARGETS.some(target=>compatible(target,[...priorExposures,exposure]));
 if(!matchesCard&&(p!==0||s.allowDeadHands===false))return;

 discard.claimed=true;
 s.turn=p;
 s.drawn=null;
 if(option.win){
  s.winType='discard';
  s.winningDiscarder=discard.player;
  hand.push(discard.tile);
  declare(s,p);
  return;
 }
 log(s,`${NAMES[p]} called ${option.label.toLowerCase()}.`);
 if(!matchesCard){
  const caller=nextActivePlayer(s,p);
  hand.push(discard.tile);
  s.deadHand={player:p,caller,key:discard.tile.k,size:exposure.tiles.length};
  s.phase='draw';
  s.turn=caller;
  log(s,`${NAMES[caller]} declared your hand dead because the new exposure fits no card line.`);
  return;
 }
 s.hands[p]=hand.filter(tile=>!picked.has(tile.id));
 priorExposures.push(exposure);
 s.phase='discard';
 recordOpponentMove(s,p,'call',discard.tile.k);
}
// A useful exposure can commit to a close alternative, even when a flexible
// unexposed rack has the same tile count. Prefer the strongest call, conserve
// jokers on ties. Exposures only fit lines that permit them.
export function botClaimOption(s,p,options=claimOptions(s,p)){
 const discard=s.discards.at(-1),ordinary=options.filter(o=>!o.win);
 if(!discard||!ordinary.length)return null;
 const hand=s.hands[p],exposed=s.exposed[p],exposedOnly=botExposedOnly(s,p);
 const visible=s.difficulty==='hard'?visibleTileCounts(s,p):null;
 const score=(rack,groups)=>visible?liveHandScore(rack,groups,visible):best(rack,groups,null,exposedOnly).matched;
 const baseline=score(hand,exposed);
 const choices=ordinary.map(option=>{
  const used=hand.filter(t=>option.ids.includes(t.id)),remaining=hand.filter(t=>!option.ids.includes(t.id));
  const after=score(remaining,[...exposed,{k:option.k,tiles:[...used,discard.tile]}]);
  return {option,score:after,jokers:used.filter(t=>t.k==='J').length,naturals:used.filter(t=>t.k!=='J').length};
 }).filter(c=>Number.isFinite(c.score)&&(c.score>baseline||(
  c.score===baseline&&c.naturals>=2&&c.jokers===0
 )));
 choices.sort((a,b)=>b.score-a.score||a.jokers-b.jokers||b.naturals-a.naturals);
 return choices[0]?.option||null;
}
export function resolveDiscard(s,humanPassed=false){let d=s.discards.at(-1),order=[1,2,3].map(i=>(d.player+i)%4);let options=order.map(p=>({p,options:claimOptions(s,p)}));const firstWin=options.find(x=>x.options.some(o=>o.win));if(firstWin){if(firstWin.p===0&&!humanPassed){s.phase='claim';return;}if(firstWin.p!==0){claim(s,firstWin.p,firstWin.options.find(o=>o.win));return;}}
 if(d.player!==0&&!humanPassed&&claimOptions(s,0).length){s.phase='claim';return;}
 for(const {p,options:os}of options){if(p===0)continue;const good=botClaimOption(s,p,os);if(good){claim(s,p,good);return;}}
 s.turn=nextActivePlayer(s,d.player);s.phase='draw';s.drawn=null;
}
export function discard(s,id){if(s.phase!=='discard'||isDeadHand(s,s.turn))throw Error('Wait for the discard step.');let i=s.hands[s.turn].findIndex(t=>t.id===id);if(i<0)throw Error('Choose a tile on your rack.');let tile=s.hands[s.turn].splice(i,1)[0];s.discards.push({tile,player:s.turn,claimed:false});s.turns++;log(s,`${NAMES[s.turn]} discarded ${tileName(tile.k)}.`);s.drawn=null;delete s.jokerSelfPick;resolveDiscard(s);}
export function exchanges(s,p=s.turn){if(s.phase!=='discard'||s.turn!==p||isDeadHand(s,p))return [];let out=[];for(let owner=0;owner<4;owner++)s.exposed[owner].forEach((e,group)=>{const j=e.tiles.find(t=>t.k==='J'),natural=s.hands[p].find(t=>t.k===e.k);if(j&&natural)out.push({owner,group,joker:j.id,natural:natural.id,k:e.k});});return out;}
export function exchange(s,option){
 const valid=exchanges(s).find(x=>x.owner===option.owner&&x.group===option.group&&s.exposed[x.owner][x.group].tiles.some(t=>t.id===option.joker&&t.k==='J'));
 if(!valid)return false;
 const player=s.turn,hand=s.hands[player];
 const exposed=s.exposed[valid.owner][valid.group].tiles;
 const naturalIndex=hand.findIndex(tile=>tile.id===valid.natural);
 const jokerIndex=exposed.findIndex(tile=>tile.id===option.joker);
 const canComplete=valid.owner!==player&&s.drawn==null&&
  !winning(hand,s.exposed[player],botExposedOnly(s,player));
 [hand[naturalIndex],exposed[jokerIndex]]=[exposed[jokerIndex],hand[naturalIndex]];
 if(canComplete||s.jokerSelfPick)s.jokerSelfPick=!!winning(hand,s.exposed[player],botExposedOnly(s,player));
 log(s,`${NAMES[player]} exchanged ${tileName(valid.k)} for a joker.`);
 recordOpponentMove(s,player,'swap',valid.k);
 return true;
}
function usefulExchange(s,p){
 const options=exchanges(s,p);
 if(!options.length||botExposedOnly(s,p))return options[0];
 const hand=s.hands[p],exposed=s.exposed[p],visible=s.difficulty==='hard'?visibleTileCounts(s,p):null;
 const plans=visible?availablePlans(exposed):null;
 const score=rack=>visible?liveHandScore(rack,exposed,visible,plans):best(rack,exposed).matched;
 const baseline=score(hand);
 return options.find(({natural,joker})=>score(hand.map(tile=>tile.id===natural?{k:'J',id:joker}:tile))>=baseline);
}
export function botStep(s){
 if(s.turn===0||['ended','claim','passReview','charleston','charlestonChoice','courtesyChoice','courtesy'].includes(s.phase))return false;
 if(s.phase==='draw')draw(s);
 if(s.phase!=='discard')return true;
 const p=s.turn;
 if(!botExposedOnly(s,p)&&declare(s,p))return true;
 for(let swaps=0;swaps<8;swaps++){
  const choice=usefulExchange(s,p);
  if(!choice)break;
  exchange(s,choice);
 }
 if(declare(s,p))return true;
 const [tile]=botLeastUseful(s,p,1,false);
 discard(s,tile.id);
 return true;
}

export function pushWall(s){if(s.phase!=='wallPush')return;s.phase='draw';log(s,`${NAMES[s.wallSegments[s.wallIndex].owner]} curtsied ${s.wallSegments[s.wallIndex].reserved?'the reserved end of East’s wall':'their wall'}. Push left, play right.`);}

export function finishSetup(s){if(s.phase==='wallSetup')s.phase='charleston';}
