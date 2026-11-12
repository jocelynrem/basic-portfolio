import {sortHand} from './engine.mjs?v=wind-sort-1';
export function displayDiscards(discards,order='time'){
 const rows=discards.map((discard,index)=>({discard,index}));
 if(order==='suit'){
  const tiles=discards.map(d=>d.tile);sortHand(tiles);const ranks=new Map(tiles.map((t,i)=>[t.id,i]));rows.sort((a,b)=>ranks.get(a.discard.tile.id)-ranks.get(b.discard.tile.id));
 }
 return rows;
}
export function handSignals(plan,hand){
 const needed=new Set(),usableJokers=new Set(),winningJokers=new Set();
 if(!plan?.compatible)return {needed,usableJokers,winningJokers};
 let jokerSlots=0,allMissing=0;
 for(const group of plan.groups){const missing=group.tiles.filter(t=>!t).length;if(missing)needed.add(group.k);allMissing+=missing;if(!group.exposed&&group.n>=3)jokerSlots+=missing;}
 const free=hand.filter(t=>t.k==='J'&&!plan.ids.includes(t.id));
 if(jokerSlots)free.forEach(t=>usableJokers.add(t.id));
 if(allMissing>0&&allMissing===jokerSlots&&free.length>=allMissing)free.forEach(t=>winningJokers.add(t.id));
 return {needed,usableJokers,winningJokers};
}
export function exposureChoice(options,ids,hand,discardKey){
 const picked=[...ids].map(id=>hand.find(t=>t.id===id));
 if(picked.some(t=>!t||(t.k!==discardKey&&t.k!=='J')))return null;
 return options.find(o=>!o.win&&o.n===picked.length+1)||null;
}
