// Filled Material Symbols Rounded from Google Fonts. See assets/Material-Symbols-LICENSE.txt.
const marks={
 bam:"M451.5-131.5Q440-143 440-160v-279q-64 0-123-24.5T213-533q-45-45-69-104t-24-123v-40q0-17 11.5-28.5T160-840h40q63 0 122 24.5T426-746q31 31 51.5 68t31.5 79q5-7 11-13.5t13-13.5q45-45 104-69.5T760-720h40q17 0 28.5 11.5T840-680v40q0 64-24.5 123T746-413q-45 45-103.5 69T520-320v160q0 17-11.5 28.5T480-120q-17 0-28.5-11.5Z",
 dot:"M495-155q-35-35-35-85t35-85q35-35 85-35t85 35q35 35 35 85t-35 85q-35 35-85 35t-85-35Zm9-309q-64-64-64-156t64-156q64-64 156-64t156 64q64 64 64 156t-64 156q-64 64-156 64t-156-64ZM280-240q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 66-47 113t-113 47Z",
 crak:"M453.5-151q-13.5-5-24.5-15-109-96-177-161.5t-106.5-115Q107-492 93.5-533T80-620q0-92 64-156t156-64q66 0 116 25.5t36 73.5l-37 130q-5 20 6.5 35.5T453-560h67l-26 254q-1 8 6.5 9t9.5-6l74-245q6-20-6-36t-32-16h-66l61-181q11-35 46-47t73-12q92 0 156 64t64 156q0 44-16 87t-55.5 95q-39.5 52-106 117.5T534-166q-11 10-25 15t-28 5q-14 0-27.5-5Z",
 owl:"M311.5-571.5Q300-583 300-600t11.5-28.5Q323-640 340-640t28.5 11.5Q380-617 380-600t-11.5 28.5Q357-560 340-560t-28.5-11.5Zm280 0Q580-583 580-600t11.5-28.5Q603-640 620-640t28.5 11.5Q660-617 660-600t-11.5 28.5Q637-560 620-560t-28.5-11.5ZM480-80q-134 0-227-93t-93-227v-200q0-122 96-201t224-79q128 0 224 79t96 201v400q0 17-11.5 28.5T760-160h-40q-50 0-85-35t-35-85v-2q0-20-12.5-30T560-322q-15 0-27.5 10T520-282v2q0 48 21 89t56 68q15 11 10.5 27T588-80H480Zm0-320q95 0 167.5-55.5T720-600q0-35-12-65.5T674-720q-64 2-109 48t-45 112q0 17-11.5 28.5T480-520q-17 0-28.5-11.5T440-560q0-66-45-111t-109-48q-22 24-34 54t-12 65q0 89 72.5 144.5T480-400Z",
 flower:"M480-540q42 0 71-29t29-71q0-42-29-71t-71-29q-42 0-71 29t-29 71q0 42 29 71t71 29Zm-70.5 158.5Q378-403 364-438q-5 0-9 .5t-9 .5q-52 0-89-37t-37-89q0-21 7-40.5t21-36.5q-13-17-20-36.5t-7-40.5q0-52 36.5-89t88.5-37q5 0 9 .5t9 .5q14-35 45.5-56.5T480-920q39 0 70.5 21.5T596-842q5 0 9-.5t9-.5q52 0 88.5 37t36.5 89q0 21-6.5 40.5T712-640q13 17 20 36.5t7 40.5q0 52-36.5 89T614-437q-5 0-9-.5t-9-.5q-14 35-45.5 56.5T480-360q-39 0-70.5-21.5ZM480-81q0-126 76-223t193-126q19-5 37.5-3.5T819-418q12 13 13.5 31t-3.5 35q-28 118-125.5 194.5T480-81Zm0 1q0-126-76-223T211-429q-19-5-37.5-3.5T141-417q-12 13-13.5 31t3.5 35q28 118 125.5 194.5T480-80Z",
 flame:"M160-400q0-113 67-217t184-182q22-15 45.5-1.5T480-760v52q0 34 23.5 57t57.5 23q17 0 32.5-7.5T621-657q8-10 20.5-12.5T665-664q63 45 99 115t36 149q0 88-43 160.5T644-125q17-24 26.5-52.5T680-238q0-40-15-75.5T622-377L480-516 339-377q-29 29-44 64t-15 75q0 32 9.5 60.5T316-125q-70-42-113-114.5T160-400Zm320-4 85 83q17 17 26 38t9 45q0 49-35 83.5T480-120q-50 0-85-34.5T360-238q0-23 9-44.5t26-38.5l85-83Z",
 star:"M480-269 314-169q-11 7-23 6t-21-8q-9-7-14-17.5t-2-23.5l44-189-147-127q-10-9-12.5-20.5T140-571q4-11 12-18t22-9l194-17 75-178q5-12 15.5-18t21.5-6q11 0 21.5 6t15.5 18l75 178 194 17q14 2 22 9t12 18q4 11 1.5 22.5T809-528L662-401l44 189q3 13-2 23.5T690-171q-9 7-21 8t-23-6L480-269Z"
};

const suits={B:['bam',29],C:['crak',29],D:['dot',31]};
const windMarkers={
 N:'M30 7l-4 5h8Z',
 E:'M55 38l-5-4v8Z',
 W:'M5 38l5 4v-8Z',
 S:'M30 69l4-5h-8Z'
};
const windInk='#25384d',jokerInk='#66325f',flowerInk='#8d4c16',markerInk='#8f561e';

function mark(name,x,y,size,ink){
 return `<path d="${marks[name]}" transform="translate(${x-size/2} ${y+size/2}) scale(${size/960})" fill="${ink}"/>`;
}
function lettering(text,x,y,size,ink){
 return `<text x="${x}" y="${y}" text-anchor="middle" font-size="${size}" fill="${ink}">${text}</text>`;
}
function mobileFace(k,p){
 if(k==='B1'){
  return `<g data-mark="bam" data-bird-bam="true">${lettering('1',12,17,16,p.bam)}${mark('owl',30,45,52,p.bam)}</g>`;
 }
 const suit=suits[k[0]];
 if(suit){
  const [name,size]=suit,ink=p[name];
  return `<g data-mark="${name}">${lettering(k[1],30,44,45,ink)}${mark(name,30,59,size,ink)}</g>`;
 }
 if(k==='R'||k==='G'){
  const ink=k==='R'?p.crak:p.bam;
  return `<g data-dragon="${k}">${lettering(k,30,20,16,ink)}${mark('flame',30,47,49,ink)}</g>`;
 }
 if(k==='H'){
  return `<rect data-dragon="H" x="13" y="16" width="34" height="43" rx="4" fill="none" stroke="${p.dot}" stroke-width="4"/>`;
 }
 if(k==='F')return mark('flower',30,39,54,flowerInk);
 if(k==='J'){
  return `<g data-joker="true">${mark('star',30,32,49,jokerInk)}<rect x="8" y="53" width="44" height="15" rx="4" fill="${jokerInk}"/>${lettering('JOKER',30,65,13,'#fffdf5')}</g>`;
 }
 if(Object.hasOwn(windMarkers,k)){
  return `<g data-wind="${k}">${lettering(k,30,54,46,windInk)}<path d="${windMarkers[k]}" fill="${markerInk}"/></g>`;
 }
 return '';
}

export function mobileTileArt(k,p){
 return `<svg class="mobile-tile-art" viewBox="0 0 60 77" aria-hidden="true" focusable="false">${mobileFace(k,p)}</svg>`;
}
