import {specialArt} from './special-art.mjs?v=origami-dragon-1';
import {mobileTileArt} from './mobile-tile-art.mjs?v=origami-dragon-1';
const suitInks={
 bam:'var(--tile-bam-ink, #2c6b52)',
 crak:'var(--tile-crak-ink, #ac4145)',
 dot:'var(--tile-dot-ink, #315f89)'
};
const dotAccent='#5c84a5';
export const STYLES={
 modern:{name:'Modern Garden',description:'Geometric bamboo stalks, two-tone blue dots, and angular Craks.',...suitInks,leaf:'#518266',gold:'#d7a52b',sky:dotAccent},
 minimal:{name:'Minimal',description:'Simple bamboo strokes, blue rings, and delicate red numerals.',...suitInks,leaf:'#b0d8ba',gold:'#eaa442',mint:'#70bcb5',pink:'#df9bab'},
 botanical:{name:'Botanical',description:'Leafy bamboo branches, blue blossom dots, and leafy letter winds.',...suitInks,leaf:'#719771',gold:'#d3a543'},
 deco:{name:'Art Deco',description:'Architectural bamboo, spoke-wheel dots, and compass winds.',...suitInks,leaf:'#37936c',gold:'#c29936'},
 coastal:{name:'Coastal',description:'Glazed green bamboo, blue rosettes, and nautical winds.',...suitInks,leaf:'#58b8b0',gold:'#e8b83f'},
 mobile:{name:'Mobile',description:'Bold, rounded suit symbols and large Ranchers wind letters.',...suitInks}
};
export function validStyle(value){return Object.hasOwn(STYLES,value)?value:'modern';}
const flowerInk='var(--tile-flower-ink, #df456e)';
const flowerMark=new URL('../icons/flower.svg#flower',import.meta.url).href;
const dragonMark=new URL('../icons/origami-dragon.svg#dragon',import.meta.url).href;
const points=n=>({1:[[20,28]],2:[[20,14],[20,41]],3:[[9,12],[20,28],[31,44]],4:[[10,14],[30,14],[10,42],[30,42]],5:[[10,12],[30,12],[20,28],[10,44],[30,44]],6:[[10,12],[30,12],[10,28],[30,28],[10,44],[30,44]],7:[[20,7],[10,20],[30,20],[10,34],[30,34],[10,48],[30,48]],8:[[10,7],[30,7],[10,21],[30,21],[10,35],[30,35],[10,49],[30,49]],9:[[8,10],[20,10],[32,10],[8,28],[20,28],[32,28],[8,46],[20,46],[32,46]]})[n];
function joker(style,p){
 if(style==='deco')return `<path d="M20 3L23 23L38 27L24 31L20 53L16 31L2 27L17 23Z" fill="${p.gold}" stroke="#a77f2b" stroke-width=".6"/><path d="M20 9V46M7 27H33" stroke="#f9e6a1" stroke-width="1"/>${[0,45,90,135,180,225,270,315].map(a=>`<path d="M20 6V12" transform="rotate(${a} 20 27)" stroke="${p.dot}" stroke-width="1.6"/>`).join('')}`;
 if(style==='coastal')return `${Array.from({length:10},(_,i)=>`<path d="M20 8Q25 4 21 0Q30 4 25 13" transform="rotate(${i*36} 20 28)" fill="${p.dot}"/>`).join('')}<circle cx="20" cy="28" r="13" fill="${p.gold}" stroke="#d8a832" stroke-width="1.2"/><path d="M13 27Q15 23 17 27M23 27Q25 23 27 27M15 32Q20 38 25 32" fill="none" stroke="${p.crak}" stroke-width="1.4" stroke-linecap="round"/>`;
 return `<path d="M4 46Q24 44 36 35M12 44Q2 34 2 29Q13 30 16 42M29 39Q28 28 37 26Q40 36 29 39" fill="${p.bam}" stroke="${p.bam}" stroke-width="1.1"/><path d="M11 39L7 48L19 42" fill="${p.dot}"/><ellipse cx="21" cy="30" rx="10" ry="13" fill="#87afc4"/><path d="M16 25Q28 24 24 39Q14 37 16 25" fill="${p.dot}"/><circle cx="26" cy="20" r="7" fill="#b6ced2"/><path d="M29 22L38 23L31 26Z" fill="${p.gold}"/><circle cx="28" cy="19" r="1.2" fill="#233b3d"/><path d="M10 1L11.5 6L17 7L12 9L10 15L8 9L3 7L8 6Z" fill="${p.gold}"/>`;
}
function modernArt(k,p){
 const blue=p.dot,sky=p.sky,green=p.bam,red=p.crak,gold=p.gold,n=Number(k.slice(1));
 if(k[0]==='B'){
  const coords=n===1?[[20,28]]:n===2?[[12,28],[28,28]]:n===3?[[8,28],[20,28],[32,28]]:points(n);
  const scale=n===1?1.8:n<=3?1.55:n>=7?.7:1;
  return coords.map(([x,y],i)=>`<g data-mark="bam" transform="translate(${x} ${y}) scale(${scale})"><path d="M-2.8-10H2.8V10H-2.8Z" fill="${i%2?p.leaf:green}"/><path d="M-1.7-7V7" stroke="#fcf9e7" stroke-width=".45" stroke-dasharray="1 3"/><path d="M3-2Q8-7 8-3Q7 0 3 1Z" fill="${green}"/></g>`).join('');
 }
 if(k[0]==='D'){
  if(n===1)return `<g data-mark="dot"><circle cx="20" cy="28" r="16" fill="${sky}"/><circle cx="20" cy="28" r="10" fill="${blue}"/><circle cx="20" cy="28" r="11" fill="none" stroke="#faf7e9" stroke-width=".7"/></g>`;
  const coords=points(n),r=n>=7?4.7:6;
  return coords.map(([x,y],i)=>`<circle data-mark="dot" cx="${x}" cy="${y}" r="${r}" fill="${i%2?sky:blue}"/>`).join('');
 }
 if(k[0]==='C'){
  const accents=[
   `<path d="M5 19V5H35V43M26 50H35"/>`,
   `<path d="M5 5V51M12 8H33V17M27 49H35V43"/>`,
   `<path d="M5 15V5H17M23 51H35V39"/><path d="M5 5H17L5 17Z" fill="${red}"/>`
  ];
  return `<g fill="none" stroke="${red}" opacity=".65" stroke-width="1.1">${accents[(n-1)%3]}</g><text x="20" y="44" text-anchor="middle" fill="${red}" font-family="Arial,sans-serif" font-size="43" font-weight="400">${n}</text>`;
 }
 if(k==='J')return `<text x="20" y="8" text-anchor="middle" font-family="Arial,sans-serif" font-size="7" font-weight="700" fill="${blue}">JOKER</text><circle cx="22" cy="16" r="4" fill="${red}"/><path d="M9 22H19V43H9Z" fill="${sky}"/><path d="M19 22L34 49H19Z" fill="${blue}"/><path d="M19 22L4 49L10 28Z" fill="${red}"/><path d="M19 43L28 50H19Z" fill="${gold}"/><path d="M10 46H17V53H10Z" fill="${green}"/>`;
 if(k==='H')return `<g data-dragon="H"><rect x="6" y="7" width="28" height="42" rx="1" fill="none" stroke="${sky}" stroke-width="1.6"/><path d="M6 7H14L6 15ZM34 7H26L34 15ZM6 49H14L6 41ZM34 49H26L34 41Z" fill="${sky}"/><path d="M14 7H26M14 49H26" stroke="${blue}" stroke-width=".8"/><circle cx="5" cy="28" r="2" fill="${red}"/><circle cx="35" cy="28" r="2" fill="${red}"/></g>`;
 const label={N:'NORTH',E:'EAST',S:'SOUTH',W:'WEST'}[k];
 const top=`<text x="20" y="9" text-anchor="middle" font-family="Arial,sans-serif" font-size="8" font-weight="700" fill="${blue}">${label}</text>`;
 if(k==='E')return `<g data-wind="E">${top}<path d="M4 31A16 16 0 0 1 36 31Z" fill="${red}"/><path d="M4 35H36M7 40H33M12 45H28" stroke="${blue}" stroke-width="2"/></g>`;
 if(k==='S')return `<g data-wind="S">${top}<path d="M3 32A17 17 0 0 1 37 32L20 39Z" fill="${red}"/>${[-60,-30,0,30,60].map(a=>`<path d="M20 37V16" stroke="#faf7e9" stroke-width=".7" transform="rotate(${a} 20 37)"/>`).join('')}<circle cx="20" cy="42" r="4" fill="${blue}"/></g>`;
 if(k==='W')return `<g data-wind="W">${top}<path d="M4 31A16 16 0 0 1 36 31Z" fill="${gold}"/><path d="M4 33H36V43H4Z" fill="${blue}"/><path d="M4 46H36" stroke="${sky}" stroke-width="2"/></g>`;
 if(k==='N')return `<g data-wind="N">${top}<path d="M5 17H35V47H5Z" fill="${blue}"/><path d="M12 24H28V40H12Z" fill="${sky}"/><path d="M17 29H23V35H17Z" fill="#faf7e9"/></g>`;
 return '';
}
function minimalArt(k,p){
 const mint=p.mint,pink=p.pink,red=p.crak,green=p.bam,blue=p.dot,n=Number(k.slice(1));
 if(k[0]==='B'){
  if(n===1)return `<g data-mark="bam"><path d="M7 31Q6 17 20 18Q34 19 32 34L24 42H11Z" fill="${green}"/><path d="M16 18H35Q34 31 24 30Z" fill="${pink}"/><path d="M9 20L2 25H11Z" fill="${red}"/><path d="M7 46Q15 41 22 45T35 45" stroke="${mint}" stroke-width="3" fill="none"/><circle cx="12" cy="21" r="1.2" fill="${blue}"/></g>`;
  return points(n).map(([x,y])=>`<g data-mark="bam" transform="translate(${x} ${y})"><path d="M0-7V7" stroke="${green}" stroke-width="2.8" stroke-linecap="round"/><path d="M-2-3H2M-2 3H2" stroke="${mint}" stroke-width="1.1"/></g>`).join('');
 }
 if(k[0]==='D'){
  if(n===1)return `<g data-mark="dot">${[14,10,6].map(r=>`<circle cx="20" cy="28" r="${r}" fill="none" stroke="${blue}" stroke-width="1.7"/>`).join('')}<circle cx="20" cy="28" r="2" fill="${blue}"/></g>`;
  return points(n).map(([x,y],i)=>`<g data-mark="dot"><circle cx="${x}" cy="${y}" r="${n>=7?4.5:6.3}" fill="${i%2?dotAccent:blue}"/>${n>=5?`<circle cx="${x}" cy="${y}" r="1.5" fill="#fffef7" fill-opacity=".65"/>`:''}</g>`).join('');
 }
 if(k[0]==='C')return `<text x="20" y="43" text-anchor="middle" fill="${red}" font-family="Georgia,serif" font-size="43" font-weight="400">${n}</text><path d="M12 50H28" stroke="${red}" stroke-opacity=".65" stroke-width="1.6" stroke-linecap="round"/>`;
 if(k==='J')return `<text x="20" y="8" text-anchor="middle" font-family="Arial,sans-serif" font-size="7" font-weight="700" fill="${red}">JOKER</text><path d="M6 29L17 47L9 48Z" fill="${mint}"/><path d="M34 29L23 47L31 48Z" fill="${green}"/><path d="M20 27L31 49H9Z" fill="${pink}"/>${[[8,mint],[20,pink],[32,green]].map(([x,c])=>`<circle cx="${x}" cy="21" r="1.8" fill="${c}"/>`).join('')}`;
 if(k==='H')return `<g data-dragon="H"><rect x="7" y="8" width="26" height="40" rx="4" fill="none" stroke="${mint}" stroke-width="1.5"/>${[[8,10],[32,10],[8,46],[32,46]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="2.3" fill="${pink}"/>`).join('')}<path d="M5 20Q0 24 5 28M5 30Q0 34 5 38M35 20Q40 24 35 28M35 30Q40 34 35 38" stroke="${green}" stroke-width="2" fill="none"/></g>`;
 const labels={N:'NORTH',E:'EAST',S:'SOUTH',W:'WEST'},label=labels[k];
 const top=`<text x="20" y="9" text-anchor="middle" font-family="Arial,sans-serif" font-size="8" font-weight="700" fill="#b15d76">${label}</text>`;
 const shapes={
  N:`<path d="M7 20L15 16V45L7 49Z" fill="${mint}"/><path d="M15 16L25 40V49L15 25Z" fill="${pink}"/><path d="M25 20L33 16V45L25 49Z" fill="${green}"/>`,
  E:`<path d="M6 18H34L28 26H6Z" fill="${mint}"/><path d="M28 26L12 40H5L19 26Z" fill="${red}"/><path d="M5 40H34L28 48H5Z" fill="${mint}"/>`,
  S:`<path d="M9 21L29 15L33 22L13 29Z" fill="${green}"/><path d="M9 21L31 35L27 43L6 29Z" fill="${red}"/><path d="M27 43L14 51L9 45L20 38Z" fill="${mint}"/>`,
  W:`<path d="M5 19L14 23L19 48L9 43Z" fill="${mint}"/><path d="M14 23L20 43L26 23Z" fill="${red}"/><path d="M26 23L35 19L31 43L21 48Z" fill="${green}"/>`
 };
 return label?`<g data-wind="${k}">${top}${shapes[k]}</g>`:'';
}
function emblemArt(style,emblem){
 const artClass=style==='mobile'?'mobile-tile-art':'tile-art';
 return `<svg class="${artClass}" viewBox="0 0 60 77" aria-hidden="true" focusable="false">${emblem}</svg>`;
}
export function faceArt(k,requestedStyle='modern'){
 const style=validStyle(requestedStyle),p=STYLES[style],n=Number(k.slice(1));let art='';
 if(k==='F')return emblemArt(style,`<use href="${flowerMark}" x="6" y="14.5" width="48" height="48" fill="${flowerInk}"/>`);
 if(k==='R'||k==='G'){
  const ink=k==='R'?p.crak:p.bam;
  return emblemArt(style,`<use data-dragon="${k}" href="${dragonMark}" x="2" y="18.5" width="56" height="40" fill="${ink}"/>`);
 }
 if(style==='mobile')return mobileTileArt(k,p);
 const special=specialArt(k,style,p);if(special)return `<svg class="tile-art" viewBox="0 0 40 56" aria-hidden="true" focusable="false">${special}</svg>`;
 if(style==='modern')return `<svg class="tile-art" viewBox="0 0 40 56" aria-hidden="true" focusable="false">${modernArt(k,p)}</svg>`;
 if(style==='minimal')return `<svg class="tile-art" viewBox="0 0 40 56" aria-hidden="true" focusable="false">${minimalArt(k,p)}</svg>`;
 if(k[0]==='B'){
  const coords=n===1?[[20,28]]:n===5?[[12,14],[28,14],[8,40],[20,40],[32,40]]:points(n),scale=n===1?2.2:n>=7?.68:n===5?.88:1;
  art=coords.map(([x,y],i)=>{
   let stalk='';
   if(style==='botanical')stalk=`<path d="M-1 10Q3 1-1-10" stroke="${p.bam}" stroke-width="3" stroke-linecap="round" fill="none"/><path d="M-2-4H1M0 3H3" stroke="#d9d6a0" stroke-width="1"/><path d="M0-3Q4-11 9-10Q8-3 0-3M1 4Q-6-3-8 0Q-6 6 1 4" fill="${p.leaf}"/><path d="M0-3L7-8M1 4L-6 1" stroke="${p.bam}" stroke-width=".4" fill="none"/>`;
   else if(style==='coastal')stalk=`${[-9,-2,5].map(y=>`<path d="M-3 ${y}Q0 ${y+1} 3 ${y}L2.5 ${y+5}Q0 ${y+6}-2.5 ${y+5}Z" fill="${p.bam}" stroke="#006a78" stroke-width=".5"/><path d="M-1.5 ${y+1}V${y+4}" stroke="#8ee0cf" stroke-width="1" stroke-linecap="round"/>`).join('')}${n===1?`<path d="M1-4Q9-12 12-6Q6-3 1-4M-1 3Q-12-3-11 3Q-4 6-1 3" fill="${p.bam}"/>`:''}`;
   else stalk=`<path d="M-2.7-10L2.7-10L2 10H-2Z" fill="${p.bam}"/><path d="M-3-3H3M-3 4H3" stroke="${p.gold}" stroke-width="1.4"/>${n===1?`<path d="M1-5L10-11L6-4ZM-1 3L-10-3L-6 4Z" fill="${p.leaf}"/>`:''}`;
   return `<g data-mark="bam" transform="translate(${x} ${y}) scale(${scale})${style==='botanical'?' rotate('+((i%2?1:-1)*7)+')':''}">${stalk}</g>`;
  }).join('');
 }else if(k[0]==='D'){
  const coords=n===3&&style==='coastal'?[[20,12],[10,39],[30,39]]:points(n);
  art=coords.map(([x,y])=>{const r=n===1?13:n>=7?4.5:5.7;let medallion='';
   if(style==='botanical')medallion=`<circle r="${r}" fill="var(--parlor-cyan-wash, #e6f0f3)" stroke="${p.dot}" stroke-width=".7"/>${Array.from({length:5},(_,i)=>`<ellipse cx="0" cy="-${r*.34}" rx="${r*.32}" ry="${r*.44}" transform="rotate(${i*72})" fill="${p.dot}"/>`).join('')}<circle r="${r*.2}" fill="${p.gold}"/>`;
   else if(style==='coastal')medallion=`${Array.from({length:8},(_,i)=>`<circle cx="0" cy="-${r*.72}" r="${r*.29}" transform="rotate(${i*45})" fill="${p.dot}"/>`).join('')}<circle r="${r*.83}" fill="${p.dot}"/><circle r="${r*.64}" fill="#fffdf3"/>${Array.from({length:4},(_,i)=>`<ellipse cx="0" cy="-${r*.3}" rx="${r*.15}" ry="${r*.3}" transform="rotate(${i*90})" fill="${p.dot}"/>`).join('')}<circle r="${r*.16}" fill="${p.gold}"/>`;
   else medallion=`<circle r="${r}" fill="${p.dot}" stroke="${p.gold}" stroke-width=".8"/>${Array.from({length:8},(_,i)=>`<path d="M0 0V-${r-1}" transform="rotate(${i*45})" stroke="#eee3b9" stroke-width=".65"/>`).join('')}<circle r="${r*.23}" fill="${p.gold}"/>`;
   return `<g data-mark="dot" transform="translate(${x} ${y})">${medallion}</g>`;
  }).join('');
 }else if(k[0]==='C'){
  art=`<text x="20" y="42" fill="${p.crak}" font-size="45" font-family="${style==='deco'?'Arial,sans-serif':'Georgia,serif'}" font-weight="${style==='deco'?600:400}" font-style="${style==='botanical'?'italic':'normal'}" text-anchor="middle">${n}</text>${style==='deco'?`<path d="M8 47L20 51L32 47M12 45L20 48L28 45" stroke="${p.gold}" stroke-width="1.1" fill="none"/>`:style==='coastal'?`<path d="M6 47Q12 43 20 47T34 47M6 51Q12 47 20 51T34 51" stroke="${p.bam}" stroke-width="1.4" fill="none"/>`:`<path d="M8 48Q20 53 33 46M24 49Q24 42 31 42Q32 47 24 49" fill="${p.leaf}" stroke="${p.bam}" stroke-width=".6"/>`}`;
 }else if(k==='J')art=joker(style,p);
 else if(k==='H'){const frame=style==='botanical'?'#547b94':p.dot;art=`<g data-dragon="H"><rect x="7" y="9" width="26" height="36" rx="${style==='coastal'?5:2}" fill="none" stroke="${frame}" stroke-width="2.2"/><rect x="11" y="13" width="18" height="28" rx="1" fill="none" stroke="${frame}" stroke-width=".8"/>${style==='deco'?`<path d="M4 16V6H14M26 6H36V16M4 38V48H14M26 48H36V38" stroke="${p.gold}" stroke-width=".9" fill="none"/>`:''}${style==='botanical'?`<path d="M5 13Q0 8 4 6Q8 9 5 13M35 42Q40 47 36 49Q32 46 35 42" fill="${p.leaf}"/>`:''}</g>`;}
 else if(['E','S','W','N'].includes(k)){
  const angle={N:0,E:90,S:180,W:270}[k];let surround='';
  if(style==='botanical')surround=`<path d="M8 44Q-1 28 7 12M32 44Q41 28 33 12" fill="none" stroke="${p.bam}" stroke-width="1"/>${[0,1,2,3].map(i=>`<path d="M${5-i*.2} ${17+i*7}Q-1 ${12+i*7} 2 ${10+i*7}Q8 ${12+i*7} 5 ${17+i*7}M${35+i*.2} ${17+i*7}Q41 ${12+i*7} 38 ${10+i*7}Q32 ${12+i*7} 35 ${17+i*7}" fill="${p.leaf}"/>`).join('')}<path d="M15 49Q20 45 25 49" stroke="${p.gold}" stroke-width="1.4" fill="none"/>`;
  else if(style==='coastal')surround=`<circle cx="20" cy="27" r="18" fill="none" stroke="${p.dot}" stroke-width="1.1"/>${[0,90,180,270].map(a=>`<path d="M20 4L17 10H23Z" fill="${a===angle?p.crak:p.dot}" transform="rotate(${a} 20 27)"/>`).join('')}<path d="M10 48Q15 44 20 48T30 48" stroke="${p.bam}" stroke-width="1.4" fill="none"/>`;
  else surround=`<path d="M20 3L37 27L20 51L3 27Z" fill="none" stroke="${p.gold}" stroke-width="1.3"/><path d="M20 8L16 15H24Z" fill="${p.bam}" transform="rotate(${angle} 20 27)"/>`;
  art=`<g data-wind="${k}">${surround}<text x="20" y="38" text-anchor="middle" font-family="${style==='deco'?'Arial,sans-serif':'Georgia,serif'}" font-size="29" font-weight="${style==='coastal'?600:500}" fill="${style==='botanical'?p.bam:p.dot}">${k}</text></g>`;
 }

 return `<svg class="tile-art" viewBox="0 0 40 56" aria-hidden="true" focusable="false">${art}</svg>`;
}
