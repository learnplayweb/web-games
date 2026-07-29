// v0.1.0 : 최초 생성 - 공통 Sticky Header 생성 함수
// v0.1.1 : Implement - 숨김 디버그 메뉴 추가. 💎 표시 영역을 7회 연속 탭하면 열림.
//          core/debug.js는 동적 import로만 불러와, 배포 시 그 파일만 지워도
//          헤더/페이지 전체는 영향받지 않도록 함(정적 import 금지).

import { getGold } from '../core/saveManager.js';

function createHeader() {
  const gold = getGold();

  const header = document.createElement('header');
  header.className = 'shared-header';
  header.innerHTML = `
    <div class="shared-header__content">
      <span class="shared-header__gold" id="shared-header-gold">
        <span>💎</span>
        <span class="shared-header__gold-value" id="shared-gold-value">${gold}</span>
      </span>
    </div>
  `;

  // 화면 상단에 고정 표시
  document.body.insertBefore(header, document.body.firstChild);

  setupDebugMenu();
}

/**
 * 헤더의 Gold 표시를 갱신한다.
 * 각 화면에서 gold 값이 변경될 때 호출한다.
 * @param {number} amount - 현재 보유 Gold
 */
function updateHeaderGold(amount) {
  const el = document.getElementById('shared-gold-value');
  if (el) el.textContent = amount;
}

// ===========================
// 숨김 디버그 메뉴
// - 💎 표시 영역(#shared-header-gold)을 2초 이내 7회 탭하면 열린다.
// - core/debug.js는 열릴 때 동적 import: 그 파일이 배포판에 없으면 조용히 무시된다.
// - 액션 실행 후에는 페이지를 새로고침한다. 페이지마다 갱신해야 할 화면 상태가
//   달라(캐릭터샵 파츠/단계 카드 등) header.js가 개별적으로 알 필요 없이
//   한 번에 최신 저장 데이터를 반영하기 위함.
// ===========================
const DEBUG_TAP_TARGET_COUNT = 7;
const DEBUG_TAP_WINDOW_MS = 2000;

const DEBUG_MENU_ITEMS = [
  { key: 'grantMaxGold', label: 'Gold 99999 지급' },
  { key: 'resetAll', label: '시계 게임 초기화' },
  { key: 'unlockAllClockLevels', label: 'Clock 모든 단계 해금' },
  { key: 'star1', label: '시계 별 1개' },
  { key: 'star2', label: '시계 별 2개' },
  { key: 'star3', label: '시계 별 3개' },
  { key: 'resetCharacter', label: '캐릭터샵 초기화' },
];

function buildDebugActions(debugModule) {
  return {
    grantMaxGold: debugModule.grantMaxGold,
    resetAll: debugModule.resetAll,
    unlockAllClockLevels: debugModule.unlockAllClockLevels,
    resetCharacter: debugModule.resetCharacter,
    star1: () => debugModule.setAllClockStars(1),
    star2: () => debugModule.setAllClockStars(2),
    star3: () => debugModule.setAllClockStars(3),
  };
}

function openDebugMenu(debugModule) {
  if (document.getElementById('debug-menu')) return; // 중복 오픈 방지

  const actions = buildDebugActions(debugModule);

  const overlay = document.createElement('div');
  overlay.id = 'debug-menu';
  overlay.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.5); z-index:999; display:flex; align-items:center; justify-content:center;';

  const card = document.createElement('div');
  card.style.cssText = 'background:#fff; border-radius:8px; padding:16px; min-width:220px; display:flex; flex-direction:column; gap:8px; font-family:inherit;';

  const title = document.createElement('p');
  title.style.cssText = 'font-weight:bold; margin:0 0 4px;';
  title.textContent = '🔧 Debug Menu';
  card.appendChild(title);

  DEBUG_MENU_ITEMS.forEach(({ key, label }) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.addEventListener('click', () => {
      actions[key]?.();
      window.location.reload(); // 페이지 무관하게 최신 저장 데이터로 화면 갱신
    });
    card.appendChild(button);
  });

  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.textContent = '닫기';
  closeButton.addEventListener('click', () => overlay.remove());
  card.appendChild(closeButton);

  overlay.appendChild(card);
  document.body.appendChild(overlay);
}

function setupDebugMenu() {
  const tapTarget = document.getElementById('shared-header-gold');
  if (!tapTarget) return;

  let tapCount = 0;
  let tapTimer = null;

  tapTarget.addEventListener('click', async () => {
    tapCount += 1;
    clearTimeout(tapTimer);
    tapTimer = setTimeout(() => { tapCount = 0; }, DEBUG_TAP_WINDOW_MS);

    if (tapCount < DEBUG_TAP_TARGET_COUNT) return;
    tapCount = 0;
    clearTimeout(tapTimer);

    try {
      const debugModule = await import('../core/debug.js');
      openDebugMenu(debugModule);
    } catch {
      // core/debug.js가 없는 배포 환경: 조용히 무시
    }
  });
}

export { createHeader, updateHeaderGold };