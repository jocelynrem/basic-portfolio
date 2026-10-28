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
      this.style = {}; this.dataset = {}; this.clientWidth = 800; this.clientHeight = 365;
      this.classList = { add() {}, remove() {}, toggle() {} }; this.captures = new Set();
    }
    setAttribute() {} append() {} insertAdjacentHTML() {} focus() {}
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
  const context = vm.createContext({ document: { querySelector: get, createElement: () => new Element() }, window });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8'), context);
  const run = code => vm.runInContext(code, context);
  const emit = (type, event) => { for (const fn of listeners.get(type) || []) fn(event); };
  const event = (extra = {}) => ({ button: 2, shiftKey: true, pointerId: 1, clientX: 100, clientY: 100, preventDefault() {}, ...extra });
  const pan = round => { run(`dispose(); current = 5; activeRound = ${round}; roundDone = false; panActivity();`); return get('.pan-view'); };
  return { get, run, emit, event, pan, listeners };
}
test('pan requires Shift and the right button, and rejects an incomplete drag', () => {
  const t = setup(), view = t.pan(0);
  for (const bad of [{ shiftKey: false }, { button: 0 }]) {
    view.onpointerdown(t.event(bad)); view.onpointermove(t.event({ clientX: 308, clientY: 173 })); view.onpointerup(t.event());
    assert.equal(t.run('progress[5]'), 0);
  }
  view.onpointerdown(t.event()); view.onpointerup(t.event());
  assert.equal(t.run('progress[5]'), 0);
});
test('releasing Shift before the mouse prevents completion even at the target', () => {
  const t = setup(), view = t.pan(0);
  view.onpointerdown(t.event()); view.onpointermove(t.event({ clientX: 308, clientY: 173 }));
  t.emit('keyup', { key: 'Shift' }); view.onpointerup(t.event({ shiftKey: false }));
  assert.equal(t.run('progress[5]'), 0);
  assert.match(t.get('#feedback').textContent, /Keep Shift/);
});
test('all three Shift/right-drag targets complete once, only on release', () => {
  const t = setup();
  const movement = [[208, 73], [-208, 73], [184, -80.3]];
  movement.forEach(([dx, dy], round) => {
    const view = t.pan(round);
    view.onpointerdown(t.event()); view.onpointermove(t.event({ clientX: 100 + dx, clientY: 100 + dy }));
    assert.equal(t.run('progress[5]'), round);
    view.onpointerup(t.event());
    assert.equal(t.run('progress[5]'), round + 1);
    assert.equal(t.get('#next').disabled, false);
    view.onpointerup(t.event());
    assert.equal(t.run('progress[5]'), round + 1);
  });
});
test('pointer cancellation and window blur do not complete a pan', () => {
  for (const cancel of ['pointer', 'blur']) {
    const t = setup(), view = t.pan(0);
    view.onpointerdown(t.event()); view.onpointermove(t.event({ clientX: 308, clientY: 173 }));
    if (cancel === 'pointer') view.onpointercancel(t.event()); else t.emit('blur', {});
    view.onpointerup(t.event()); assert.equal(t.run('progress[5]'), 0);
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
  t.run('current = 5; activeRound = 2; roundDone = true; activities.forEach((a, i) => progress[i] = a.rounds);');
  t.get('#next').onclick();
  assert.equal(t.get('#activity-title').textContent, 'All skills complete');
  assert.equal(t.get('#counter').textContent, '19 / 19 rounds');
  assert.equal(t.get('.mouse-guide').hidden, true);
  assert.doesNotMatch(t.get('#feedback').textContent, /green button/);
});
