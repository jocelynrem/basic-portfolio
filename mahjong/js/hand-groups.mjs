// Group tile slots for hand displays without changing their indexes.
export function targetBlocks(target){
 let index=0;
 const blocks=target.pattern.split(/\s+/).map(token=>{
  const runs=token.replace(/^[abc]/,'').match(/(.)\1*/g);
  return runs.map(symbols=>({index:index++,symbols}));
 });
 if(target.id==='pair1'){
  const numberAndDragon=[4,6,8].map(i=>[...blocks[i],...blocks[i+1]]);
  blocks.splice(4,6,...numberAndDragon);
 }
 if(target.id==='odd4'){
  const oddTiles=[...blocks[0],...blocks[1]].sort((a,b)=>Number(a.symbols[0])-Number(b.symbols[0]));
  blocks.splice(0,2,oddTiles);
 }
 if(target.id==='wind2'&&blocks[2][0].symbols==='GGG'){
  // Keep green before red when both are pungs.
  [blocks[1],blocks[2]]=[blocks[2],blocks[1]];
 }
 return blocks;
}
export function patternBlocks(target){
 return targetBlocks(target).map(block=>block.map(part=>part.index));
}
