// Joker star from Google Material Symbols Rounded. See assets/Material-Symbols-LICENSE.txt.
const starPath="M480-269 314-169q-11 7-23 6t-21-8q-9-7-14-17.5t-2-23.5l44-189-147-127q-10-9-12.5-20.5T140-571q4-11 12-18t22-9l194-17 75-178q5-12 15.5-18t21.5-6q11 0 21.5 6t15.5 18l75 178 194 17q14 2 22 9t12 18q4 11 1.5 22.5T809-528L662-401l44 189q3 13-2 23.5T690-171q-9 7-21 8t-23-6L480-269Z";
const suits={B:'bam',C:'crak',D:'dot'};
const faceViewBox='0 0 60 77';
const dotPips=[
 [6,6],[22,6],[38,6],[54,6],
 [6,22],[54,22],[6,38.5],[54,38.5],[6,55],[54,55],
 [6,71],[22,71],[38,71],[54,71]
];
const suitFrames={
 bam:`<rect x="5.5" y="5.5" width="49" height="66" rx="3" fill="none" stroke="currentColor" stroke-width="2.6"/><path d="M3 27h5m-5 23h5M52 27h5m-5 23h5M21 3v5m18-5v5M21 69v5m18-5v5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>`,
 crak:`<path d="M5.5 26V11.5h6v-6H25M35 5.5h13.5v6h6V26M5.5 51v14.5h6v6H25M35 71.5h13.5v-6h6V51" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linejoin="round" stroke-linecap="round"/>`,
 dot:dotPips.map(([x,y])=>`<circle cx="${x}" cy="${y}" r="2.45"/>`).join('')
};

const windMarkers={
 N:'M30 4l-3 4h6Z',
 E:'M55 7l-4-3v6Z',
 W:'M5 7l4 3v-6Z',
 S:'M30 73l3-4h-6Z'
};
const tealInk='var(--parlor-link, #285763)';
const markerInk='var(--pacific-cyan, #62929e)';
const paper='var(--white, #fdfdff)';

function star(x,y,size,ink){
 return `<path d="${starPath}" transform="translate(${x-size/2} ${y+size/2}) scale(${size/960})" fill="${ink}"/>`;
}
function lettering(text,x,y,size,ink){
 return `<text x="${x}" y="${y}" text-anchor="middle" font-size="${size}" fill="${ink}">${text}</text>`;
}
function centeredLabel(text,ink){
 return lettering(text,30,55,45,ink);
}
function mobileFace(k,p,suit){
 if(suit){
  const ink=p[suit];
  return `<g data-mark="${suit}" color="${ink}" fill="currentColor">
   <svg width="100%" height="100%" viewBox="${faceViewBox}">${centeredLabel(k[1],'currentColor')}</svg>
   <svg width="100%" height="100%" viewBox="${faceViewBox}" preserveAspectRatio="none">${suitFrames[suit]}</svg>
  </g>`;
 }
 if(k==='H'){
  return `<g data-dragon="H" fill="none" stroke="${p.dot}" stroke-linejoin="round">
   <path d="M18 15h24l5 5v35l-5 5H18l-5-5V20Z" stroke-width="3.2"/>
   <path d="M22 21h16l3 3v27l-3 3H22l-3-3V24Z" stroke-width="1.6"/>
  </g>`;
 }
 if(k==='J'){
  return `<g data-joker="true">${star(30,32,49,tealInk)}<rect x="8" y="53" width="44" height="15" rx="4" fill="${tealInk}"/>${lettering('JOKER',30,65,13,paper)}</g>`;
 }
 if(Object.hasOwn(windMarkers,k)){
  return `<g data-wind="${k}">${centeredLabel(k,tealInk)}<path d="${windMarkers[k]}" fill="${markerInk}"/></g>`;
 }
 return '';
}

export function mobileTileArt(k,p){
 const suit=suits[k[0]];
 const dimensions=suit?'width="60" height="77"':`viewBox="${faceViewBox}"`;
 return `<svg class="mobile-tile-art" ${dimensions} aria-hidden="true" focusable="false">${mobileFace(k,p,suit)}</svg>`;
}
