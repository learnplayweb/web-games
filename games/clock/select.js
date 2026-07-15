import { getClockSave, getGold } from '../../core/saveManager.js';
import {
  grantMaxGold,
  resetAll,
  setAllClockStars,
  unlockAllClockLevels,
} from '../../core/debug.js';
import { createHeader, updateHeaderGold } from '../../shared/header.js';

const LEVEL_NAMES = [
  'Lv.1 : 정각',
  'Lv.2 : 15분 단위',
  'Lv.3 : 5분 단위',
  'Lv.4 : 모든 분',
  'Lv.5 : 시·분·초',
  'Lv.6 : 시간 계산 (1단위)',
  'Lv.7 : 시간 계산 (2단위)',
  'Lv.8 : 시간 계산 (전체)',
];

function starsToString(stars) {
  return '⭐'.repeat(stars) + '☆'.repeat(3 - stars);
}

function renderStageCards() {
  const save = getClockSave();
  const list = document.getElementById('stage-card-list');
  list.innerHTML = '';

  LEVEL_NAMES.forEach((name, index) => {
    const level = index + 1;
    const isUnlocked = level <= save.unlockedLevel;
    const card = document.createElement('div');
    card.className = `stage-card ${isUnlocked ? 'stage-card--unlocked' : 'stage-card--locked'}`;

    const levelLabel = document.createElement('p');
    levelLabel.className = 'stage-card__level';
    levelLabel.textContent = isUnlocked ? name : `🔒 ${name}`;

    const starsLabel = document.createElement('p');
    starsLabel.className = 'stage-card__stars';
    starsLabel.textContent = starsToString(level === 8 ? save.currentStars ?? 0 : save.bestStars[index] ?? 0);

    card.append(levelLabel, starsLabel);
    if (isUnlocked) {
      card.addEventListener('click', () => {
        location.href = `index.html?level=${level}`;
      });
    }
    list.appendChild(card);
  });
}

function openDebugMenu() {
  document.getElementById('debug-menu').style.display = 'flex';
}

function closeDebugMenu() {
  document.getElementById('debug-menu').style.display = 'none';
}

function refreshAfterDebug() {
  renderStageCards();
  updateHeaderGold(getGold());
}

let devTapCount = 0;
let devTapTimer = null;

document.getElementById('stage-select-title').addEventListener('click', () => {
  devTapCount += 1;
  clearTimeout(devTapTimer);
  devTapTimer = setTimeout(() => { devTapCount = 0; }, 2000);

  if (devTapCount >= 7) {
    devTapCount = 0;
    clearTimeout(devTapTimer);
    openDebugMenu();
  }
});

document.getElementById('debug-menu-close').addEventListener('click', closeDebugMenu);

const debugActions = {
  resetAll,
  grantMaxGold,
  unlockAllClockLevels,
  star1: () => setAllClockStars(1),
  star2: () => setAllClockStars(2),
  star3: () => setAllClockStars(3),
};

document.querySelectorAll('#debug-menu [data-debug]').forEach((button) => {
  button.addEventListener('click', () => {
    debugActions[button.dataset.debug]();
    refreshAfterDebug();
    closeDebugMenu();
  });
});

createHeader();
renderStageCards();
