const GRID = { rows: 5, cols: 4 };
const START = { row: 1, col: 1, direction: 0 };
const DIRECTIONS = [
  { label: "Up", deltaRow: -1, deltaCol: 0 },
  { label: "Right", deltaRow: 0, deltaCol: 1 },
  { label: "Down", deltaRow: 1, deltaCol: 0 },
  { label: "Left", deltaRow: 0, deltaCol: -1 },
];

const CELL_LABELS = [
  ["Turn", "A", "B / C", "D / F"],
  ["E", "START", "G / H", "I"],
  ["J / K", "L / M", "O", "N / P"],
  ["Turn", "Q / R", "S / T", "U"],
  ["V / W", "Y", "X / Z", "Turn"],
];

const COMMANDS = {
  left: { label: "Turn Left", icon: "assets/button-left.png" },
  forward: { label: "Forward", icon: "assets/button-forward.png" },
  right: { label: "Turn Right", icon: "assets/button-right.png" },
  backward: { label: "Backward", icon: "assets/button-backward.png" },
  pause: { label: "Pause", icon: "assets/button-pause.svg" },
};

const MAT_ASPECT_RATIO = 4 / 5;
const MIN_STAGE_HEIGHT = 220;

const state = {
  row: START.row,
  col: START.col,
  direction: START.direction,
  sequence: [],
  isRunning: false,
  cancelRequested: false,
  drag: null,
};

const AudioContextClass = window.AudioContext || window.webkitAudioContext;
const audioState = {
  context: null,
  masterGain: null,
  unlocked: false,
};

const stage = document.getElementById("mat-stage");
const token = document.getElementById("beebot-token");
const dragHandle = document.getElementById("drag-handle");
const dragHighlight = document.getElementById("drag-highlight");
const statusMessage = document.getElementById("status-message");
const sequenceCount = document.getElementById("sequence-count");
const sequenceList = document.getElementById("sequence-list");
const hotspotButtons = Array.from(document.querySelectorAll(".hotspot"));
const cardHeading = document.querySelector(".card-heading");
const boardLayout = document.querySelector(".board-layout");
const programPanel = document.querySelector(".program-panel");
const sequenceCard = document.querySelector(".sequence-card");

function getAudioContext() {
  if (!AudioContextClass) {
    return null;
  }

  if (!audioState.context) {
    audioState.context = new AudioContextClass();
    audioState.masterGain = audioState.context.createGain();
    audioState.masterGain.gain.value = 1;
    audioState.masterGain.connect(audioState.context.destination);
  }

  return audioState.context;
}

async function unlockAudio() {
  const context = getAudioContext();

  if (!context) {
    return null;
  }

  if (context.state === "suspended") {
    try {
      await context.resume();
    } catch {
      return context;
    }
  }

  audioState.unlocked = context.state === "running";
  return context;
}

function scheduleTone({
  startFrequency,
  endFrequency = startFrequency,
  duration = 0.1,
  volume = 0.02,
  type = "sine",
  attack = 0.012,
  delay = 0,
  filterFrequency = 2400,
}) {
  const context = getAudioContext();

  if (!context || !audioState.masterGain || context.state !== "running") {
    return;
  }

  const now = context.currentTime + delay;
  const oscillator = context.createOscillator();
  const filter = context.createBiquadFilter();
  const gain = context.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(startFrequency, now);

  if (endFrequency !== startFrequency) {
    oscillator.frequency.exponentialRampToValueAtTime(
      Math.max(1, endFrequency),
      now + duration
    );
  }

  filter.type = "lowpass";
  filter.frequency.setValueAtTime(filterFrequency, now);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(volume, now + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  oscillator.connect(filter);
  filter.connect(gain);
  gain.connect(audioState.masterGain);

  oscillator.start(now);
  oscillator.stop(now + duration + 0.03);
}

function playButtonPressSound() {
  scheduleTone({
    startFrequency: 740,
    endFrequency: 520,
    duration: 0.09,
    volume: 0.07,
    type: "triangle",
    filterFrequency: 3000,
  });
}

function playGoPressSound() {
  scheduleTone({
    startFrequency: 520,
    endFrequency: 720,
    duration: 0.11,
    volume: 0.075,
    type: "triangle",
    filterFrequency: 3200,
  });
  scheduleTone({
    startFrequency: 720,
    endFrequency: 920,
    duration: 0.09,
    volume: 0.055,
    type: "triangle",
    delay: 0.07,
    filterFrequency: 3600,
  });
}

function playStepSound() {
  scheduleTone({
    startFrequency: 460,
    endFrequency: 610,
    duration: 0.13,
    volume: 0.065,
    type: "triangle",
    filterFrequency: 3200,
  });
}

function playStopSound() {
  scheduleTone({
    startFrequency: 520,
    endFrequency: 620,
    duration: 0.12,
    volume: 0.06,
    type: "triangle",
    filterFrequency: 3000,
  });
  scheduleTone({
    startFrequency: 660,
    endFrequency: 820,
    duration: 0.14,
    volume: 0.065,
    type: "triangle",
    delay: 0.08,
    filterFrequency: 3400,
  });
  scheduleTone({
    startFrequency: 820,
    endFrequency: 980,
    duration: 0.16,
    volume: 0.05,
    type: "triangle",
    delay: 0.16,
    filterFrequency: 3800,
  });
}

function cellCenterPercent(row, col) {
  return {
    left: ((col + 0.5) / GRID.cols) * 100,
    top: ((row + 0.5) / GRID.rows) * 100,
  };
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getPaddingSize(element, startSide, endSide) {
  const styles = window.getComputedStyle(element);
  return (
    Number.parseFloat(styles[startSide] || "0") +
    Number.parseFloat(styles[endSide] || "0")
  );
}

function syncViewportLayout() {
  if (!stage || !cardHeading || !boardLayout || !programPanel || !sequenceCard) {
    return;
  }

  const layoutVerticalPadding = getPaddingSize(boardLayout, "paddingTop", "paddingBottom");
  const layoutHorizontalPadding = getPaddingSize(boardLayout, "paddingLeft", "paddingRight");
  const boardGap = Number.parseFloat(window.getComputedStyle(boardLayout).gap || "0");
  const isStacked = window.getComputedStyle(boardLayout).flexDirection === "column";
  const contentWidth = Math.max(boardLayout.clientWidth - layoutHorizontalPadding, 0);
  const contentHeight = Math.max(boardLayout.clientHeight - layoutVerticalPadding, 0);
  const availableWidth = isStacked
    ? contentWidth
    : Math.max(
        contentWidth - cardHeading.offsetWidth - programPanel.offsetWidth - boardGap * 2,
        0
      );
  const availableHeight = Math.max(
    contentHeight - (isStacked ? cardHeading.offsetHeight + programPanel.offsetHeight + boardGap * 2 : 0),
    MIN_STAGE_HEIGHT
  );
  const nextHeight = Math.max(
    MIN_STAGE_HEIGHT,
    Math.min(availableHeight, availableWidth / MAT_ASPECT_RATIO)
  );
  const nextWidth = nextHeight * MAT_ASPECT_RATIO;

  stage.style.width = `${Math.max(nextWidth, 0)}px`;
  stage.style.height = `${Math.max(nextHeight, 0)}px`;

  if (isStacked) {
    programPanel.style.height = "";
    sequenceCard.style.height = "";
    return;
  }

  programPanel.style.height = `${Math.max(nextHeight, 0)}px`;
  sequenceCard.style.height = `${Math.max(nextHeight, 0)}px`;
}

function setStatus(message) {
  statusMessage.textContent = message;
}

function getCellLabel(row, col) {
  return CELL_LABELS[row]?.[col] ?? "Unknown";
}

function isStartCell(row, col) {
  return row === START.row && col === START.col;
}

function updateBeeBotPosition() {
  const position = state.drag
    ? { left: state.drag.leftPercent, top: state.drag.topPercent }
    : cellCenterPercent(state.row, state.col);

  token.style.setProperty("--left", `${position.left}%`);
  token.style.setProperty("--top", `${position.top}%`);
  token.style.setProperty("--rotation", `${state.direction * 90}deg`);
}

function updateInfo() {
  const stepsText = `${state.sequence.length} ${state.sequence.length === 1 ? "step" : "steps"}`;
  sequenceCount.textContent = stepsText;
}

function renderSequence(activeIndex = -1) {
  if (!state.sequence.length) {
    sequenceList.className = "sequence-list empty";
    sequenceList.innerHTML =
      '<p class="sequence-placeholder">Tap Bee-Bot\'s arrows to stack a path.</p>';
    updateInfo();
    syncViewportLayout();
    return;
  }

  sequenceList.className = "sequence-list";
  sequenceList.innerHTML = state.sequence
    .map((command, index) => {
      const definition = COMMANDS[command];
      const activeClass = index === activeIndex ? "sequence-item active" : "sequence-item";

      return `
        <div class="${activeClass}">
          <img src="${definition.icon}" alt="${definition.label}" />
          <span class="step-label">${definition.label}</span>
        </div>
      `;
    })
    .join("");

  updateInfo();
  syncViewportLayout();
}

function updateHighlight(visible, ready = false) {
  const left = (START.col / GRID.cols) * 100;
  const top = (START.row / GRID.rows) * 100;
  dragHighlight.style.left = `${left}%`;
  dragHighlight.style.top = `${top}%`;
  dragHighlight.classList.toggle("visible", visible);
  dragHighlight.classList.toggle("ready", ready);
}

function pointToCell(clientX, clientY) {
  const rect = stage.getBoundingClientRect();
  const x = clamp(clientX - rect.left, 0, rect.width);
  const y = clamp(clientY - rect.top, 0, rect.height);
  const col = clamp(Math.floor((x / rect.width) * GRID.cols), 0, GRID.cols - 1);
  const row = clamp(Math.floor((y / rect.height) * GRID.rows), 0, GRID.rows - 1);

  return {
    row,
    col,
    leftPercent: clamp((x / rect.width) * 100, 0, 100),
    topPercent: clamp((y / rect.height) * 100, 0, 100),
  };
}

function beginDrag(event) {
  if (state.isRunning) {
    return;
  }

  event.preventDefault();

  const pointer = pointToCell(event.clientX, event.clientY);
  state.drag = {
    pointerId: event.pointerId,
    overStart: isStartCell(pointer.row, pointer.col),
    leftPercent: pointer.leftPercent,
    topPercent: pointer.topPercent,
  };

  token.classList.add("dragging");
  dragHandle.setPointerCapture(event.pointerId);
  updateHighlight(true, state.drag.overStart);
  updateBeeBotPosition();
  setStatus("Drag Bee-Bot back to the START square to run the saved program again.");
}

function moveDrag(event) {
  if (!state.drag || event.pointerId !== state.drag.pointerId) {
    return;
  }

  const pointer = pointToCell(event.clientX, event.clientY);
  state.drag.overStart = isStartCell(pointer.row, pointer.col);
  state.drag.leftPercent = pointer.leftPercent;
  state.drag.topPercent = pointer.topPercent;

  updateHighlight(true, state.drag.overStart);
  updateBeeBotPosition();
}

function endDrag(event) {
  if (!state.drag || event.pointerId !== state.drag.pointerId) {
    return;
  }

  const droppedOnStart = state.drag.overStart;
  state.drag = null;
  token.classList.remove("dragging");
  updateHighlight(false);

  if (droppedOnStart) {
    returnToStart();
    return;
  }

  updateBeeBotPosition();
  setStatus("Drop Bee-Bot on the START square to run the saved program again.");
}

function queueCommand(command) {
  if (state.isRunning) {
    return;
  }

  if (state.sequence.length >= 40) {
    setStatus("This program already has 40 steps. Press GO or clear it first.");
    return;
  }

  state.sequence.push(command);
  renderSequence();
  setStatus(`${COMMANDS[command].label} added to the program.`);
}

function moveBy(deltaRow, deltaCol) {
  const nextRow = state.row + deltaRow;
  const nextCol = state.col + deltaCol;

  if (
    nextRow < 0 ||
    nextRow >= GRID.rows ||
    nextCol < 0 ||
    nextCol >= GRID.cols
  ) {
    setStatus("Bee-Bot cannot move off the mat, so it stays on the current square.");
    return false;
  }

  state.row = nextRow;
  state.col = nextCol;
  updateBeeBotPosition();
  updateInfo();
  return true;
}

function executeCommand(command) {
  if (command === "left") {
    state.direction = (state.direction + 3) % 4;
    updateBeeBotPosition();
    updateInfo();
    return;
  }

  if (command === "right") {
    state.direction = (state.direction + 1) % 4;
    updateBeeBotPosition();
    updateInfo();
    return;
  }

  const forward = DIRECTIONS[state.direction];

  if (command === "forward") {
    moveBy(forward.deltaRow, forward.deltaCol);
    return;
  }

  if (command === "backward") {
    moveBy(-forward.deltaRow, -forward.deltaCol);
    return;
  }

  if (command === "pause") {
    setStatus("Bee-Bot is pausing.");
  }
}

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function setControlAvailability() {
  const disabled = state.isRunning;
  dragHandle.disabled = disabled;
  hotspotButtons.forEach((button) => {
    const command = button.dataset.command;
    button.disabled = disabled && command !== "clear";
  });
}

async function runSequence() {
  if (state.isRunning) {
    return;
  }

  if (!state.sequence.length) {
    setStatus("Add some arrow steps first, then press GO.");
    return;
  }

  state.isRunning = true;
  state.cancelRequested = false;
  setControlAvailability();
  setStatus("Bee-Bot is running the program.");

  for (let index = 0; index < state.sequence.length; index += 1) {
    if (state.cancelRequested) {
      break;
    }

    renderSequence(index);
    await sleep(320);

    if (state.cancelRequested) {
      break;
    }

    const command = state.sequence[index];

    if (!command) {
      break;
    }

    playStepSound();
    executeCommand(command);
    await sleep(command === "pause" ? 900 : 620);
  }

  state.isRunning = false;
  playStopSound();
  renderSequence();
  setControlAvailability();

  if (!state.cancelRequested) {
    setStatus(`Program finished on ${getCellLabel(state.row, state.col)}.`);
  }
}

function placeAtStart() {
  state.row = START.row;
  state.col = START.col;
  state.direction = START.direction;
  state.drag = null;
  updateBeeBotPosition();
  updateInfo();
}

function returnToStart() {
  placeAtStart();
  setStatus("Bee-Bot returned to START and is facing the starting direction.");
}

function clearProgram() {
  state.cancelRequested = true;
  state.sequence = [];
  placeAtStart();
  renderSequence();
  setStatus("Program cleared. Bee-Bot returned to the START square.");
}

function handleCommand(command) {
  unlockAudio().then(() => {
    if (command === "go") {
      playGoPressSound();
      return;
    }

    playButtonPressSound();
  });

  if (command === "go") {
    runSequence();
    return;
  }

  if (command === "clear") {
    clearProgram();
    return;
  }

  queueCommand(command);
}

dragHandle.addEventListener("pointerdown", beginDrag);
dragHandle.addEventListener("pointermove", moveDrag);
dragHandle.addEventListener("pointerup", endDrag);
dragHandle.addEventListener("pointercancel", endDrag);

hotspotButtons.forEach((button) => {
  button.addEventListener("click", () => handleCommand(button.dataset.command));
});

window.addEventListener(
  "pointerdown",
  () => {
    unlockAudio();
  },
  { once: true }
);

window.addEventListener("resize", () => {
  syncViewportLayout();
  updateBeeBotPosition();
});

syncViewportLayout();
updateBeeBotPosition();
renderSequence();
updateInfo();
setControlAvailability();
