// Event-handler regression tests. Browser tests cover rendering and real drag geometry.
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
function setup() {
  const nodes = new Map();
  class Element {
    constructor() {
      this.children = []; this.style = {}; this.dataset = {}; this.clientWidth = 800; this.clientHeight = 365;
      this.classList = { add() {}, remove() {}, toggle() {} }; this.captures = new Set();
    }
    setAttribute(name, value) { this[name] = value; }
    set innerHTML(value) { this.html = value; this.children = []; }
    get innerHTML() { return this.html || ''; }
    append(...children) { this.children.push(...children); const register = el => { if (el.id) nodes.set('#' + el.id, el); el.children.forEach(register); }; children.forEach(register); }
    insertAdjacentHTML() {} focus() {} addEventListener() {}
    setPointerCapture(id) { this.captures.add(id); }
    releasePointerCapture(id) { this.captures.delete(id); }
    hasPointerCapture(id) { return this.captures.has(id); }
  }
  const get = selector => { if (!nodes.has(selector)) nodes.set(selector, new Element()); return nodes.get(selector); };
  const listeners = new Map();
  const window = {
    addEventListener(type, fn) { if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type).add(fn); },
    removeEventListener(type, fn) { listeners.get(type)?.delete(fn); }
  };
  let frameId = 0;
  const frames = new Map();
  const requestAnimationFrame = fn => { frames.set(++frameId, fn); return frameId; };
  const cancelAnimationFrame = id => frames.delete(id);
  const tick = time => { const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn(time)); };
  const selection = { removeAllRanges() { this.word = ''; }, addRange(range) { this.word = range.word; } };
  window.getSelection = () => selection;
  const context = vm.createContext({ requestAnimationFrame, cancelAnimationFrame, document: { createRange: () => ({ selectNodeContents(label) { this.word = label.textContent; } }), querySelector: get, createElement: () => new Element() }, window });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8'), context);
  const run = code => vm.runInContext(code, context);
  const emit = (type, event) => { for (const fn of listeners.get(type) || []) fn(event); };
  const event = (extra = {}) => ({ button: 2, shiftKey: true, pointerId: 1, clientX: 100, clientY: 100, preventDefault() {}, ...extra });
  const pan = round => { run(`dispose(); current = 6; activeRound = ${round}; roundDone = false; panActivity();`); return get('.pan-view'); };
  return { get, run, emit, event, pan, listeners, tick, frames };
}
test('pan requires Shift and the right button, and rejects an incomplete drag', () => {
  const t = setup(), view = t.pan(0);
  for (const bad of [{ shiftKey: false }, { button: 0 }]) {
    view.onpointerdown(t.event(bad)); view.onpointermove(t.event({ clientX: 308, clientY: 173 })); view.onpointerup(t.event());
    assert.equal(t.run('progress[6]'), 0);
  }
  view.onpointerdown(t.event()); view.onpointerup(t.event());
  assert.equal(t.run('progress[6]'), 0);
});
test('releasing Shift before the mouse prevents completion even at the target', () => {
  const t = setup(), view = t.pan(0);
  view.onpointerdown(t.event()); view.onpointermove(t.event({ clientX: 308, clientY: 173 }));
  t.emit('keyup', { key: 'Shift' }); view.onpointerup(t.event({ shiftKey: false }));
  assert.equal(t.run('progress[6]'), 0);
  assert.match(t.get('#feedback').textContent, /Keep Shift/);
});
test('both Shift/right-drag targets complete once, only on release', () => {
  const t = setup();
  const movement = [[208, 73], [-208, 73]];
  movement.forEach(([dx, dy], round) => {
    const view = t.pan(round);
    view.onpointerdown(t.event()); view.onpointermove(t.event({ clientX: 100 + dx, clientY: 100 + dy }));
    assert.equal(t.run('progress[6]'), round);
    view.onpointerup(t.event());
    assert.equal(t.run('progress[6]'), round + 1);
    assert.equal(t.get('#next').disabled, false);
    view.onpointerup(t.event());
    assert.equal(t.run('progress[6]'), round + 1);
  });
});
test('pointer cancellation and window blur do not complete a pan', () => {
  for (const cancel of ['pointer', 'blur']) {
    const t = setup(), view = t.pan(0);
    view.onpointerdown(t.event()); view.onpointermove(t.event({ clientX: 308, clientY: 173 }));
    if (cancel === 'pointer') view.onpointercancel(t.event()); else t.emit('blur', {});
    view.onpointerup(t.event()); assert.equal(t.run('progress[6]'), 0);
    t.run('dispose()');
    for (const set of t.listeners.values()) assert.equal(set.size, 0);
  }
});
test('restarting a completed round repeats that round without advancing progress', () => {
  const t = setup(); t.run('completeRound("Done");');
  t.get('#retry').onclick();
  assert.equal(t.run('activeRound'), 0); assert.equal(t.run('progress[0]'), 1);
  assert.equal(t.get('#next').disabled, true);
  t.run('completeRound("Done again");'); assert.equal(t.run('progress[0]'), 1);
  t.get('#next').onclick(); assert.equal(t.run('activeRound'), 1);
});
test('completion screen removes stale pan instructions and continue prompt', () => {
  const t = setup();
  t.run('current = 6; activeRound = 1; roundDone = true; activities.forEach((a, i) => progress[i] = a.rounds);');
  t.get('#next').onclick();
  assert.equal(t.get('#activity-title').textContent, 'All skills complete');
  assert.equal(t.get('#counter').textContent, '14 / 14 rounds');
  assert.equal(t.get('.mouse-guide').hidden, true);
  assert.doesNotMatch(t.get('#feedback').textContent, /green button/);
});
test('each click round uses the same four numbered items and enforces number order', () => {
  const t = setup();
  for (let round = 0; round < 3; round++) {
    t.run(`render(0, false, ${round});`);
    const buttons = t.get('#stage').children.filter(b => b.className.includes('numbered-target'));
    assert.equal(buttons.length, 4);
    buttons.forEach((b, i) => assert.match(b.innerHTML, new RegExp(`target-number">${i + 1}<`)));
    buttons[2].onclick();
    assert.equal(t.get('#counter').textContent, '0 / 4 clicks');
    assert.equal(t.get('#next').disabled, true);
    buttons.forEach(b => b.onclick());
    assert.equal(t.get('#counter').textContent, '4 / 4 clicks');
    assert.equal(t.run('progress[0]'), round + 1);
    assert.equal(t.frames.size, 0);
  }
});
test('round one stays still, round three moves faster, pause and cleanup stop animation', () => {
  const t = setup();
  assert.equal(t.frames.size, 0);
  const distances = [];
  for (const round of [1, 2]) {
    t.run(`render(0, false, ${round});`);
    const first = t.get('#stage').children[0];
    const start = parseFloat(first.style.left);
    for (let time = 0; time <= 1000; time += 20) t.tick(time);
    distances.push(Math.abs(parseFloat(first.style.left) - start));
    t.get('#motion-toggle').onclick();
    const paused = first.style.left;
    t.tick(1020); t.tick(1040);
    assert.equal(first.style.left, paused);
    t.get('#motion-toggle').onclick(); t.tick(1060);
    assert.notEqual(first.style.left, paused);
  }
  assert.ok(distances[1] > distances[0] * 1.5);
  t.run('dispose()'); assert.equal(t.frames.size, 0);
  for (const set of t.listeners.values()) assert.equal(set.size, 0);
});
test('a selected moving target stops while remaining items keep moving', () => {
  const t = setup(); t.run('render(0, false, 1);');
  const [first, second] = t.get('#stage').children;
  t.tick(0); t.tick(20); first.onclick();
  const stopped = first.style.left, moving = second.style.left;
  t.tick(40); t.tick(60);
  assert.equal(first.style.left, stopped);
  assert.notEqual(second.style.left, moving);
});
test('speed selector updates motion and remembers the chosen speed for that round', () => {
  const t = setup(); t.run('render(0, false, 2);');
  const select = t.get('#click-speed');
  assert.equal(select.value, '2');
  select.value = '0.45'; select.onchange();
  assert.equal(t.run('clickSpeeds[2]'), .45);
  t.run('render(0, false, 2);');
  assert.equal(t.get('#click-speed').value, '0.45');
});
test('scroll target is pictured twice and advances only for the exact numbered card', () => {
  const t = setup(); t.run('render(3, false, 0);');
  const cards = t.get('.library-list').children;
  assert.equal(cards.length, 12);
  assert.equal(t.get('#task-visual').innerHTML, cards[7].innerHTML);
  assert.equal(t.get('#reference-card').innerHTML, cards[7].innerHTML);
  cards[2].onclick(); // Same triangle, wrong number.
  assert.equal(t.get('#counter').textContent, '0 / 2 matches');
  cards[7].onclick();
  assert.equal(t.get('#reference-card').innerHTML, cards[1].innerHTML);
  cards[1].onclick(); assert.equal(t.run('roundDone'), true);
});
test('zoom unlocks Next only while matched and advances with one click', () => {
  const t = setup(); t.run('render(4, false, 0);');
  t.get('#next').onclick(); assert.equal(t.run('activeRound'), 0);
  for (let i = 0; i < 10; i++) t.get('#zoom-in').onclick();
  assert.equal(t.get('#next').disabled, false);
  for (let i = 0; i < 4; i++) t.get('#zoom-in').onclick();
  assert.equal(t.get('#next').disabled, true);
  for (let i = 0; i < 4; i++) t.get('#zoom-out').onclick();
  t.get('#next').onclick();
  assert.equal(t.run('progress[4]'), 1);
  assert.equal(t.run('activeRound'), 1);
  assert.equal(t.get('#next').disabled, true);
  for (let i = 0; i < 15; i++) t.get('#zoom-out').onclick();
  t.get('#check-view').onclick();
  assert.equal(t.run('progress[4]'), 2);
  assert.equal(t.run('current'), 5);
  assert.equal(t.run('activeRound'), 0);
});
test('orbit enables one-click continuation after releasing an aligned cube', () => {
  const t = setup(); t.run('render(5, false, 0);');
  const view = t.get('.view-scene');
  view.onpointerdown(t.event());
  view.onpointermove(t.event({clientX: 365}));
  assert.equal(t.get('#next').disabled, true);
  view.onpointerup(t.event());
  assert.equal(t.get('#next').disabled, false);
  t.get('#check-view').onclick();
  assert.equal(t.run('progress[5]'), 1);
  assert.equal(t.run('current'), 6);
  assert.equal(t.run('activeRound'), 0);
  assert.equal(t.get('#next').disabled, true);
});
test('flat-shape activities use 2D geometry names', () => {
  const t = setup();
  assert.equal(t.run("Object.keys(symbols).join(',')"), 'square,circle,triangle,rectangle,hexagon');
  assert.match(t.run("shapeArt('circle')"), /<circle/);
  assert.match(t.run("shapeArt('square')"), /width="80" height="80"/);
});

test('double-click requires the matching word, selects text, and completes both rounds', () => {
  const t = setup();
  const orders = [[0, 2, 1, 3], [5, 3, 0, 4]];
  orders.forEach((order, round) => {
    t.run(`render(1, false, ${round});`);
    const cards = t.get('#stage').children[0].children;
    const first = cards[order[0]].children[0];
    first.onclick({ detail: 1 });
    assert.equal(t.get('#counter').textContent, '0 / 4 words');
    first.ondblclick({ button: 2 });
    assert.equal(t.get('#counter').textContent, '0 / 4 words');
    cards[order[1]].children[0].ondblclick({ button: 0 });
    assert.equal(t.get('#counter').textContent, '0 / 4 words');
    order.forEach((index, i) => {
      const label = cards[index].children[0];
      label.ondblclick({ button: 0 });
      assert.equal(t.run('window.getSelection().word'), label.textContent);
      assert.equal(t.get('#counter').textContent, `${i + 1} / 4 words`);
      label.ondblclick({ button: 0 });
      assert.equal(t.get('#counter').textContent, `${i + 1} / 4 words`);
    });
    assert.equal(t.run('progress[1]'), round + 1);
    assert.equal(t.get('#next').disabled, false);
    t.run('dispose()'); assert.equal(t.run('window.getSelection().word'), '');
  });
});

test('celebrations happen at skill completion and the finale is larger', () => {
  const t = setup();
  t.run('completeRound("Done");');
  assert.equal(t.get('#celebration').innerHTML, '');
  t.run('render(0, false, 2); completeRound("Done");');
  assert.equal(t.get('#celebration').className, 'celebration skill-celebration');
  assert.match(t.get('#celebration').innerHTML, /Click complete!/);
  const skillPieces = (t.get('#celebration').innerHTML.match(/<i /g) || []).length;
  t.run('current = 6; activeRound = 1; roundDone = true; activities.forEach((a, i) => progress[i] = a.rounds);');
  t.get('#next').onclick();
  assert.equal(t.get('#celebration').className, 'celebration finale');
  assert.ok((t.get('#celebration').innerHTML.match(/<i /g) || []).length > skillPieces);
  t.get('#play-again').onclick();
  assert.equal(t.get('#celebration').innerHTML, '');
  assert.equal(t.run('progress.every(n => n === 0)'), true);
});
