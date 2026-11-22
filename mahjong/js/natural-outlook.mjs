import {compatible,tileName,unseenCopies,visibleTileCounts} from './engine.mjs?v=win-source-1';

const list=new Intl.ListFormat('en',{style:'long',type:'conjunction'});

function groupsLabel(pairs,singles){
 if(pairs&&singles)return 'singles and pairs';
 return pairs?'pairs':'singles';
}

function missingNaturals(gaps,groupLabel){
 if(gaps.length>3)return 'natural tiles for its '+groupLabel;
 if(gaps.length>1&&gaps.every(g=>g.need===1))return list.format(gaps.map(g=>tileName(g.key)))+' for its '+groupLabel;
 return list.format(gaps.map(g=>{
  const name=tileName(g.key);
  if(g.pair&&g.required===2)return g.need===1?'a natural '+name+' for its pair':'two natural '+name+'s for its pair';
  return g.need===1?'a natural '+name:g.need+' natural copies of '+name;
 }));
}

function jokerSupply(game,visible){
 // Even if every exposed joker could be redeemed, a line needing more
 // additional jokers than this upper bound cannot be finished.
 const exposed=game.exposed.flatMap(groups=>groups.flatMap(group=>group.tiles));
 return unseenCopies(visible,'J')+exposed.filter(t=>t.k==='J').length;
}

function jokerShortage(game,row,visible){
 if(!row.jokerDebt)return null;
 const groups=compatible(row.target,game.exposed[0]);
 const sizes={3:'pung',4:'kong',5:'quint',6:'sextet'};
 const total='At least '+row.jokerDebt+' more '+(row.jokerDebt===1?'joker is':'jokers are')+' needed across the line.';
 for(const [key,n] of groups){
  if(n<3)continue;
  const same=groups.filter(([k])=>k===key);
  // When several sets use the same tile, the joker could fill any of them.
  if(same.filter(([,size])=>size>=3).length!==1)continue;
  const required=same.reduce((sum,[,size])=>sum+size,0);
  const held=game.hands[0].filter(t=>t.k===key).length;
  const unseen=unseenCopies(visible,key),short=required-held-unseen;
  if(short>0){
   const label=tileName(key)+' '+sizes[n];
   return {note:'Its '+label+' needs '+(short===1?'a joker':short+' jokers')+'.',
    detail:row.target.name+' · '+tileName(key)+' · '+required+' required across the line’s remaining groups · '+held+' on rack · '+unseen+' unseen. '+total};
  }
 }
 return {note:'',detail:row.target.name+' · '+total};
}

export function naturalWaitDetails(game,row,visible=visibleTileCounts(game)){
 if(!row?.gaps.length||row.incompatible)return [];
 const pool=game.discards.filter(d=>!d.claimed);
 const exposures=game.exposed.flatMap(groups=>groups.flatMap(g=>g.tiles));
 const gaps=row.gaps.map(g=>({...g,unseen:unseenCopies(visible,g.key)}));
 const details=gaps.map(g=>{
  const discarded=pool.filter(d=>d.tile.k===g.key).length;
  const exposed=exposures.filter(t=>t.k===g.key).length;
  return tileName(g.key)+' · '+(g.pair?'pair':'single')+' · '+g.need+' needed · '+discarded+' in discards · '+exposed+' exposed · '+g.unseen+' unseen.';
 });
 if(game.wall.length&&gaps.every(g=>g.need<=g.unseen)&&row.jokerDebt<=jokerSupply(game,visible)){
  // A complete American set contains 152 physical tiles. Public visibility
  // already deduplicates claimed tiles and includes our own rack.
  const unknown=152-Object.values(visible).reduce((sum,n)=>sum+n,0);
  const helpful=gaps.reduce((sum,g)=>sum+g.unseen,0);
  if(unknown>0&&helpful<=unknown){
   const percent=Math.round(100*helpful/unknown);
   details.push('Next wall draw · about '+percent+'% to advance a single or pair for '+row.target.name+' ('+helpful+' helpful copies among '+unknown+' unseen tiles, assuming each hidden position is equally likely).');
  }
 }
 return details;
}

// Compare two concrete variations, independent of which one the player pinned.
// A natural single or pair needs its actual tile, even when plentiful jokers
// could cover the remaining sets on the competing line.
export function naturalTradeoff(game,focus,other){
 if(!focus||!other||focus.incompatible||other.incompatible||!focus.away||!other.away)return null;
 const visible=visibleTileCounts(game),jokers=jokerSupply(game,visible);
 // A public discard can close either line regardless of its former distance.
 const blockedGap=row=>row.gaps.find(g=>g.need>unseenCopies(visible,g.key));
 const focusBlocked=blockedGap(focus),otherBlocked=blockedGap(other);
 if(focusBlocked||otherBlocked){
  if(focusBlocked&&otherBlocked)return null;
  const dead=focusBlocked?focus:other,preferred=focusBlocked?other:focus;
  if(preferred.jokerDebt>jokers)return null;
  const gap=focusBlocked??otherBlocked;
  const shortage=jokerShortage(game,preferred,visible);
  const reason=dead.target.name+' needs more natural copies of '+tileName(gap.key)+' than remain unseen. '+preferred.target.name+' is still open.';
  const details=naturalWaitDetails(game,dead,visible);
  if(shortage)details.push(shortage.detail);
  return {kind:'pivot',title:'Playable line',leader:preferred.target.name,preferred,
   reason:reason+(shortage?.note?' '+shortage.note:''),details};
 }
 const waiting=focus.naturalsNeeded?focus:other;
 const flexible=waiting===focus?other:focus;
 if(!waiting.gaps.length||flexible.naturalsNeeded||flexible.blocked||waiting.away>flexible.away)return null;

 if(flexible.jokerDebt>jokers)return null;
 const gaps=waiting.gaps.map(g=>({...g,unseen:unseenCopies(visible,g.key)}));
 const tight=gaps.find(g=>g.need===g.unseen);
 const distance=flexible.away-waiting.away;
 const a=waiting.target.name,b=flexible.target.name;
 const unfinished=groupsLabel(gaps.some(g=>g.pair),gaps.some(g=>!g.pair));
 const sizes=flexible.target.groups.map(([,n])=>n);
 const complete=groupsLabel(sizes.includes(2),sizes.includes(1));
 const ready=sizes.some(n=>n<=2)?b+' has its '+complete+' in place.':b+' can use a joker in every remaining set.';
 const gapTiles=missingNaturals(gaps,unfinished);
 // A short wall gives the farther line fewer turns to recover the distance.
 // Calls can change turn order, so use this only as a tiebreaker.
 const seats=game.deadHand?3:4;
 const shortWall=distance>0&&Math.ceil(game.wall.length/seats)<flexible.away;
 const scarcity=tight?(tight.unseen===1?'Only one '+tileName(tight.key)+' is unseen.':'You need every unseen '+tileName(tight.key)+'.'):'';
 let preferred=waiting,reason;
 if(waiting.jokerDebt>jokers){
  preferred=flexible;
  reason=a+' needs more jokers than you can still collect. '+ready;
 }else{
  // At one away, a discard can complete even the last single or pair.
  // Otherwise a clean line is attractive at equal distance, or a small
  // distance penalty if the closer line needs every unseen copy of a tile.
  if(flexible.jokerDebt<=waiting.jokerDebt){
   if(!distance||(distance===1&&tight&&!shortWall&&waiting.away>1))preferred=flexible;
   else if(distance===2&&tight&&!shortWall&&waiting.away>1)preferred=null;
  }
  const comparison=distance?' is closer':' is just as close';
  const need=shortWall&&preferred===waiting?'With the wall short, I’d favor '+a+'. You still need '+gapTiles+'.':
   a+comparison+' and needs '+gapTiles+'.';
  const outlook=tight?scarcity:waiting.away===1?'You can call that tile for Mahjong.':'';
  if(!distance&&preferred===flexible&&!flexible.jokerDebt&&sizes.some(n=>n<=2)){
   const sameSection=waiting.target.section===flexible.target.section;
   const completeLine=sameSection?'Line '+flexible.target.line:b;
   const waitingLine=sameSection?'Line '+waiting.target.line:a;
   reason='Both lines are equally close. '+completeLine+'’s '+complete+' are complete. '+waitingLine+' still needs '+gapTiles+'.';
   if(outlook)reason+=' '+outlook;
  }else reason=[need,outlook,ready].filter(Boolean).join(' ');
 }
 const details=naturalWaitDetails(game,waiting,visible);
 const shortage=jokerShortage(game,flexible,visible);
 if(shortage){
  if(shortage.note)reason+=' '+shortage.note;
  details.push(shortage.detail);
 }
 return {kind:preferred?'edge':'even',title:preferred?'Lean toward':'Close call',reason,
  leader:preferred?.target.name,preferred,details};
}
