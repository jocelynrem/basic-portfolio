'use strict';
const $ = selector => document.querySelector(selector);
const stage = $('#stage');
const activities = [
  { name: 'Click', title: 'Select shapes', rounds: 3, guide: 'left', caption: 'Left click', instruction: 'Read the task above the workplane. Point at the requested shape, then click the left button once.', tip: 'An orange outline shows the shape you selected.', keyboard: 'Tab to a shape and press Enter.' },
  { name: 'Drag', title: 'Place shapes', rounds: 3, guide: 'left', caption: 'Hold left → move → release', instruction: 'Hold the left button on a shape. Move its center into the matching outline, then release the button.', tip: 'Keep holding the button until you reach the outline. Later rounds use smaller targets.', keyboard: 'Tab to a shape. Press Enter to pick it up, use arrow keys to move it, then Enter to drop it. Escape cancels.' },
  { name: 'Scroll', title: 'Find shapes in a list', rounds: 3, guide: 'wheel', caption: 'Scroll, then left click', instruction: 'Put your pointer over the shapes panel. Roll the wheel to find the requested shape, then click it.', tip: 'In a shapes panel, the wheel scrolls the list. Over a 3D workplane, it zooms the view.', keyboard: 'Focus the shapes panel and use arrow keys to scroll, or Tab between its shape buttons and press Enter.' },
  { name: 'Zoom', title: 'Control the view size', rounds: 4, guide: 'wheel', caption: 'Roll wheel → click Check view', instruction: 'Point at the workplane. Roll up to zoom in or down to zoom out. Stop in the requested range, then click Check view.', tip: 'Zoom changes your view. It does not resize the model.', keyboard: 'Focus the workplane and press + or −, or use the zoom buttons. Click Check view when ready.' },
  { name: 'Orbit', title: 'View different sides', rounds: 3, guide: 'right', caption: 'Hold right → move → release', instruction: 'Hold the right mouse button over the workplane and move sideways. Release when the requested face points toward you. Click Check view.', tip: 'Orbit changes your viewing angle around a model.', keyboard: 'Focus the workplane and use left and right arrows. Click Check view when ready.' },
  { name: 'Pan', title: 'Use a key and the mouse', rounds: 3, guide: 'right', caption: 'Shift + hold right → drag', instruction: 'Hold Shift on the keyboard. While holding it, hold the right mouse button and drag the workplane. Move the orange marker into the center target, then release the mouse button.', tip: 'Keep Shift held until you release the mouse. Panning moves the whole view, not just one shape.', keyboard: 'Focus the workplane, hold Shift and use arrow keys to move the view. Release Shift to check your position.' }
];
const symbols = { box: '■', cylinder: '●', roof: '▲', star: '★', diamond: '◆', ring: '◎' };
const progress = activities.map(() => 0);
let current = 0;
let roundDone = false;
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
  feedback('Success — click the green button to continue.', 'success');
  const finished = activeRound + 1 === activities[current].rounds;
  $('#next').disabled = false;
  $('#next').textContent = finished ? (current === activities.length - 1 ? 'Finish practice →' : 'Next skill →') : 'Next round →';
  renderSteps();
}
let activeRound = 0;
function roundIndex() { return activeRound; }
function renderSteps() {
  $('#steps').innerHTML = activities.map((a, i) => {
    const done = progress[i] === a.rounds;
    const locked = i > 0 && progress[i - 1] < activities[i - 1].rounds;
    return `<button class="step ${done ? 'done' : ''}" data-step="${i}" ${i === current ? 'aria-current="step"' : ''} ${locked ? 'disabled' : ''}><span class="step-number">${done ? '✓' : i + 1}</span><span>${a.name}<small>${locked ? 'Locked' : `${progress[i]} / ${a.rounds} rounds`}</small></span></button>`;
  }).join('');
}
function render(index, focus = false, requestedRound = null) {
  dispose(); dispose = () => {};
  if ('speechSynthesis' in window) speechSynthesis.cancel();
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
  $('#task-label').textContent = 'DO THIS NEXT';
  $('#next').textContent = 'Complete this round';
  $('#next').disabled = true;
  $('#counter').textContent = '';
  stage.className = 'stage';
  stage.innerHTML = '';
  stage.onpointerdown = stage.onpointermove = stage.onpointerup = stage.onpointercancel = stage.onkeydown = stage.oncontextmenu = null;
  feedback('Follow the task above the workplane.');
  [clickActivity, dragActivity, scrollActivity, zoomActivity, orbitActivity, panActivity][index]();
  if (focus) $('#activity-title').focus();
}
function workplane(label = 'TOP VIEW') {
  stage.insertAdjacentHTML('beforeend', `<span class="view-tag" aria-hidden="true">${label}</span><span class="plane-label" aria-hidden="true">WORKPLANE</span>`);
}
function objectButton(type, label, className = 'model-object') {
  const button = document.createElement('button');
  button.className = `${className} object-${type}`;
  button.innerHTML = `<span aria-hidden="true">${symbols[type]}</span><small>${label}</small>`;
  button.setAttribute('aria-label', label);
  return button;
}
function clickActivity() {
  workplane();
  const plans = [
    [['box', '1'], ['cylinder', '2'], ['roof', '3'], ['box', '4']],
    [['box', 'Box A'], ['cylinder', 'Cylinder A'], ['roof', 'Roof A'], ['box', 'Box B'], ['cylinder', 'Cylinder B']],
    [['box', 'Box A'], ['cylinder', 'Cylinder A'], ['roof', 'Roof A'], ['box', 'Box B'], ['cylinder', 'Cylinder B'], ['roof', 'Roof B']]
  ];
  const items = plans[activeRound];
  const order = activeRound === 0 ? [0, 1, 2, 3] : activeRound === 1 ? [3, 1, 2, 4, 0] : [4, 0, 5, 1, 3, 2];
  let selected = 0;
  const positions = [[15, 18], [45, 16], [73, 20], [19, 60], [48, 58], [76, 62]];
  function prompt() { task(`LEFT CLICK: Select ${items[order[selected]][1]}.`); count(selected, items.length, 'selections'); }
  items.forEach(([type, label], i) => {
    const b = objectButton(type, label);
    b.style.left = positions[i][0] + '%'; b.style.top = positions[i][1] + '%';
    b.classList.toggle('smaller', activeRound === 2);
    b.onclick = () => {
      if (roundDone || b.disabled) return;
      if (i !== order[selected]) { feedback(`That is ${label}. Find ${items[order[selected]][1]}.`, 'retry'); return; }
      b.classList.add('placed'); b.disabled = true; b.innerHTML += '<b class="object-check" aria-hidden="true">✓</b>';
      selected++; count(selected, items.length, 'selections');
      if (selected === items.length) completeRound(`Selected all ${items.length} shapes correctly.`);
      else { prompt(); feedback(`✓ ${label} selected. Now find ${items[order[selected]][1]}.`, 'success'); }
    };
    stage.append(b);
  });
  prompt();
}
function dragActivity() {
  workplane();
  const types = activeRound === 0 ? ['box', 'cylinder'] : ['box', 'cylinder', 'roof'];
  let matched = 0;
  const cancellations = [];
  task('DRAG: Hold the left button on a shape. Release it in the matching outline.');
  count(0, types.length, 'placements');
  types.forEach((type, i) => {
    const row = types.length === 2 ? 25 + i * 43 : 15 + i * 30;
    const goalRow = activeRound === 2 ? 15 + (2 - i) * 30 : row;
    const home = document.createElement('div');
    home.className = 'drop-target'; home.dataset.shape = type;
    home.style.left = (activeRound === 2 ? 64 : 73) + '%'; home.style.top = goalRow + '%';
    home.style.width = home.style.height = (activeRound === 0 ? 94 : activeRound === 1 ? 80 : 68) + 'px';
    home.innerHTML = `<span aria-hidden="true">${symbols[type]}</span><small>${type}</small>`;
    const b = objectButton(type, type, 'drag-object');
    b.style.left = '17%'; b.style.top = row + '%';
    b.setAttribute('aria-label', `Drag ${type}`);
    let drag = null, keyboard = false, placed = false;
    let origin = null;
    function reset() {
      if (placed) return;
      if (origin) { b.style.left = origin.left; b.style.top = origin.top; }
      drag = null; keyboard = false; b.classList.remove('dragging'); b.setAttribute('aria-pressed', 'false');
    }
    function drop(cancel = false) {
      const r = home.getBoundingClientRect(), s = b.getBoundingClientRect();
      const near = Math.abs(s.x + s.width / 2 - r.x - r.width / 2) < r.width * .42 && Math.abs(s.y + s.height / 2 - r.y - r.height / 2) < r.height * .42;
      if (!cancel && near) {
        placed = true; drag = null; keyboard = false; b.hidden = true; home.classList.add('placed');
        home.innerHTML = `<b>✓</b><small>${type} placed</small>`;
        count(++matched, types.length, 'placements');
        if (matched === types.length) completeRound(`Placed all ${types.length} shapes on the workplane.`);
        else feedback(`✓ ${type} placed. Drag the next shape.`, 'success');
      } else { reset(); feedback(cancel ? 'Drag canceled. Try again.' : 'Release closer to the center of the matching outline.', 'retry'); }
    }
    function move(x, y) {
      b.style.left = Math.max(32, Math.min(stage.clientWidth - 32, x)) + 'px';
      b.style.top = Math.max(42, Math.min(stage.clientHeight - 40, y)) + 'px';
    }
    b.onpointerdown = e => {
      if (e.button !== 0 || placed || roundDone) return;
      e.preventDefault(); b.focus();
      origin = { left: b.style.left, top: b.style.top };
      const r = b.getBoundingClientRect();
      drag = { id: e.pointerId, dx: e.clientX - (r.x + r.width / 2), dy: e.clientY - (r.y + r.height / 2) };
      b.setPointerCapture(e.pointerId); b.classList.add('dragging');
      feedback(`Holding ${type}. Keep the left button down and move to its outline.`);
    };
    b.onpointermove = e => {
      if (!drag) return;
      const r = stage.getBoundingClientRect(); move(e.clientX - r.x - drag.dx, e.clientY - r.y - drag.dy);
    };
    b.onpointerup = e => { if (!drag) return; b.releasePointerCapture(e.pointerId); drop(); };
    b.onpointercancel = () => drop(true);
    b.onkeydown = e => {
      if (roundDone || placed) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (keyboard) drop();
        else { origin = { left: b.style.left, top: b.style.top }; keyboard = true; b.classList.add('dragging'); b.setAttribute('aria-pressed', 'true'); feedback(`Picked up ${type}. Use arrow keys, then Enter to drop.`); }
      } else if (e.key === 'Escape') { e.preventDefault(); reset(); }
      else if (keyboard && e.key.startsWith('Arrow')) {
        e.preventDefault(); const r = b.getBoundingClientRect(), s = stage.getBoundingClientRect();
        move(r.x + r.width / 2 - s.x + (e.key === 'ArrowRight' ? 10 : e.key === 'ArrowLeft' ? -10 : 0), r.y + r.height / 2 - s.y + (e.key === 'ArrowDown' ? 10 : e.key === 'ArrowUp' ? -10 : 0));
      }
    };
    cancellations.push(reset);
    stage.append(home, b);
  });
  const cancel = () => cancellations.forEach(fn => fn());
  window.addEventListener('blur', cancel);
  dispose = () => window.removeEventListener('blur', cancel);
}
function scrollActivity() {
  workplane();
  stage.insertAdjacentHTML('beforeend', '<div class="panel-context">Find shapes in the list →<br><small>Scroll inside the shapes panel.</small></div><div class="shape-library" tabindex="0" role="region" aria-label="Shapes panel"><div class="library-heading">Basic shapes</div><div class="library-list"></div></div>');
  const names = ['box', 'cylinder', 'roof', 'star', 'diamond', 'ring'];
  const orders = [[5, 0], [4, 1], [5, 2]];
  const order = orders[activeRound]; let found = 0;
  function prompt() { task(`SCROLL, THEN LEFT CLICK: Find the ${names[order[found]]} in the shapes panel.`); count(found, 2, 'shapes'); }
  names.forEach((name, i) => {
    const b = objectButton(name, name, 'library-shape');
    b.onclick = () => {
      if (roundDone) return;
      if (i !== order[found]) { feedback(`That is the ${name}. Scroll to find the ${names[order[found]]}.`, 'retry'); return; }
      b.classList.add('placed'); found++; count(found, 2, 'shapes');
      if (found === 2) completeRound('Found both shapes by scrolling down and back up.');
      else { prompt(); feedback(`✓ ${name} selected. Scroll up to find the next shape.`, 'success'); }
    };
    $('.library-list').append(b);
  });
  prompt();
}
function cubeMarkup() {
  return '<div class="cube"><div class="face front">●</div><div class="face back">★</div><div class="face right">＋</div><div class="face left">◆</div><div class="face top">■</div><div class="face bottom"></div></div>';
}
function scene() {
  stage.innerHTML = `<div class="view-scene" tabindex="0" role="region" aria-label="3D workplane"><div class="scene-model"><div class="model-grid"></div>${cubeMarkup()}</div></div><span class="view-tag" id="view-label">3D VIEW</span><span class="plane-label" aria-hidden="true">WORKPLANE</span>`;
  return $('.view-scene');
}
function zoomActivity() {
  const ranges = [[140, 160], [70, 90], [170, 190], [95, 110]];
  const [low, high] = ranges[activeRound];
  if (activeRound === 0) modelScale = 1;
  const view = scene();
  stage.insertAdjacentHTML('beforeend', '<div class="view-controls"><button id="zoom-out" aria-label="Zoom out">−</button><button id="zoom-in" aria-label="Zoom in">+</button></div><button class="check-view" id="check-view">Check view</button>');
  task(`ZOOM: Reach ${low}–${high}%, then LEFT CLICK “Check view”.`);
  function update(delta = 0) {
    if (roundDone) return;
    modelScale = Math.max(.5, Math.min(2.1, Math.round((modelScale + delta) * 100) / 100));
    $('.scene-model').style.transform = `scale(${modelScale})`;
    $('#view-label').textContent = `ZOOM ${Math.round(modelScale * 100)}%`;
    const ready = modelScale * 100 >= low && modelScale * 100 <= high;
    $('#check-view').classList.toggle('ready', ready);
    feedback(ready ? 'In range. Left click Check view to confirm.' : `Use the wheel to reach ${low}–${high}%.`);
    count(activeRound, ranges.length, 'views');
  }
  view.addEventListener('wheel', e => { if (e.ctrlKey || e.metaKey) return; e.preventDefault(); if (e.deltaY) update(-Math.sign(e.deltaY) * .05); }, { passive: false });
  view.onkeydown = e => { if (['+', '=', '-', '_'].includes(e.key)) { e.preventDefault(); update(['-', '_'].includes(e.key) ? -.05 : .05); } };
  $('#zoom-in').onclick = () => update(.05); $('#zoom-out').onclick = () => update(-.05);
  $('#check-view').onclick = () => {
    if (roundDone) return;
    if (modelScale * 100 >= low && modelScale * 100 <= high) { count(activeRound + 1, 4, 'views'); completeRound(`View checked at ${Math.round(modelScale * 100)}%.`); }
    else feedback(`Not in range yet. Aim for ${low}–${high}%, then click Check view.`, 'retry');
  };
  update();
}
function orbitActivity() {
  const targets = [{ angle: 180, name: 'star ★ on the back' }, { angle: 90, name: 'diamond ◆ on the left' }, { angle: 0, name: 'circle ● on the front' }];
  const target = targets[activeRound];
  if (activeRound === 0) modelAngle = -32;
  const view = scene(); let drag = null;
  stage.insertAdjacentHTML('beforeend', '<button class="check-view" id="check-view">Check view</button>');
  task(`ORBIT: Face the ${target.name} toward you. Then LEFT CLICK “Check view”.`);
  const aligned = () => Math.abs(((modelAngle - target.angle + 540) % 360 + 360) % 360 - 180) <= 20;
  function update() {
    $('.cube').style.transform = `rotateX(-22deg) rotateY(${modelAngle}deg)`;
    $('.model-grid').style.transform = `rotateX(65deg) rotateZ(${-modelAngle}deg)`;
    $('#check-view').classList.toggle('ready', aligned());
    if (aligned()) feedback('Face in position. Release the right button, then left click Check view.');
  }
  view.oncontextmenu = e => e.preventDefault();
  view.onpointerdown = e => {
    if (roundDone) return;
    if (e.button !== 2) { feedback('Use the RIGHT mouse button to look around.', 'retry'); return; }
    e.preventDefault(); drag = { x: e.clientX, angle: modelAngle }; view.setPointerCapture(e.pointerId);
  };
  view.onpointermove = e => { if (drag) { modelAngle = drag.angle + (e.clientX - drag.x) * .8; update(); } };
  view.onpointerup = view.onpointercancel = e => { drag = null; if (view.hasPointerCapture(e.pointerId)) view.releasePointerCapture(e.pointerId); };
  view.onkeydown = e => { if (!roundDone && ['ArrowLeft', 'ArrowRight'].includes(e.key)) { e.preventDefault(); modelAngle += e.key === 'ArrowRight' ? 10 : -10; update(); } };
  const cancel = () => { drag = null; }; window.addEventListener('blur', cancel); dispose = () => window.removeEventListener('blur', cancel);
  $('#check-view').onclick = () => {
    if (roundDone) return;
    if (aligned()) { count(activeRound + 1, 3, 'faces'); completeRound(`View checked: ${target.name}.`); }
    else feedback(`Keep orbiting until the ${target.name} faces you.`, 'retry');
  };
  count(activeRound, 3, 'faces'); update();
}
function panActivity() {
  stage.innerHTML = '<div class="pan-view" tabindex="0" role="region" aria-label="Pan workplane"><div class="pan-world"><div class="pan-marker">＋<small>MOVE TO CENTER</small></div><div class="pan-block block-one">■</div><div class="pan-block block-two">●</div></div><div class="pan-goal" aria-hidden="true">＋</div></div><span class="view-tag">TOP VIEW</span><span class="key-state" id="key-state">Shift: not held</span><span class="plane-label" aria-hidden="true">WORKPLANE</span>';
  const view = $('.pan-view'), world = $('.pan-world');
  const offsets = [[-.26, -.2], [.26, -.2], [-.23, .22]];
  let x = stage.clientWidth * offsets[activeRound][0], y = stage.clientHeight * offsets[activeRound][1];
  let drag = null, keyboardMoved = false;
  const tolerance = activeRound === 0 ? 32 : activeRound === 1 ? 25 : 19;
  $('.pan-goal').style.width = $('.pan-goal').style.height = (tolerance * 2 + 24) + 'px';
  task('HOLD SHIFT + RIGHT DRAG: Move the orange marker into the center target. Release the mouse first.');
  const aligned = () => Math.hypot(x, y) <= tolerance;
  function update() {
    world.style.transform = `translate(${x}px, ${y}px)`;
    $('.pan-goal').classList.toggle('ready', aligned());
    if (aligned()) feedback('Marker centered. Keep Shift held and release the mouse button.');
  }
  function keyState(held) { $('#key-state').textContent = held ? '✓ Shift held' : 'Shift: not held'; $('#key-state').classList.toggle('held', held); }
  function check() {
    if (aligned()) { count(activeRound + 1, 3, 'positions'); completeRound('Panned the workplane using Shift and a drag.'); }
    else feedback('Keep panning until the orange marker is inside the center target.', 'retry');
  }
  view.oncontextmenu = e => e.preventDefault();
  view.onpointerdown = e => {
    if (roundDone) return;
    if (e.button !== 2 || !e.shiftKey) { feedback('Hold SHIFT, then hold the RIGHT mouse button and drag.', 'retry'); return; }
    e.preventDefault(); view.focus(); keyState(true);
    drag = { px: e.clientX, py: e.clientY, x, y }; view.setPointerCapture(e.pointerId);
  };
  view.onpointermove = e => {
    if (!drag) return;
    if (!e.shiftKey) { drag = null; keyState(false); feedback('Shift was released. Hold Shift and start the drag again.', 'retry'); return; }
    x = Math.max(-stage.clientWidth * .6, Math.min(stage.clientWidth * .6, drag.x + e.clientX - drag.px));
    y = Math.max(-stage.clientHeight * .6, Math.min(stage.clientHeight * .6, drag.y + e.clientY - drag.py)); update();
  };
  view.onpointerup = e => {
    if (view.hasPointerCapture(e.pointerId)) view.releasePointerCapture(e.pointerId);
    if (!drag) return;
    drag = null;
    if (!e.shiftKey) { keyState(false); feedback('Keep Shift held until after you release the mouse button.', 'retry'); return; }
    check();
  };
  view.onpointercancel = () => { drag = null; feedback('Drag canceled. Hold Shift and try again.', 'retry'); };
  view.onkeydown = e => {
    if (roundDone || !e.shiftKey || !e.key.startsWith('Arrow')) return;
    e.preventDefault(); keyboardMoved = true; x += e.key === 'ArrowRight' ? 10 : e.key === 'ArrowLeft' ? -10 : 0; y += e.key === 'ArrowDown' ? 10 : e.key === 'ArrowUp' ? -10 : 0; update();
  };
  const down = e => { if (e.key === 'Shift') keyState(true); };
  const up = e => {
    if (e.key !== 'Shift') return;
    keyState(false);
    if (drag) { drag = null; feedback('Keep Shift held through the whole drag. Try again.', 'retry'); }
    if (keyboardMoved && !roundDone) { keyboardMoved = false; check(); }
  };
  const blur = () => { drag = null; keyboardMoved = false; keyState(false); };
  window.addEventListener('keydown', down); window.addEventListener('keyup', up); window.addEventListener('blur', blur);
  dispose = () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', blur); };
  count(activeRound, 3, 'positions'); update();
}
$('#steps').onclick = e => { const b = e.target.closest('[data-step]'); if (b && !b.disabled) render(Number(b.dataset.step), true); };
$('#next').onclick = () => {
  if (!roundDone) return;
  if (activeRound + 1 < activities[current].rounds) { render(current, true, activeRound + 1); return; }
  if (current < activities.length - 1) { render(current + 1, true); return; }
  dispose(); dispose = () => {};
  stage.className = 'stage';
  stage.innerHTML = '<div class="finish"><div class="finish-mark">✓</div><h3>Practice complete</h3><p>You practiced selecting, placing, scrolling, zooming, orbiting, and panning.</p><button class="primary" id="play-again">Start again</button></div>';
  task('All 19 rounds complete. You can revisit a skill above.');
  $('#task-label').textContent = '✓ ALL SKILLS COMPLETE';
  $('#activity-title').textContent = 'All skills complete';
  $('#instruction').textContent = 'You completed 19 rounds of mouse and keyboard practice for working with 3D shapes.';
  $('#tip').textContent = 'Choose a skill above to replay its rounds, or start again.';
  $('.mouse-guide').hidden = true;
  $('.keyboard-help').hidden = true;
  $('#counter').textContent = '19 / 19 rounds';
  feedback('All skills complete. Choose a skill to repeat or click Start again.', 'success');
  $('#next').disabled = true; $('#next').textContent = 'Practice complete';
  $('#play-again').onclick = () => { progress.fill(0); modelAngle = -32; modelScale = 1; render(0, true); };
};
$('#retry').onclick = () => render(current, true, activeRound);
$('#listen').onclick = () => {
  if (!('speechSynthesis' in window)) { feedback('Read-aloud is unavailable in this browser.'); return; }
  speechSynthesis.cancel();
  const message = new SpeechSynthesisUtterance(`${$('#task').textContent} ${$('#instruction').textContent}`);
  message.rate = .9; message.lang = 'en-US';
  message.onerror = e => { if (!['interrupted', 'canceled'].includes(e.error)) feedback('The voice could not play.'); };
  speechSynthesis.speak(message);
};
render(0);
