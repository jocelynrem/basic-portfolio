import assert from 'node:assert/strict';
import test from 'node:test';
import {answerCoachQuestion} from '../js/coach-questions.mjs';
import {TARGETS,visibleTileCounts} from '../js/engine.mjs';
import {assessHand} from '../js/recommendations.mjs';
import {readTable} from '../js/defense.mjs';
import {naturalTradeoff} from '../js/natural-outlook.mjs';

function scenario(){
 const rack='F B2 B4 B4 B4 B5 B6 B7 B8 B8 E E W B6'.split(' ').map((k,id)=>({k,id}));
 const game={hands:[rack],wall:Array(63).fill(null),phase:'discard',turn:0,
  discards:['W','W','B2','B8'].map((k,i)=>({tile:{k,id:i+20}})),
  exposed:[[],[],[{k:'D4',tiles:['J','D4','D4'].map((k,i)=>({k,id:i+30}))},{k:'C8',tiles:['C8','C8','C8','J'].map((k,i)=>({k,id:i+34}))}],[]]};
 const ask=(question,extra={})=>{
  const visible=visibleTileCounts(game),lines=['even3-0','run2-27'].map(key=>assessHand(rack,[],TARGETS.find(t=>t.key===key),visible));
  return answerCoachQuestion(game,lines,{question,table:readTable(game,visible),tradeoff:naturalTradeoff(game,...lines),...extra});
 };
 return {game,ask};
}

test('a specific Flower question explains what each line keeps, the natural run, and the alternative',()=>{
 const {game,ask}=scenario(),before=JSON.stringify(game);
 for(const question of ['Why not discard the Flower?','What about the flowers instead?','why not the flower?']){
  const {text,details}=ask(question,{tileKey:'B7'});
  assert.match(text,/Flower makes sense for 2468 · Line 3/);
  assert.match(text,/5–6–7 Bam singles stay intact/);
  assert.match(text,/another Flower or a joker/);
  assert.match(text,/6 Bams instead/);
  assert.match(details.join(' '),/2468 · Line 3 · 3 → 3 tiles away after discarding Flower/);
  assert.match(details.join(' '),/Consecutive Run · Line 2 · 5 → 6/);
 }
 assert.equal(JSON.stringify(game),before);
 assert.match(ask('Why keep this tile?',{tileKey:'B7'}).text,/7 Bam protects a natural single/);
 for(const q of ['Should I toss the seven bamboos?','What if I throw the B7?','Could I drop bam 7?'])assert.match(ask(q).text,/7 Bam protects a natural single/);
});

test('public natural waits and exposures answer distinct questions',()=>{
 const {ask}=scenario();
 const odds=ask('What are the odds of getting the two bamboo given what is exposed?');
 assert.match(odds.text,/2 Bam has 2 unseen copies/);
 assert.match(odds.details[0],/Next wall draw/);
 const pairs=ask('How live are my pairs?');
 assert.match(pairs.text,/West \(1 unseen\)/);
 assert.match(pairs.details.join(' '),/2 in discards/);
 assert.match(ask('Should I switch lines?').text,/2468 · Line 3.*Consecutive Run · Line 2/);
 assert.match(ask('What is Rose going for?').text,/Rose.*2468 · Line 1.*2 Dot and 6 Crak/);
 assert.match(ask('Is this tile dangerous?',{tileKey:'B7'}).text,/no clear warning about 7 Bam/);
});

test('questions respect the turn, selections, unsupported topics, and the discard currently on offer',()=>{
 const {game,ask}=scenario();
 assert.match(ask('Why discard this tile?').text,/Which rack tile/);
 assert.equal(ask('What should I discard?',{advice:{text:'These two discards are equally useful.'}}).text,'These two discards are equally useful.');
 assert.match(ask('Why keep soap?').text,/White dragon isn’t on your rack/);
 assert.match(ask('Explain the history of mahjong').text,/I can compare your lines/);
 game.turn=1;
 assert.match(ask('Discard 7 Bam?').text,/your turn to discard/);
 game.phase='claim';
 assert.match(ask('Call the flower?').text,/tile on offer is 8 Bam/);
 assert.match(ask('Should I call 8 Bam?',{advice:{text:'Pass on the 8 Bam.'}}).text,/Pass on the 8 Bam/);
});
