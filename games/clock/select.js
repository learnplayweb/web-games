// clock v0.2.0 : 선택 화면 공통 모듈(shared/stageSelect.js) 사용으로 변경 (카드 렌더링·헤더·뒤로가기 갱신 이동)
import { getClockSave } from '../../core/saveManager.js';
import { initStageSelect } from '../../shared/stageSelect.js';

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

// 시계 고유 규칙: 단계는 순서대로 해금(unlockedLevel), 복습 단계(Lv.8)는 최고 별점이 아닌 최근 별점(currentStars)을 표시
function buildCards() {
  const save = getClockSave();

  return LEVEL_NAMES.map((name, index) => {
    const level = index + 1;
    return {
      level,
      name,
      unlocked: level <= save.unlockedLevel,
      stars: level === 8 ? save.currentStars ?? 0 : save.bestStars[index] ?? 0,
    };
  });
}

/* 디버그 메뉴 열기/닫기/버튼 > 헤더로 옮김
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
*/

initStageSelect({ getCards: buildCards });