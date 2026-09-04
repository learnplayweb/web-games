// v0.3.0
// preview.js
// - characterRenderer.js의 renderCharacterSvg 재사용, characterData.js에서 파츠/표정 목록을 직접 import
// - head/body/legs/eyes/mouth 드롭다운을 BASE_PARTS·FACE_ASSETS로부터 런타임 생성 (목록 추가 시 코드 수정 불필요)
// - eyes/mouth는 expression 매개 없이 완전히 독립 선택 → 서로 다른 상태 조합 테스트 가능
// - 애니메이션 상태(8종) 전환은 재렌더링 없이 state-* 클래스만 교체하여 즉시 확인

import { renderCharacterSvg } from '../characterRenderer.js';
import { BASE_PARTS, FACE_ASSETS } from '../characterData.js';

const svg = document.getElementById('character-svg');

const els = {
  head: document.getElementById('input-head'),
  body: document.getElementById('input-body'),
  legs: document.getElementById('input-legs'),
  eyes: document.getElementById('input-eyes'),
  mouth: document.getElementById('input-mouth'),
  color: document.getElementById('input-color'),
  colorEnabled: document.getElementById('input-color-enabled'),
  applyBtn: document.getElementById('btn-apply'),
  animButtons: document.querySelectorAll('.anim-buttons button'),
};

// ─────────────────────────────────────────────
// 드롭다운 옵션 채우기 (BASE_PARTS / FACE_ASSETS 기준, 하드코딩 없음)
// ─────────────────────────────────────────────
function populateSelect(selectEl, options, { noneLabel } = {}) {
  selectEl.innerHTML = '';

  if (noneLabel) {
    const noneOpt = document.createElement('option');
    noneOpt.value = '';
    noneOpt.textContent = noneLabel;
    selectEl.appendChild(noneOpt);
  }

  options.forEach(({ value, label }) => {
    const opt = document.createElement('option');
    opt.value = value;
    opt.textContent = label;
    selectEl.appendChild(opt);
  });
}

const partOptions = BASE_PARTS.map((part) => ({ value: part.id, label: `${part.name} (${part.id})` }));
// eyes/mouth는 각자의 키 목록을 그대로 사용 (두 목록이 다를 수 있음을 전제, 서로 강제 매칭하지 않음)
const eyeOptions = Object.keys(FACE_ASSETS.eyes).map((key) => ({ value: key, label: key }));
const mouthOptions = Object.keys(FACE_ASSETS.mouth).map((key) => ({ value: key, label: key }));

populateSelect(els.head, partOptions);
populateSelect(els.body, partOptions, { noneLabel: '없음' });
populateSelect(els.legs, partOptions, { noneLabel: '없음' });
populateSelect(els.eyes, eyeOptions);
populateSelect(els.mouth, mouthOptions);

// ─────────────────────────────────────────────
// 초기 기본값
// ─────────────────────────────────────────────
let currentConfig = {
  head: partOptions[0]?.value ?? null,
  body: partOptions[0]?.value ?? null,
  legs: partOptions[0]?.value ?? null,
  color: '#ffd54f',
  colorMix: null,
  eyes: eyeOptions[0]?.value ?? 'idle',
  mouth: mouthOptions[0]?.value ?? 'idle',
  animation: 'idle',
};

els.head.value = currentConfig.head;
els.body.value = currentConfig.body;
els.legs.value = currentConfig.legs;
els.eyes.value = currentConfig.eyes;
els.mouth.value = currentConfig.mouth;

function readConfigFromInputs() {
  return {
    ...currentConfig,
    head: els.head.value || null,
    body: els.body.value || null,
    legs: els.legs.value || null,
    eyes: els.eyes.value,
    mouth: els.mouth.value,
    color: els.colorEnabled.checked ? els.color.value : null,
  };
}

async function applyAndRender() {
  currentConfig = readConfigFromInputs();
  await renderCharacterSvg(svg, currentConfig);
  setAnimation(currentConfig.animation);
}

// renderCharacterSvg 내부와 동일한 방식(state-* 클래스 교체)으로 애니메이션만 전환.
// 파츠를 다시 불러오지 않으므로 즉시 반영됨.
function setAnimation(animName) {
  currentConfig.animation = animName;

  Array.from(svg.classList).forEach((cls) => {
    if (cls.startsWith('state-')) svg.classList.remove(cls);
  });
  svg.classList.add(`state-${animName}`);

  els.animButtons.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.anim === animName);
  });
}

els.applyBtn.addEventListener('click', applyAndRender);

els.animButtons.forEach((btn) => {
  btn.addEventListener('click', () => setAnimation(btn.dataset.anim));
});

setupDebugMenu();

// 초기 렌더링
applyAndRender();

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
  { key: 'resetClock', label: '시계 게임 초기화' },
  { key: 'unlockAllClockLevels', label: 'Clock 모든 단계 해금' },
  { key: 'star1', label: '시계 별 1개' },
  { key: 'star2', label: '시계 별 2개' },
  { key: 'star3', label: '시계 별 3개' },
  { key: 'resetCharacter', label: '캐릭터샵 초기화' },
  { key: 'resetAll', label: '전체 데이터 초기화 (골드+캐릭터+게임)' },
];

function buildDebugActions(debugModule) {
  return {
    resetClock: debugModule.resetClock,
    grantMaxGold: debugModule.grantMaxGold,
    unlockAllClockLevels: debugModule.unlockAllClockLevels,
    resetCharacter: debugModule.resetCharacter,
    resetAll: debugModule.resetAll,
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
  const tapTarget = document.getElementById('character-stage');
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
      const debugModule = await import('../../core/debug.js');
      openDebugMenu(debugModule);
    } catch {
      // core/debug.js가 없는 배포 환경: 조용히 무시
    }
  });
}