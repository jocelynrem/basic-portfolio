const repeat=(n,count)=>String(n).repeat(count);
const runs=(templates,width)=>Array.from({length:10-width},(_,offset)=>templates.map(p=>p.replace(/[1-9]/g,n=>String(Number(n)+offset)))).flat();
const row=(section,id,points,concealed,patterns)=>({section,id,points,concealed,patterns});

export default [
 row('Quints','quint1',40,false,Array.from({length:9},(_,i)=>{const n=i+1;return `a${repeat(n,5)} b${repeat(n,4)} c${repeat(n,5)}`;})),
 row('Quints','quint2',45,false,runs(['FF a11111 a22 a33333'],3)),
 row('Quints','quint3',40,false,Array.from({length:9},(_,i)=>Array.from({length:9},(_,j)=>i===j?[]:[`a${repeat(i+1,5)} a${repeat(j+1,5)} bDDDD`])).flat(2)),

 row('Consecutive Run','run1',25,false,['a11 a222 a33 a444 a5555','a55 a666 a77 a888 a9999']),
 row('Consecutive Run','run2',25,false,runs(['FFF a1111 a234 a5555','FFF a1111 b234 a5555'],5)),
 row('Consecutive Run','run3',25,false,runs(['a11 a22 b111 b222 c3333'],3)),
 row('Consecutive Run','run4',25,false,runs(['a111 a222 a3333 a4444','a111 a222 b3333 b4444'],4)),
 row('Consecutive Run','run5',25,false,runs(['FFF a11 a22 a333 aDDDD','FFF a11 b22 a333 bDDDD'],3)),
 row('Consecutive Run','run6',30,false,runs(['a1111 FFFFFF a2222'],2)),
 row('Consecutive Run','run7',25,false,runs(['FF a1111 a2222 a3333','FF a1111 b2222 c3333'],3)),
 row('Consecutive Run','run8',35,true,runs(['a1 a22 a333 b1 b22 b333 c44'],4)),

 row('13579','odd1',25,false,['a11 a333 a55 a777 a9999','a11 a333 b55 b777 c9999']),
 row('13579','odd2',25,false,['a111 a333 b3333 b5555','a555 a777 b7777 b9999']),
 row('13579','odd3',30,false,['NN a1111 a33 a5555 SS','NN a5555 a77 a9999 SS']),
 row('13579','odd4',25,false,[1,3,5,7,9].map(n=>`a${repeat(n,2)} a${[1,3,5,7,9].filter(x=>x!==n).join('')} b${repeat(n,4)} c${repeat(n,4)}`)),
 row('13579','odd5',25,false,['FFF a11 a33 a555 aDDDD','FFF a55 a77 a999 aDDDD']),
 row('13579','odd6',25,false,['a11 a33 b111 b333 c5555','a55 a77 b555 b777 c9999']),
 row('13579','odd7',30,false,['a1111 a33 a55 a77 a9999','a1111 b33 b55 b77 a9999']),
 row('13579','odd8',35,true,['FF a11 a33 a55 b111 c111','FF a55 a77 a99 b555 c555']),
 row('13579','odd9',30,true,['FF a135 a777 a999 bDDD'])
];
