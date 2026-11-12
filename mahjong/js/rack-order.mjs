// Keep surviving tiles in the player's order; new tiles go on the right.
export function retainRackOrder(hand,order){
 if(!Array.isArray(order))return null;
 const positions=new Map(order.map((id,i)=>[id,i]));
 hand.sort((a,b)=>(positions.get(a.id)??Infinity)-(positions.get(b.id)??Infinity));
 return hand.map(t=>t.id);
}

// insertion is a gap in the original rack, from 0 through hand.length.
export function moveRackTile(hand,id,insertion){
 const from=hand.findIndex(t=>t.id===id);
 if(from<0||!Number.isInteger(insertion))return false;
 let to=Math.max(0,Math.min(hand.length,insertion));
 if(to>from)to--;
 if(to===from)return false;
 const [tile]=hand.splice(from,1);hand.splice(to,0,tile);return true;
}
