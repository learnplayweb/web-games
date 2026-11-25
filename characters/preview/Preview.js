// characters v0.4.0 : 동작 조합(눈·입·몸·팔·다리) 테스트, 프리셋 코드 복사, 등록된 이벤트·프리셋 재생 추가
// preview.js
// - characterRenderer.js의 renderCharacterSvg 재사용, characterData.js에서 파츠/표정 목록을 직접 import
// - head/body/legs/eyes/mouth 드롭다운을 BASE_PARTS·FACE_ASSETS로부터 런타임 생성 (목록 추가 시 코드 수정 불필요)
// - eyes/mouth는 expression 매개 없이 완전히 독립 선택 → 서로 다른 상태 조합 테스트 가능
// - 몸·팔·다리 동작(motions.js 목록)은 고르는 즉시 클래스만 교체하여 반영 (재렌더링 없음)
// - 합격한 조합은 "등록용 코드 복사"로 motions.js의 PRESETS에 붙여 넣는다
// - 등록된 이벤트·프리셋은 motionPlayer.js(게임이 쓰는 엔진과 동일)로 재생해 실제 동작을 확인한다

import { renderCharacterSvg, setCharacterMotions } from '../characterRenderer.js';
import { BASE_PARTS, FACE_ASSETS } from '../characterData.js';
import { BODY_MOTIONS, ARM_MOTIONS, LEG_MOTIONS, PRESETS } from '../motions.js';
import { createMotionPlayer } from '../motionPlayer.js';

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
  motionBody: document.getElementById('input-motion-body'),
  motionArms: document.getElementById('input-motion-arms'),
  motionLegs: document.getElementById('input-motion-legs'),
  presetId: document.getElementById('preset-id'),
  presetLabel: document.getElementById('preset-label'),
  presetDuration: document.getElementById('preset-duration'),
  presetEvents: document.getElementById('preset-events'),
  previewBtn: document.getElementById('btn-preview'),
  copyBtn: document.getElementById('btn-copy'),
  copyMessage: document.getElementById('copy-message'),
  presetCode: document.getElementById('preset-code'),
  registeredEvents: document.getElementById('registered-events'),
  registeredPresets: document.getElementById('registered-presets'),
};

// ─────────────────────────────────────────────
// 드롭다운 옵션 채우기 (BASE_PARTS / FACE_ASSETS / motions.js 기준, 하드코딩 없음)
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
const toOptions = (names) => names.map((name) => ({ value: name, label: name }));

populateSelect(els.head, partOptions);
populateSelect(els.body, partOptions, { noneLabel: '없음' });
populateSelect(els.legs, partOptions, { noneLabel: '없음' });
populateSelect(els.eyes, eyeOptions);
populateSelect(els.mouth, mouthOptions);
populateSelect(els.motionBody, toOptions(BODY_MOTIONS));
populateSelect(els.motionArms, toOptions(ARM_MOTIONS));
populateSelect(els.motionLegs, toOptions(LEG_MOTIONS));

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
  motions: { body: 'idle', arms: 'idle', legs: 'idle' },
};

els.head.value = currentConfig.head;
els.body.value = currentConfig.body;
els.legs.value = currentConfig.legs;
els.eyes.value = currentConfig.eyes;
els.mouth.value = currentConfig.mouth;
els.motionBody.value = 'idle';
els.motionArms.value = 'idle';
els.motionLegs.value = 'idle';

const readMotions = () => ({
  body: els.motionBody.value,
  arms: els.motionArms.value,
  legs: els.motionLegs.value,
});

// 지금 화면에서 고른 눈·입·몸·팔·다리 조합
const readCombo = () => ({ eyes: els.eyes.value, mouth: els.mouth.value, ...readMotions() });

function readConfigFromInputs() {
  return {
    ...currentConfig,
    head: els.head.value || null,
    body: els.body.value || null,
    legs: els.legs.value || null,
    eyes: els.eyes.value,
    mouth: els.mouth.value,
    color: els.colorEnabled.checked ? els.color.value : null,
    motions: readMotions(),
  };
}

// 게임이 쓰는 동작 엔진과 같은 것을 프리뷰에서도 사용 (눈·입을 바꿀 때 다시 그리기 위해 현재 장착 상태를 넘겨 줌)
const player = createMotionPlayer(svg, {
  getEquip: () => ({
    head: currentConfig.head,
    body: currentConfig.body,
    legs: currentConfig.legs,
    color: currentConfig.color,
    colorMix: currentConfig.colorMix,
  }),
});

async function applyAndRender() {
  currentConfig = readConfigFromInputs();
  await renderCharacterSvg(svg, currentConfig);
  player.syncState(readCombo()); // 엔진이 알고 있는 현재 상태를 화면과 맞춤
  updateAnimButtons();
}

// 몸·팔·다리 동작만 교체 (파츠를 다시 불러오지 않으므로 즉시 반영)
function applyMotions() {
  currentConfig.motions = readMotions();
  setCharacterMotions(svg, currentConfig.motions);
  player.syncState(readCombo());
  updateAnimButtons();
}

// "전체 동작 한 번에" 버튼: 몸·팔·다리에 같은 동작 적용
function setAllMotions(name) {
  els.motionBody.value = name;
  els.motionArms.value = name;
  els.motionLegs.value = name;
  applyMotions();
}

function updateAnimButtons() {
  const { body, arms, legs } = readMotions();
  const sameForAll = body === arms && arms === legs ? body : null;
  els.animButtons.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.anim === sameForAll);
  });
}

els.applyBtn.addEventListener('click', applyAndRender);
[els.motionBody, els.motionArms, els.motionLegs].forEach((select) => select.addEventListener('change', applyMotions));
els.animButtons.forEach((btn) => {
  btn.addEventListener('click', () => setAllMotions(btn.dataset.anim));
});

// ─────────────────────────────────────────────
// 프리셋 만들기: 코드 복사 / 길이만큼 재생 후 복귀
// ─────────────────────────────────────────────
function buildPresetCode() {
  const combo = readCombo();
  const id = els.presetId.value.trim() || 'new-preset';
  const label = els.presetLabel.value.trim() || id;
  const duration = Number(els.presetDuration.value) || 600;
  const events = els.presetEvents.value.split(',').map((name) => name.trim()).filter(Boolean);
  const eventsText = events.map((name) => `'${name}'`).join(', ');
  return `  { id: '${id}', label: '${label}', eyes: '${combo.eyes}', mouth: '${combo.mouth}', body: '${combo.body}', arms: '${combo.arms}', legs: '${combo.legs}', duration: ${duration}, events: [${eventsText}], enabled: true },`;
}

async function copyPresetCode() {
  const code = buildPresetCode();
  els.presetCode.textContent = code;
  try {
    await navigator.clipboard.writeText(code);
    els.copyMessage.textContent = '복사했습니다.';
  } catch {
    // 클립보드를 쓸 수 없는 환경: 아래 표시된 코드를 직접 복사
    els.copyMessage.textContent = '자동 복사에 실패했습니다. 아래 코드를 직접 복사해 주세요.';
  }
}

els.copyBtn.addEventListener('click', copyPresetCode);
els.previewBtn.addEventListener('click', () => {
  const duration = Number(els.presetDuration.value) || 600;
  player.applyCombo(readCombo(), { duration }); // 길이가 지나면 기본(idle) 상태로 돌아감
});

// ─────────────────────────────────────────────
// 등록된 이벤트·프리셋 재생 (게임이 쓰는 엔진 그대로)
// ─────────────────────────────────────────────
function renderRegisteredList() {
  const makeButtons = (container, items, onClick) => {
    container.innerHTML = '';
    if (items.length === 0) {
      const empty = document.createElement('span');
      empty.className = 'empty';
      empty.textContent = '등록된 항목이 없습니다.';
      container.appendChild(empty);
      return;
    }
    items.forEach(({ key, label }) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = label;
      button.addEventListener('click', () => onClick(key));
      container.appendChild(button);
    });
  };

  makeButtons(els.registeredEvents, player.getEvents().map((name) => ({ key: name, label: name })), (name) => player.play(name));
  makeButtons(
    els.registeredPresets,
    PRESETS.filter((preset) => preset.enabled !== false).map((preset) => ({ key: preset.id, label: `${preset.label} (${preset.id})` })),
    (id) => player.playPreset(id),
  );
}

setupDebugMenu();
renderRegisteredList();

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
  { key: 'unlockAllSpelling', label: '맞춤법 모든 단계 해금' },
  { key: 'resetSpelling', label: '맞춤법 게임 초기화' },
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
    unlockAllSpelling: debugModule.unlockAllSpellingStages, // 비동기(게임 데이터를 동적으로 불러옴)
    resetSpelling: debugModule.resetSpelling,
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
    button.addEventListener('click', async () => {
      await actions[key]?.(); // 비동기 액션(맞춤법 해금)이 끝난 뒤에 새로고침해야 저장 결과가 반영됨
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