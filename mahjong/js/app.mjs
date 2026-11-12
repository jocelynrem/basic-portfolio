import * as G from './engine.mjs?v=wind-sort-1';
import {displayDiscards,handSignals,exposureChoice} from './discard-view.mjs?v=wind-sort-1';
import {finalizeRound,reviewRoundHands} from './rounds.mjs?v=wind-sort-1';
import {canDrawWall,discardClaims,prepareDiscardClaims,passDiscard,drawFromWall,finishWallPush,exchangeJoker,prepareTable} from './table-actions.mjs?v=call-prompt-range-1';
import {recommendHands} from './recommendations.mjs?v=all-lines-1';
import {displaySymbols,patternBlocks,targetBlocks} from './hand-groups.mjs?v=dragon-notation-1';
import {placeJoker} from './joker-placement.mjs?v=wind-sort-1';
import {newMatch,nextRound,finishMatch,normalizeMatch} from './match.mjs?v=wind-sort-1';
import {practiceGame} from './learning.mjs?v=wind-sort-1';
import {tileAdvice} from './hints.mjs?v=wind-sort-1';
import {matchHandTiles} from './hand-match.mjs?v=wind-sort-1';
import {retainRackOrder,moveRackTile} from './rack-order.mjs';
import {installRackArrangement} from './rack-arrange.mjs?v=mobile-review-1';
import {STYLES,BOARDS,validStyle,faceArt} from './tile-art.mjs?v=portfolio-parlor-1';
let tileStyle='modern',hideConcealed=false,discardOrder='time',soundEnabled=false;try{tileStyle=validStyle(localStorage.getItem('parlor-tile-style'));hideConcealed=localStorage.getItem('parlor-hide-concealed')==='true';discardOrder=localStorage.getItem('parlor-discard-order')==='suit'?'suit':'time';soundEnabled=localStorage.getItem('parlor-sound')==='true';}catch{}
try{if(localStorage.getItem('parlor-theme-version')!=='modern-garden-1'){tileStyle='modern';localStorage.setItem('parlor-tile-style',tileStyle);localStorage.setItem('parlor-theme-version','modern-garden-1');}}catch{}
const $=s=>document.querySelector(s),STORE='parlor-2026-v1';
const landscapeLayout=matchMedia('(orientation: landscape) and (min-width: 500px) and (max-width: 1050px) and (max-height: 500px)');
const coarsePointer=matchMedia('(any-pointer: coarse)');
const touchRack=()=>innerWidth<=760||landscapeLayout.matches||coarsePointer.matches;
const difficultyNames={easy:'Easy',standard:'Standard',hard:'Hard'};
const difficultyNotes={easy:'Bots play exposed hands.',standard:'Bots play all card lines, including concealed hands.',hard:'Bots play all card lines and use visible tiles to judge which hands are within reach.'};
let difficultyPreference='easy';try{difficultyPreference=G.normalizeDifficulty(localStorage.getItem('parlor-difficulty'));}catch{}
let s;try{s=JSON.parse(localStorage.getItem(STORE));if(s?.version!==4)throw Error();}catch{s=null;}s||=newMatch(difficultyPreference);normalizeMatch(s);
let selected=new Set(),pinned=G.CARD.some(c=>c.id===s.goalHandId)?s.goalHandId:null,goalKey=s.goalTargetKey||null,pickerOpen=localStorage.getItem('parlor-hand-picker-open')==='true',jokerTargetGroup=null,lastFreshKey='',matchingIds=new Set(),receivedIds=new Set(s.receivedIds||[]),neededDiscardKeys=new Set(),usableJokerIds=new Set(),winningJokerIds=new Set(),section=localStorage.getItem('parlor-card-section')||'All sections',sound=soundEnabled,passing=false,activePass=null,botTimer,toastTimer,wallLessonStep=0,mobileArrange=false,hintIds=[],lastDiscardShown=null;
let claims=[],winningClaim=null,swaps=[],swapMessage='';
const callPromptOptions=[
 {value:'all',label:'All eligible calls'},
 {value:'chosen',label:'Chosen hand · any distance'},
 ...[1,2,3].map(maxTilesAway=>({
  value:String(maxTilesAway),label:`Filter within ${maxTilesAway} ${maxTilesAway===1?'tile':'tiles'} of chosen hand`,maxTilesAway
 }))
];
let callPrompt=callPromptOptions[0];
try{
 const saved=localStorage.getItem('parlor-call-prompts')??(localStorage.getItem('parlor-helpful-calls')==='true'?'chosen':'all');
 callPrompt=callPromptOptions.find(option=>option.value===saved)??callPrompt;
}catch{}
let regularReturn=null;try{regularReturn=JSON.parse(localStorage.getItem('parlor-regular-game'));}catch{}
let savedMatch=null;try{savedMatch=JSON.parse(localStorage.getItem('parlor-match-2026'));}catch{}
s.jokerPlacements||={};
s.dealer??=0;s.handNumber??=savedMatch?.handNumber||1;s.scores??=savedMatch?.scores||[0,0,0,0];s.scoreHistory??=savedMatch?.scoreHistory||[];
const modal=$('#modal');
const esc=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const btn=(label,action,cls='',disabled=false)=>`<button class="button ${cls}" data-action="${action}" ${disabled?'disabled':''}>${label}</button>`;
const pos=[[50,88],[88,48],[50,9],[12,48]],passNames=['','right','across','left'];
const jokerLabel='<svg class="tile-joker-label" viewBox="0 0 36 10" aria-hidden="true" focusable="false"><text x="18" y="8.5" text-anchor="middle" textLength="32" lengthAdjust="spacingAndGlyphs">JOKER</text></svg>';
function tile(t,size='',interactive=false,extra='',style=tileStyle){
 const k=typeof t==='string'?t:t.k,n=Number(k.slice(1)),cls=/^B/.test(k)?'bam':/^C/.test(k)?'crak':/^D/.test(k)?'dot':k==='J'?'joker':k==='F'?'flower':'honor';
 const corner=style!=='mobile'&&/^[BCD]/.test(k)?`<span class="tile-number">${n}</span>`:'',fresh=interactive&&(s.drawn===t.id||receivedIds.has(t.id)),freshLabel=fresh?(s.drawn===t.id?'Just drawn':'Just received'):'';
 const jokerCaption=k==='J'&&style!=='mobile'?jokerLabel:'';
 const callClass=interactive&&claims.length&&!winningClaim?(k===s.discards.at(-1).tile.k||k==='J'?'claim-eligible':'claim-unavailable'):'';
 const attrs=interactive?`data-tile="${t.id}" aria-label="${G.tileName(k)}${freshLabel?' · '+freshLabel:''}" aria-pressed="${selected.has(t.id)}" aria-describedby="rack-arrange-help" aria-keyshortcuts="Alt+ArrowLeft Alt+ArrowRight" ${passing||s.phase==='wallSetup'?'disabled':''}`:`role="img" aria-label="${G.tileName(k)}"`;
 return `<${interactive?'button':'span'} class="tile ${cls} ${size} ${extra} ${interactive&&selected.has(t.id)?'selected':''} ${callClass} ${interactive&&s.drawn===t.id?'drawn':''} ${interactive&&receivedIds.has(t.id)?'received':''} ${interactive&&matchingIds.has(t.id)?'hand-match':''} ${interactive&&usableJokerIds.has(t.id)?'joker-usable':''} ${interactive&&winningJokerIds.has(t.id)?'joker-winning':''}" data-tile-style="${style}" ${attrs} title="${freshLabel?freshLabel+' · ':''}${esc(interactive&&winningJokerIds.has(t.id)?'Joker can complete this hand — unassigned':interactive&&usableJokerIds.has(t.id)?'Joker can help this hand — unassigned':G.tileName(k))}">${fresh?'<span class="tile-new-mark" aria-hidden="true">NEW</span>':''}${jokerCaption}${corner}${faceArt(k,style)}</${interactive?'button':'span'}>`;
}
function stylePreview(){return ['B1','B5','D3','C8','F','J','N','E','S','W','R','G','H'].map(k=>tile(k,'preview-tile')).join('');}
function stylePicker(){return `<fieldset class="style-picker"><legend>Tile set</legend><div class="style-choices">${Object.entries(STYLES).map(([id,style])=>`<label><input type="radio" name="tile-style" value="${id}" ${id===tileStyle?'checked':''}><span>${style.name}</span></label>`).join('')}</div><div id="settings-style-preview" class="style-samples">${stylePreview()}</div></fieldset>`;}
function applyTileStyle(style){tileStyle=validStyle(style);try{localStorage.setItem('parlor-tile-style',tileStyle);}catch{}render();if($('#settings-style-preview'))$('#settings-style-preview').innerHTML=stylePreview();}
function playSound(){if(!sound)return;try{const ctx=new(window.AudioContext||window.webkitAudioContext)(),o=ctx.createOscillator(),gain=ctx.createGain();o.type='sine';o.frequency.setValueAtTime(760,ctx.currentTime);o.frequency.exponentialRampToValueAtTime(380,ctx.currentTime+.09);gain.gain.setValueAtTime(.06,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.15);o.connect(gain).connect(ctx.destination);o.start();o.stop(ctx.currentTime+.16);o.onended=()=>ctx.close();}catch{}}
function save(){try{localStorage.setItem('parlor-hand-picker-open',String(pickerOpen));}catch{}s.receivedIds=[...receivedIds];s.goalHandId=pinned;s.goalTargetKey=goalKey;try{localStorage.setItem(STORE,JSON.stringify(s));if(!s.practiceSession)localStorage.setItem('parlor-match-2026',JSON.stringify({scores:s.scores,scoreHistory:s.scoreHistory,dealer:s.dealer,handNumber:s.handNumber}));}catch{}}
function toast(message){$('#toast').textContent=message;$('#toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').hidden=true,4800);}
function show(title,body,eyebrow=''){clearTimeout(botTimer);modal.classList.remove('tile-style-modal');modal.dataset.view=''; $('#modal-eyebrow').textContent=eyebrow;$('#modal-eyebrow').hidden=!eyebrow;$('#modal-content').innerHTML=`<h2 id="modal-title">${title}</h2>${body}`;if(!modal.open)modal.showModal();}
function exposedMarkup(p,size='tiny',splitAt=0){
 const groups=s.exposed[p].map((e,group)=>`<div class="exposure" title="${e.tiles.length} ${G.tileName(e.k)}">${e.tiles.map(t=>{
  const face=tile(t,size,false,p===0&&matchingIds.has(t.id)?'hand-match':'');let content=face;
  if(t.k==='J'&&swaps.some(option=>option.owner===p&&option.group===group)){
   const label=`Swap ${G.tileName(e.k)} for this joker`;
   content=`<button class="joker-swap can-swap" data-action="exchange-joker-${t.id}" aria-label="${esc(label)}" title="${esc(label)}">${face}<span class="joker-swap-icon" aria-hidden="true">↔</span></button>`;
  }
  return `<span class="exposed-tile-slot">${content}</span>`;
 }).join('')}</div>`);
 if(!splitAt)return groups.join('');
 return [groups.slice(0,splitAt),groups.slice(splitAt)].map(column=>`<div class="side-column">${column.join('')}</div>`).join('');
}
function renderSeat(p){
 const seat=$('#seat'+p),across=p===2;
 const groups=s.exposed[p],tileCount=groups.reduce((count,group)=>count+group.tiles.length,0);
 let splitAt=0;
 if(!across&&tileCount>8&&groups.length>1){
  let bestDifference=Infinity,leftCount=0;
  for(let i=1;i<groups.length;i++){
   leftCount+=groups[i-1].tiles.length;
   const difference=Math.abs(tileCount-2*leftCount);
   if(difference<bestDifference){bestDifference=difference;splitAt=i;}
  }
 }
 seat.classList.toggle('split-exposures',splitAt>0);
 const exposureLabel=groups.length?`role="group" aria-label="${G.NAMES[p]} exposed tiles"`:'';
 seat.innerHTML=`<div class="seat-identity"><div class="avatar">${G.NAMES[p][0]}</div><div class="seat-name">${G.NAMES[p]}<small>${G.windFor(p,s.dealer).toUpperCase()}${p===s.dealer?' · DEALER':''}</small></div></div><div class="bot-exposed" ${exposureLabel}>${exposedMarkup(p,'opponent-tile',splitAt)}</div>`;
}
function arrowDiagram(dir){const paths=Array.from({length:4},(_,i)=>{const a=pos[i],b=pos[(i+dir)%4],dx=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dx,dy),offset=dir===2?(i%2?2:-2):0;return `<path d="M${a[0]+dx/l*13+offset} ${a[1]+dy/l*13}L${b[0]-dx/l*13+offset} ${b[1]-dy/l*13}" stroke="${i===0?'#f4ce87':'#9ab9a0'}" stroke-width="${i===0?2:1}" marker-end="url(#arrow${i===0?'gold':'green'})" fill="none" opacity="${i===0?1:.5}"/>`;}).join('');return `<svg class="pass-diagram" viewBox="0 0 100 100" aria-label="Everyone passes ${passNames[dir]}. You send to ${G.NAMES[dir]} and receive from ${G.NAMES[(4-dir)%4]}."><defs><marker id="arrowgold" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto"><path d="M0 0L5 2.5L0 5" fill="#f4ce87"/></marker><marker id="arrowgreen" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto"><path d="M0 0L5 2.5L0 5" fill="#9ab9a0"/></marker></defs>${paths}${pos.map(([x,y],i)=>`<circle cx="${x}" cy="${y}" r="10" fill="${i===0?'#f1ebd4':'#3b6c5b'}" stroke="#c3d0ac" stroke-width=".5"/><text x="${x}" y="${y+1}" dominant-baseline="middle" text-anchor="middle" font-size="${i===0?5.5:5}" fill="${i===0?'#315d4c':'#e3e8cc'}" font-family="sans-serif">${G.NAMES[i]}</text>`).join('')}</svg>`;}
function renderCenter(){if(s.phase==='matchEnded'){renderMatchEnd();return;}const el=$('#table-center');el.classList.remove('claim-center');el.classList.remove('charleston-center');
 if(['charleston','courtesy','charlestonChoice','courtesyChoice'].includes(s.phase)){el.innerHTML='';return;}
 if(s.phase==='ended'){
  if(s.winner===null)el.innerHTML='<div class="winner-name">Wall game</div>';
  return;
 }
 const oldPool=$('#discards'),poolScroll=oldPool?.scrollTop||0;
 const discards=displayDiscards(s.discards,discardOrder).map(({discard:d,index:i})=>{
  const latest=i===s.discards.length-1,needed=neededDiscardKeys.has(d.tile.k),name=G.tileName(d.tile.k),player=G.NAMES[d.player];
  const face=tile(d.tile,latest?'mini latest-discard':'mini');
  const label=winningClaim?`Declare Mahjong with ${name} from ${player}`:`Choose rack tiles to call ${name} from ${player}`;
  const content=latest&&claims.length?`<button class="discard-pickup" data-action="${winningClaim?'declare-discard':'discard-option'}" aria-label="${esc(label)}" title="${esc(label)}">${face}</button>`:face;
  return `<span class="discard-wrapper ${d.claimed?'claimed':''} ${latest?'latest-discard-wrapper':''} ${needed?'needed-discard':''}" title="${player} discarded ${name}${d.claimed?' · claimed':''}${needed?' · Needed for your chosen hand':''}">${content}</span>`;
 }).join('');
 el.innerHTML=`<div class="discards" id="discards" aria-label="Discard pool">${discards}</div>`;
 $('#discards').scrollTop=poolScroll;
}
function renderActions(){
 let title='',description='',actions='',icon='↗',phase=s.phase,isYou=s.turn===0;
 if(phase==='charleston'||phase==='courtesy'){
  const need=phase==='courtesy'?selected.size:3,dir=phase==='courtesy'?2:(s.passRound===1?[1,2,3]:[3,2,1])[s.passStep],blind=phase==='charleston'&&s.passStep===2;
  title=phase==='courtesy'?'Courtesy pass':`Pass ${s.passRound===1?s.passStep+1:s.passStep+4} · ${passNames[dir]}`;
  description=phase==='courtesy'?'Choose 0–3 tiles to exchange across.':blind?`${3-selected.size} incoming tiles will pass unseen.`:`Choose 3 tiles for ${G.NAMES[dir]}.`;
  actions=btn(passing?'Passing…':phase==='courtesy'?`Pass ${need} tile${need===1?'':'s'}`:blind&&selected.size<3?`Pass · ${3-selected.size} blind`:`Pass · ${selected.size}/3`,'pass','',passing||(phase!=='courtesy'&&!blind&&selected.size!==3));
 }else if(phase==='charlestonChoice'){
  title='Second Charleston?';actions=btn('Start second Charleston','second')+btn('Skip to courtesy pass','stop-charleston','outline');icon='⇄';
 }else if(winningClaim){
  title='Mahjong is available';description=`${G.tileName(s.discards.at(-1).tile.k)} completes your hand.`;
  actions=btn('Declare Mahjong','declare-discard','small');icon='✧';
 }else if(claims.length){
  const key=s.discards.at(-1).tile.k,option=exposureChoice(claims,selected,s.hands[0],key);
  const counts=claims.map(({n})=>n-1).sort((a,b)=>a-b);
  const nextCount=counts.find(count=>count>selected.size);
  title=`Call ${G.tileName(key)}`;
  description=option?`${selected.size} selected`:selected.size?`${selected.size} of ${nextCount} selected`:`Tap ${counts.join(' or ')} matching tiles or jokers.`;
  actions=phase==='draw'&&isYou?btn('Draw a tile','draw','outline small'):btn('Pass','pass-call','outline small');
  actions+=btn(option?`Expose ${option.label.split(' ')[0].toLowerCase()}`:'Expose','claim-confirm','outline small',!option);icon='!';
 }else if(phase==='ended'){
  title=s.winner===null?'Wall game':s.winner===0?'Mahjong!':`${G.NAMES[s.winner]} wins`;
  description='';actions=btn(s.practiceSession?'Practice again':'Next round',s.practiceSession?'practice-again':'next-round');icon='✧';
 }else if(!isYou){title=`${G.NAMES[s.turn]} is playing`;actions='<span class="thinking">● ● ●</span>';icon='…';
 }else if(phase==='draw'){
  title='Your turn';actions=btn('Draw a tile','draw');icon='↓';
 }else{
  title='Your turn';description=swapMessage||(swaps.length===1?`Swap your ${G.tileName(swaps[0].k)}.`:swaps.length?'Tap a marked joker to swap.':s.turns===0?'East discards first.':'');
  actions=G.winning(s.hands[0],s.exposed[0])?btn('Declare Mahjong','mahjong','small'):'';
  if(swaps.length===1)actions+=btn('Swap for joker',`exchange-joker-${swaps[0].joker}`,'outline small');
  else if(swaps.length>1)actions+=btn('Swap for joker','joker-choices','outline small');
  actions+=btn('Discard','discard','small',selected.size!==1);icon='↑';
 }
 $('#phase-title').textContent=title;$('#phase-description').textContent=description;$('#phase-description').hidden=!description;$('#actions').innerHTML=actions;
 const phaseIcon=$('#phase-icon'),preview=claims.length?s.discards.at(-1).tile:null;
 phaseIcon.classList.toggle('has-call-preview',Boolean(preview));
 if(preview)phaseIcon.innerHTML=`<span aria-hidden="true">${tile(preview,'mini call-preview-tile')}</span>`;
 else phaseIcon.textContent=icon;
 $('#actions').classList.toggle('claim-actions',claims.length>0&&!winningClaim);$('#actions').classList.toggle('charleston-choice',phase==='charlestonChoice');
 $('#rack').classList.toggle('is-arranging',mobileArrange);$('#arrange-toggle').textContent=mobileArrange?'Done arranging':'Arrange';$('#arrange-toggle').setAttribute('aria-pressed',String(mobileArrange));
 $('#rack-arrange-help').textContent=mobileArrange?'Drag tiles to arrange them. Choose Done arranging to select tiles.':'Use Arrange on a phone, drag with a mouse, or use Alt and the arrow keys. Double-click to discard.';
}
function difficultyStatus(){
 const current=G.normalizeDifficulty(s.difficulty);
 const pending=current===difficultyPreference?'':`This round uses ${difficultyNames[current]}. The new level starts with the next deal. `;
 return pending+difficultyNotes[difficultyPreference];
}
function showSettings(){
 const sections=[...new Set(G.CARD.map(c=>c.section))];
 const difficultyOptions=G.BOT_DIFFICULTIES.map(level=>`<option value="${level}" ${difficultyPreference===level?'selected':''}>${difficultyNames[level]}</option>`).join('');
 const promptOptions=callPromptOptions.map(({value,label})=>`<option value="${value}" ${callPrompt.value===value?'selected':''}>${label}</option>`).join('');
 const installed=matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
 const installHelp=installed?'':`<details class="install-app">
  <summary>Install app</summary>
  <p><strong>iPhone or iPad</strong> In Safari, tap Share → Add to Home Screen. Turn on Open as Web App if shown, then tap Add.</p>
  <p><strong>Android</strong> In Chrome’s menu, choose Install or Add to Home screen.</p>
  <p>Open Mahjong from your Home Screen to play without the browser controls.</p>
 </details>`;
 show('Settings',`${installHelp}
  <div class="settings-fields difficulty-setting"><label>Bot difficulty<select name="bot-difficulty" aria-describedby="difficulty-status">${difficultyOptions}</select></label><p id="difficulty-status" aria-live="polite">${difficultyStatus()}</p></div>
  ${stylePicker()}
  <div class="settings-fields">
   <label>Discard order<select name="discard-order"><option value="time" ${discardOrder==='time'?'selected':''}>Order of play</option><option value="suit" ${discardOrder==='suit'?'selected':''}>Suit and number</option></select></label>
   <label>Recommended section<select id="section-filter">${['All sections',...sections].map(x=>`<option ${section===x?'selected':''}>${x}</option>`).join('')}</select></label>
   <label>Call prompts<select name="call-prompts">${promptOptions}</select></label>
   <label class="settings-check"><input name="sound-toggle" type="checkbox" ${sound?'checked':''}>Sound</label>
  </div>
  <div class="modal-actions">${btn('Done','close')}${btn('Scores','scores','outline')}</div>`);
 modal.dataset.view='settings';
}
function showJokerChoices(){
 if(swaps.length<2)return;
 const names=swaps.map(({owner,k})=>`${G.NAMES[owner]} · ${G.tileName(k)}`);
 const choices=swaps.map(({joker},index)=>{
  const name=names[index];
  const repeated=names.indexOf(name)!==names.lastIndexOf(name);
  const number=names.slice(0,index+1).filter(label=>label===name).length;
  return btn(esc(repeated?`${name} · Joker ${number}`:name),`exchange-joker-${joker}`,'outline');
 }).join('');
 show('Swap for a joker',`<div class="joker-choices">${choices}</div>`);
 modal.dataset.view='joker-choices';
}
function showLearn(){
 const target=currentPlan()?.target,advice=tileAdvice(s,target,s.phase==='courtesy'?(selected.size||3):3);hintIds=advice.tiles.map(t=>t.id);
 let body='';
 if(['ended','matchEnded'].includes(s.phase))body='<p>The round result shows the closest line for each player.</p>';
 else if(advice.kind==='choose')body=`<p>Choose a hand for advice about individual tiles.</p>${btn('Choose a hand','learn-hands','outline small')}`;
 else if(advice.kind==='pass'||advice.kind==='discard')body=`<p>${advice.kind==='pass'?'Consider passing':'Consider discarding'}:</p><div class="hint-tiles">${advice.tiles.map(t=>tile(t)).join('')}</div><ul class="hint-reasons">${advice.reasons.map(r=>`<li>${esc(r)}</li>`).join('')}</ul>${btn(advice.tiles.length===1?'Select this tile':'Select these tiles','use-hint','small')}`;
 else if(advice.kind==='win-self'||advice.kind==='win')body=`<p>${esc(advice.reasons[0])}</p>${btn('Declare Mahjong',advice.kind==='win'?'learn-declare-discard':'learn-mahjong','small')}`;
 else if(advice.kind==='change')body=`<p>${esc(advice.reasons[0])}</p>${btn('Change hand','learn-hands','outline small')}`;
 else if(advice.kind==='claim')body=`<p>${esc(advice.reasons[0])}</p>`;

 else body='<p>Draw before choosing a discard. Use this panel afterward for tile-specific advice.</p>';
 if(advice.blocked.length)body=`<div class="hint-warning">${advice.blocked.map(b=>`<p>You still need ${b.need} ${esc(G.tileName(b.k))}, but only ${b.unseen} ${b.unseen===1?'copy is':'copies are'} unseen. Jokers cannot fill that single or pair.</p>`).join('')}${btn('Change hand','learn-hands','outline small')}</div>`+body;
 show('Learn',`<section class="learn-advice"><h3>Tile advice</h3>${body}</section><div class="learn-options">${btn(s.practiceSession?'Practice again':'Guided practice','practice-again','outline')}${btn('Charleston','charleston-help','outline')}${btn('How to play','rules','outline')}${btn('Tile guide','tiles','outline')}</div><details class="card-credit"><summary>2026 card &amp; copyright</summary><p>The 2026 Official Standard Hands and Rules card is published and copyrighted by the National Mah Jongg League, Inc. Mahjong Parlor is an independent practice game. Suggestions use Mahjong Parlor’s tile art and wording. Use your official card as the reference for each section and line.</p><p><a href="https://www.nationalmahjonggleague.org/store.aspx" target="_blank" rel="noopener">Get the official 2026 card ↗</a></p></details>${s.practiceSession?`<div class="modal-actions">${btn('Back to game','return-game')}</div>`:''}`);modal.dataset.view='learn';
}
function showScores(){const fmt=n=>n>0?'+'+n:String(n),last=s.scoreHistory?.at(-1);show('Scores',`<table class="scores-table"><thead><tr><th>Player</th><th>Last hand</th><th>Total</th></tr></thead><tbody>${G.NAMES.map((name,p)=>`<tr><td>${name}</td><td>${fmt(last?.deltas[p]||0)}</td><td><strong>${fmt(s.scores[p]||0)}</strong></td></tr>`).join('')}</tbody></table>${last?`<p>${last.winner===null?'Wall game':G.NAMES[last.winner]+' won '+esc(last.hand)+'. '+last.base+' card points'+(last.jokerless?' · Jokerless bonus':'')+(last.winType==='discard'?' · Won on a discard':' · Self-picked')}.</p>`:''}<p class="score-note">Standard point payments. Scores save on this browser. East rotates every hand.</p><p class="score-note"><a href="https://faqs.nmjlonline.com/forums/printthread.php?tid=93" target="_blank" rel="noopener">NMJL scoring reference ↗</a></p><div class="modal-actions">${btn('Done','close')}</div>`);}
function showDiscards(){
 const items=displayDiscards(s.discards,'suit').map(({discard})=>{
  const needed=neededDiscardKeys.has(discard.tile.k);
  return `<li>${tile(discard.tile,'mini',false,needed?'needed-history-tile':'')}${discard.claimed?'<small>Called</small>':''}${needed?'<span class="sr-only">Needed for your chosen hand</span>':''}</li>`;
 }).join('');
 show('Discards',items?`<ul class="discard-overview" role="list" aria-label="Discarded tiles in suit and number order" tabindex="0">${items}</ul>`:'<p>No discards yet.</p>');
 modal.dataset.view='discards';
}
function useGame(game){
 cancelPass();s=game;s.jokerPlacements||={};selected.clear();pinned=G.CARD.some(c=>c.id===s.goalHandId)?s.goalHandId:null;goalKey=s.goalTargetKey||null;
 jokerTargetGroup=null;mobileArrange=false;swapMessage='';receivedIds=new Set(s.receivedIds||[]);lastDiscardShown=null;
 modal.close();render();
}
function beginHand(){regularReturn=null;try{localStorage.removeItem('parlor-regular-game');}catch{}useGame(newMatch(difficultyPreference));}
function advanceRound(){useGame(nextRound(s,difficultyPreference));}
function beginPractice(){
 if(!s.practiceSession){save();regularReturn=JSON.parse(JSON.stringify(s));try{localStorage.setItem('parlor-regular-game',JSON.stringify(regularReturn));}catch{}}
 useGame(practiceGame(s,difficultyPreference));
}
function returnToGame(){
 if(!regularReturn){beginHand();return;}
 const game=regularReturn;regularReturn=null;try{localStorage.removeItem('parlor-regular-game');}catch{}useGame(game);
}
function declareDiscard(){const option=discardClaims(s).find(o=>o.win);if(!option)return;G.claim(s,0,option);selected.clear();render();}
function jokerPlacements(target){return s.jokerPlacements?.[target?.key]||{};}
const targetLabel=target=>[target.name,target.variant].filter(Boolean).join(' · ');
const notationColors={B:'bam',C:'crak',D:'dot',F:'flower',G:'bam',R:'crak',H:'dot'};
function targetNotation(target,extraClass=''){
 const description=[];
 const groups=targetBlocks(target).map(block=>{
  const parts=block.map(({index,symbols})=>{
   const [key,count]=target.groups[index];
   description.push(`${count} × ${G.tileName(key)}`);
   const color=notationColors[key[0]]??'honor';
   return `<span class="${color}">${esc(displaySymbols(symbols,target.section))}</span>`;
  });
  return `<span class="hand-group" aria-hidden="true">${parts.join('')}</span>`;
 }).join('');
 return `<span class="hand-tiles ${extraClass}" role="img" aria-label="${esc(description.join(', '))}">${groups}</span>`;
}
function renderHands(){
 if(s.phase==='matchEnded')return;
 $('.side-panel').hidden=!pickerOpen;
 if(!pickerOpen)return;
 const filterFocused=document.activeElement?.matches('#hands-panel [name="hide-concealed"]');
 const rows=recommendHands(s.hands[0],s.exposed[0],{section,hideConcealed,chosenKey:goalKey,jokerPlacements:s.jokerPlacements});
 const contents=rows.map(({target,away})=>{
  const chosen=goalKey===target.key;
  const available=Number.isFinite(away);
  const distance=available?(away===0?'Ready':away+' away'):'Unavailable';
  return `<button class="hand-card ${chosen?'chosen':''}" data-hand="${target.id}" data-target-key="${target.key}" data-away="${away}" aria-pressed="${chosen}" ${available?'':'disabled title="Conflicts with your exposures"'}>
   <span class="hand-patterns"><span class="suggestion-label"><strong>${esc(target.name)}</strong>${target.variant?`<span>${esc(target.variant)}</span>`:''}${chosen?'<span class="following-badge">Chosen</span>':''}</span>${targetNotation(target)}</span>
   <span class="hand-values">${target.concealed?'<span class="concealed-badge">C · Concealed</span>':''}<span class="hand-score"><span>${target.points} pt</span><strong>${distance}</strong></span></span>
  </button>`;
 }).join('')||'<p class="empty-recommendations">No hands match your current filters.</p>';
 $('#hands-panel').innerHTML=`<div class="card-intro">
  <span class="card-year">2026</span>
  <label class="hide-concealed"><input name="hide-concealed" type="checkbox" ${hideConcealed?'checked':''}>Hide concealed hands</label>
  <button class="text-button picker-close" data-action="toggle-hands" aria-label="Close hand picker">×</button>
 </div><div id="hand-list" class="ordered-hands ranked-hands">${contents}</div>`;
 if(filterFocused)$('#hands-panel [name="hide-concealed"]')?.focus({preventScroll:true});
}
function targetFor(id,key){return id?G.TARGETS.find(t=>t.id===id&&t.key===key)??G.best(s.hands[0],s.exposed[0],id)?.target:null;}
function currentPlan(){const target=targetFor(pinned,goalKey);return target?{target,...matchHandTiles(s.hands[0],s.exposed[0],target,jokerPlacements(target))}:null;}
function renderHandFocus(plan){
 const el=$('#hand-focus');el.hidden=false;el.classList.toggle('empty-hand',!plan);el.classList.remove('is-preview');
 const picker=`<button class="text-button" data-action="toggle-hands" aria-expanded="${pickerOpen}" aria-controls="hands-panel">${pickerOpen?'Hide all lines':'See all lines'}</button>`;
 if(!plan){delete el.dataset.handId;delete el.dataset.targetKey;el.innerHTML=`<div class="hand-picker-empty">${picker}</div>`;return;}
 const {target}=plan;el.dataset.handId=target.id;el.dataset.targetKey=target.key;
 const hasJoker=s.hands[0].some(t=>t.k==='J');
 const renderGroup=g=>`<span class="goal-group ${g.exposed?'goal-exposed':''} ${jokerTargetGroup===g.index?'joker-destination':''}">${g.tiles.map(actual=>{
  const canPlace=!actual&&!g.exposed&&g.n>=3&&hasJoker,canFree=actual?.k==='J'&&!g.exposed,tag=canPlace||canFree?'button':'span';
  const action=canPlace?`data-action="goal-joker-group-${g.index}" aria-label="Use a joker in the ${G.tileName(g.k)} group"`:canFree?`data-action="free-goal-joker-${actual.id}" aria-label="Free this joker from the chosen hand"`:'';
  const title=canPlace?'Click this space, then click a joker on your rack':canFree?'Click to free this joker':actual?g.exposed?'Exposed':'In your rack':'Still needed';
  return `<${tag} class="goal-slot ${canPlace||canFree?'goal-slot-action':''}" ${action} title="${title}">${tile(g.k,'goal-tile',false,actual?'goal-have':'goal-missing')}${actual?.k==='J'?'<span class="goal-joker">J</span>':''}</${tag}>`;
 }).join('')}</span>`;
 const pattern=patternBlocks(target).map(indexes=>`<span class="goal-block">${indexes.map(index=>renderGroup(plan.groups[index])).join('')}</span>`).join('');
 el.innerHTML=`<div class="goal-header"><div class="goal-heading"><span class="goal-state">Going for</span><strong>${esc(targetLabel(target))}</strong>${target.concealed?'<span class="concealed-badge">C · Concealed</span>':''}<span class="goal-count">${plan.compatible?(G.evaluate(s.hands[0],s.exposed[0],target).missing===0?'Ready for Mahjong':G.evaluate(s.hands[0],s.exposed[0],target).missing+' away'):'Conflicts with your exposures'}</span></div><div class="goal-actions">${picker}<span class="goal-secondary"><button class="text-button" data-action="clear-goal">Clear</button></span></div></div><div class="goal-pattern">${pattern}</div>${jokerTargetGroup!==null?'<div class="goal-footer"><span class="joker-instruction">Click a joker on your rack · Esc cancels</span></div>':''}`;
}
function chooseHand(id,key){
 const target=targetFor(id,key);
 if(!target||!matchHandTiles(s.hands[0],s.exposed[0],target,jokerPlacements(target)).compatible){
  toast('This hand conflicts with your exposed tiles.');
  return;
 }
 pinned=id;
 goalKey=target.key;
 jokerTargetGroup=null;
 render();
 $('#hand-list .hand-card.chosen')?.focus({preventScroll:true});
}
function clearHand(){pinned=null;goalKey=null;jokerTargetGroup=null;render();}
function showFinishedTable(phase,content){
 const board=$('#table');
 const enteringResult=!board.classList.contains('match-complete');
 board.classList.add('match-complete');
 board.style.height='';
 board.dataset.phase=phase;
 $('.opponent-row').hidden=true;
 $('.player-zone').hidden=true;
 $('#hand-focus').hidden=true;
 $('.side-panel').hidden=true;
 $('#table-center').innerHTML=content;
 renderTableTools();
 if(enteringResult&&board.getBoundingClientRect().top<0)board.scrollIntoView({block:'start'});
}
function renderMatchEnd(){
 const result=s.matchResult,names=result.winners.map(p=>G.NAMES[p]),title=names.length===1?(result.winners[0]===0?'You win':names[0]+' wins'):names.length===4?'A four-way tie':names.join(' and ')+' tie';
 for(const p of [1,2,3])$('#seat'+p).innerHTML='';$('#rack').innerHTML='';$('#your-exposures').innerHTML='';$('#actions').innerHTML='';
 $('.header-new-game').hidden=true;
 const scores=`<div class="match-summary"><h2>${esc(title)}</h2><table class="match-scores"><thead><tr><th>Player</th><th>Points</th></tr></thead><tbody>${result.scores.map((score,p)=>({p,score})).sort((a,b)=>b.score-a.score).map(({p,score})=>`<tr class="${result.winners.includes(p)?'match-winner':''}"><td>${G.NAMES[p]}</td><td>${score>0?'+':''}${score}</td></tr>`).join('')}</tbody></table><p>Four rounds complete. Start a new game?</p><div class="match-actions">${btn('Start new game','new')}</div></div>`;
 showFinishedTable('matchEnded',scores+roundReviewMarkup(result.lastHand));
}
function render(){
 normalizeMatch(s);
 const received=prepareTable(s);if(received!==null)receivedIds=new Set(received);
 if(Array.isArray(s.rackOrder))s.rackOrder=retainRackOrder(s.hands[0],s.rackOrder);
 const plan=currentPlan(),choosingCall=claims.length>0||s.phase==='claim';
 claims=prepareDiscardClaims(s,callPrompt.value==='all'?null:plan?.target,callPrompt.maxTilesAway);
 winningClaim=claims.find(option=>option.win);
 swaps=G.exchanges(s,0).flatMap(option=>s.exposed[option.owner][option.group].tiles
  .filter(tile=>tile.k==='J').map(tile=>({...option,joker:tile.id})));
 if(choosingCall&&selected.size&&!claims.some(({n})=>n>selected.size))selected.clear();
 if(s.turn!==0||s.phase!=='discard')swapMessage='';
 finalizeRound(s,s.winner===0?goalKey:null);
 const completed=finishMatch(s);
 if(completed){pinned=null;goalKey=null;selected.clear();try{localStorage.setItem('parlor-last-match',JSON.stringify(completed));}catch{}}
 document.documentElement.dataset.tileStyle=tileStyle;for(const[key,value]of Object.entries(BOARDS[tileStyle]))document.documentElement.style.setProperty('--board-'+key,value);
 if(s.phase==='matchEnded'){renderMatchEnd();save();clearTimeout(botTimer);return;}
 const newButton=$('.header-new-game');newButton.hidden=false;newButton.dataset.action=s.practiceSession?'return-game':'new';newButton.innerHTML=s.practiceSession?'← Back to game':'<span>＋</span> New game';
 if(s.phase==='ended'&&s.winner!==null){
  const next=s.practiceSession?btn('Practice again','practice-again'):btn('Next round','next-round');
  showFinishedTable('ended',roundReviewMarkup(s,next));save();clearTimeout(botTimer);return;
 }
 const board=$('#table'),enteringSecondChoice=s.phase==='charlestonChoice'&&board.dataset.phase!==s.phase;
 board.classList.remove('match-complete');board.dataset.phase=s.phase;$('.opponent-row').hidden=false;$('.player-zone').hidden=false;
 const signals=handSignals(plan,s.hands[0]);matchingIds=new Set(plan?[...plan.ids,...plan.exposedIds]:[]);usableJokerIds=signals.usableJokers;winningJokerIds=signals.winningJokers;
 neededDiscardKeys=signals.needed;[1,2,3].forEach(renderSeat);
 $('#rack').style.setProperty('--tiles',s.hands[0].length);
 $('#rack').innerHTML=s.hands[0].map(t=>tile(t,'',true)).join('');
 $('#your-exposures').innerHTML=exposedMarkup(0,'mini');$('#rack-count').textContent=s.phase==='ended'?'':`${s.wall.length} left to draw`;
 $('.seat-wind').textContent=G.windFor(0,s.dealer).toUpperCase()+(s.dealer===0?' · DEALER':'');
 renderTableTools();renderCenter();renderActions();renderHandFocus(plan);renderHands();save();scheduleBot();updateBoardSpace();revealFreshTile();
 if(enteringSecondChoice&&!modal.open){
  const start=$('#actions [data-action="second"]');
  start.scrollIntoView({block:'nearest',inline:'nearest'});
  start.focus({preventScroll:true});
 }
}
function revealFreshTile(){
 const key=s.drawn!=null?'draw:'+s.drawn:'pass:'+([...receivedIds].join(','));
 if(key===lastFreshKey)return;lastFreshKey=key;
 const fresh=$('#rack .drawn')||$('#rack .received'),scroll=$('.rack-scroll');if(!fresh)return;
 const tileBox=fresh.getBoundingClientRect(),box=scroll.getBoundingClientRect();
 if(tileBox.right>box.right-6)scroll.scrollLeft+=tileBox.right-box.right+6;
 else if(tileBox.left<box.left+6)scroll.scrollLeft+=tileBox.left-box.left-6;
}
function updateBoardSpace(){
 const board=$('#table'),rack=$('.player-zone'),north=$('#seat2'),pool=$('#discards'),mobile=innerWidth<=760;
 if(board.classList.contains('match-complete'))return;
 const latest=pool?.querySelector('.latest-discard-wrapper');
 const landscape=landscapeLayout.matches;
 const rackHeight=rack.offsetHeight;
 const passingTiles=['charleston','charlestonChoice','courtesy'].includes(s.phase);
 const bottom=rackHeight+(landscape?(passingTiles?8:18):mobile?25:36);
 // Leave room for the full call button and its marker above the rack.
 const discardSpace=Math.max(57,(latest?.offsetHeight||0)+13);
 const center=landscape?(passingTiles?6:discardSpace):mobile?(passingTiles?50:100):150;
 const mobileBase=passingTiles?380:Math.min(530,Math.max(414,innerHeight-125));
 const viewportHeight=window.visualViewport?.scale===1?window.visualViewport.height:innerHeight;
 const boardTop=board.getBoundingClientRect().top+scrollY;
 const base=landscape?viewportHeight-boardTop-40:mobile?mobileBase:Math.min(600,Math.max(500,innerHeight-110));
 const top=Math.max(mobile?32:70,north.offsetHeight+(mobile?12:24));
 const normalHeight=landscape?Math.max(base,bottom+center+26):Math.max(base,top+bottom+center+16);
 const rackInset=parseFloat(getComputedStyle(rack).bottom)||0;
 const rackClearance=rackHeight+board.offsetHeight-board.clientHeight+rackInset+8;
 const sideBudget=(landscape?Math.max(normalHeight,viewportHeight-boardTop-6):normalHeight)-rackClearance;
 let height=normalHeight;
 if(!landscape)board.style.setProperty('--opponent-zone-height',top+'px');
 board.style.setProperty('--rack-zone-height',rackHeight+'px');
 // Size both side racks against the normal table, then make room for any extra groups.
 for(const player of [1,3]){
  const seat=$('#seat'+player),slot=seat.querySelector('.exposed-tile-slot');
  const inset=player===1?'--landscape-right-inset':'--landscape-left-inset';
  if(!slot){if(landscape)board.style.setProperty(inset,seat.offsetWidth+12+'px');continue;}
  const split=seat.classList.contains('split-exposures');
  const columns=landscape?[...seat.querySelectorAll('.exposure')]:split?[...seat.querySelectorAll('.side-column')]:[seat.querySelector('.bot-exposed')];
  const sizes=columns.map(column=>{
   const count=column.querySelectorAll('.exposed-tile-slot').length;
   return {height:column.offsetHeight,count:landscape&&count>4?3:count};
  });
  const currentFaceWidth=slot.offsetHeight;
  const columnTop=seat.offsetTop+seat.offsetHeight-Math.max(...sizes.map(size=>size.height));
  const fittingWidth=Math.min(...sizes.map(size=>currentFaceWidth+Math.floor((sideBudget-columnTop-size.height)/size.count)));
  const minimum=landscape?19:mobile?(split?22:24):28,maximum=landscape?25:mobile?(split?24:30):38;
  const width=Math.max(minimum,Math.min(maximum,fittingWidth));
  seat.style.setProperty('--side-face-width',width+'px');
  seat.style.setProperty('--side-face-height',Math.round(width*54/38)+'px');
  seat.style.setProperty('--side-number-size',Math.max(10,Math.round(width*14/38))+'px');
  seat.style.setProperty('--side-art-top',Math.round(width*18/38)+'px');
  seat.style.setProperty('--side-art-space',Math.round(width*22/38)+'px');
  const fittedBottom=columnTop+Math.max(...sizes.map(size=>size.height+(width-currentFaceWidth)*size.count));
  height=Math.max(height,fittedBottom+rackClearance);
  if(landscape)board.style.setProperty(inset,seat.offsetWidth+12+'px');
 }
 if(landscape){
  const landscapeTop=north.offsetTop+north.offsetHeight+4;
  board.style.setProperty('--opponent-zone-height',landscapeTop+'px');
  height=Math.max(height,landscapeTop+bottom+center);
 }
 height=Math.ceil(height);
 if(board.style.height!==height+'px')board.style.height=height+'px';
 if(latest&&lastDiscardShown!==s.discards.at(-1)?.tile.id){lastDiscardShown=s.discards.at(-1)?.tile.id;const box=pool.getBoundingClientRect(),tile=latest.getBoundingClientRect(),tileTop=tile.top-box.top+pool.scrollTop,tileBottom=tile.bottom-box.top+pool.scrollTop+8;if(tileTop<pool.scrollTop)pool.scrollTop=Math.max(0,tileTop-5);else if(tileBottom>pool.scrollTop+pool.clientHeight)pool.scrollTop=tileBottom-pool.clientHeight;}
}
function renderTableTools(){
 const passingTiles=['charleston','charlestonChoice','courtesyChoice','courtesy'].includes(s.phase);
 $('#charleston-info').hidden=!passingTiles;
 $('#table-discards').hidden=s.phase==='matchEnded'||!s.discards.length;
 if(!passingTiles)return;
 const step=s.phase==='charleston'?`${s.passRound}-${s.passStep}`:s.phase;
 for(const label of document.querySelectorAll('[data-charleston-step]')){
  if(label.dataset.charlestonStep===step)label.setAttribute('aria-current','step');
  else label.removeAttribute('aria-current');
 }
}
function scheduleBot(){clearTimeout(botTimer);if(modal.open)return;if(s.phase==='wallSetup'){botTimer=setTimeout(()=>{if(s.setupStep<=s.wallIndex)s.setupStep++;else G.finishSetup(s);render();},s.setupStep===0?900:1800);return;}if(s.phase==='wallPush'){botTimer=setTimeout(()=>{finishWallPush(s);render();},1800);return;}if(s.turn!==0&&['draw','discard'].includes(s.phase))botTimer=setTimeout(()=>{G.botStep(s);selected.clear();playSound();render();},1100);}
function charlestonHelp(){show('Charleston rules',`<p>Everyone exchanges tiles at the same time. Your right is Mabel, across is Rose, and left is June. You keep the same number of tiles on your rack after every pass.</p><div class="lesson-sequence"><strong>1. First Charleston · required</strong><span>RIGHT → ACROSS → LEFT</span><p>Choose 3 unwanted tiles each time. The third pass (left) allows a blind pass.</p><strong>2. Second Charleston · optional</strong><span>LEFT → ACROSS → RIGHT</span><p>Any player can stop before this round begins. Once begun, complete all 3 passes. The final right pass allows a blind pass.</p><strong>3. Courtesy pass · optional</strong><span>ACROSS · 0, 1, 2, OR 3 TILES</span><p>You exchange with Rose across the table. Mabel and June make their own agreement. Here, Rose accepts your choice; Mabel and June agree on 3 each.</p></div><h3>What is a blind pass?</h3><p>On the first left or final right, you can keep more of your rack. Select fewer than 3 of your own tiles. The rest are taken from the packet coming to you and passed onward <strong>without looking</strong>. Select none to pass all 3 incoming tiles unseen.</p><p><strong>Never pass jokers.</strong> Our arrows show the route; received tiles have a small NEW marker. The next pass is ready automatically. Unseen tiles stay face down.</p><div class="modal-actions">${btn('Back to the table','close')}${btn('See card rules','card-rules','outline')}</div>`,'');}
function rules(){show('How to play',`<p>Build a 14-tile hand that matches a line on your 2026 NMJL card. The table uses the 2026 card’s allowed hands, suit variations, and joker rules.</p><h3>First, the Charleston</h3><p>Pass right, across, left. A second round (left, across, right) is optional, followed by an optional courtesy pass across. Jokers stay on your rack.</p>${btn('Walk me through the Charleston','charleston-help','outline small')}<h3>Then, draw and discard</h3><p>East begins with 14 tiles and discards first. East rotates to the next player each hand. On later turns, draw a tile, consider a joker exchange, then discard.</p><h3>Calling a tile</h3><p>We pause when a discard can complete an eligible exposed pung, kong, quint, or sextet, or a winning hand. Singles and pairs can only be called for Mahjong. Concealed hands cannot have prior exposures.</p><h3>Jokers and dragons</h3><p>Gold highlights show usable jokers while leaving them unassigned. To place one in your chosen hand, click a faded space in a group of three or more, then click the joker on your rack. Click its J badge to free it. Called exposures let you select your own tiles, including jokers. Jokers can fill identical groups of 3 or more, never singles or pairs. Replace a joker in an exposure with its natural tile on your turn. Bams match green dragons; craks match red; dots match white (soap). A zero is a white dragon, not a joker.</p><h3>Choose a hand to practice</h3><p>The hand list shows all card lines, starting with the closest. Each row shows one way to build the hand with your current tiles. Choose a row to highlight matching tiles and keep that target below your rack.</p><p>This teaching table prevents invalid calls and gives you unlimited thinking time. It does not simulate penalties for verbal miscalls or dead hands, and scores four rounds before declaring a game winner.</p><div class="modal-actions">${btn('Let’s play','close')}${btn('Read the rules','card-rules','outline')}</div>`,'AMERICAN MAHJONG · 2026');}
function tileGuide(){show('Tile guide',`<p>A standard American set has 152 tiles: 108 suit tiles, 28 winds and dragons, 8 flowers, and 8 jokers.</p>${[['Bams',['B1','B2','B3','B4','B5','B6','B7','B8','B9']],['Craks',['C1','C2','C3','C4','C5','C6','C7','C8','C9']],['Dots',['D1','D2','D3','D4','D5','D6','D7','D8','D9']],['Winds',['E','S','W','N']],['Dragons',['G','R','H']],['Special',['F','J']]].map(([l,ks])=>`<div class="tile-guide-row"><label>${l}</label>${ks.map(k=>tile(k,'mini')).join('')}</div>`).join('')}<p><strong>White dragon = soap = 0.</strong> It can be a dragon or the zero in a year hand. Flowers are interchangeable; jokers have their own rules.</p>`,'THE TILE GUIDE');}
function cancelPass(){
 if(activePass){activePass.cancelled=true;activePass.layer?.remove();activePass=null;}
 passing=false;
}
async function runPass(){
 if(passing||!['charleston','courtesy'].includes(s.phase))return;
 const game=s,ids=[...selected];
 if(game.phase==='courtesy')game.courtesyCount=ids.length;
 receivedIds.clear();passing=true;
 const run={game,ids,cancelled:false,layer:null};activePass=run;render();
 const dir=game.phase==='courtesy'?2:(game.passRound===1?[1,2,3]:[3,2,1])[game.passStep],layer=document.createElement('div');
 run.layer=layer;layer.className='tile-flight-layer';layer.setAttribute('aria-hidden','true');
 const board=$('#table').getBoundingClientRect(),positions=[$('#rack'),$('#seat1'),$('#seat2'),$('#seat3')].map(el=>{const r=el.getBoundingClientRect();return [(r.left+r.width/2-board.left)/board.width*100,(r.top+r.height/2-board.top)/board.height*100];});
 layer.innerHTML=positions.map(([x,y],i)=>{const b=positions[(i+dir)%4];return `<div class="flying-packet" style="--sx:${x}%;--sy:${y}%;--ex:${b[0]}%;--ey:${b[1]}%">${'<i class="tile-back"></i>'.repeat(game.phase==='courtesy'?(i%2===0?game.courtesyCount:game.otherCourtesyCount):3)}</div>`;}).join('');
 $('#table').append(layer);await new Promise(r=>setTimeout(r,1000));
 if(run.cancelled||activePass!==run||s!==game)return;
 try{G.pass(game,ids);selected.clear();playSound();}catch(e){toast(e.message);}
 activePass=null;passing=false;layer.remove();render();
}
function roundReviewMarkup(round,action=''){
 if(round.winner===null||round.winner===undefined)return '<div class="round-result-head"><h2>Wall game</h2></div>';
 const title=round.winner===0?'You won this round':G.NAMES[round.winner]+' wins this round';
 const hands=reviewRoundHands(round);
 const reviews=[hands[round.winner],...hands.filter(hand=>hand.player!==round.winner)];
 const faces=tiles=>tiles.map(item=>tile(item,'result-tile')).join('');
 const cards=reviews.map(({player,target,missing,groups,extras})=>{
  const won=player===round.winner;
  const distance=won?'Mahjong':missing===null?'No eligible line':`${missing} ${missing===1?'tile':'tiles'} away`;
  const line=target?`<div class="review-line">${esc(targetLabel(target))}${won?' · '+target.points+' pt':''}${target.concealed?' · Concealed':''}</div>${targetNotation(target,'review-notation')}`:'';
  const matched=groups.map(group=>`<span class="winning-group ${group.exposed?'winning-exposed':''}">${faces(group.tiles)}</span>`).join('');
  const extra=extras.length?`<span class="review-extra"><span class="review-extra-label">Extra tiles</span><span class="winning-group">${faces(extras)}</span></span>`:'';
  return `<article class="review-hand${won?' review-winner':''}"><div class="review-hand-head"><strong>${G.NAMES[player]}</strong><span>${distance}</span></div>${line}<div class="review-tiles">${matched}${extra}</div></article>`;
 });
 const wall=round.wall;
 const wallReview=Array.isArray(wall)?`
  <section class="review-hand review-wall" aria-labelledby="review-wall-title">
   <div class="review-hand-head">
    <h3 id="review-wall-title">Tiles left in the wall</h3>
    <span>${wall.length} ${wall.length===1?'tile':'tiles'}</span>
   </div>
   ${wall.length?`<div class="review-tiles">${faces([...wall].reverse())}</div>`:''}
  </section>`:'';
 return `<div class="round-result"><div class="round-result-head"><h2>${title}</h2>${action}</div><div class="round-hands">${cards.join('')}</div>${wallReview}</div>`;
}
function renderSelection(){
 document.querySelectorAll('#rack [data-tile]').forEach(t=>{
  const active=selected.has(Number(t.dataset.tile));
  t.classList.toggle('selected',active);t.setAttribute('aria-pressed',String(active));
 });
 renderActions();
}
function selectRackTile(id){
 if(passing||(mobileArrange&&touchRack()))return;
 const item=s.hands[0].find(tile=>tile.id===id);
 if(!item)return;
 if(jokerTargetGroup!==null){
  const target=targetFor(pinned,goalKey);
  if(item.k==='J'&&target){
   const placed=placeJoker(s.hands[0],s.exposed[0],target,jokerPlacements(target),id,jokerTargetGroup);
   if(!placed){toast('That group cannot use another joker.');return;}
   s.jokerPlacements[target.key]=placed;jokerTargetGroup=null;render();return;
  }
  jokerTargetGroup=null;renderHandFocus(currentPlan());
 }
 if(winningClaim)return;
 const passingTiles=['charleston','courtesy'].includes(s.phase);
 const discarding=s.phase==='discard'&&s.turn===0;
 if(!claims.length&&!passingTiles&&!discarding)return;
 if(passingTiles&&item.k==='J'){toast('Jokers are never passed in the Charleston.');return;}
 if(claims.length&&item.k!==s.discards.at(-1).tile.k&&item.k!=='J'){toast('Choose a matching tile or joker.');return;}
 swapMessage='';
 if(selected.has(id))selected.delete(id);
 else{
  if(discarding)selected.clear();
  const limit=claims.length?Math.max(...claims.map(({n})=>n-1)):3;
  if(selected.size>=limit){toast('Tap a selected tile to remove it first.');return;}
  selected.add(id);
 }
 renderSelection();
}
function exposeSelectedTiles(){
 const options=discardClaims(s,callPrompt.value==='all'?null:targetFor(pinned,goalKey),callPrompt.maxTilesAway);
 if(!options.length||options.some(option=>option.win))return;
 const option=exposureChoice(options,selected,s.hands[0],s.discards.at(-1).tile.k);
 if(!option)return;
 G.claim(s,0,{...option,ids:[...selected]});selected.clear();playSound();render();
}
function swapExposedJoker(id){
 const swap=swaps.find(({joker})=>joker===id);
 if(!swap||!exchangeJoker(s,id))return;
 if(modal.dataset.view==='joker-choices')modal.close();
 selected.delete(swap.natural);receivedIds.delete(swap.natural);receivedIds.add(id);
 if(s.drawn===swap.natural)s.drawn=null;
 if(Array.isArray(s.rackOrder))s.rackOrder=s.hands[0].map(tile=>tile.id);
 swapMessage=`Swapped ${G.tileName(swap.k)} for a joker.`;
 playSound();render();
 const returned=$('#rack [data-tile="'+id+'"]');
 returned?.scrollIntoView({block:'nearest',inline:'nearest'});
 returned?.focus({preventScroll:true});
}
function arrangeTile(id,insertion){if(passing||s.phase==='wallSetup')return;if(moveRackTile(s.hands[0],id,insertion)){s.rackOrder=s.hands[0].map(t=>t.id);render();$('#rack [data-tile="'+id+'"]').focus({preventScroll:true});}}
function discardTile(id){if(passing||s.turn!==0||s.phase!=='discard'||!s.hands[0].some(t=>t.id===id))return;G.discard(s,id);selected.clear();playSound();render();}
installRackArrangement({rack:$('#rack'),canArrange:e=>!passing&&!['wallSetup','ended','matchEnded'].includes(s.phase)&&(e?.pointerType!=='touch'||mobileArrange),onMove:arrangeTile,onPause:()=>clearTimeout(botTimer),onResume:scheduleBot});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&jokerTargetGroup!==null&&!(modal.open&&modal.dataset.view==='discards')){jokerTargetGroup=null;render();}});
document.addEventListener('dblclick',e=>{const t=e.target.closest('#rack [data-tile]');if(!t||(mobileArrange&&touchRack()))return;e.preventDefault();try{discardTile(Number(t.dataset.tile));}catch(error){toast(error.message);}});
document.addEventListener('click',async e=>{
 const t=e.target.closest('#rack [data-tile]');
 if(t&&!t.disabled){selectRackTile(Number(t.dataset.tile));return;}
 const hand=e.target.closest('[data-hand]');if(hand){chooseHand(hand.dataset.hand,hand.dataset.targetKey);return;}const a=e.target.closest('[data-action]')?.dataset.action;if(!a)return;
 if(a!=='show-discards'&&!(a==='close'&&modal.dataset.view==='discards')&&!a.startsWith('goal-joker-group-')&&!a.startsWith('free-goal-joker-'))jokerTargetGroup=null;
 try{
 if(a==='settings'||a==='tile-styles'){showSettings();}
 else if(a==='show-discards'){showDiscards();}
 else if(a==='joker-choices'){showJokerChoices();}
 else if(a==='learn'||a==='hint'){showLearn();}
 else if(a==='learn-hands'){modal.close();pickerOpen=true;render();}
 else if(a==='practice-again'){beginPractice();}
 else if(a==='return-game'){returnToGame();}
 else if(a==='learn-mahjong'){modal.close();if(G.declare(s,0))render();}
 else if(a==='learn-declare-discard'){modal.close();declareDiscard();}
 else if(a==='arrange'){mobileArrange=!mobileArrange;renderActions();}
 else if(a==='scores'){showScores();}
 else if(a==='declare-discard'){declareDiscard();}
 else if(a==='clear-goal'){clearHand();}
 else if(a.startsWith('goal-joker-group-')){jokerTargetGroup=jokerTargetGroup===Number(a.slice(17))?null:Number(a.slice(17));render();}
 else if(a.startsWith('free-goal-joker-')){const target=targetFor(pinned,goalKey);if(target)delete jokerPlacements(target)[Number(a.slice(16))];jokerTargetGroup=null;render();}
 else if(a==='toggle-hands'){
  pickerOpen=!pickerOpen;
  render();
  $('#hand-focus [data-action="toggle-hands"]')?.focus({preventScroll:true});
 }
 else if(a==='close'||a==='play'){modal.close();modal.classList.remove('tile-style-modal');scheduleBot();}
 else if(a==='rules')rules();else if(a==='tiles')tileGuide();else if(a==='charleston-help')charlestonHelp();
 else if(a==='card-rules')rules();
 else if(a==='new'){beginHand();}
 else if(a==='next-round'){advanceRound();}
 else if(a==='sort'){G.sortHand(s.hands[0]);delete s.rackOrder;render();}
 else if(a==='pass'){await runPass();}
 else if(a==='second'||a==='stop-charleston'){G.secondCharleston(s,a==='second');selected.clear();render();}
 else if(a==='draw'){if(canDrawWall(s)){selected.clear();receivedIds.clear();drawFromWall(s);playSound();render();}}
 else if(a==='discard'){discardTile([...selected][0]);}
 else if(a==='pass-call'&&passDiscard(s)){selected.clear();render();}
 else if(a==='discard-option'){($('#rack .claim-eligible.selected')||$('#rack .claim-eligible'))?.focus();}
 else if(a==='claim-confirm'){exposeSelectedTiles();}
 else if(a==='mahjong'){if(G.declare(s,0)){render();}else toast('Your rack does not yet match a complete 2026 hand.');}
 else if(a.startsWith('exchange-joker-')){swapExposedJoker(Number(a.slice(15)));}
 else if(a==='use-hint'){if(['charleston','courtesy'].includes(s.phase)||(s.turn===0&&s.phase==='discard')){selected=new Set(hintIds);modal.close();render();}else{modal.close();scheduleBot();}}
 }catch(error){toast(error.message);}
});
document.addEventListener('change',e=>{
 if(e.target.name==='bot-difficulty'){
  difficultyPreference=G.normalizeDifficulty(e.target.value);
  try{localStorage.setItem('parlor-difficulty',difficultyPreference);}catch{}
  if(!passing&&(s.phase==='wallSetup'||(s.phase==='charleston'&&s.passRound===1&&s.passStep===0))){
   s.difficulty=difficultyPreference;save();
  }
  $('#difficulty-status').textContent=difficultyStatus();return;
 }
 if(e.target.name==='call-prompts'){
  const option=callPromptOptions.find(({value})=>value===e.target.value);
  if(!option)return;
  callPrompt=option;
  try{localStorage.setItem('parlor-call-prompts',option.value);}catch{}
  render();return;
 }
 if(e.target.name==='discard-order'){discardOrder=e.target.value;lastDiscardShown=null;try{localStorage.setItem('parlor-discard-order',discardOrder);}catch{}renderCenter();updateBoardSpace();return;}
 if(e.target.name==='sound-toggle'){sound=e.target.checked;try{localStorage.setItem('parlor-sound',String(sound));}catch{}playSound();return;}
 if(e.target.name==='hide-concealed'){hideConcealed=e.target.checked;try{localStorage.setItem('parlor-hide-concealed',String(hideConcealed));}catch{}renderHands();return;}
 if(e.target.name==='tile-style'){applyTileStyle(e.target.value);return;}
 if(e.target.id==='section-filter'){section=e.target.value;try{localStorage.setItem('parlor-card-section',section);}catch{}renderHands();updateBoardSpace();}
});
modal.addEventListener('close',()=>{modal.classList.remove('tile-style-modal');scheduleBot();});
modal.addEventListener('click',e=>{if(e.target===modal){const r=modal.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)modal.close();}});
const charlestonToggle=$('#charleston-toggle'),charlestonGuide=$('#charleston-guide');
function setCharlestonGuideOpen(open){
 charlestonGuide.hidden=!open;
 charlestonToggle.setAttribute('aria-expanded',String(open));
}
try{setCharlestonGuideOpen(localStorage.getItem('parlor-charleston-guide')!=='closed');}catch{}
charlestonToggle.addEventListener('click',()=>{
 const open=charlestonGuide.hidden;
 setCharlestonGuideOpen(open);
 try{localStorage.setItem('parlor-charleston-guide',open?'open':'closed');}catch{}
 updateBoardSpace();
});
const boardObserver=new ResizeObserver(updateBoardSpace);boardObserver.observe($('#seat2'));boardObserver.observe($('.player-zone'));
window.addEventListener('resize',()=>{
 if(mobileArrange&&!touchRack()){mobileArrange=false;renderActions();}
 lastDiscardShown=null;updateBoardSpace();lastFreshKey='';revealFreshTile();
});
render();
