import assert from 'node:assert/strict';
import test from 'node:test';
import {practiceGame} from '../js/learning.mjs';
import {claimOptions,TARGETS,visibleTileCounts} from '../js/engine.mjs';
import {assessHand,recommendHands} from '../js/recommendations.mjs';
import {handComparison,selectionAdvice,spareTiles,suggestTiles,turnAdvice} from '../js/coaching.mjs';

function guided(){
 const game=practiceGame({dealer:0});
 const hand=game.hands[0];
 const focus=assessHand(hand,[],TARGETS.find(t=>t.key===game.goalTargetKey));
 const [other]=recommendHands(hand,[],{visible:visibleTileCounts(game)}).filter(row=>row.target.id!==focus.target.id);
 return {game,hand,lines:[focus,other]};
}

const options={selected:new Set(),claims:[],staging:false,receivedIds:new Set(),swaps:[]};

test('the guided opening compares distinct hands and recognizes the missing natural pair',()=>{
 const {game,hand,lines}=guided();
 const [evens,run]=lines;
 assert.equal(run.target.id,'run7');
 assert.deepEqual(lines.map(row=>row.away),[5,5]);
 assert.match(handComparison(evens,run,true).reason,/pair of 6 Craks/);
 assert.match(handComparison(run,evens,true).title,/Your pick has a slight edge/);
 game.discards=[0,1,2].map(id=>({player:1,tile:{id:200+id,k:'C6'}}));
 const unavailable=assessHand(hand,[],evens.target,visibleTileCounts(game));
 assert.ok(unavailable.blocked);
 assert.match(handComparison(unavailable,run,true).reason,/Too few copies of 6 Crak/);
});

test('a whole pass can preserve the target and cost a tile toward the alternative',()=>{
 const {hand,lines}=guided();
 const picks=['D1','C9','C4'].map(k=>hand.find(t=>t.k===k));
 const feedback=selectionAdvice(hand,[],lines,picks,true);
 assert.match(feedback.text,/Keep 4 Crak.*Pass Green dragon/);
 assert.match(feedback.details[0],/5 tiles away/);
 assert.match(feedback.details[1],/6 tiles away/);
 const recommended=suggestTiles(hand,[],lines,3,true);
 assert.equal(recommended.length,3);
 assert.ok(recommended.every(t=>t.k!=='J'));
 assert.match(selectionAdvice(hand,[],lines,recommended,true).text,/both hands open/);
});

test('the coach uses the same visible evidence regardless of concealed opponents or wall order',()=>{
 const {game,lines}=guided();
 game.phase='charlestonChoice';
 const note=turnAdvice(game,lines,options);
 game.wall.reverse();game.hands[1]=[];game.hands[2]=[];
 assert.deepEqual(turnAdvice(game,lines,options),note);
 assert.match(note.text,/Continue/);
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

test('calling compares the staged exposure and discarding previews the selected tile',()=>{
 const {game,hand,lines}=guided();
 game.phase='claim';
 const discard={k:'C4',id:999};
 game.discards=[{player:1,tile:discard}];
 const claims=claimOptions(game,0),chosen=hand.filter(t=>t.k==='C4');
 const advice=turnAdvice(game,lines,{...options,claims,staging:true,selected:new Set(chosen.map(t=>t.id))});
 assert.match(advice.text,/exposure fits Consecutive Run/);
 assert.match(advice.details[0],/before discarding/);
 game.phase='discard';game.turn=0;
 assert.match(turnAdvice(game,lines,{...options,selected:new Set([hand.find(t=>t.k==='C9').id])}).text,/Discarding 9 Crak/);
 game.phase='draw';
 assert.match(turnAdvice(game,lines,options).text,/Draw from the wall/);
});
