import {CARD,TARGETS,deck,shuffle,sortHand} from './engine.mjs?v=hand-outlook-1';
import {matchHandTiles} from './hand-match.mjs?v=wind-sort-1';
import {recommendHands} from './recommendations.mjs?v=hand-outlook-1';

// Start with a recognizable core. Later racks mix in more unrelated tiles
// and the answer choices get closer together.
const levels=[
 {core:11,gaps:[4]},
 {core:11,gaps:[3]},
 {core:11,gaps:[2]},
 {core:10,gaps:[3,2]},
 {core:10,gaps:[2,2]},
 {core:9,gaps:[2,1]},
 {core:9,gaps:[1,1]},
 {core:8,gaps:[2,1,1]},
 {core:8,gaps:[1,1,1]},
 {core:8,gaps:[1,1,0]}
];
export const TOTAL_ROUNDS=levels.length;

const variations=new Map(CARD.map(line=>[line.id,TARGETS.filter(target=>target.id===line.id)]));
const starterLines=CARD.filter(line=>!line.concealed&&line.section!=='Quints');
const pick=items=>items[Math.floor(Math.random()*items.length)];
const signature=rack=>rack.map(tile=>tile.k).sort().join(',');

function partialRack(line,core){
 const target=pick(variations.get(line.id));
 const pool=deck(),pattern=[];
 const keys=new Set(target.groups.map(([key])=>key));
 for(const [key,count] of target.groups){
  for(let slot=0;slot<count;slot++){
   let index=pool.findIndex(tile=>tile.k===key);
   // A quint requires a physical joker once all four naturals are used.
   if(index<0)index=pool.findIndex(tile=>tile.k==='J');
   pattern.push(pool.splice(index,1)[0]);
  }
 }
 const rack=shuffle(pattern).slice(0,core);
 const extras=pool.filter(tile=>!keys.has(tile.k));
 rack.push(...extras.slice(0,13-core));
 sortHand(rack);
 return rack;
}

function challengeChoices(ranked,best,gaps){
 const choices=[best],remaining=shuffle(ranked.filter(row=>row!==best));
 for(const gap of gaps){
  // Allow equal fits in the final round; always include a meaningful alternative.
  const eligible=remaining.filter(row=>!gap||row.away>best.away);
  const wanted=best.away+gap;
  const nearest=eligible.reduce((a,b)=>Math.abs(a.away-wanted)<=Math.abs(b.away-wanted)?a:b);
  choices.push(nearest);
  remaining.splice(remaining.indexOf(nearest),1);
 }
 return choices;
}

export function dealSprintRound(index,previousRounds=[]){
 if(!Number.isInteger(index)||index<0||index>=TOTAL_ROUNDS)throw new RangeError('Unknown Line Sprint round');
 const level=levels[index];
 const previousRacks=new Set(previousRounds.map(round=>signature(round.rack)));
 const previousBest=new Set(previousRounds.flatMap(round=>round.choices
  .filter(choice=>choice.away===round.bestAway).map(choice=>choice.target.id)));
 const lines=shuffle((level.gaps.length===1?starterLines:CARD).filter(line=>!previousBest.has(line.id)));
 let candidate;
 for(const [attempt,line] of lines.entries()){
  if(candidate&&attempt>=4)break;
  const rack=partialRack(line,level.core);
  if(previousRacks.has(signature(rack)))continue;
  const ranked=recommendHands(rack,[]);
  const bestAway=ranked[0].away;
  // Even accidental fits for an entirely different card line must be partial.
  if(bestAway<2)continue;
  const tied=ranked.filter(row=>row.away===bestAway);
  const fresh=tied.filter(row=>!previousBest.has(row.target.id));
  const best=pick(fresh.length?fresh:tied);
  const choices=challengeChoices(ranked,best,level.gaps);
  const difficultyError=choices.slice(1).reduce((error,choice,i)=>
   error+Math.abs(choice.away-bestAway-level.gaps[i]),0);
  const penalty=difficultyError+(fresh.length?0:2);
  if(!candidate||penalty<candidate.penalty)candidate={rack,choices,bestAway,penalty};
  if(!penalty)break;
 }
 if(!candidate)throw new Error('Could not deal a new partial rack');
 const {rack,bestAway}=candidate;
 const choices=shuffle(candidate.choices).map(({target,away})=>{
  const {groups,ids}=matchHandTiles(rack,[],target);
  return {target,away,groups,matchedIds:ids};
 });
 return {rack,choices,bestAway};
}

export function scorePick(round,choiceIndex){
 const choice=Number.isInteger(choiceIndex)?round.choices[choiceIndex]:null;
 return choice?Math.max(0,100-25*(choice.away-round.bestAway)):0;
}
