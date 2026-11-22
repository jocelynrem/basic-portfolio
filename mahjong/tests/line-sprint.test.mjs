import assert from 'node:assert/strict';
import test from 'node:test';
import {best,deck} from '../js/engine.mjs';
import {TOTAL_ROUNDS,dealSprintRound,scorePick} from '../js/line-sprint.mjs';

function seededRandom(seed){
 return ()=>{
  seed=(Math.imul(1664525,seed)+1013904223)>>>0;
  return seed/4294967296;
 };
}

test('each rack is a legal partial hand and every answer uses its closest card variation',t=>{
 const keysById=new Map(deck().map(tile=>[tile.id,tile.k]));
 t.mock.method(Math,'random',seededRandom(20261122));
 const rounds=[];
 assert.equal(TOTAL_ROUNDS,10);
 for(let index=0;index<TOTAL_ROUNDS;index++){
  const round=dealSprintRound(index,rounds);
  rounds.push(round);
  assert.equal(round.rack.length,13);
  assert.equal(new Set(round.rack.map(tile=>tile.id)).size,13);
  for(const tile of round.rack)assert.equal(keysById.get(tile.id),tile.k);

  assert.equal(round.choices.length,index<3?2:index<7?3:4);
  assert.equal(new Set(round.choices.map(choice=>choice.target.id)).size,round.choices.length);
  assert.ok(round.bestAway>=2);
  assert.equal(round.bestAway,best(round.rack).missing);
  assert.ok(round.choices.some(choice=>choice.away===round.bestAway));
  assert.ok(round.choices.some(choice=>choice.away>round.bestAway));
  for(const choice of round.choices){
   assert.equal(choice.away,best(round.rack,[],choice.target.id).missing);
   const fitted=choice.groups.flatMap(group=>group.tiles.filter(Boolean));
   assert.equal(choice.matchedIds.length,14-choice.away);
   assert.equal(new Set(choice.matchedIds).size,choice.matchedIds.length);
   assert.deepEqual(new Set(fitted.map(tile=>tile.id)),new Set(choice.matchedIds));
   for(const group of choice.groups){
    for(const tile of group.tiles.filter(Boolean)){
     assert.ok(round.rack.includes(tile));
     assert.ok(tile.k===group.k||(tile.k==='J'&&group.n>=3));
    }
   }
  }
 }
 assert.equal(new Set(rounds.map(round=>round.rack.map(tile=>tile.k).join(','))).size,TOTAL_ROUNDS);
});

test('points follow the distance gap, including tied best fits, distant choices, and timeouts',()=>{
 const round={bestAway:3,choices:[3,4,5,6,7,8,3].map(away=>({away}))};
 assert.deepEqual(round.choices.map((_,index)=>scorePick(round,index)),[100,75,50,25,0,0,100]);
 assert.equal(scorePick(round,null),0);
});
