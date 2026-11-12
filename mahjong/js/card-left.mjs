const repeat = (digit, count) => String(digit).repeat(count);
const numbers = Array.from({length:9}, (_,i)=>i+1);
const evenNumbers = [2,4,6,8];
const row = (section,id,points,patterns,concealed=false) =>
  ({section,id,points,concealed,patterns});

export default [
  row('2026','year1',25,[
    'a222 HHH b2222 b6666'
  ]),
  row('2026','year2',25,[
    'a2026 aDDD b2222 bDDD',
    'a2026 aDDD b6666 bDDD'
  ]),
  row('2026','year3',25,[
    'FFF a2026 b222 c6666'
  ]),
  row('2026','year4',30,[
    'a22 HH b222 b666 NEWS'
  ]),

  row('2468','even1',25,[
    'a222 a444 a6666 a8888',
    'a222 a444 b6666 b8888'
  ]),
  row('2468','even2',30,[
    'FF a2222 b44 b66 a8888'
  ]),
  row('2468','even3',30,[
    'EE a22 a444 a666 a88 WW'
  ]),
  row('2468','even4',25,[
    'a2222 aDDD b8888 bDDD'
  ]),
  row('2468','even5',25,[
    'FFF a22 a44 a666 a8888'
  ]),
  row('2468','even6',25,
    evenNumbers.map(n=>`a2468 b${repeat(n,4)} bD c${repeat(n,4)} cD`)
  ),
  row('2468','even7',30,
    evenNumbers.map(n=>`FFF a2468 FFF b${repeat(n,4)}`)
  ),
  row('2468','even8',30,[
    'FF a246 a888 b246 b888'
  ],true),

  row('Any Like Numbers','like1',30,
    numbers.map(n=>`a${repeat(n,4)} FFFFFF b${repeat(n,4)}`)
  ),
  row('Any Like Numbers','like2',25,
    numbers.map(n=>`a${repeat(n,4)} aD b${repeat(n,3)} bD c${repeat(n,4)} cD`)
  ),
  row('Any Like Numbers','like3',25,
    numbers.flatMap(n=>['GG','RR','HH'].map(dragon=>`FF a${repeat(n,4)} b${repeat(n,2)} c${repeat(n,4)} ${dragon}`))
  )
];
