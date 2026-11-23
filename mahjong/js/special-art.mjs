// Shared silhouettes for the bird Bam, winds, and jokers.
const pinkInk='var(--tile-wind-joker-ink, #b92d65)';
const roseInk='var(--tile-flower-ink, #df456e)';

export function specialArt(k,style,p){
 const accent=p.sky||p.mint||p.gold,paper='#fffdf4';
 if(k==='B1')return `<g data-mark="bam" data-bird-bam="true"><path d="M8 37L3 47L18 39" fill="${accent}"/><ellipse cx="20" cy="31" rx="11" ry="12" fill="${p.bam}"/><path d="M16 23Q31 20 27 38Q16 37 16 23Z" fill="${style==='minimal'?p.pink:p.crak}"/><circle cx="26" cy="17" r="7" fill="${p.bam}"/><path d="M31 17L39 20L31 23Z" fill="${p.gold}"/><circle cx="28" cy="16" r="1.2" fill="${paper}"/><path d="M18 42V48M24 42V48M11 50H31" stroke="${p.dot}" stroke-width="1.4" stroke-linecap="round"/></g>`;
 if(k==='J')return `<g data-joker="true"><path d="M7 16L13 21L20 13L27 21L33 16L30 28H10Z" fill="${roseInk}"/><path d="M10 28H30" stroke="${pinkInk}" stroke-width="2"/>${[[7,15],[20,12],[33,15]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="1.8" fill="${pinkInk}"/>`).join('')}<text x="20" y="51" text-anchor="middle" font-family="Arial,sans-serif" font-size="26" font-weight="600" fill="${pinkInk}">J</text></g>`;
 if(!['N','E','S','W'].includes(k))return null;
 let frame='';
 if(style==='botanical')frame=`<path d="M7 49Q14 46 20 51Q26 46 33 49" stroke="${roseInk}" stroke-width="1" fill="none"/><path d="M14 48Q7 50 5 44Q11 43 14 48M26 48Q33 50 35 44Q29 43 26 48" fill="${roseInk}"/>`;
 else if(style==='deco')frame=`<path d="M13 12L20 3L27 12M13 44L20 53L27 44" fill="none" stroke="${roseInk}" stroke-width="1.2"/>`;
 else if(style==='minimal')frame=`<path d="M6 45H15M25 11H34" stroke="${roseInk}" stroke-width="2" stroke-linecap="round"/><circle cx="33" cy="44" r="2.2" fill="${roseInk}"/>`;
 else if(style==='coastal')frame=`<path d="M11 12Q20 4 29 12" stroke="${pinkInk}" fill="none"/><path d="M9 49Q14 45 20 49T31 49" stroke="${roseInk}" stroke-width="1.4" fill="none"/>`;
 else frame=`<path d="M7 12A17 17 0 0 1 33 12" stroke="${roseInk}" stroke-width="2" fill="none"/><path d="M8 47H32" stroke="${pinkInk}" stroke-width="1.4"/>`;
 const botanical=style==='botanical',wideLetter=botanical&&k==='W'?' textLength="35" lengthAdjust="spacingAndGlyphs"':'';
 return `<g data-wind="${k}">${frame}<text x="20" y="41" text-anchor="middle" font-family="${botanical?'Georgia,serif':'Arial,sans-serif'}" font-size="36" font-weight="600" fill="${pinkInk}"${wideLetter}>${k}</text></g>`;
}
