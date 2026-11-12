import left from './card-left.mjs';
import middle from './card-middle.mjs';
import right from './card-right.mjs';
export const CARD=[...left,...middle,...right].map(row=>{
 const line=Number(row.id.match(/\d+$/)[0]);
 return {...row,line,name:`${row.section} · Line ${line}`};
});
const mappings=[['B','C','D'],['B','D','C'],['C','B','D'],['C','D','B'],['D','B','C'],['D','C','B']];
const dragons={B:'G',C:'R',D:'H'};
const oneOrTwoSuits=['One suit','Two suits'];
const oneOrThreeSuits=['One suit','Three suits'];
const oddRanges=['Uses 1, 3, 5','Uses 5, 7, 9'];
const variantLabels={
 year2:['Four 2s','Four 6s'],
 even1:oneOrTwoSuits,
 run1:['Numbers 1–5','Numbers 5–9'],
 run2:oneOrTwoSuits,
 run4:oneOrTwoSuits,
 run5:oneOrTwoSuits,
 run7:oneOrThreeSuits,
 odd1:oneOrThreeSuits,
 odd2:oddRanges,
 odd3:oddRanges,
 odd5:oddRanges,
 odd6:oddRanges,
 odd7:oneOrTwoSuits,
 odd8:oddRanges,
 wind1:['Four Norths and four Souths','Four Easts and four Wests'],
 wind7:['North and South','East and West'],
 nine1:['Two suits','Three suits'],
 nine3:['Matching dragon','Different-suit dragon']
};
export function parsePattern(pattern,mapping=['B','C','D']){
 const out=[];
 for(let token of pattern.split(/\s+/)){
  let suit=null;
  if(/^[abc]/.test(token)){suit=mapping['abc'.indexOf(token[0])];token=token.slice(1);}
  for(const run of token.match(/(.)\1*/g)||[]){
   const c=run[0],k=c==='0'?'H':c==='D'?dragons[suit]:/[1-9]/.test(c)?suit+c:c;
   if(!k||(!/^[BCD][1-9]$/.test(k)&&!['F','E','S','W','N','G','R','H'].includes(k)))throw Error('Invalid card token '+token);
   out.push([k,run.length]);
  }
 }
 return out;
}
export const TARGETS=CARD.flatMap(row=>{
 const seen=new Set(),targets=[];
 for(const [index,pattern] of row.patterns.entries())for(const mapping of mappings){
  const groups=parsePattern(pattern,mapping),signature=groups.map(([k,n])=>k+':'+n).sort().join('|');
  if(groups.reduce((a,g)=>a+g[1],0)!==14)throw Error('Card hand must have 14 tiles: '+row.id);
  if(!seen.has(signature)){
   seen.add(signature);
   // Run templates interleave alternatives at each starting number.
   const variant=variantLabels[row.id]?.[index%2]??'';
   targets.push({...row,groups,pattern,variant,key:row.id+'-'+targets.length});
  }
 }
 return targets;
});
