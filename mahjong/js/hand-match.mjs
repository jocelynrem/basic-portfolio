import {compatible} from './engine.mjs?v=wind-sort-1';

// Each physical tile fills one slot. Passing placements opts into player-controlled
// jokers; omitted placements retain the engine's automatic evaluation for checks.
export function matchHandTiles(hand,exposed,target,placements){
 const groups=target.groups.map(([k,n],index)=>({k,n,index,tiles:Array(n).fill(null),exposed:false}));
 if(!compatible(target,exposed))return {compatible:false,groups,ids:[],exposedIds:[],matched:0,missing:14};
 const exposedIds=[];
 for(const exposure of exposed){
  const group=groups.find(g=>!g.exposed&&g.k===exposure.k&&g.n===exposure.tiles.length);
  group.exposed=true;group.tiles=[...exposure.tiles];exposedIds.push(...exposure.tiles.map(t=>t.id));
 }
 const available=[...hand],ids=[],open=groups.filter(g=>!g.exposed).sort((a,b)=>a.n-b.n);
 for(const group of open)for(let i=0;i<group.n;i++){
  const at=available.findIndex(t=>t.k===group.k);
  if(at>=0){const tile=available.splice(at,1)[0];group.tiles[i]=tile;ids.push(tile.id);}
 }
 for(const group of open.filter(g=>g.n>=3))for(let i=0;i<group.n;i++){
  if(group.tiles[i])continue;
  const at=available.findIndex(t=>t.k==='J'&&(placements===undefined||placements?.[t.id]===group.index));
  if(at>=0){const tile=available.splice(at,1)[0];group.tiles[i]=tile;ids.push(tile.id);}
 }
 const matched=ids.length+exposedIds.length;
 return {compatible:true,groups,ids,exposedIds,matched,missing:14-matched};
}
