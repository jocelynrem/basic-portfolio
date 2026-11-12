import {matchHandTiles} from './hand-match.mjs?v=wind-sort-1';

// Return a new plan only after the player explicitly picks a group and joker.
export function placeJoker(hand,exposed,target,placements,jokerId,groupIndex){
 if(!hand.some(t=>t.id===jokerId&&t.k==='J'))return null;
 const next={...placements};delete next[jokerId];
 const plan=matchHandTiles(hand,exposed,target,next),group=plan.groups[groupIndex];
 if(!plan.compatible||!group||group.exposed||group.n<3||!group.tiles.includes(null))return null;
 next[jokerId]=groupIndex;
 return next;
}
