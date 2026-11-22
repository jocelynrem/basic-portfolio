import assert from 'node:assert/strict';
import test from 'node:test';
import {readTable} from '../js/defense.mjs';
import {TARGETS} from '../js/engine.mjs';

function table(){
 let id=0;
 const tile=k=>({id:id++,k});
 const tiles=(...keys)=>keys.map(tile);
 const group=(k,...keys)=>({k,tiles:tiles(...keys)});
 const game={hands:[[],[],[],[]],exposed:[[],[],[],[]],discards:[]};
 const discard=(...keys)=>game.discards.push(...tiles(...keys).map(tile=>({tile,player:1})));
 return {game,tile,tiles,group,discard};
}

test('two exposed groups narrow Rose to one card variation and identify both remaining calls',()=>{
 const {game,tiles,group,discard}=table();
 game.exposed[2]=[group('D4','J','D4','D4'),group('C8','C8','C8','J','C8')];
 game.exposed[1]=[group('C1','C1','C1','C1')];
 game.hands[0]=tiles('B2','D2','C6','D4','C8','J');
 const first=readTable(game);
 assert.match(first.details[0],/Rose.*4 Dot.*8 Crak.*2468 · Line 1.*2 Dot and 6 Crak/);
 assert.match(first.details[1],/Mabel.*fits \d+ card lines/);
 for(const key of ['D2','C6']){
  assert.equal(first.risks.get(key).rank,3);
  assert.match(first.risks.get(key).reason,/Rose could call .* for a set on 2468 · Line 1/);
 }
 for(const key of ['D4','C8','J'])assert.equal(first.risks.has(key),false);
 game.hands[1]=tiles('B2','B2','J');
 game.hands[2]=tiles('W','B9','J');
 game.wall=tiles('D2','C6');
 game.exposed[2].forEach(g=>game.discards.push({tile:g.tiles.at(-1),claimed:true,player:1}));
 assert.deepEqual(readTable(game),first);
 // No other 2 Dot or hidden joker could accompany the proposed discard.
 discard('D2','D2','D2','J','J','J','J','J');
 assert.equal(readTable(game).risks.has('D2'),false);
});

test('a pair can win on our discard when one other copy is unseen',()=>{
 const {game,tiles,group,discard}=table();
 game.exposed[2]=[group('F','F','F','F'),group('B3','B3','B3','B3'),group('G','G','G','G','G')];
 game.hands[0]=tiles('B1','B2','B3','J');
 // Run line 5 needs pairs of both 1 and 2. Only one more 1 can be hidden.
 discard('B1','B1');
 const {risks}=readTable(game);
 assert.match(risks.get('B1').reason,/Mahjong on Consecutive Run · Line 5.*pair/);
 assert.equal(risks.has('B2'),false);
 assert.equal(risks.has('J'),false);
 discard('B1');
 assert.equal(readTable(game).risks.size,0);
});

test('the last natural single can give Mahjong and multiple locked naturals invalidate a suit variation',()=>{
 const {game,tiles,group,discard}=table();
 game.exposed[1]=[group('F','F','F','F'),group('B1','B1','B1','B1','B1'),group('B5','B5','B5','B5','B5')];
 game.hands[0]=tiles('B2','B3','C2');
 discard('B2','B2','B2');
 assert.match(readTable(game).risks.get('B2').reason,/could give Mabel Mahjong.*single/);
 discard('B3','B3','B3');
 const {risks}=readTable(game);
 assert.equal(risks.has('B2'),false);
 assert.equal(risks.has('B3'),false);
 assert.match(risks.get('C2').reason,/Mahjong/);
});

test('unexposed and declared-dead opponents supply no discard read',()=>{
 const {game,tiles,group}=table();
 game.hands[0]=tiles('D2','C6');
 game.hands[1]=tiles('D2','D2','J');
 assert.deepEqual(readTable(game),{risks:new Map(),details:[]});
 game.exposed[3]=[group('D4','D4','D4','D4'),group('C8','C8','C8','C8','C8')];
 game.deadHand={player:3};
 assert.deepEqual(readTable(game),{risks:new Map(),details:[]});
});

test('June’s Flower warning previews the two-suit Line 5 matching her actual exposures',()=>{
 const {game,tiles,group}=table();
 game.hands[0]=tiles('D3','D3','D3','D6','D6','B6','B6','B6','C9','C9','C9','C9','F','B5');
 game.exposed[3]=[group('C4','C4','J','C4'),group('G','G','G','G','G')];
 const {risks}=readTable(game),flower=risks.get('F');
 assert.match(flower.reason,/June could call Flower for a set on Consecutive Run · Line 5/);
 assert.deepEqual(flower.preview,{player:3,tileKey:'F',lineName:'Consecutive Run · Line 5',
  targets:[TARGETS.find(t=>t.key==='run5-14')]});
 assert.deepEqual(flower.preview.targets[0].groups,[['F',3],['C2',2],['B3',2],['C4',3],['G',4]]);
 assert.equal(risks.has('B5'),false);
});

test('each warning previews only its live variations and its own discard role',()=>{
 const {game,tiles,group,discard}=table();
 game.hands[0]=tiles('F','C3');
 game.exposed[3]=[group('C2','C2','C2','C2','C2'),group('C6','C6','C6','C6','C6')];
 const keys=k=>readTable(game).risks.get(k).preview.targets.map(t=>t.key);
 assert.deepEqual(keys('F'),['run2-10','run2-14','run2-15']);
 assert.deepEqual(keys('C3'),['run2-10']);
 assert.match(readTable(game).risks.get('C3').reason,/Mahjong.*single/);
 discard('B4','B4','B4','B4');
 assert.deepEqual(keys('F'),['run2-10','run2-15']);
 // A general warning that fits several lines must not appear to identify one.
 game.exposed[3]=[group('H','H','H','H'),group('C2','C2','C2','C2','C2')];
 game.hands[0]=tiles('D2');
 const general=readTable(game).risks.get('D2');
 assert.match(general.reason,/set that fits the exposures/);
 assert.equal(general.preview,undefined);
});
