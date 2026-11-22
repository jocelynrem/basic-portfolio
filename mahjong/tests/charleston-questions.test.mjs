import assert from 'node:assert/strict';
import test from 'node:test';
import {answerCoachQuestion} from '../js/coach-questions.mjs';
import {TARGETS,evaluate,visibleTileCounts} from '../js/engine.mjs';
import {assessHand} from '../js/recommendations.mjs';

// South is asking during a simultaneous pass. The dealer still has the turn marker.
function scenario(keys='E E B2 B2 B4 B4 B6 B8 W J C1 D3 G'){
 const rack=keys.split(' ').map((k,id)=>({k,id}));
 const game={hands:[rack,[],[],[]],exposed:[[],[],[],[]],discards:[],wall:Array(99).fill(null),
  phase:'charleston',turn:1,dealer:1,passRound:1,passStep:0};
 const target=TARGETS.find(t=>t.key==='even3-0');
 const lines=[assessHand(rack,[],target,visibleTileCounts(game))];
 const ask=(question,ids=[],extra={})=>answerCoachQuestion(game,lines,{question,selectedIds:new Set(ids),...extra});
 return {game,rack,target,ask};
}

function reply({text,details=[]}){
 return [text,...details].join(' ');
}

test('Charleston tile questions use the named tile, including when phrased as a discard',()=>{
 const {ask,game}=scenario(),before=structuredClone(game);
 for(const question of ['Should I pass East?','Why keep East?','Why discard East?']){
  const result=reply(ask(question,[10],{tileKey:'C1'}));
  assert.match(result,/East/);
  assert.match(result,/2468 · Line 3/);
  assert.doesNotMatch(result,/your turn to discard|when it.s your turn/i);
 }
 assert.match(reply(ask('Should I pass the Flower?')),/Flower.*(?:rack|hold)|(?:rack|hold).*Flower/i);
 const joker=reply(ask('Can I pass my joker?'));
 assert.match(joker,/joker/i);
 assert.match(joker,/stay|keep|never|cannot|can.t/i);
 assert.deepEqual(game,before);
});

test('Ask the coach evaluates every selected copy in a partial or complete packet',()=>{
 const {rack,target,ask}=scenario();
 for(const ids of [[0],[0,1],[0,1,10]]){
  const answer=ask('Should I pass these tiles?',ids,{tileKey:'E'});
  const distance=evaluate(rack.filter(t=>!ids.includes(t.id)),[],target).missing;
  assert.match(reply(answer),/East/);
  assert.match(answer.details.join(' '),new RegExp('2468 · Line 3[^.]*\\b'+distance+' tiles? away'));
  if(ids.includes(10))assert.match(reply(answer),/1 Crak/);
 }
});

test('the generic required pass offers the three spare rack tiles',()=>{
 const {ask}=scenario(),answer=reply(ask('Which tiles should I pass?'));
 for(const tile of ['1 Crak','3 Dot','Green dragon'])assert.ok(answer.includes(tile),answer);
 assert.doesNotMatch(answer,/pass.*blind|your turn to discard/i);
});

test('a choice between two passes evaluates each separately and a hypothetical keep leaves the packet alone',()=>{
 const {ask}=scenario();
 const answer=ask('Should I pass 1 Crak or East?');
 assert.match(answer.text,/pass 1 Crak and keep East for 2468 · Line 3/);
 assert.match(reply(answer),/Passing 1 Crak · 2468/);
 assert.match(reply(answer),/Passing East · 2468/);
 assert.doesNotMatch(ask('Why keep East?').text,/choose 2 more/i);
});

test('a left pass and copies left are different questions on the same turn',()=>{
 const {ask,game}=scenario();
 game.passRound=2;game.passStep=0;
 const pass=reply(ask('What should I pass left?'));
 for(const tile of ['1 Crak','3 Dot','Green dragon'])assert.ok(pass.includes(tile),pass);
 assert.match(reply(ask('How many 2 Bams are left?')),/2 unseen|2 copies.*unseen/i);
 assert.match(reply(ask('How many Wests are left?')),/3 unseen|3 copies.*unseen/i);
 game.phase='claim';game.discards.push({tile:{k:'W',id:30},player:1});
 const advice={text:'Pass on the West to keep your pair concealed.'};
 assert.equal(ask('Should I pass on the West?',[],{advice}).text,advice.text);
});

test('a tight rack can keep every tile on a blind pass or in the courtesy exchange',()=>{
 const {game,ask}=scenario('E E B2 B2 B4 B4 B4 B6 B6 B6 B8 B8 W');
 for(const passRound of [1,2]){
  game.passRound=passRound;game.passStep=2;
  const answer=reply(ask('What should I pass?'));
  assert.match(answer,/blind|unseen/i);
 }
 game.phase='courtesy';
 const courtesy=reply(ask('What should I pass?'));
 assert.match(courtesy,/skip|sit .*out|zero|pass (?:none|nothing|0)|keep (?:all|every)|exchange (?:none|nothing|0)/i);
 assert.doesNotMatch(courtesy,/tiles? blind|incoming .*unseen/i);
});

test('one selected spare can be passed with two blind tiles or exchanged on its own in courtesy',()=>{
 const {game,ask}=scenario();
 game.passStep=2;
 const blind=reply(ask('Should I pass these tiles?',[10]));
 assert.match(blind,/1 Crak/);
 assert.match(blind,/(?:two|2)[^.]*?(?:blind|unseen)|(?:blind|unseen)[^.]*?(?:two|2)/i);
 game.phase='courtesy';
 const courtesy=reply(ask('Should I pass these tiles?',[10]));
 assert.match(courtesy,/1 Crak/);
 assert.doesNotMatch(courtesy,/(?:two|2) more|tiles? blind|blind tiles?/i);
});

test('whether to stop depends on the actual second Charleston decision and the available spares',()=>{
 const spare=scenario(),tight=scenario('E E B2 B2 B4 B4 B4 B6 B6 B6 B8 B8 W');
 for(const round of [1,2]){
  tight.game.passRound=round;tight.game.passStep=1;
  const required=reply(tight.ask('Can I stop the Charleston now?'));
  assert.match(required,/required|finish|complete|must|after|already started|committed/i);
  assert.doesNotMatch(required,/I’d stop here/i);
 }
 for(const [fixture,action] of [[spare,/continue|start|go ahead|pass (?:three|3)/i],[tight,/stop|skip/i]]){
  fixture.game.phase='charlestonChoice';fixture.game.passRound=1;fixture.game.passStep=0;
  assert.match(reply(fixture.ask('Should I start the second Charleston?')),action);
 }
});
