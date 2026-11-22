// Joker star from Google Material Symbols Rounded. See assets/Material-Symbols-LICENSE.txt.
const starPath="M480-269 314-169q-11 7-23 6t-21-8q-9-7-14-17.5t-2-23.5l44-189-147-127q-10-9-12.5-20.5T140-571q4-11 12-18t22-9l194-17 75-178q5-12 15.5-18t21.5-6q11 0 21.5 6t15.5 18l75 178 194 17q14 2 22 9t12 18q4 11 1.5 22.5T809-528L662-401l44 189q3 13-2 23.5T690-171q-9 7-21 8t-23-6L480-269Z";
const suits={B:'bam',C:'crak',D:'dot'};
const dotPips=[
 [17,13],[30,13],[43,13],
 [8,25],[52,25],[8,38.5],[52,38.5],[8,52],[52,52],
 [17,64],[30,64],[43,64]
];
const suitFrames={
 bam:`<path d="M9 13V64M51 13V64M6 26h6m-6 24h6m36-24h6m-6 24h6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><path d="M10 17Q14 9 23 12Q20 18 10 17ZM50 60Q46 68 37 65Q40 59 50 60Z"/>`,
 crak:`<path d="M8 27V16h5v-5h10m14 0h10v5h5v11M8 50v11h5v5h10m14 0h10v-5h5V50" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linejoin="round" stroke-linecap="round"/>`,
 dot:dotPips.map(([x,y])=>`<circle cx="${x}" cy="${y}" r="2.35"/>`).join('')
};

const windMarkers={
 N:'M30 4l-3 4h6Z',
 E:'M55 7l-4-3v6Z',
 W:'M5 7l4 3v-6Z',
 S:'M30 73l3-4h-6Z'
};
const windInk='var(--gunmetal, #393d3f)';
const jokerInk='var(--parlor-link, #285763)';
const markerInk='var(--pacific-cyan, #62929e)';
const paper='var(--white, #fdfdff)';

function star(x,y,size,ink){
 return `<path d="${starPath}" transform="translate(${x-size/2} ${y+size/2}) scale(${size/960})" fill="${ink}"/>`;
}
function lettering(text,x,y,size,ink){
 return `<text x="${x}" y="${y}" text-anchor="middle" font-size="${size}" fill="${ink}">${text}</text>`;
}
function mobileFace(k,p){
 const suit=suits[k[0]];
 if(suit){
  const ink=p[suit];
  return `<g data-mark="${suit}" color="${ink}" fill="currentColor">${lettering(k[1],30,55,45,'currentColor')}${suitFrames[suit]}</g>`;
 }
 if(k==='H'){
  return `<rect data-dragon="H" x="13" y="16" width="34" height="43" rx="4" fill="none" stroke="${p.dot}" stroke-width="4"/>`;
 }
 if(k==='J'){
  return `<g data-joker="true">${star(30,32,49,jokerInk)}<rect x="8" y="53" width="44" height="15" rx="4" fill="${jokerInk}"/>${lettering('JOKER',30,65,13,paper)}</g>`;
 }
 if(Object.hasOwn(windMarkers,k)){
  return `<g data-wind="${k}">${lettering(k,30,63,62,windInk)}<path d="${windMarkers[k]}" fill="${markerInk}"/></g>`;
 }
 return '';
}

export function mobileTileArt(k,p){
 return `<svg class="mobile-tile-art" viewBox="0 0 60 77" aria-hidden="true" focusable="false">${mobileFace(k,p)}</svg>`;
}
