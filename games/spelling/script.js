// v0.2.0
// Spelling Game - Stage 3-1: 점프 및 키보드 조작
// - 모바일(키패드)/PC(키보드) 동일 조작: ←/→ = 좌우 착지, ↓ 또는 Space = 중앙 점프
// - 캐릭터 좌표만 이동(블록이 흘러가는 연출은 3-2에서 구현)
// - 점프 동작은 character-anim.css의 'correct' 세트(팔다리 파닥임)를 재사용
//
// Public API
// - initCharacter()
// - moveCharacterTo(target)

import { renderCharacterSvg } from '../../characters/characterRenderer.js';
import { getEquippedParts } from '../../core/saveManager.js';

/* ===========================
   상수
=========================== */

// 갈림길 블록 중심 좌표 (board-area 가로 중심 기준, ±82px)
// 산출 근거: block--front 폭 150px + fork-row gap 0.9rem(14.4px) → 150/2 + 14.4/2 = 82.2px
const CHARACTER_X_OFFSET = 82;
const JUMP_ANIM_DURATION = 400; // character-jump-arc(0.4s)와 동일하게 유지

/* ===========================
   캐릭터 초기화 (정면 idle)
=========================== */

let characterSvgEl = null;
let characterEquipState = null;

function initCharacter() {
  const container = document.getElementById('character-container');
  if (!container) return;

  characterEquipState = getEquippedParts();

  characterSvgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  characterSvgEl.classList.add('ingame-character');
  characterSvgEl.setAttribute('viewBox', '0 0 160 300');
  container.appendChild(characterSvgEl);

  renderCharacterSvg(characterSvgEl, {
    head: characterEquipState.head,
    body: characterEquipState.body,
    legs: characterEquipState.legs,
    color: characterEquipState.color,
    colorMix: characterEquipState.colorMix,
    expression: 'idle',
    animation: 'idle'
  });
}

/* ===========================
   좌우 이동 + 점프 (좌표 변경만, 블록 이동은 3-2에서 구현)
=========================== */

const xTrackEl = document.getElementById('character-x-track');
const jumpEl   = document.getElementById('character-jump');

// target: 'left' | 'center' | 'right'
function moveCharacterTo(target) {
  const offset = target === 'left' ? -CHARACTER_X_OFFSET
               : target === 'right' ? CHARACTER_X_OFFSET
               : 0;

  xTrackEl.style.transform = `translateX(${offset}px)`;
  playJumpMotion();
}

// 점프 아크(위치 이동) + 팔다리 파닥임(correct 세트) 동시 재생
function playJumpMotion() {
  // [점프 아크] 클래스를 껐다 켜서 애니메이션 재시작 (reflow로 강제)
  jumpEl.classList.remove('is-jumping');
  void jumpEl.offsetWidth;
  jumpEl.classList.add('is-jumping');

  // [팔다리 파닥임] correct 세트를 잠깐 재생 후 idle로 복귀
  if (!characterSvgEl || !characterEquipState) return;
  renderCharacterSvg(characterSvgEl, {
    head: characterEquipState.head,
    body: characterEquipState.body,
    legs: characterEquipState.legs,
    color: characterEquipState.color,
    colorMix: characterEquipState.colorMix,
    expression: 'idle',
    animation: 'correct'
  });

  setTimeout(() => {
    renderCharacterSvg(characterSvgEl, {
      head: characterEquipState.head,
      body: characterEquipState.body,
      legs: characterEquipState.legs,
      color: characterEquipState.color,
      colorMix: characterEquipState.colorMix,
      expression: 'idle',
      animation: 'idle'
    });
  }, JUMP_ANIM_DURATION);
}

/* ===========================
   조작 바인딩 : 키패드(모바일) / 키보드(PC)
=========================== */

document.querySelector('.keypad-area').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-key]');
  if (!btn) return;

  const key = btn.dataset.key;
  if (key === 'left')  moveCharacterTo('left');
  if (key === 'right') moveCharacterTo('right');
  if (key === 'jump')  moveCharacterTo('center');
});

document.addEventListener('keydown', (e) => {
  switch (e.key) {
    case 'ArrowLeft':
      e.preventDefault();
      moveCharacterTo('left');
      break;
    case 'ArrowRight':
      e.preventDefault();
      moveCharacterTo('right');
      break;
    case 'ArrowDown':
    case ' ': // Space
      e.preventDefault();
      moveCharacterTo('center');
      break;
  }
});

/* ===========================
   초기화
=========================== */

initCharacter();