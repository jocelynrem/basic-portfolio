import { dealSprintRound, scorePick, TOTAL_ROUNDS } from '../js/line-sprint.mjs';
import { tileName } from '../js/engine.mjs?v=win-source-1';
import { targetBlocks, displaySymbols } from '../js/hand-groups.mjs?v=dragon-notation-1';
import { faceArt } from '../js/tile-art.mjs?v=wind-letter-size-1';

const $ = selector => document.querySelector(selector);
const ROUND_MS = 20_000;
const REVEAL_MS = 3_000;
const timerKey = 'parlor-rack-sprint-timed';
const inks = { B:'bam', C:'crak', D:'dot', F:'flower', G:'bam', R:'crak', H:'dot' };
const levels = ['Warm-up', 'Steady', 'Challenge'];
let timed = true;
try { timed = localStorage.getItem(timerKey) !== 'off'; } catch {}

let phase = 'intro';
let round;
let history = [];
let total = 0;
let remaining = 0;
let deadline = null;
let interval;

function tileFace(key, fit) {
 const state = fit === undefined ? '' : ` data-fit="${fit ? 'yes' : 'no'}"`;
 const name = tileName(key);
 const label = fit === undefined ? name : name + (fit ? ', fits the closest line' : ', outside the closest line');
 return `<span class="sprint-tile" role="img" aria-label="${label}" title="${name}"${state}>${faceArt(key,'mobile')}</span>`;
}

function rackMarkup(rack, fit) {
 const ids = fit && new Set(fit.matchedIds);
 return rack.map(tile => tileFace(tile.k, ids?.has(tile.id))).join('');
}

function pattern(target) {
 const spoken = target.groups.map(([k,n]) => `${n} × ${tileName(k)}`).join(', ');
 const blocks = targetBlocks(target).map(block => {
  const parts = block.map(({index,symbols}) => {
   const ink = inks[target.groups[index][0][0]] || 'honor';
   return `<span data-ink="${ink}">${displaySymbols(symbols,target.section)}</span>`;
  });
  return `<span class="pattern-group" aria-hidden="true">${parts.join('')}</span>`;
 });
 return `<span class="line-pattern" role="img" aria-label="${spoken}">${blocks.join('')}</span>`;
}

function choiceButton(choice,index) {
 return `<button type="button" class="line-choice" data-index="${index}">
  <span class="choice-key" aria-hidden="true">${String.fromCharCode(65 + index)}</span>
  <span class="choice-content"><span class="line-name">${choice.target.name}</span>${pattern(choice.target)}</span>
  <span class="choice-result"></span></button>`;
}

function distance(number) {
 return `${number} ${number === 1 ? 'tile' : 'tiles'} away`;
}

function fitNote(best, picked) {
 if (picked && picked.away > best.away) {
  const matched = choice => {
   const counts = new Map();
   for (const group of choice.groups) for (const tile of group.tiles) {
    if (tile) counts.set(tile.k, (counts.get(tile.k) || 0) + 1);
   }
   return counts;
  };
  const other = matched(picked);
  const extra = Array.from(matched(best), ([key,count]) => [key,count - (other.get(key) || 0)])
   .filter(([,count]) => count > 0).sort((a,b) => b[1] - a[1]).slice(0,2);
  if (extra.length) {
   const tiles = extra.map(([key,count]) => (count > 1 ? count + ' × ' : '') + tileName(key));
   return `${best.target.name} also uses ${tiles.join(' and ')} from your rack.`;
  }
 }
 const full = best.groups.filter(group => group.n > 1 && group.tiles.every(tile => tile?.k === group.k))
  .sort((a,b) => b.n - a.n)[0];
 if (full) return `You already have the full ${full.n}-tile group of ${tileName(full.k)}.`;
 return `${best.matchedIds.length} of your rack tiles fit this line.`;
}

function showScreen(id) {
 for (const screen of ['intro','play','results']) $('#' + screen).hidden = screen !== id;
}

function focusAt(selector) {
 const el = $(selector);
 el.tabIndex = -1;
 el.focus({preventScroll:true});
 if (el.getBoundingClientRect().top < 0 || el.getBoundingClientRect().bottom > innerHeight) {
  el.scrollIntoView({block:'nearest',behavior:'instant'});
 }
}

function drawClock() {
 $('#clock').hidden = !timed || phase !== 'pick';
 if (phase !== 'pick') return;
 const seconds = Math.ceil(remaining / 1000);
 const value = seconds + 's';
 if ($('#time-left').textContent !== value) $('#time-left').textContent = value;
 $('#clock').style.setProperty('--remaining', String(remaining / ROUND_MS));
 $('#clock').dataset.urgent = String(seconds <= 5);
}

function pauseClock() {
 if (deadline !== null) remaining = Math.max(0, deadline - performance.now());
 deadline = null;
 clearInterval(interval);
}

function tick() {
 if (deadline === null) return;
 remaining = Math.max(0, deadline - performance.now());
 drawClock();
 if (remaining === 0) {
  if (phase === 'pick') answer(null);
  else if (phase === 'reveal') advance();
 }
}

function runClock() {
 drawClock();
 if (!timed || document.hidden || !['pick','reveal'].includes(phase) || deadline !== null) return;
 deadline = performance.now() + remaining;
 interval = setInterval(tick,100);
}

function drawRound() {
 phase = 'pick';
 const index = history.length;
 round = dealSprintRound(index,history.map(entry => entry.round));
 $('#round-counter').textContent = (index + 1) + ' / ' + TOTAL_ROUNDS;
 $('#difficulty').textContent = levels[Math.floor(index / 2)];
 $('#score').textContent = total;
 $('#progress').innerHTML = Array.from({length:TOTAL_ROUNDS}, (_,i) =>
  `<span data-state="${i < index ? 'done' : i === index ? 'current' : 'to-go'}"></span>`).join('');
 $('#rack').innerHTML = rackMarkup(round.rack);
 $('#choices').innerHTML = round.choices.map(choiceButton).join('');
 $('#feedback').hidden = true;
 delete $('#feedback').dataset.kind;
 showScreen('play');
 focusAt('#round-counter');
 remaining = ROUND_MS;
 runClock();
}

function answer(index) {
 if (phase !== 'pick') return;
 pauseClock();
 if (timed && remaining === 0) index = null;
 phase = 'reveal';
 const picked = round.choices[index];
 const points = scorePick(round,index);
 const best = picked?.away === round.bestAway ? picked : round.choices.find(choice => choice.away === round.bestAway);
 history.push({round,index,best,points});
 total += points;
 $('#score').textContent = total;
 $('#rack').innerHTML = rackMarkup(round.rack,best);
 for (const button of $('#choices').children) {
  const i = Number(button.dataset.index);
  const choice = round.choices[i];
  const closest = choice.away === round.bestAway;
  button.disabled = true;
  button.dataset.result = closest ? 'best' : i === index ? 'picked' : 'other';
  button.dataset.picked = String(i === index);
  button.querySelector('.choice-result').textContent = (closest ? '✓ Best fit · ' : i === index ? 'Your pick · ' : '') + distance(choice.away);
 }
 const kind = !picked ? 'timeout' : points === 100 ? 'best' : points > 0 ? 'close' : 'miss';
 const gap = picked ? picked.away - round.bestAway : 0;
 const title = !picked ? 'Time’s up' : !gap ? 'Best fit!' : gap === 1 ? 'Just one tile off!' : gap + ' tiles off';
 $('#feedback-title').textContent = title + ' · +' + points;
 $('#feedback-note').textContent = picked ? fitNote(best,picked) : `${best.target.name} is ${distance(best.away)}.`;
 $('#feedback').dataset.kind = kind;
 $('#feedback').hidden = false;
 $('#next').textContent = history.length === TOTAL_ROUNDS ? 'See score' : 'Next rack';
 $('#next').focus({preventScroll:true});
 if ($('#next').getBoundingClientRect().bottom > innerHeight) $('#next').scrollIntoView({block:'nearest',behavior:'instant'});
 remaining = REVEAL_MS;
 runClock();
}

function reviewLine(label, choice) {
 return `<div class="review-line"><small>${label}</small><strong class="line-name">${choice.target.name}</strong>
  ${pattern(choice.target)}<span class="away">${distance(choice.away)}</span></div>`;
}

function showResults() {
 phase = 'results';
 const bestCount = history.filter(entry => entry.points === 100).length;
 $('#final-score').textContent = total;
 $('#best-count').textContent = `${bestCount} of ${TOTAL_ROUNDS} best picks`;
 const firstMiss = history.findIndex(entry => entry.points < 100);
 $('#review').innerHTML = history.map(({round,index,best,points},i) => {
  const picked = round.choices[index];
  const correct = points === 100;
  return `<details class="review-round" data-kind="${correct ? 'best' : 'miss'}" ${i === (firstMiss < 0 ? 0 : firstMiss) ? 'open' : ''}>
   <summary><span class="review-index">${String(i + 1).padStart(2,'0')}</span><span class="review-label">${!picked ? 'Time’s up' : correct ? 'Best fit' : 'Closer line available'}</span><span class="review-points">+${points}</span></summary>
   <div class="review-body"><div class="review-comparisons">${picked && !correct ? reviewLine('Your pick',picked) : ''}${reviewLine(correct ? 'Your pick · Best fit' : 'Best fit',best)}</div>
   <div class="review-rack" role="group" aria-label="Original rack. Highlighted tiles fit the best line.">${rackMarkup(round.rack,best)}</div>
   <p class="review-note">${fitNote(best,picked)}</p></div></details>`;
 }).join('');
 showScreen('results');
 focusAt('#final-score');
}

function advance() {
 if (phase !== 'reveal') return;
 pauseClock();
 if (history.length === TOTAL_ROUNDS) showResults();
 else drawRound();
}

function start() {
 pauseClock();
 history = [];
 total = 0;
 drawRound();
}

for (const toggle of document.querySelectorAll('[data-timer-toggle]')) {
 toggle.checked = timed;
 toggle.addEventListener('change', () => {
  pauseClock();
  timed = toggle.checked;
  for (const input of document.querySelectorAll('[data-timer-toggle]')) input.checked = timed;
  try { localStorage.setItem(timerKey,timed ? 'on' : 'off'); } catch {}
  runClock();
 });
}
$('#hero-tiles').innerHTML = ['B5','F','D7'].map(key => tileFace(key)).join('');
$('#start').addEventListener('click',start);
$('#again').addEventListener('click',start);
$('#next').addEventListener('click',advance);
$('#choices').addEventListener('click',event => {
 const button = event.target.closest('.line-choice');
 if (button) answer(Number(button.dataset.index));
});
document.addEventListener('keydown',event => {
 if (phase !== 'pick' || event.repeat || event.altKey || event.ctrlKey || event.metaKey) return;
 const key = event.key.toLowerCase();
 const index = /^[a-d]$/.test(key) ? key.charCodeAt(0) - 97 : /^[1-4]$/.test(key) ? Number(key) - 1 : -1;
 if (round.choices[index]) { event.preventDefault(); answer(index); }
});
document.addEventListener('visibilitychange',() => document.hidden ? pauseClock() : runClock());
