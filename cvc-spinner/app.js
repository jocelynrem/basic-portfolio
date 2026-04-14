const state = {
  words: [],
  deck: [],
  currentWord: null,
  round: 0,
  position: 0,
  scanDurationMs: 2500,
  isScanning: false,
  isAnswerRevealed: false,
  scanIntervalId: null,
  scanTimeoutId: null,
  embedMode: false,
  showControls: true,
};

const elements = {
  body: document.body,
  slideCard: document.getElementById("slide-card"),
  scanSurface: document.getElementById("scan-surface"),
  wordImage: document.getElementById("word-image"),
  imageFallback: document.getElementById("image-fallback"),
  answerDetails: document.getElementById("answer-details"),
  revealButton: document.getElementById("reveal-button"),
  phonicsPill: document.getElementById("phonics-pill"),
  wordTitle: document.getElementById("word-title"),
  letterRow: document.getElementById("letter-row"),
};

let audioContext = null;

document.addEventListener("DOMContentLoaded", init);

async function init() {
  applyUrlConfig();
  bindEvents();

  try {
    state.words = await loadWords();
  } catch (error) {
    renderLoadError(error);
    return;
  }

  startNewRound({ animate: false });
}

function applyUrlConfig() {
  const params = new URLSearchParams(window.location.search);
  const scanValue = Number.parseFloat(params.get("scan") ?? params.get("interval") ?? "2.5");
  const controlsParam = params.get("controls");
  const embedParam = params.get("embed");

  if (Number.isFinite(scanValue)) {
    state.scanDurationMs = clamp(Math.round(scanValue * 1000), 1500, 5000);
  }

  state.showControls = controlsParam !== "0";
  state.embedMode = embedParam === "1";

  elements.body.dataset.embed = String(state.embedMode);
  elements.body.dataset.controls = String(state.showControls);
}

function bindEvents() {
  elements.revealButton.addEventListener("click", toggleRevealAnswer);
  elements.scanSurface.addEventListener("click", startScan);
  elements.scanSurface.addEventListener("keydown", (event) => {
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      startScan();
    }
  });

  window.addEventListener("keydown", (event) => {
    if (event.target instanceof HTMLButtonElement) {
      return;
    }

    if (event.key === " " && event.target === document.body) {
      event.preventDefault();
      startScan();
      return;
    }

    if (event.key === "ArrowRight") {
      startScan();
      return;
    }

    if (event.key === "Enter") {
      toggleRevealAnswer();
    }
  });

  elements.wordImage.addEventListener("error", showFallback);
  elements.wordImage.addEventListener("load", hideFallback);
}

async function loadWords() {
  const response = await fetch("data/active-word-images.json");

  if (!response.ok) {
    throw new Error(`Could not load word list (${response.status}).`);
  }

  const words = await response.json();

  if (!Array.isArray(words) || words.length === 0) {
    throw new Error("Word list is empty.");
  }

  return words;
}

function startNewRound({ animate = false } = {}) {
  clearScanTimers();
  state.isScanning = false;
  state.isAnswerRevealed = false;
  resetDeck();
  state.currentWord = takeNextWord();
  renderCurrentWord({ animate });
}

async function startScan() {
  if (!state.words.length || state.isScanning) {
    return;
  }

  state.isScanning = true;
  state.isAnswerRevealed = false;

  try {
    await ensureAudioContext();
  } catch (error) {
    console.warn("Audio setup failed", error);
  }

  const finalWord = takeNextWord();
  const previewFrames = buildPreviewFrames(finalWord);
  let frameIndex = 0;

  renderPreviewWord(previewFrames[frameIndex]);
  playScanTick(frameIndex, previewFrames.length);
  renderAnswerPanel();
  updateButtons();

  state.scanIntervalId = window.setInterval(() => {
    frameIndex = (frameIndex + 1) % previewFrames.length;
    renderPreviewWord(previewFrames[frameIndex]);
    playScanTick(frameIndex, previewFrames.length);
  }, 120);

  state.scanTimeoutId = window.setTimeout(() => {
    clearScanTimers();
    state.isScanning = false;
    playLandingSound();
    state.currentWord = finalWord;
    renderCurrentWord({ animate: true });
  }, state.scanDurationMs);
}

function toggleRevealAnswer() {
  if (!state.currentWord || state.isScanning) {
    return;
  }

  state.isAnswerRevealed = !state.isAnswerRevealed;
  renderAnswerPanel();
  updateButtons();
}

function resetDeck() {
  state.round += 1;
  state.position = 0;
  state.deck = shuffleWords(state.words, state.currentWord?.word);
}

function takeNextWord() {
  if (!state.deck.length) {
    resetDeck();
  }

  state.position += 1;
  return state.deck.shift();
}

function buildPreviewFrames(finalWord) {
  const frameCount = Math.max(8, Math.round(state.scanDurationMs / 120));
  const pool = shuffleWords(
    state.words.filter((entry) => entry.word !== finalWord.word),
    state.currentWord?.word,
  );
  const frames = [];
  let previousWord = state.currentWord?.word;

  for (let index = 0; index < frameCount; index += 1) {
    let candidate = pool[index % pool.length] ?? finalWord;

    if (candidate.word === previousWord && pool.length > 1) {
      candidate = pool[(index + 1) % pool.length];
    }

    frames.push(candidate);
    previousWord = candidate.word;
  }

  return frames.length ? frames : [finalWord];
}

function renderPreviewWord(entry) {
  if (!entry) {
    return;
  }

  elements.slideCard.classList.add("is-scanning");
  elements.wordImage.alt = `Illustration of ${entry.imageLabel}`;
  elements.wordImage.src = `${entry.imagePath}?v=1`;
}

function renderCurrentWord({ animate = true } = {}) {
  const entry = state.currentWord;

  if (!entry) {
    return;
  }

  elements.slideCard.classList.remove("is-scanning");
  elements.wordImage.alt = `Illustration of ${entry.imageLabel}`;
  elements.wordImage.src = `${entry.imagePath}?v=1`;
  elements.phonicsPill.textContent = `Short ${entry.vowel}`;
  elements.wordTitle.textContent = entry.word;

  renderLetterRow(entry.word);
  renderAnswerPanel();
  updateButtons();

  if (animate) {
    animateSlideCard();
  }
}

function renderLetterRow(word) {
  elements.letterRow.innerHTML = "";

  [...word].forEach((letter, index) => {
    const chip = document.createElement("span");
    chip.className = "letter-chip";
    chip.textContent = letter;

    if (index === 1) {
      chip.classList.add("is-vowel");
    }

    elements.letterRow.append(chip);
  });
}

function renderAnswerPanel() {
  if (state.isScanning || !state.currentWord || !state.isAnswerRevealed) {
    elements.answerDetails.classList.add('is-hidden');
    return;
  }

  elements.answerDetails.classList.remove('is-hidden');
}

function updateButtons() {
  elements.revealButton.textContent = state.isAnswerRevealed ? "Hide" : "Show";
  elements.revealButton.disabled = state.isScanning || !state.currentWord;
}

async function ensureAudioContext() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;

  if (!AudioContextClass) {
    return null;
  }

  if (!audioContext) {
    audioContext = new AudioContextClass();
  }

  if (audioContext.state === "suspended") {
    await audioContext.resume();
  }

  return audioContext;
}

function playScanTick(frameIndex, totalFrames) {
  if (!audioContext || audioContext.state !== "running") {
    return;
  }

  const now = audioContext.currentTime;
  const progress = totalFrames > 1 ? frameIndex / (totalFrames - 1) : 0;
  const oscillator = audioContext.createOscillator();
  const filter = audioContext.createBiquadFilter();
  const gain = audioContext.createGain();

  oscillator.type = "triangle";
  oscillator.frequency.setValueAtTime(620 - progress * 180, now);

  filter.type = "lowpass";
  filter.frequency.setValueAtTime(1800, now);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.03, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

  oscillator.connect(filter);
  filter.connect(gain);
  gain.connect(audioContext.destination);

  oscillator.start(now);
  oscillator.stop(now + 0.09);
}

function playLandingSound() {
  if (!audioContext || audioContext.state !== "running") {
    return;
  }

  const now = audioContext.currentTime;
  const tone = audioContext.createOscillator();
  const overtone = audioContext.createOscillator();
  const filter = audioContext.createBiquadFilter();
  const gain = audioContext.createGain();

  tone.type = "square";
  overtone.type = "triangle";
  tone.frequency.setValueAtTime(988, now);
  tone.frequency.setValueAtTime(1318, now + 0.075);
  tone.frequency.setValueAtTime(1760, now + 0.15);
  overtone.frequency.setValueAtTime(1480, now);
  overtone.frequency.setValueAtTime(1976, now + 0.075);
  overtone.frequency.setValueAtTime(2637, now + 0.15);

  filter.type = "lowpass";
  filter.frequency.setValueAtTime(5200, now);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.055, now + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.028, now + 0.11);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.26);

  tone.connect(filter);
  overtone.connect(filter);
  filter.connect(gain);
  gain.connect(audioContext.destination);

  tone.start(now);
  overtone.start(now);
  tone.stop(now + 0.28);
  overtone.stop(now + 0.24);
}

function clearScanTimers() {
  if (state.scanIntervalId !== null) {
    window.clearInterval(state.scanIntervalId);
    state.scanIntervalId = null;
  }

  if (state.scanTimeoutId !== null) {
    window.clearTimeout(state.scanTimeoutId);
    state.scanTimeoutId = null;
  }
}

function shuffleWords(words, previousWord) {
  const deck = [...words];

  for (let index = deck.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [deck[index], deck[swapIndex]] = [deck[swapIndex], deck[index]];
  }

  if (previousWord && deck.length > 1 && deck[0].word === previousWord) {
    [deck[0], deck[1]] = [deck[1], deck[0]];
  }

  return deck;
}

function animateSlideCard() {
  elements.slideCard.classList.remove("is-animating");
  void elements.slideCard.offsetWidth;
  elements.slideCard.classList.add("is-animating");
}

function showFallback() {
  elements.imageFallback.hidden = false;
  elements.wordImage.hidden = true;
}

function hideFallback() {
  elements.imageFallback.hidden = true;
  elements.wordImage.hidden = false;
}

function renderLoadError(error) {
  clearScanTimers();
  state.isScanning = false;
  state.currentWord = null;
  elements.answerDetails.classList.add('is-hidden');
  elements.revealButton.disabled = true;
  showFallback();
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
