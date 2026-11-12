const row=(section,id,points,concealed,patterns)=>({section,id,points,concealed,patterns});
const repeat=(n,count)=>String(n).repeat(count);
const odd=[1,3,5,7,9],even=[2,4,6,8],all=[1,2,3,4,5,6,7,8,9];

export default [
 row('Winds - Dragons','wind1',25,false,
   ['NNNN EEE WWW SSSS','NNN EEEE WWWW SSS']),
 row('Winds - Dragons','wind2',25,false,
   Array.from({length:6},(_,i)=>{
     const run=[i+1,i+2,i+3,i+4].join('');
     return [`a${run} RRR GGG HHHH`,`a${run} RRR HHH GGGG`,`a${run} GGG HHH RRRR`];
   }).flat()),
 row('Winds - Dragons','wind3',25,false,
   odd.map(n=>`NNN a${repeat(n,4)} b${repeat(n,4)} SSS`)),
 row('Winds - Dragons','wind4',25,false,
   even.map(n=>`EEE a${repeat(n,4)} b${repeat(n,4)} WWW`)),
 row('Winds - Dragons','wind5',25,false,
   ['N','E','W','S'].flatMap(w=>['R','G','H'].map(d=>`FFF ${w.repeat(4)} FFF ${d.repeat(4)}`))),
 row('Winds - Dragons','wind6',25,false,
   ['a1 N a2 EE a3 WWW a4 SSSS']),
 row('Winds - Dragons','wind7',25,false,
   ['FF NNNN SSSS aDD bDD','FF EEEE WWWW aDD bDD']),
 row('Winds - Dragons','wind8',30,true,
   ['NN EEE a2026 WWW SS']),

 row('369','nine1',25,false,
   ['a333 a666 b6666 b9999','a333 a666 b6666 c9999']),
 row('369','nine2',25,false,
   ['a33 a66 b333 b666 c9999']),
 row('369','nine3',25,false,
   ['FFF a33 a666 a99 aDDDD','FFF a33 a666 a99 bDDDD']),
 row('369','nine4',30,false,
   ['a33 a66 b666 b999 NEWS']),
 row('369','nine5',25,false,
   ['FF a3369 b3333 c3333','FF a3669 b6666 c6666','FF a3699 b9999 c9999']),
 row('369','nine6',30,true,
   ['FF a333 a666 a999 b369']),

 row('Singles and Pairs','pair1',50,true,
   all.map(n=>`NN EE WW SS a${n} aD b${n} bD c${n} cD`)),
 row('Singles and Pairs','pair2',50,true,
   ['a2 a4 a66 a88 b2 b4 b66 b88 c88']),
 row('Singles and Pairs','pair3',50,true,
   ['FF a3369 b3669 c3699']),
 row('Singles and Pairs','pair4',50,true,
   Array.from({length:3},(_,i)=>Array.from({length:7},(_,j)=>`a${repeat(i+j+1,2)}`).join(' '))),
 row('Singles and Pairs','pair5',50,true,
   ['a11 a357 a99 b11 b357 b99']),
 row('Singles and Pairs','pair6',75,true,
   ['FF a2026 b2026 c2026'])
];
