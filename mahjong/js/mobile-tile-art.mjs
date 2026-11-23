// Joker star from Google Material Symbols Rounded. See assets/Material-Symbols-LICENSE.txt.
const starPath="M480-269 314-169q-11 7-23 6t-21-8q-9-7-14-17.5t-2-23.5l44-189-147-127q-10-9-12.5-20.5T140-571q4-11 12-18t22-9l194-17 75-178q5-12 15.5-18t21.5-6q11 0 21.5 6t15.5 18l75 178 194 17q14 2 22 9t12 18q4 11 1.5 22.5T809-528L662-401l44 189q3 13-2 23.5T690-171q-9 7-21 8t-23-6L480-269Z";
const suits={B:'bam',C:'crak',D:'dot'};
const faceViewBox='0 0 60 77';
const cornerTransforms=[
 'translate(0 0)', 'translate(60 0) scale(-1 1)',
 'translate(0 77) scale(1 -1)', 'translate(60 77) scale(-1 -1)'
];
function atCorners(art){
 return cornerTransforms.map(transform=>`<g transform="${transform}">${art}</g>`).join('');
}
const suitFrames={
 bam:atCorners(`<path d="M5.5 22V16m0-4V8q0-2.5 2.5-2.5h4m4 0h6" fill="none" stroke="currentColor" stroke-width="2.7" stroke-linecap="round"/><path d="M3.2 14h4.6M14 3.2v4.6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`),
 crak:atCorners(`<path d="M5.5 25V11.5h6v-6H24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linejoin="round" stroke-linecap="round"/>`),
 dot:atCorners(`<circle cx="6" cy="6" r="2.05"/><circle cx="14" cy="6" r="2.05"/><circle cx="6" cy="14" r="2.05"/>`)
};

const windMarkers={
 N:[30,7], E:[54,38.5], W:[6,38.5], S:[30,70]
};
const pinkInk='var(--tile-wind-joker-ink, #b62d7a)';
const paper='var(--white, #fdfdff)';

function star(x,y,size,ink){
 return `<path d="${starPath}" transform="translate(${x-size/2} ${y+size/2}) scale(${size/960})" fill="${ink}"/>`;
}
function lettering(text,x,y,size,ink){
 return `<text x="${x}" y="${y}" text-anchor="middle" font-size="${size}" fill="${ink}">${text}</text>`;
}
function centeredLabel(text,ink){
 return lettering(text,30,58,52,ink);
}
function mobileFace(k,p,suit){
 if(suit){
  const ink=p[suit];
  return `<g data-mark="${suit}" color="${ink}" fill="currentColor">
   <svg width="100%" height="100%" viewBox="${faceViewBox}">${centeredLabel(k[1],'currentColor')}</svg>
   <svg width="100%" height="100%" viewBox="${faceViewBox}" preserveAspectRatio="none" opacity=".74">${suitFrames[suit]}</svg>
  </g>`;
 }
 if(k==='H'){
  return `<g data-dragon="H" fill="none" stroke="${p.dot}" stroke-linejoin="round">
   <path d="M16 12h28l5 5v41l-5 5H16l-5-5V17Z" stroke-width="3.2"/>
   <path d="M20 18h20l3 3v33l-3 3H20l-3-3V21Z" stroke-width="1.6"/>
  </g>`;
 }
 if(k==='J'){
  return `<g data-joker="true">${star(30,31,55,pinkInk)}<rect x="6" y="53" width="48" height="16" rx="4" fill="${pinkInk}"/>${lettering('JOKER',30,66,14,paper)}</g>`;
 }
 if(Object.hasOwn(windMarkers,k)){
  const [x,y]=windMarkers[k];
  return `<g data-wind="${k}">${centeredLabel(k,pinkInk)}<circle cx="${x}" cy="${y}" r="2.3" fill="${pinkInk}"/></g>`;
 }
 return '';
}

export function mobileTileArt(k,p){
 const suit=suits[k[0]];
 const dimensions=suit?'width="60" height="77"':`viewBox="${faceViewBox}"`;
 return `<svg class="mobile-tile-art" ${dimensions} aria-hidden="true" focusable="false">${mobileFace(k,p,suit)}</svg>`;
}
