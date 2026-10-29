'use strict';
const $ = selector => document.querySelector(selector);
const stage = $('#stage');
const activities = [
  { name: 'Click', title: 'Number chase', rounds: 3, guide: 'left', caption: 'Left click', instruction: 'Click in order.', tip: 'Correct clicks stop the number.', keyboard: 'Tab to a number and press Enter.' },
  { name: 'Double-click', title: 'Highlight the word', rounds: 1, guide: 'left', caption: 'Click-click → highlight', instruction: 'Double-click the matching word.', tip: 'Two quick clicks. Keep the mouse still.', keyboard: 'Tab to a word and press Enter to highlight it.' },
  { name: 'Drag', title: 'Build a picture', rounds: 1, guide: 'left', caption: 'Hold left → move → let go', instruction: 'Drag shapes onto their outlines.', tip: 'Hold the button until you reach an outline.', keyboard: 'Tab to a shape. Enter picks it up. Arrow keys move it. Enter drops it. Escape cancels.' },
  { name: 'Scroll', title: 'Find the match', rounds: 1, guide: 'wheel', caption: 'Roll wheel → left click', instruction: 'Find the pictured card.', tip: 'Match the shape AND the number.', keyboard: 'Focus the cards and use arrow keys to scroll, or Tab between cards and press Enter.' },
  { name: 'Zoom', title: 'Fit the frame', rounds: 4, guide: 'wheel', caption: 'Roll wheel → Next', instruction: 'Make the picture fit.', tip: 'Roll up: bigger. Roll down: smaller.', keyboard: 'Focus the picture and press + or −, or use the zoom buttons. When green, click Next.' },
  { name: 'Orbit', title: 'Find the symbol', rounds: 2, guide: 'right', caption: 'Hold right → turn → let go', instruction: 'Hold right + move to turn.', tip: 'When green, click Next.', keyboard: 'Focus the cube and use left and right arrows. When green, click Next.' },
  { name: 'Pan', title: 'Park the rover', rounds: 2, guide: 'right', caption: 'Shift + hold right → move', instruction: 'Hold Shift + right. Move to park.', tip: 'Keep Shift held. Let go of the mouse first.', keyboard: 'Focus the workplane. Hold Shift and use arrow keys to move the view. Release Shift to check.' }
];
const symbols = { square: '■', circle: '●', triangle: '▲', rectangle: '▯', hexagon: '⬡' };
const clickSpeeds = [0, .45, 2];
function shapeArt(type, outline = false) {
  const shapes = {
    square: '<rect x="10" y="10" width="80" height="80"/>',
    circle: '<circle cx="50" cy="50" r="40"/>',
    triangle: '<polygon points="50,8 94,92 6,92"/>',
    rectangle: '<rect x="25" y="5" width="50" height="90"/>',
    hexagon: '<polygon points="28,10 72,10 94,50 72,90 28,90 6,50"/>'
  };
  return `<svg class="shape-art art-${type} ${outline ? 'outline-art' : ''}" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${shapes[type]}</svg>`;
}
function rocketArt() {
  return '<svg class="rocket-art" viewBox="0 0 100 140" aria-hidden="true"><path d="M28 96 15 125 34 115M72 96 85 125 66 115" fill="#e4783f" stroke="#763e24" stroke-width="2"/><path d="M34 112 50 136 66 112" fill="#f3bc40"/><rect x="30" y="43" width="40" height="72" rx="6" fill="#d6ecf7" stroke="#34657e" stroke-width="3"/><path d="M30 43 50 7 70 43Z" fill="#e4783f" stroke="#763e24" stroke-width="2"/><circle cx="50" cy="65" r="12" fill="#2787a5" stroke="white" stroke-width="4"/></svg>';
}
function roverArt() {
  return '<svg class="rover-art" viewBox="0 0 100 75" aria-hidden="true"><circle cx="25" cy="61" r="12" fill="#294656"/><circle cx="75" cy="61" r="12" fill="#294656"/><rect x="12" y="26" width="76" height="31" rx="7" fill="#e5793d" stroke="#85431f" stroke-width="3"/><path d="M30 26 37 10H66L75 26Z" fill="#8dd4eb" stroke="#34657e" stroke-width="3"/><path d="M52 9V2" stroke="#34657e" stroke-width="3"/></svg>';
}
function goal(markup, label) {
  $('#task-visual').innerHTML = markup;
  $('#task-visual').setAttribute('aria-label', label);
  $('#task-visual').hidden = !markup;
}
const progress = activities.map(() => 0);
let current = 0;
let roundDone = false;
let pendingCompletion = null;
let dispose = () => {};
let modelScale = 1;
let modelAngle = -32;

function feedback(text, kind = 'info') {
  $('#feedback').textContent = text;
  $('#feedback').dataset.kind = kind;
}
function task(text) { $('#task').textContent = text; }
function count(done, total, label) { $('#counter').textContent = `${done} / ${total} ${label}`; }
function completeRound(message) {
  if (roundDone) return;
  roundDone = true;
  progress[current] = Math.max(progress[current], roundIndex() + 1);
  stage.classList.add('round-complete');
  $('#task-label').textContent = '✓ ROUND COMPLETE';
  task(message);
  feedback('✓ Done! Next →', 'success');
  const finished = activeRound + 1 === activities[current].rounds;
  $('#next').disabled = false;
  $('#next').textContent = finished ? (current === activities.length - 1 ? 'Finish practice →' : 'Next skill →') : 'Next round →';
  renderSteps();
  if (finished) celebrate();
}
let activeRound = 0;
function roundIndex() { return activeRound; }
function renderSteps() {
  $('#steps').innerHTML = activities.map((a, i) => {
    const done = progress[i] === a.rounds;
    const locked = i > 0 && progress[i - 1] < activities[i - 1].rounds;
    return `<button class="step ${done ? 'done' : ''}" data-step="${i}" ${i === current ? 'aria-current="step"' : ''} ${locked ? 'disabled' : ''}><span class="step-number">${done ? '✓' : i + 1}</span><span>${a.name}<small>${locked ? 'Locked' : `${progress[i]} / ${a.rounds} ${a.rounds === 1 ? "round" : "rounds"}`}</small></span></button>`;
  }).join('');
}
function render(index, focus = false, requestedRound = null) {
  dispose(); dispose = () => {};
  pendingCompletion = null;
  current = index;
  activeRound = requestedRound ?? (progress[index] === activities[index].rounds ? 0 : progress[index]);
  // A completed skill is available to replay; its completion still unlocks the next skill.
  roundDone = false;
  const a = activities[index];
  renderSteps();
  $('#step-label').textContent = `SKILL ${index + 1} OF ${activities.length} · ROUND ${activeRound + 1} OF ${a.rounds}`;
  $('#activity-title').textContent = a.title;
  $('#instruction').textContent = a.instruction;
  $('#tip').textContent = a.tip;
  $('#keyboard-help').textContent = a.keyboard;
  $('.mouse-guide').className = `mouse-guide guide-${a.guide}`;
  $('.mouse-guide').hidden = false;
  $('.keyboard-help').hidden = false;
  $('#mouse-caption').textContent = a.caption;
  $('#gesture-key').hidden = a.name !== 'Pan';
  $('#task-label').textContent = 'YOUR TASK';
  $('#next').textContent = 'Finish the task first';
  $('#next').disabled = true;
  $('#counter').textContent = '';
  $('#task-controls').innerHTML = '';
  stage.className = 'stage';
  stage.innerHTML = '';
  stage.onpointerdown = stage.onpointermove = stage.onpointerup = stage.onpointercancel = stage.onkeydown = stage.oncontextmenu = null;
  goal('', '');
  feedback('Your turn.');
  [clickActivity, doubleClickActivity, dragActivity, scrollActivity, zoomActivity, orbitActivity, panActivity][index]();
  $('#task-mouse').hidden = false;
  $('#task-mouse').innerHTML = index < 3 ? leftMouseCue(index) : index < 5 ? scrollMouseArt() : rightMouseCue(index === 6);
  $('.workplane-surface').dataset.skill = a.name;
  if (focus) $('#activity-title').focus();
}
function objectButton(type, label, className = 'model-object') {
  const button = document.createElement('button');
  button.className = `${className} object-${type}`;
  button.innerHTML = `<span aria-hidden="true">${symbols[type]}</span><small>${label}</small>`;
  button.setAttribute('aria-label', label);
  return button;
}
function doubleClickActivity() {
  const words = ['SUN', 'CAT', 'DOG', 'HAT', 'BUG', 'CUP'];
  const order = [5, 3, 0, 4];
  let matched = 0;
  const board = document.createElement('div');
  board.className = 'word-board word-round-2';
  function prompt() {
    goal(`<strong class="goal-word">${words[order[matched]]}</strong>`, `Highlight ${words[order[matched]]}`);
    task('Double-click this word.');
    count(matched, order.length, 'words');
  }
  words.forEach((word, index) => {
    const card = document.createElement('div'); card.className = 'word-card';
    const label = document.createElement('span');
    label.className = 'practice-word'; label.textContent = word; label.tabIndex = 0;
    label.setAttribute('aria-label', `Highlight ${word}`);
    const check = document.createElement('span'); check.className = 'word-check'; check.setAttribute('aria-hidden', 'true');
    let done = false;
    function highlight() {
      if (roundDone || done) return;
      // Use real text selection, so the result matches highlighting a word elsewhere.
      const range = document.createRange(); range.selectNodeContents(label);
      const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range);
      if (index !== order[matched]) { feedback('Match the word above. Try again.', 'retry'); return; }
      done = true; card.classList.add('matched'); check.textContent = '✓';
      matched++; count(matched, order.length, 'words');
      if (matched === order.length) completeRound('Words highlighted! ✓');
      else { prompt(); feedback('✓ Highlighted! Find the next word.', 'success'); }
    }
    label.onclick = e => { if (!roundDone && !done && e.detail === 1) feedback('Click-click quickly on the same word.'); };
    label.ondblclick = e => { if (e.button === 0) highlight(); };
    label.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); highlight(); } };
    card.append(label, check); board.append(card);
  });
  stage.append(board); prompt();
  dispose = () => window.getSelection()?.removeAllRanges();
}
function clickActivity() {
  let speed = clickSpeeds[activeRound];
  const items = [['square', '1'], ['circle', '2'], ['triangle', '3'], ['square', '4']];
  const centers = [[.25, .28], [.73, .28], [.25, .75], [.73, .75]];
  const targets = [];
  let selected = 0, elapsed = 0, previousTime = null, frame = null, held = null;
  let paused = speed > 0 && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  $('#activity-title').textContent = 'Number Chase';
  $('#instruction').textContent = 'Click 1 → 2 → 3 → 4.';
  $('#tip').textContent = speed ? 'Choose your speed above the numbers.' : 'These numbers stay still.';
  function prompt() {
    goal(`<strong class="goal-number">${selected + 1}</strong>`, `Click number ${selected + 1}`);
    task('Click this number.');
    count(selected, items.length, 'clicks');
  }
  items.forEach(([type, label], i) => {
    const b = objectButton(type, label, 'model-object numbered-target');
    b.innerHTML = `<strong class="target-number">${label}</strong><span class="target-symbol" aria-hidden="true">${symbols[type]}</span>`;
    b.style.left = centers[i][0] * 100 + '%'; b.style.top = centers[i][1] * 100 + '%';
    b.onpointerdown = e => { if (e.button === 0 && !b.disabled) held = { button: b, id: e.pointerId }; };
    b.onclick = () => {
      if (roundDone || b.disabled) return;
      if (i !== selected) { feedback(`That is ${label}. Click ${selected + 1} next.`, 'retry'); return; }
      b.classList.add('placed'); b.disabled = true;
      b.innerHTML += '<b class="object-check" aria-hidden="true">✓</b>';
      selected++; count(selected, items.length, 'clicks');
      if (selected === items.length) {
        if (frame !== null) cancelAnimationFrame(frame);
        if ($('#motion-toggle')) $('#motion-toggle').disabled = true;
        if ($('#click-speed')) $('#click-speed').disabled = true;
        goal('<strong class="goal-number">✓</strong>', 'Complete');
        completeRound('1 → 2 → 3 → 4 ✓');
      } else { prompt(); feedback(`✓ ${label}! Next: ${selected + 1}`, 'success'); }
    };
    stage.append(b); targets.push(b);
  });
  if (speed > 0) {
    const toggle = document.createElement('button');
    toggle.id = 'motion-toggle'; toggle.className = 'motion-toggle';
    function updateToggle() {
      toggle.textContent = paused ? 'Resume movement' : 'Pause movement';
      toggle.setAttribute('aria-pressed', String(paused));
    }
    toggle.onclick = () => { paused = !paused; updateToggle(); };
    const controls = document.createElement('div'); controls.className = 'click-controls';
    const label = document.createElement('label'); label.textContent = 'Speed ';
    const select = document.createElement('select'); select.id = 'click-speed'; select.setAttribute('aria-label', 'Number speed');
    select.innerHTML = '<option value="0.45">Slow</option><option value="1">Medium</option><option value="2">Fast</option><option value="3">Extra fast</option>';
    select.value = String(speed);
    select.onchange = () => { speed = Number(select.value); clickSpeeds[activeRound] = speed; };
    label.append(select); controls.append(label, toggle); updateToggle(); $('#task-controls').append(controls);
    if (paused) feedback('Movement paused. Use Resume when ready.');
    function animate(time) {
      if (roundDone) return;
      const delta = previousTime === null ? 0 : Math.min((time - previousTime) / 1000, .05);
      previousTime = time;
      if (!paused) {
        elapsed += delta * speed;
        targets.forEach((b, i) => {
          if (b.disabled || held?.button === b) return;
          // Each target has its own lane, so labels never cross or overlap.
          const phase = i * Math.PI / 2;
          const x = centers[i][0] + .075 * (Math.sin(elapsed + phase) - Math.sin(phase));
          const y = centers[i][1] + .035 * (Math.cos(elapsed + phase) - Math.cos(phase));
          b.style.left = x * 100 + '%'; b.style.top = y * 100 + '%';
        });
      }
      frame = requestAnimationFrame(animate);
    }
    frame = requestAnimationFrame(animate);
  }
  const release = e => { if (held?.id === e.pointerId) held = null; };
  const blur = () => { held = null; previousTime = null; };
  window.addEventListener('pointerup', release);
  window.addEventListener('pointercancel', release);
  window.addEventListener('blur', blur);
  dispose = () => {
    if (frame !== null) cancelAnimationFrame(frame);
    window.removeEventListener('pointerup', release);
    window.removeEventListener('pointercancel', release);
    window.removeEventListener('blur', blur);
  };
  prompt();
}

function dragActivity() {
  const puzzle = { name: 'House', parts: [
    {type:'square',x:65,y:48,w:112,h:112}, {type:'triangle',x:65,y:26,w:128,h:90}, {type:'rectangle',x:65,y:52,w:45,h:64},
    {type:'rectangle',x:84,y:48,w:46,h:100}, {decor:'tree',type:'circle',x:84,y:25,w:98,h:98}
  ] };
  $('#activity-title').textContent = `Build a ${puzzle.name.toLowerCase()}`;
  goal('<span class="gesture-pair">◇ → ◇</span>', 'Drag each shape onto its outline');
  task('Drag → match → let go.');
  const targets = []; let matched = 0;
  const cancellations = [];
  count(0, puzzle.parts.length, 'pieces');
  const size = Math.min(1, stage.clientWidth / 900, stage.clientHeight / 340);
  for (const part of puzzle.parts) {
    const home = document.createElement('div'); home.className = 'picture-target'; home.dataset.shape = part.type;
    if (part.decor) home.classList.add(part.decor);
    home.style.left = (stage.clientWidth * part.x / 100) + 'px';
    home.style.top = (stage.clientHeight * part.y / 100) + 'px';
    home.style.width = part.w * size + 'px'; home.style.height = part.h * size + 'px';
    home.innerHTML = shapeArt(part.type, true);
    if (part.flame) home.classList.add('flame-piece');
    stage.append(home);
    targets.push({ home, type: part.type, part, filled: false });
  }
  puzzle.parts.forEach((part, i) => {
    const type = part.type;
    const b = objectButton(type, type, 'drag-object picture-piece');
    b.innerHTML = shapeArt(type) + `<small>${type}</small>`;
    b.style.left = (22 + i % 3 * 10) + '%'; b.style.top = (25 + Math.floor(i / 3) * 28) + '%';
    b.setAttribute('aria-label', `Drag ${type} ${i + 1}`);
    let drag = null, keyboard = false, placed = false, origin = null;
    function reset() {
      if (placed) return;
      if (origin) { b.style.left = origin.left; b.style.top = origin.top; }
      drag = null; keyboard = false; b.classList.remove('dragging'); b.setAttribute('aria-pressed', 'false');
    }
    function drop(cancel = false) {
      const s = b.getBoundingClientRect();
      const destination = targets.find(t => {
        if (t.filled || t.type !== type) return false;
        const r = t.home.getBoundingClientRect();
        return Math.abs(s.x + s.width / 2 - r.x - r.width / 2) < Math.max(18, r.width * .48) && Math.abs(s.y + s.height / 2 - r.y - r.height / 2) < Math.max(18, r.height * .48);
      });
      if (!cancel && destination) {
        placed = true; drag = null; keyboard = false; b.hidden = true;
        destination.filled = true; destination.home.classList.add('placed');
        destination.home.innerHTML = shapeArt(type);
        count(++matched, puzzle.parts.length, 'pieces');
        if (matched === puzzle.parts.length) { goal('<strong class="goal-number">✓</strong>', 'Picture complete'); completeRound(`${puzzle.name} built! ✓`); }
        else feedback('✓ Fits! Next piece.', 'success');
      } else { reset(); feedback(cancel ? 'Try again.' : 'Match the outline. Try again.', 'retry'); }
    }
    function move(x, y) {
      b.style.left = Math.max(32, Math.min(stage.clientWidth - 32, x)) + 'px';
      b.style.top = Math.max(42, Math.min(stage.clientHeight - 40, y)) + 'px';
    }
    b.onpointerdown = e => {
      if (e.button !== 0 || placed || roundDone) return;
      e.preventDefault(); b.focus(); origin = { left: b.style.left, top: b.style.top };
      const r = b.getBoundingClientRect();
      drag = { id: e.pointerId, dx: e.clientX - (r.x + r.width / 2), dy: e.clientY - (r.y + r.height / 2) };
      b.setPointerCapture(e.pointerId); b.classList.add('dragging'); feedback('Hold → move → let go.');
    };
    b.onpointermove = e => { if (drag) { const r = stage.getBoundingClientRect(); move(e.clientX - r.x - drag.dx, e.clientY - r.y - drag.dy); } };
    b.onpointerup = e => { if (drag) { b.releasePointerCapture(e.pointerId); drop(); } };
    b.onpointercancel = () => drop(true);
    b.onkeydown = e => {
      if (roundDone || placed) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (keyboard) drop();
        else { origin = { left: b.style.left, top: b.style.top }; keyboard = true; b.classList.add('dragging'); b.setAttribute('aria-pressed', 'true'); feedback('Arrow keys → Enter to drop.'); }
      } else if (e.key === 'Escape') { e.preventDefault(); reset(); }
      else if (keyboard && e.key.startsWith('Arrow')) {
        e.preventDefault(); const r = b.getBoundingClientRect(), s = stage.getBoundingClientRect();
        move(r.x + r.width / 2 - s.x + (e.key === 'ArrowRight' ? 10 : e.key === 'ArrowLeft' ? -10 : 0), r.y + r.height / 2 - s.y + (e.key === 'ArrowDown' ? 10 : e.key === 'ArrowUp' ? -10 : 0));
      }
    };
    cancellations.push(reset); stage.append(b);
  });
  const cancel = () => cancellations.forEach(fn => fn());
  const resize = () => {
    cancel();
    const scale = Math.min(1, stage.clientWidth / 900, stage.clientHeight / 340);
    targets.forEach(({home, part}) => {
      home.style.left = (stage.clientWidth * part.x / 100) + 'px';
      home.style.top = (stage.clientHeight * part.y / 100) + 'px';
      home.style.width = part.w * scale + 'px'; home.style.height = part.h * scale + 'px';
    });
  };
  window.addEventListener('blur', cancel); window.addEventListener('resize', resize);
  dispose = () => { window.removeEventListener('blur', cancel); window.removeEventListener('resize', resize); };
}
function leftMouseCue(index) {
  const captions = ['Left click', 'Click-click', 'Hold left + move'];
  return `<div class="left-mouse-cue"><svg viewBox="0 0 100 105" role="img" aria-label="${captions[index]}"><rect x="20" y="5" width="62" height="88" rx="30" fill="white" stroke="#345b72" stroke-width="3"/><path d="M51 6C33 6 21 19 21 36V44H51Z" fill="#ecaa26" stroke="#85540d" stroke-width="2"/><path d="M20 44H82M51 6V44" stroke="#345b72" stroke-width="2"/><rect x="47" y="17" width="8" height="21" rx="4" fill="white" stroke="#345b72" stroke-width="2"/></svg><strong>${captions[index]}</strong></div>`;
}
function rightMouseCue(shift = false) {
  return `<div class="right-mouse-cue">${shift ? '<kbd>Shift</kbd><b>+</b>' : ''}<svg viewBox="0 0 110 108" role="img" aria-label="Hold the right mouse button and move the mouse"><rect x="20" y="5" width="62" height="88" rx="30" fill="white" stroke="#345b72" stroke-width="3"/><path d="M51 6C69 6 81 19 81 36V44H51Z" fill="#ecaa26" stroke="#85540d" stroke-width="2"/><path d="M20 44H82M51 6V44" stroke="#345b72" stroke-width="2"/><rect x="47" y="17" width="8" height="21" rx="4" fill="white" stroke="#345b72" stroke-width="2"/><path d="M13 101H89M21 95L13 101 21 107M81 95L89 101 81 107" fill="none" stroke="#176b91" stroke-width="3"/></svg><strong>${shift ? 'Hold Shift + right' : 'Hold right + move'}</strong>${shift ? '<small>Move → park → let go</small>' : '<small>Turn → match → let go</small>'}</div>`;
}
function celebrate(finale = false) {
  const layer = $('#celebration');
  layer.className = '';
  layer.innerHTML = `<div class="celebration-badge"><span>${finale ? '★' : '✓'}</span><strong>${finale ? 'All 7 skills complete!' : activities[current].name + ' complete!'}</strong></div>` + Array.from({length: finale ? 90 : 10}, (_, i) => `<i style="--x:${(i * 37) % 100}%;--delay:${(i % 9) * .07}s;--spin:${i % 2 ? 540 : -540}deg;--color:${['#ecaa26','#267ea4','#df6840','#68aa70','#9b69b5'][i % 5]};--drift:${(i % 7 - 3) * 35}px"></i>`).join('');
  // Restart the CSS animation when students finish another skill quickly.
  void layer.offsetWidth;
  layer.className = finale ? 'celebration finale' : 'celebration skill-celebration';
}
function scrollMouseArt() {
  return '<svg class="scroll-mouse-picture" viewBox="0 0 150 105" role="img" aria-label="Roll the mouse wheel up or down"><rect x="35" y="6" width="62" height="91" rx="30" fill="white" stroke="#345b72" stroke-width="3"/><path d="M35 44H97M66 7V44" stroke="#345b72" stroke-width="2"/><rect x="59" y="17" width="14" height="29" rx="7" fill="#ecaa26" stroke="#85540d" stroke-width="2"/><path d="M61 25H71M61 31H71M61 37H71" stroke="#85540d" stroke-width="2"/><path d="M118 17V78M108 28L118 17 128 28M108 67L118 78 128 67" fill="none" stroke="#176b91" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
}
function readyToContinue(ready, finish) {
  pendingCompletion = ready ? finish : null;
  $('#next').disabled = !ready;
  $('#next').textContent = ready ? (activeRound + 1 < activities[current].rounds ? 'Next round →' : 'Next skill →') : 'Finish the task first';
  $('#check-view').disabled = !ready;
  $('#check-view').classList.toggle('ready', ready);
  $('#check-view').textContent = ready ? '✓ Next →' : 'Match the target';
}
function scrollActivity() {
  stage.insertAdjacentHTML('beforeend', '<div class="shape-library search-cards" tabindex="0" role="region" aria-label="Scroll to find the matching card"><div class="library-heading">SCROLL ↕</div><div class="library-list"></div></div>');
  const shapes = ['square', 'circle', 'triangle', 'rectangle', 'hexagon'];
  const orders = [[7, 1]];
  const order = orders[activeRound]; let found = 0;
  function card(i) { return shapeArt(shapes[i % shapes.length]) + `<strong class="card-number">${i + 1}</strong>`; }
  function prompt() {
    const i = order[found];
    goal(card(i), `Find ${shapes[i % shapes.length]} card ${i + 1}`);
    task('Roll the wheel. Find this card. Click it.'); count(found, 2, 'matches');
  }
  for (let i = 0; i < 12; i++) {
    const b = document.createElement('button'); b.className = 'library-shape search-card'; b.innerHTML = card(i);
    b.setAttribute('aria-label', `${shapes[i % shapes.length]} card ${i + 1}`);
    b.onclick = () => {
      if (roundDone) return;
      if (i !== order[found]) { feedback('Match the picture AND number.', 'retry'); return; }
      b.classList.add('placed'); b.disabled = true; found++; count(found, 2, 'matches');
      if (found === 2) { goal('<strong class="goal-number">✓</strong>', 'Both cards found'); completeRound('Both matches found! ✓'); }
      else { prompt(); feedback('✓ Match! Find the new card.', 'success'); }
    };
    $('.library-list').append(b);
  }
  prompt();
}
function cubeMarkup() {
  return '<div class="cube"><div class="face front">●</div><div class="face back">★</div><div class="face right">＋</div><div class="face left">▲</div><div class="face top">■</div><div class="face bottom"></div></div>';
}
function scene() {
  stage.innerHTML = `<div class="view-scene" tabindex="0" role="region" aria-label="3D workplane"><div class="scene-model"><div class="model-grid"></div>${cubeMarkup()}</div></div>`;
  return $('.view-scene');
}
function zoomActivity() {
  const sizes = [1.5, .75, 1.8, 1];
  const target = sizes[activeRound], tolerance = activeRound === 0 ? .1 : .05;
  if (activeRound === 0) modelScale = 1;
  stage.innerHTML = `<div class="zoom-game" tabindex="0" role="region" aria-label="Zoom the rocket to fit the dashed frame"><div class="zoom-frame" aria-hidden="true"></div><div class="zoom-picture">${rocketArt()}</div></div><div class="view-controls"><button id="zoom-out" aria-label="Zoom out">−</button><button id="zoom-in" aria-label="Zoom in">+</button></div><button class="check-view" id="check-view" disabled>Match the target</button>`;
  const view = $('.zoom-game');
  $('.zoom-frame').style.width = 100 * target + 'px'; $('.zoom-frame').style.height = 140 * target + 'px';
  goal('<span class="frame-icon">↔</span>', 'Zoom to fit the frame'); task('Roll the wheel to fit the frame.');
  const aligned = () => Math.abs(modelScale - target) <= tolerance + .001;
  function update(delta = 0) {
    if (roundDone) return;
    modelScale = Math.max(.5, Math.min(2.1, Math.round((modelScale + delta) * 100) / 100));
    $('.zoom-picture').style.transform = `translate(-50%, -50%) scale(${modelScale})`;
    $('.zoom-frame').classList.toggle('ready', aligned());
    readyToContinue(aligned(), () => { count(activeRound + 1, sizes.length, 'frames'); completeRound('Perfect fit! ✓'); });
    feedback(aligned() ? '✓ Fits! Click Next.' : modelScale < target ? 'Roll up ↑' : 'Roll down ↓');
    count(activeRound, sizes.length, 'frames');
  }
  view.addEventListener('wheel', e => { if (e.ctrlKey || e.metaKey) return; e.preventDefault(); if (e.deltaY) update(-Math.sign(e.deltaY) * .05); }, { passive: false });
  view.onkeydown = e => { if (['+', '=', '-', '_'].includes(e.key)) { e.preventDefault(); update(['-', '_'].includes(e.key) ? -.05 : .05); } };
  $('#zoom-in').onclick = () => update(.05); $('#zoom-out').onclick = () => update(-.05);
  $('#check-view').onclick = () => $('#next').onclick();
  update();
}
function orbitActivity() {
  const targets = [{ angle: 180, symbol: '★', name: 'star' }, { angle: 90, symbol: '▲', name: 'triangle' }];
  const target = targets[activeRound];
  if (activeRound === 0) modelAngle = -32;
  const view = scene(); let drag = null;
  stage.insertAdjacentHTML('beforeend', '<button class="check-view" id="check-view" disabled>Match the target</button>');
  goal(`<span class="goal-symbol">${target.symbol}</span>`, `Find the ${target.name} on the cube`);
  task('Hold right + move. Match the symbol.');
  const aligned = () => Math.abs(((modelAngle - target.angle + 540) % 360 + 360) % 360 - 180) <= 20;
  function update() {
    $('.cube').style.transform = `rotateX(-22deg) rotateY(${modelAngle}deg)`;
    $('.model-grid').style.transform = `rotateX(65deg) rotateZ(${-modelAngle}deg)`;
    readyToContinue(aligned() && !drag, () => { count(activeRound + 1, targets.length, 'faces'); completeRound('Symbol found! ✓'); });
    feedback(aligned() ? '✓ Match! Let go, then click Next.' : 'Hold right + turn ↔');
  }
  view.oncontextmenu = e => e.preventDefault();
  view.onpointerdown = e => {
    if (roundDone) return;
    if (e.button !== 2) { feedback('Use the RIGHT button ↔', 'retry'); return; }
    e.preventDefault(); drag = { x: e.clientX, angle: modelAngle }; view.setPointerCapture(e.pointerId); update();
  };
  view.onpointermove = e => { if (drag) { modelAngle = drag.angle + (e.clientX - drag.x) * .8; update(); } };
  view.onpointerup = view.onpointercancel = e => { drag = null; if (view.hasPointerCapture(e.pointerId)) view.releasePointerCapture(e.pointerId); update(); };
  view.onkeydown = e => { if (!roundDone && ['ArrowLeft', 'ArrowRight'].includes(e.key)) { e.preventDefault(); modelAngle += e.key === 'ArrowRight' ? 10 : -10; update(); } };
  const cancel = () => { drag = null; }; window.addEventListener('blur', cancel); dispose = () => window.removeEventListener('blur', cancel);
  $('#check-view').onclick = () => $('#next').onclick();
  count(activeRound, targets.length, 'faces'); update();
}
function panActivity() {
  stage.innerHTML = '<div class="pan-view" tabindex="0" role="region" aria-label="Pan workplane"><div class="pan-world"><div class="pan-marker">' + roverArt() + '</div><div class="pan-block block-one">■</div><div class="pan-block block-two">●</div></div><div class="pan-goal" aria-hidden="true">P</div></div><span class="key-state" id="key-state">Shift: not held</span>';
  const view = $('.pan-view'), world = $('.pan-world');
  const offsets = [[-.26, -.2], [.26, -.2]];
  let x = stage.clientWidth * offsets[activeRound][0], y = stage.clientHeight * offsets[activeRound][1];
  let drag = null, keyboardMoved = false;
  const tolerance = activeRound === 0 ? 32 : 19;
  $('.pan-goal').style.width = (tolerance * 2 + 64) + 'px';
  $('.pan-goal').style.height = (tolerance * 2 + 48) + 'px';
  goal(roverArt() + '<span class="parking-icon">P</span>', 'Move the rover into the parking space');
  task('Shift + right drag → park.');
  const aligned = () => Math.hypot(x, y) <= tolerance;
  function update() {
    world.style.transform = `translate(${x}px, ${y}px)`;
    $('.pan-goal').classList.toggle('ready', aligned());
    if (aligned()) feedback('✓ Parked! Keep Shift held. Let go of the mouse.');
  }
  function keyState(held) { $('#key-state').textContent = held ? '✓ Shift held' : 'Shift: not held'; $('#key-state').classList.toggle('held', held); }
  function check() {
    if (aligned()) { count(activeRound + 1, offsets.length, 'positions'); goal('<strong class="goal-number">✓</strong>', 'Rover parked'); completeRound('Rover parked! ✓'); }
    else feedback('Move the rover into P.', 'retry');
  }
  view.oncontextmenu = e => e.preventDefault();
  view.onpointerdown = e => {
    if (roundDone) return;
    if (e.button !== 2 || !e.shiftKey) { feedback('Hold Shift + RIGHT button.', 'retry'); return; }
    e.preventDefault(); view.focus(); keyState(true);
    drag = { px: e.clientX, py: e.clientY, x, y }; view.setPointerCapture(e.pointerId);
  };
  view.onpointermove = e => {
    if (!drag) return;
    if (!e.shiftKey) { drag = null; keyState(false); feedback('Keep Shift held. Try again.', 'retry'); return; }
    x = Math.max(-stage.clientWidth * .6, Math.min(stage.clientWidth * .6, drag.x + e.clientX - drag.px));
    y = Math.max(-stage.clientHeight * .6, Math.min(stage.clientHeight * .6, drag.y + e.clientY - drag.py)); update();
  };
  view.onpointerup = e => {
    if (view.hasPointerCapture(e.pointerId)) view.releasePointerCapture(e.pointerId);
    if (!drag) return;
    drag = null;
    if (!e.shiftKey) { keyState(false); feedback('Keep Shift held. Let go of the mouse first.', 'retry'); return; }
    check();
  };
  view.onpointercancel = () => { drag = null; feedback('Hold Shift and try again.', 'retry'); };
  view.onkeydown = e => {
    if (roundDone || !e.shiftKey || !e.key.startsWith('Arrow')) return;
    e.preventDefault(); keyboardMoved = true; x += e.key === 'ArrowRight' ? 10 : e.key === 'ArrowLeft' ? -10 : 0; y += e.key === 'ArrowDown' ? 10 : e.key === 'ArrowUp' ? -10 : 0; update();
  };
  const down = e => { if (e.key === 'Shift') keyState(true); };
  const up = e => {
    if (e.key !== 'Shift') return;
    keyState(false);
    if (drag) { drag = null; feedback('Keep Shift held. Try again.', 'retry'); }
    if (keyboardMoved && !roundDone) { keyboardMoved = false; check(); }
  };
  const blur = () => { drag = null; keyboardMoved = false; keyState(false); };
  window.addEventListener('keydown', down); window.addEventListener('keyup', up); window.addEventListener('blur', blur);
  dispose = () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', blur); };
  count(activeRound, offsets.length, 'positions'); update();
}
$('#steps').onclick = e => { const b = e.target.closest('[data-step]'); if (b && !b.disabled) render(Number(b.dataset.step), true); };
$('#next').onclick = () => {
  if (!roundDone && pendingCompletion) { const finish = pendingCompletion; pendingCompletion = null; finish(); }
  if (!roundDone) return;
  if (activeRound + 1 < activities[current].rounds) { render(current, true, activeRound + 1); return; }
  if (current < activities.length - 1) { render(current + 1, true); return; }
  dispose(); dispose = () => {};
  stage.className = 'stage';
  stage.innerHTML = '<div class="finish"><div class="finish-mark">★</div><h3>All 7 skills complete!</h3><p>✓ Click · ✓ Double-click · ✓ Drag<br>✓ Scroll · ✓ Zoom · ✓ Orbit · ✓ Pan</p><button class="primary" id="play-again">Start again</button></div>';
  goal('<strong class="goal-number">✓</strong>', 'All rounds complete'); task(`${activities.reduce((total, a) => total + a.rounds, 0)} rounds complete!`);
  $('#task-label').textContent = '✓ ALL SKILLS COMPLETE';
  $('#task-mouse').hidden = true;
  $('#task-controls').innerHTML = '';
  $('#activity-title').textContent = 'All skills complete';
  $('#step-label').textContent = 'PRACTICE COMPLETE';
  $('#instruction').textContent = 'All seven skills practiced.';
  $('#tip').textContent = 'Play again or choose a skill.';
  $('.mouse-guide').hidden = true;
  $('.keyboard-help').hidden = true;
  const totalRounds = activities.reduce((total, a) => total + a.rounds, 0);
  $('#counter').textContent = `${totalRounds} / ${totalRounds} rounds`;
  feedback('✓ All done!', 'success');
  celebrate(true);
  $('#next').disabled = true; $('#next').textContent = 'Practice complete';
  $('#play-again').onclick = () => { $('#celebration').innerHTML = ''; progress.fill(0); modelAngle = -32; modelScale = 1; render(0, true); };
};
$('#retry').onclick = () => { $('#celebration').innerHTML = ''; render(current, true, activeRound); };
render(0);
