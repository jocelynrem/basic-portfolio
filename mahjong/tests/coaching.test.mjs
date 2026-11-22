import assert from 'node:assert/strict';
import test from 'node:test';
import {practiceGame,restorePracticeChoice} from '../js/learning.mjs';
import {claimOptions,pass,secondCharleston,TARGETS,visibleTileCounts} from '../js/engine.mjs';
import {currentLineMove,drawFromWall,passTiles,prepareTable} from '../js/table-actions.mjs';
import {assessHand,recommendHands} from '../js/recommendations.mjs';
import {handComparison,selectionAdvice,spareTiles,suggestTiles,turnAdvice} from '../js/coaching.mjs';
import {holdVerdict,pivotReason,trackOutlook} from '../js/outlook.mjs';

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
 const pass='Pass. That’s the first White dragon discarded. You need one more White dragon or joker on your rack to call a set of 4.';
 assert.equal(advice([target]).text,pass);
 const withAlternative=advice([target,alternative]);
 assert.equal(withAlternative.text,pass);
 assert.match(withAlternative.details.join(' '),/Winds - Dragons · Line 2/);
 game.hands[0][9].k='J';
 assert.equal(advice([target]).text,pass);
 game.hands[0][10].k='J';
 assert.match(advice([target]).text,/call that White dragon/);
 assert.match(advice([target],[8,9]).text,/Add 1 more tile to expose 4/);
 assert.match(advice([target],[8,9,10]).text,/call that White dragon/);
 const concealed=TARGETS.find(t=>t.concealed);
 assert.match(advice([concealed]).text,/concealed/);
 const pair=TARGETS.find(t=>!t.concealed&&t.groups.some(([k,n])=>k==='H'&&n===2));
 assert.match(advice([pair]).text,/pair/);
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
 assert.match(turnAdvice(game,lines,{...options,selected:new Set([hand.find(t=>t.k==='C9').id])}).text,/9 Crak.*tied/);
 game.phase='draw';
 assert.match(turnAdvice(game,lines,options).text,/Take a tile from the wall/);
});

test('7 and 9 Bam are a real tradeoff for the 13579 backup, including after selecting a tile',()=>{
 const {game}=guided();
 game.phase='discard';game.turn=0;game.drawn=10;
 game.hands[0]=['F','F','F','B1','B1','B2','B2','J','J','B7','B9'].map((k,id)=>({k,id}));
 game.exposed[0]=[{k:'B3',tiles:[20,21,22].map(id=>({k:'B3',id}))}];
 const rows=()=>recommendHands(game.hands[0],game.exposed[0],{visible:visibleTileCounts(game)}).slice(0,2);
 assert.deepEqual(rows().map(r=>r.target.id),['run5','odd1']);
 for(const id of [null,9,10]){
  const tip=turnAdvice(game,rows(),{...options,selected:new Set(id==null?[]:[id])});
  assert.match(tip.text,/Tough choice/);
  for(const label of ['7 Bam','9 Bam','13579 · Line 1'])assert.ok(tip.text.includes(label));
  assert.match(tip.text,/Either discard costs it a tile/);
  assert.equal(tip.tile,undefined);
  game.hands[0].reverse();
 }
 game.hands[0].find(t=>t.k==='B7').k='W';
 assert.equal(turnAdvice(game,rows(),options).tile.k,'W');
});

test('a lone 5 Dot is a better discard than a 5 Bam with its 6 Bam single already on the rack',()=>{
 const {game}=guided();
 game.phase='discard';game.turn=0;game.drawn=13;
 game.hands[0]=['F','B4','B4','B5','B6','B8','B8','B9','C5','C6','E','E','W','D5'].map((k,id)=>({k,id}));
 const advice=selected=>{
  const rows=recommendHands(game.hands[0],[],{visible:visibleTileCounts(game)}).slice(0,2);
  assert.deepEqual(rows.map(r=>r.target.id),['even3','run2']);
  return turnAdvice(game,rows,{...options,selected:new Set(selected)});
 };
 for(const selected of [[],[3],[13]]){
  const tip=advice(selected);
  assert.match(tip.text,/Discard (?:the )?5 Dot/i);
  assert.match(tip.text,/5 and 6 in Bams and Craks/);
  assert.match(tip.text,/7 Bam/);
  assert.match(tip.text,/Consecutive Run · Line 2/);
  assert.doesNotMatch(tip.text,/5 Dot and 5 Bam are tied/);
  game.hands[0].reverse();
 }
 // A suit swap reverses the recommendation without changing the card line.
 for(const tile of game.hands[0]){
  if(tile.k.startsWith('B'))tile.k='D'+tile.k.slice(1);
  else if(tile.k.startsWith('D'))tile.k='B'+tile.k.slice(1);
 }
 const swapped=advice([]).text;
 assert.match(swapped,/Discard 5 Bam/);
 assert.match(swapped,/5 and 6 in (Craks and Dots|Dots and Craks)/);
 assert.match(swapped,/7 Dot/);
 // Once all four 7 Dots are out, the Crak variation still works.
 game.discards=[20,21,22,23].map(id=>({tile:{id,k:'D7'},player:1}));
 const tip=advice([3]);
 assert.doesNotMatch(tip.text,/Keep 5 Dot|Only 7 Dot/);
 assert.match(tip.details.join(' '),/Equally ranked discards[^·]*·[^.]*5 Dot/);
});

test('the new 3 Bam lets both suits wait for their 7, and a forced split favors the 6 shared with 2468',()=>{
 const {game}=guided();
 game.phase='discard';game.turn=0;game.drawn=13;
 game.hands[0]='F B4 B4 B4 B5 B6 B8 B8 C5 C6 E E W B3'.split(' ').map((k,id)=>({k,id}));
 game.discards='C1 F B9 C3 C5 C5 C4 D4 C9 W D5 D3 D1 R D5 C2 D2 H B9 C2 S C2'.split(' ').map((k,i)=>({
  tile:{k,id:20+i},player:1,claimed:i===0||i===7
 }));
 game.exposed[2]=[{k:'D4',tiles:[game.discards[7].tile,{k:'J',id:50},{k:'D4',id:51}]}];
 game.exposed[3]=[{k:'C1',tiles:[game.discards[0].tile,{k:'C1',id:52},{k:'C1',id:53}]}];
 const advice=selected=>{
  const rows=recommendHands(game.hands[0],[],{hideConcealed:true,visible:visibleTileCounts(game)}).slice(0,2);
  assert.deepEqual(rows.map(r=>r.target.id),['even3','run2']);
  return turnAdvice(game,rows,{...options,selected:new Set(selected)});
 };
 for(const selected of [[],[13],[4],[8]]){
  const tip=advice(selected);
  assert.equal(tip.tile.k,'B3');
  assert.match(tip.text,/Discard 3 Bam.*5 and 6 in Bams and Craks.*Consecutive Run · Line 2.*7 Bam or 7 Crak/);
  assert.match(tip.details.join(' '),/6 Bam can serve either 2468 · Line 3 or Consecutive Run · Line 2/);
  if(selected[0]===4)assert.match(tip.details.join(' '),/2 after discarding 3 Bam, 1 after discarding 5 Bam/);
 }
 // A useful draw for the main line now forces a suit decision.
 game.hands[0][13].k='B2';
 for(const selected of [[],[4],[8]]){
  const tip=advice(selected);
  assert.match(tip.text,/Discard (5 Crak or 6 Crak|6 Crak or 5 Crak).*Keep 5 Bam and 6 Bam/);
  assert.match(tip.details.join(' '),/6 Bam can serve either 2468/);
 }
 // The shared 6 is only a tiebreaker while a natural 7 Bam is available.
 game.discards.push(...[60,61,62,63].map(id=>({tile:{k:'B7',id},player:1})));
 assert.doesNotMatch(advice([]).text,/Keep 5 Bam|7 Bam or 7 Crak/);
});

test('the second missed Green dragon explains call readiness and the selected line still leads',()=>{
 const {game}=guided(),target=TARGETS.find(t=>t.key==='run5-0');
 game.phase='claim';game.turn=1;
 game.exposed[0]=[{k:'B3',tiles:[20,21,22].map(id=>({k:'B3',id}))}];
 game.hands[0]=['F','F','F','B1','B1','B2','B2','J','J','B7'].map((k,id)=>({k,id}));
 game.discards=[{player:3,tile:{k:'G',id:40}},{player:1,tile:{k:'G',id:41}}];
 const rows=recommendHands(game.hands[0],game.exposed[0],{visible:visibleTileCounts(game)}).slice(0,2);
 assert.equal(rows[0].target.key,target.key);
 for(const claims of [claimOptions(game,0),[]]){
  const tip=turnAdvice(game,rows,{...options,claims});
  assert.match(tip.text,/second Green dragon discarded.*one more Green dragon or joker.*set of 4/);
  assert.match(tip.details[0],/2 in the discard pool · 0 exposed · 2 unseen/);
  assert.equal(pivotReason(...rows,tip.scarceDiscard),'');
  assert.equal(holdVerdict(...rows).title,'Stay');
 }
 // Another opponent's ordinary discard should not erase the notice before our draw.
 game.phase='draw';game.turn=0;game.discards.push({player:3,tile:{k:'W',id:42}});
 assert.match(turnAdvice(game,rows,options).text,/second Green dragon/);
 game.hands[0].push({k:'G',id:43});game.drawn=43;game.phase='discard';
 assert.equal(turnAdvice(game,rows,options).neededDiscard,undefined);
 // The same discarded tile can warrant a pivot with a different rack.
 game.phase='claim';game.turn=1;game.discards.pop();
 game.hands[0]=['B5','B5','B1','B1','B7','B7','B9','B9','J','J'].map((k,id)=>({k,id}));
 const visible=visibleTileCounts(game);
 const ranked=recommendHands(game.hands[0],game.exposed[0],{visible});
 const chosen=assessHand(game.hands[0],game.exposed[0],target,visible);
 const tip=turnAdvice(game,[chosen,ranked[0]],{...options,claims:claimOptions(game,0)});
 assert.equal(tip.scarceDiscard,'G');
 assert.match(pivotReason(chosen,ranked[0],tip.scarceDiscard),/13579 · Line 1/);
 assert.ok(pivotReason(ranked.find(r=>r.target.id===target.id),ranked[0],tip.scarceDiscard));
});

test('an exposed opponent line breaks an otherwise genuine discard tie',()=>{
 const {game}=guided();
 game.phase='discard';game.turn=0;
 game.hands[0]='E E B2 B2 B4 B4 B4 B6 B6 B8 W W D2 B9'.split(' ').map((k,id)=>({k,id}));
 const focus=TARGETS.find(t=>t.key==='even3-0');
 const advice=(selected=[])=>turnAdvice(game,[assessHand(game.hands[0],[],focus,visibleTileCounts(game))],{...options,selected:new Set(selected)});
 assert.equal(advice().tile,undefined);
 game.exposed[2]=[{k:'D4',tiles:['D4','J','D4'].map((k,i)=>({k,id:50+i}))},
  {k:'C8',tiles:['C8','C8','J','C8'].map((k,i)=>({k,id:60+i}))}];
 for(const selected of [[],[12],[13]]){
  const tip=advice(selected);
  assert.equal(tip.tile.k,'B9');
  assert.match(tip.text,/Discard 9 Bam.*Rose could call 2 Dot.*2468 · Line 1/);
 }
});

test('uncallable discards use the actual tile and group size, including a quint and a six-Flower set',()=>{
 for(const [key,n] of [['B4',3],['C8',4],['D5',5],['F',6],['N',4]]){
  const {game}=guided();
  const target=TARGETS.find(t=>!t.concealed&&t.groups.some(([k,size])=>k===key&&size===n));
  game.hands[0]=Array.from({length:n-2},(_,id)=>({id,k:id%2?'J':key}));
  game.phase='draw';game.turn=0;
  const previous={k:key,id:40};
  game.discards=[{player:2,tile:previous,claimed:true},{player:3,tile:{k:key,id:41}}];
  game.exposed[2]=[{k:key,tiles:[previous,{id:42,k:'J'},{id:43,k:'J'}]}];
  const row=assessHand(game.hands[0],[],target,visibleTileCounts(game));
  const tip=turnAdvice(game,[row],options);
  assert.equal(tip.neededDiscard,key);
  assert.match(tip.text,/second/);
  assert.ok(tip.text.includes('set of '+n));
  assert.ok(tip.details[0].includes('1 in the discard pool · 1 exposed'));
 }
});
