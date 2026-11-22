import assert from 'node:assert/strict';
import test from 'node:test';
import {TARGETS,visibleTileCounts} from '../js/engine.mjs';
import {assessHand} from '../js/recommendations.mjs';
import {naturalTradeoff,naturalWaitDetails} from '../js/natural-outlook.mjs';

function table(){
 let id=0;
 const tiles=keys=>keys.split(' ').map(k=>({k,id:id++}));
 const hand=tiles('F B2 B4 B4 B4 B5 B6 B7 B8 B8 E E W B6');
 const discards=tiles('B2 W E D3 C3').map(tile=>({tile,claimed:false}));
 const exposed=[[],[{k:'D6',tiles:tiles('D6 J D6')}],
  [{k:'D4',tiles:tiles('J D4 D4')},{k:'C8',tiles:tiles('C8 C8 J C8')}],
  [{k:'C1',tiles:tiles('C1 C1 C1')}]];
 discards.push({tile:exposed[2][0].tiles[1],claimed:true});
 const game={hands:[hand],discards,exposed,wall:Array(63)};
 const row=key=>assessHand(hand,[],TARGETS.find(t=>t.key===key),visibleTileCounts(game));
 const advice=(reverse=false)=>{
  const rows=[row('even3-0'),row('run2-27')];
  return naturalTradeoff(game,...(reverse?rows.reverse():rows));
 };
 return {game,tiles,row,advice};
}

test('the closer 2468 line has two live pair waits while the farther run has every single',()=>{
 const {advice,row}=table();
 assert.equal(row('even3-0').away,3);
 assert.equal(row('run2-27').away,5);
 for(const reverse of [false,true]){
  const tip=advice(reverse);
  assert.equal(tip.preferred.target.id,'even3');
  assert.match(tip.reason,/2468 · Line 3 is closer.*2 Bam and West for its pairs/);
  assert.match(tip.reason,/Consecutive Run · Line 2 has its singles in place/);
  assert.match(tip.details[0],/2 Bam · pair · 1 needed · 1 in discards · 0 exposed · 2 unseen/);
  assert.match(tip.details[1],/West · pair · 1 needed · 1 in discards · 0 exposed · 2 unseen/);
  // 14 rack + 13 exposed + 5 unclaimed discards = 32 public/owned tiles.
  assert.match(tip.details[2],/about 3%.*4 helpful copies among 120 unseen tiles.*equally likely/);
 }
});

test('an exposed natural counts once and its jokers do not use up other copies',()=>{
 const {game,tiles,advice}=table();
 const west=tiles('W W J');
 game.discards=game.discards.filter(d=>d.tile.k!=='W');
 game.discards.push({tile:west[0],claimed:true});
 game.exposed[1].push({k:'W',tiles:west});
 const tight=advice();
 assert.equal(tight.preferred,null);
 assert.match(tight.reason,/Only one West is unseen/);
 assert.match(tight.details.join(' '),/West · pair · 1 needed · 0 in discards · 2 exposed · 1 unseen/);
 game.discards.push({tile:tiles('W')[0],claimed:false});
 const blocked=advice();
 assert.equal(blocked.preferred.target.id,'run2');
 assert.match(blocked.reason,/more natural copies of West than remain unseen/);
 assert.doesNotMatch(blocked.details.join(' '),/Next wall draw/);
});

test('a discarded 8 Bam forces a joker into the backup kong, then the last West closes 2468',()=>{
 const {game,tiles,row,advice}=table();
 game.discards.push({tile:tiles('B8')[0],claimed:false},{tile:tiles('W')[0],claimed:false});
 const tip=advice();
 assert.equal(tip.preferred.target.id,'even3');
 assert.match(tip.reason,/Only one West is unseen/);
 assert.match(tip.reason,/8 Bam kong needs a joker/);
 assert.match(tip.details.join(' '),/8 Bam · 4 required.*2 on rack · 1 unseen/);
 const earlier=row('even3-0');
 game.discards.push({tile:tiles('W')[0],claimed:false});
 for(const pair of [[earlier,row('run2-27')],[row('run2-27'),earlier]]){
  const blocked=naturalTradeoff(game,...pair);
  assert.equal(blocked.title,'Playable line');
  assert.equal(blocked.preferred.target.id,'run2');
  assert.match(blocked.reason,/more natural copies of West than remain unseen.*Consecutive Run · Line 2 is still open/);
  assert.match(blocked.reason,/8 Bam kong needs a joker/);
  assert.doesNotMatch(blocked.details.join(' '),/Next wall draw/);
 }
 // The other live line may have natural gaps of its own.
 const other=row('even2-0');
 assert.ok(other.naturalsNeeded>0&&!other.blocked);
 assert.equal(naturalTradeoff(game,earlier,other).preferred,other);
});

test('a shorter wall favors the shorter live route and an empty wall has no draw estimate',()=>{
 const {game,tiles,advice}=table();
 game.discards.push({tile:tiles('W')[0],claimed:false});
 assert.equal(advice().preferred,null);
 game.wall.length=12;
 assert.equal(advice().preferred.target.id,'even3');
 game.wall.length=0;
 assert.doesNotMatch(advice().details.join(' '),/Next wall draw/);
});

test('coaching depends only on public tile identities and counts',()=>{
 const {game,advice}=table();
 const before=advice();
 game.hands.push([{k:'W'},{k:'B2'}],[],[]);
 game.wall.fill({k:'C2'});
 assert.deepEqual(advice(),before);
});

test('a single line can explain its natural waits without a competing line',()=>{
 const {game,row}=table();
 assert.match(naturalWaitDetails(game,row('even3-0')).join(' '),/Next wall draw.*helpful copies/);
 assert.deepEqual(naturalWaitDetails(game,row('run2-27')),[]);
});
