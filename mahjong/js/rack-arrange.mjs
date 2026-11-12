// Insertion is a gap in the original tile order, even where the rack wraps.
export function rackInsertionGap(items,x,y){
 if(!items.length)return null;
 const rows=[];
 items.forEach(({row,box},index)=>{
  const center=box.top+box.height/2;
  const previous=rows.at(-1);
  if(previous?.row===row){
   previous.end=index+1;
   previous.center=Math.max(previous.center,center);
  }else{
   rows.push({row,start:index,end:index+1,center});
  }
 });
 let nearest=rows[0];
 for(const row of rows.slice(1)){
  if(Math.abs(y-row.center)<Math.abs(y-nearest.center))nearest=row;
 }
 let insertion=nearest.start;
 while(insertion<nearest.end){
  const {left,width}=items[insertion].box;
  if(x<left+width/2)break;
  insertion++;
 }
 const after=insertion===nearest.end;
 return {insertion,edge:items[after?insertion-1:insertion].box,after};
}

// Pointer dragging works with mouse, pen, and touch without selecting pass tiles.
export function installRackArrangement({rack,canArrange,onMove,onPause,onResume}){
 let drag=null,ignoreClicksUntil=0;
 const tiles=()=>[...rack.querySelectorAll('[data-tile]')];
 function locate(){
  // offsetTop keeps a lifted, selected tile in its layout row.
  const items=tiles().map(tile=>({row:tile.offsetTop,box:tile.getBoundingClientRect()}));
  const gap=rackInsertionGap(items,drag.x,drag.y);
  if(!gap)return;
  const {insertion,edge,after}=gap;
  drag.insertion=insertion;
  Object.assign(drag.marker.style,{
   left:(after?edge.right+2:edge.left-4)+'px',
   top:edge.top-3+'px',
   height:edge.height+6+'px'
  });
 }
 function tick(){
  if(!drag?.active)return;
  const viewport=rack.parentElement,box=viewport.getBoundingClientRect();
  if(drag.x<box.left+28)viewport.scrollLeft-=8;
  else if(drag.x>box.right-28)viewport.scrollLeft+=8;
  locate();drag.frame=requestAnimationFrame(tick);
 }
 function finish(commit){
  if(!drag)return;
  const d=drag;drag=null;
  if(d.active){
   cancelAnimationFrame(d.frame);d.ghost.remove();d.marker.remove();d.source.classList.remove('rack-dragging');
   if(rack.hasPointerCapture(d.pointer))rack.releasePointerCapture(d.pointer);
   ignoreClicksUntil=Date.now()+400;
   const box=rack.getBoundingClientRect();
   if(commit&&d.y>=box.top-60&&d.y<=box.bottom+60)onMove(d.id,d.insertion);
  }
  onResume();
 }
 rack.addEventListener('pointerdown',e=>{
  const source=e.target.closest('[data-tile]');
  if(drag||!source||e.button!==0||!canArrange(e))return;
  const box=source.getBoundingClientRect();onPause();
  drag={id:Number(source.dataset.tile),source,pointer:e.pointerId,startX:e.clientX,startY:e.clientY,x:e.clientX,y:e.clientY,offsetX:e.clientX-box.left,offsetY:e.clientY-box.top,active:false};
 });
 document.addEventListener('pointermove',e=>{
  if(!drag||drag.pointer!==e.pointerId)return;
  drag.x=e.clientX;drag.y=e.clientY;
  if(!drag.active){
   const dx=e.clientX-drag.startX,dy=e.clientY-drag.startY;
   if(Math.hypot(dx,dy)<7)return;
   if(e.pointerType==='touch'&&!rack.classList.contains('is-arranging')&&Math.abs(dy)>Math.abs(dx)){finish(false);return;}
   drag.active=true;rack.setPointerCapture(e.pointerId);
   const box=drag.source.getBoundingClientRect(),ghost=drag.source.cloneNode(true);
   ghost.removeAttribute('data-tile');ghost.removeAttribute('id');ghost.tabIndex=-1;ghost.setAttribute('aria-hidden','true');ghost.classList.add('rack-drag-ghost');ghost.classList.remove('selected');
   Object.assign(ghost.style,{width:box.width+'px',height:box.height+'px'});
   for(const selector of ['.tile-art','.tile-number']){
    const original=drag.source.querySelector(selector),copy=ghost.querySelector(selector);
    if(original&&copy){const style=getComputedStyle(original);for(const key of ['width','height','top','left','fontSize','fontWeight','position','margin'])copy.style[key]=style[key];}
   }
   drag.ghost=ghost;drag.marker=document.createElement('span');drag.marker.className='rack-drop-marker';drag.marker.setAttribute('aria-hidden','true');document.body.append(ghost,drag.marker);drag.source.classList.add('rack-dragging');tick();
  }
  e.preventDefault();Object.assign(drag.ghost.style,{left:e.clientX-drag.offsetX+'px',top:e.clientY-drag.offsetY+'px'});locate();
 },{passive:false});
 document.addEventListener('pointerup',e=>{if(drag?.pointer===e.pointerId)finish(true);});
 document.addEventListener('pointercancel',e=>{if(drag?.pointer===e.pointerId)finish(false);});
 document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&drag){finish(false);return;}
  const tile=e.target.closest('#rack [data-tile]');
  if(!tile||!e.altKey||!['ArrowLeft','ArrowRight'].includes(e.key)||!canArrange(e))return;
  e.preventDefault();const at=tiles().indexOf(tile);onMove(Number(tile.dataset.tile),e.key==='ArrowLeft'?at-1:at+2);
 });
 for(const type of ['click','dblclick'])document.addEventListener(type,e=>{if(Date.now()<ignoreClicksUntil&&e.target.closest('#rack')){e.preventDefault();e.stopImmediatePropagation();}},true);
 rack.addEventListener('dragstart',e=>e.preventDefault());
}
