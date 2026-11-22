import assert from 'node:assert/strict';
import test from 'node:test';
import {practiceGame,restorePracticeChoice} from '../js/learning.mjs';
import {claimOptions,pass,secondCharleston,TARGETS,visibleTileCounts} from '../js/engine.mjs';
import {currentLineMove,drawFromWall,passTiles,prepareTable} from '../js/table-actions.mjs';
import {assessHand,recommendHands} from '../js/recommendations.mjs';
import {handComparison,selectionAdvice,spareTiles,suggestTiles,turnAdvice} from '../js/coaching.mjs';
import {pivotReason,trackOutlook} from '../js/outlook.mjs';

function guided(){
 const game=practiceGame({dealer:0});
 // A repeatable comparison rack for these examples, using actual tiles from the deal.
 const pool=game.hands.flat().concat(game.wall);
 const example=['F','F','B2','B2','B2','C4','C4','C4','G','G','J','D1','C9','B8'];
 game.hands[0]=example.map(key=>pool.splice(pool.findIndex(t=>t.k===key),1)[0]);
 for(let p=1;p<4;p++)game.hands[p]=pool.splice(0,13);
 game.wall=pool;
 const hand=game.hands[0];
 const focus=assessHand(hand,[],TARGETS.find(t=>t.key==='even2-0'));
 const [other]=recommendHands(hand,[],{visible:visibleTileCounts(game)}).filter(row=>row.target.id!==focus.target.id);
 return {game,hand,lines:[focus,other]};
}

const options={selected:new Set(),claims:[],staging:false,receivedIds:new Set(),swaps:[]};

test('a pass compares each card line across variations and replaces its arrows on a blind pass',t=>{
 t.mock.method(Math,'random',()=>0.4);
 const {game}=guided();
 prepareTable(game);
 game.guidedPlay=true;
 const distances=()=>new Map(recommendHands(game.hands[0],[],{visible:visibleTileCounts(game)}).map(row=>[row.target.id,row.away]));
 const before=distances();
 assert.equal(currentLineMove(game),null);
 passTiles(game,game.hands[0].filter(tile=>tile.k==='B2').map(tile=>tile.id));
 prepareTable(game);
 const move=currentLineMove(game);
 assert.equal(move.action,'pass');
 const directions=new Set();
 for(const [id,after] of distances()){
  const prior=before.get(id);
  directions.add(Math.sign(prior-after));
  assert.deepEqual(move.changes[id],after===prior?undefined:{before:prior,after});
 }
 assert.equal(directions.size,3);
 game.hands[0].reverse();
 assert.deepEqual(currentLineMove(JSON.parse(JSON.stringify(game))),move);
 assert.throws(()=>passTiles(game,[]));
 assert.equal(currentLineMove(game),move);
 game.passStep=2;
 passTiles(game,[]);
 assert.equal(currentLineMove(game),null);
});

test('a player draw records the new distance on receipt, including a draw across a wall break',()=>{
 for(const wallBreak of [false,true]){
  const {game}=guided();
  const tile=game.hands[0].splice(game.hands[0].findIndex(t=>t.k==='J'),1)[0];
  game.phase='draw';game.turn=0;game.wall.push(tile);
  game.wallSegments[game.wallIndex].remaining=wallBreak?0:1;
  assert.ok(drawFromWall(game));
  if(wallBreak){
   assert.equal(currentLineMove(game),null);
   prepareTable(game);
  }
  const move=currentLineMove(game);
  assert.equal(move.action,'draw');
  assert.deepEqual(move.changes.run7,{before:6,after:5});
  game.hands[0].pop();
  assert.equal(currentLineMove(game),null);
 }
});

test('new practice deals open without a chosen hand or an idle passing prompt',()=>{
 const {game,lines}=guided();
 for(const deal of [game,practiceGame(game)]){
  assert.ok(!deal.goalHandId&&!deal.goalTargetKey);
 }
 game.phase='charleston';
 assert.equal(turnAdvice(game,lines,options).text,'');
});

test('starting practice and practicing again use the shuffled deck for every seat',t=>{
 // Different deterministic shuffles expose a preset rack without relying on chance.
 const random=t.mock.method(Math,'random',()=>0.21);
 const first=practiceGame({dealer:0});
 random.mock.mockImplementation(()=>0.79);
 const next=practiceGame(first);
 const tiles=game=>game.hands[0].map(t=>t.k);
 assert.notDeepEqual(tiles(first),tiles(practiceGame({dealer:0})));
 assert.equal(next.dealer,1);
 for(const game of [first,next]){
  assert.equal(game.hands[game.dealer].length,14);
  assert.equal(new Set([...game.hands.flat(),...game.wall].map(t=>t.id)).size,152);
  assert.ok(!game.goalHandId);
 }
});

test('an old practice preset is cleared only at the opening and only once',()=>{
 const old={practiceSession:true,phase:'charleston',passRound:1,passStep:0,goalTargetKey:'even2-0',goalHandId:'even2'};
 for(const saved of [{...old,passStep:1},{...old,goalTargetKey:'run7-0',goalHandId:'run7'}]){
  const original=saved.goalTargetKey;
  restorePracticeChoice(saved);
  assert.equal(saved.goalTargetKey,original);
 }
 restorePracticeChoice(old);
 assert.equal(old.goalTargetKey,null);
 Object.assign(old,{goalTargetKey:'even2-0',goalHandId:'even2'});
 restorePracticeChoice(old);
 assert.equal(old.goalTargetKey,'even2-0');
});

test('the guided opening compares distinct hands and recognizes the missing natural pair',()=>{
 const {game,hand,lines}=guided();
 const [evens,run]=lines;
 assert.equal(run.target.id,'run7');
 assert.deepEqual(lines.map(row=>row.away),[5,5]);
 const {reason}=handComparison(evens,run);
 assert.match(reason,/pair of 6 Craks/);
 for(const row of lines)assert.ok(reason.includes(row.target.name));
 assert.equal(handComparison(run,evens).title,'Slight edge');
 assert.equal(handComparison(run,evens).leader,run.target.name);
 game.discards=[0,1,2].map(id=>({player:1,tile:{id:200+id,k:'C6'}}));
 const unavailable=assessHand(hand,[],evens.target,visibleTileCounts(game));
 assert.ok(unavailable.blocked);
 assert.match(handComparison(unavailable,run,true).reason,/Too few copies of 6 Crak/);
});

test('the outlook follows committed moves and public evidence, including a claimed discard only once',()=>{
 const {game,lines}=guided(),[evens,run]=lines;
 const assess=()=>assessHand(game.hands[0],game.exposed[0],evens.target,visibleTileCounts(game));
 let tracker=trackOutlook(null,game,assess());
 assert.equal(tracker.status,'Tracking');
 game.hands[0].reverse();game.wall.reverse();game.hands[1]=[];
 assert.deepEqual(trackOutlook(tracker,game,assess()),tracker);
 const discarded={k:'C6',id:304};
 game.discards.push({tile:discarded,claimed:false,player:1});
 tracker=trackOutlook(tracker,game,assess());
 assert.equal(tracker.status,'Weakening');
 assert.match(tracker.note,/6 Crak.*discards/);
 game.discards[0].claimed=true;
 game.exposed[2].push({k:'C6',tiles:[discarded,{id:305,k:'C6'},{id:306,k:'J'}]});
 tracker=trackOutlook(tracker,game,assess());
 assert.match(tracker.note,/opponent exposed 6 Crak/);
 assert.equal(assess().gaps.find(g=>g.key==='C6').unseen,2);
 assert.match(pivotReason(assess(),run),/every unseen copy of 6 Crak/);
 game.discards.push({tile:{id:307,k:'C6'},claimed:false,player:3});
 tracker=trackOutlook(tracker,game,assess());
 assert.equal(tracker.status,'Blocked');
 assert.match(pivotReason(assess(),run),/2468 · Line 2.*Consecutive Run · Line 7/);
 assert.deepEqual(trackOutlook(JSON.parse(JSON.stringify(tracker)),game,assess()),tracker);
 assert.equal(trackOutlook(tracker,game,run).history.length,0);
});

test('a useful draw improves the chosen line and an unrelated discard leaves it alone',()=>{
 const {game,lines:[row,other]}=guided();
 const initial=trackOutlook(null,game,row);
 assert.equal(pivotReason(row,other),'');
 game.discards.push({tile:{k:'W',id:500},player:1});
 const assess=()=>assessHand(game.hands[0],[],row.target,visibleTileCounts(game));
 const steady=trackOutlook(initial,game,assess());
 assert.equal(steady.status,'Steady');
 game.hands[0].push({k:'C6',id:501});
 const improved=trackOutlook(steady,game,assess());
 assert.equal(improved.status,'Improving');
 assert.match(improved.note,/6 Crak/);
 assert.equal(improved.start-improved.last.away,1);
});

test('helpful draws count each physical copy once and only include tiles that reduce the distance',()=>{
 const {game,lines}=guided();
 for(const row of lines){
  const tested=assessHand(game.hands[0],[],row.target,visibleTileCounts(game));
  for(const key of [...new Set([...row.target.groups.map(([k])=>k),'J'])]){
   const hand=[...game.hands[0],{k:key,id:600}];
   const closer=assessHand(hand,[],row.target).away<row.away;
   assert.equal(Object.hasOwn(tested.helpful,key),closer);
  }
  assert.equal(tested.usefulCopies,Object.values(tested.helpful).reduce((n,c)=>n+c,0));
 }
});

test('exposed jokers count as jokers, and a set with scarce naturals can motivate a pivot',()=>{
 const {lines:[,run]}=guided(),hand=[{k:'B2',id:1},{k:'B2',id:2}];
 const table={hands:[hand,[],[],[]],discards:[],exposed:[[],[{k:'B2',tiles:[{k:'B2',id:3},{k:'B2',id:4},{k:'J',id:5}]}],[],[]]};
 const row=assessHand(hand,[],run.target,visibleTileCounts(table));
 assert.equal(row.helpful.B2,0);
 assert.equal(row.helpful.J,7);
 assert.equal(row.jokerDebt,2);
 assert.equal(row.blocked,false);
 const safer=recommendHands(hand,[],{visible:visibleTileCounts(table)}).find(r=>r.target.id!==row.target.id&&!r.jokerDebt&&r.away<=row.away);
 assert.match(pivotReason(row,safer),/jokers/);
});

test('a whole pass can preserve the target and cost a tile toward the alternative',()=>{
 const {hand,lines}=guided();
 const picks=['D1','C9','C4'].map(k=>hand.find(t=>t.k===k));
 const feedback=selectionAdvice(hand,[],lines,picks,true);
 assert.match(feedback.text,/keep the 4 Crak.*Pass the Green dragon/);
 assert.match(feedback.details[0],/5 tiles away/);
 assert.match(feedback.details[1],/6 tiles away/);
 const recommended=suggestTiles(hand,[],lines,3,true);
 assert.equal(recommended.length,3);
 assert.ok(recommended.every(t=>t.k!=='J'));
 const keep=selectionAdvice(hand,[],lines,recommended,true).text;
 for(const row of lines)assert.ok(keep.includes(row.target.name));
});

test('the coach uses the same visible evidence regardless of concealed opponents or wall order',()=>{
 const {game,lines}=guided();
 game.phase='charlestonChoice';
 const note=turnAdvice(game,lines,options);
 game.wall.reverse();game.hands[1]=[];game.hands[2]=[];
 assert.deepEqual(turnAdvice(game,lines,options),note);
 assert.match(note.text,/You can pass three tiles/);
});

test('the final incoming tiles stay on the rack while the second Charleston decision waits',()=>{
 const {game}=guided();
 prepareTable(game);
 let received;
 for(let step=0;step<3;step++){
  pass(game,game.hands[0].filter(t=>t.k!=='J').slice(0,3).map(t=>t.id));
  received=prepareTable(game);
 }
 assert.equal(received.length,3);
 assert.ok(received.every(id=>game.hands[0].some(tile=>tile.id===id)));
 assert.equal(prepareTable(game),null);
 assert.equal(game.phase,'charlestonChoice');
 const skip=structuredClone(game);
 secondCharleston(game,true);
 assert.equal(game.passRound,2);
 assert.equal(game.phase,'charleston');
 secondCharleston(skip,false);
 prepareTable(skip);
 assert.equal(skip.phase,'courtesy');
});

test('optional passes can preserve the entire rack and never suggest passing a joker',()=>{
 const {lines}=guided();
 const target=lines[0].target;
 const keys=target.groups.flatMap(([k,n])=>Array(n).fill(k));
 const hand=keys.slice(1).map((k,id)=>({k,id}));
 assert.deepEqual(spareTiles(hand,[],[assessHand(hand,[],target)]),[]);
});

test('winning calls and self-draws take priority even when another line is pinned',()=>{
 const {game,lines}=guided();
 const target=lines[1].target;
 game.hands[0]=target.groups.flatMap(([k,n])=>Array(n).fill(k)).map((k,id)=>({k,id}));
 game.phase='discard';game.turn=0;
 assert.match(turnAdvice(game,lines.slice(0,1),options).text,/Declare Mahjong/);
 game.discards=[{tile:game.hands[0].pop(),player:1}];game.phase='claim';
 assert.match(turnAdvice(game,[],{...options,claims:claimOptions(game,0)}).text,/Call it for Mahjong/);
});

test('a White dragon call explains the size Line 5 needs, including the discard and any jokers',()=>{
 const {game}=guided();
 game.phase='claim';
 game.discards=[{player:1,tile:{k:'H',id:999}}];
 const target=TARGETS.find(t=>t.id==='run5'&&t.groups.some(([k,n])=>k==='H'&&n===4));
 const alternative=TARGETS.find(t=>t.id==='wind2'&&t.groups.some(([k,n])=>k==='H'&&n===3));
 const rack=['F','F','D1','D1','D2','D2','D3','D3','H','H','E','B8','C9'];
 game.hands[0]=rack.map((k,id)=>({k,id}));
 const advice=(targets,selected=[])=>turnAdvice(game,targets.map(t=>assessHand(game.hands[0],[],t)),{
  ...options,claims:claimOptions(game,0),selected:new Set(selected),staging:selected.length>0
 });
 const pass='Pass on the White dragon. With it, you can expose 3 of the 4 needed for Consecutive Run · Line 5.';
 assert.equal(advice([target]).text,pass);
 const withAlternative=advice([target,alternative]);
 assert.equal(withAlternative.text,pass);
 assert.match(withAlternative.details[0],/Winds - Dragons · Line 2/);
 game.hands[0][9].k='J';
 assert.equal(advice([target]).text,pass);
 game.hands[0][10].k='J';
 assert.match(advice([target]).text,/call that White dragon/);
 assert.match(advice([target],[8,9]).text,/Add 1 more tile to expose 4/);
 assert.match(advice([target],[8,9,10]).text,/call that White dragon/);
 const concealed=TARGETS.find(t=>t.concealed);
 assert.match(advice([concealed]).text,/must stay concealed/);
 const pair=TARGETS.find(t=>!t.concealed&&t.groups.some(([k,n])=>k==='H'&&n===2));
 assert.match(advice([pair]).text,/single or pair/);
});

test('a fourth Flower stays on the table when the player already holds the three the line needs',()=>{
 const {game}=guided(),target=TARGETS.find(t=>t.key==='run5-0');
 game.phase='claim';
 game.exposed[0]=[{k:'B3',tiles:[30,31,32].map(id=>({k:'B3',id}))}];
 game.hands[0]=['F','F','F','B1','B1','B2','B2','J','J','B7'].map((k,id)=>({k,id}));
 game.discards=[{player:1,tile:{k:'F',id:50}}];
 const advice=(ids=[])=>turnAdvice(game,[assessHand(game.hands[0],game.exposed[0],target)],{
  ...options,claims:claimOptions(game,0),selected:new Set(ids),staging:ids.length>0
 });
 for(const selected of [[],[0],[0,1],[0,1,2]]){
  const tip=advice(selected);
  assert.match(tip.text,/^Pass.*3 Flowers.*concealed/);
  assert.match(tip.details.join(' '),/2 → 2 tiles away after discarding/);
 }
 // Two Flowers and an off-line tile make the same discard a useful call.
 game.hands[0][2].k='C9';
 assert.match(advice().text,/call that Flower/i);
 assert.match(advice().details[0],/3 → 2 tiles away after discarding/);
 // Staging a joker instead of the second Flower ties it up in the exposure.
 assert.match(advice([0,7]).text,/^Pass on the Flower/);
 assert.match(advice([0,7]).details[0],/3 → 3 tiles away after discarding/);
 // A joker can also usefully fill the missing Flower when only one natural is held.
 game.hands[0][1].k='W';
 assert.match(advice([0,7]).text,/call that Flower/i);
});

test('calling compares the staged exposure and discarding previews the selected tile',()=>{
 const {game,hand,lines}=guided();
 game.phase='claim';
 const discard={k:'C4',id:999};
 game.discards=[{player:1,tile:discard}];
 const claims=claimOptions(game,0),chosen=hand.filter(t=>t.k==='C4');
 const advice=turnAdvice(game,lines,{...options,claims,staging:true,selected:new Set(chosen.map(t=>t.id))});
 assert.match(advice.text,/Pass on the 4 Crak.*2468 · Line 2.*pair/);
 assert.match(advice.details[0],/Consecutive Run/);
 assert.match(advice.details[0],/after discarding/);
 game.phase='discard';game.turn=0;
 assert.match(turnAdvice(game,lines,{...options,selected:new Set([hand.find(t=>t.k==='C9').id])}).text,/let the 9 Crak go/);
 game.phase='draw';
 assert.match(turnAdvice(game,lines,options).text,/Take a tile from the wall/);
});
