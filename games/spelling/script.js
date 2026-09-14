// v0.3.0
// Spelling Game - Stage 3-1 수정: 좌/중앙/우 3칸 상대 이동으로 로직 교체
// - 점프(↓/Space)는 현재 칸에서 제자리 점프, 좌우 방향키는 한 칸씩만 이동(좌↔중, 중↔우)
// - 좌우 착지 좌표 재계산: block--front 150px + fork-row gap 5rem(80px) → 150/2 + 80/2 = 115px
//
// Public API
// - initCharacter()

import { renderCharacterSvg } from '../../characters/characterRenderer.js';
import { getEquippedParts } from '../../core/saveManager.js';

/* ===========================
   상수
=========================== */

const CHARACTER_X_OFFSET = 115; // 좌/우 칸 좌표 (board-area 가로 중심 기준)
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
   좌/중앙/우 3칸 상대 이동 (좌표 변경만, 블록 이동은 3-2에서 구현)
=========================== */

const xTrackEl = document.getElementById('character-x-track');
const jumpEl   = document.getElementById('character-jump');

// 현재 캐릭터가 서 있는 칸. 한 번에 한 칸씩만 이동 가능 (좌 ↔ 중 ↔ 우)
let currentLane = 'center'; // 'left' | 'center' | 'right'

function applyLanePosition() {
  const offset = currentLane === 'left' ? -CHARACTER_X_OFFSET
               : currentLane === 'right' ? CHARACTER_X_OFFSET
               : 0;
  xTrackEl.style.transform = `translateX(${offset}px)`;
}

// 왼쪽 방향키 : 중앙→좌, 우→중앙. 이미 좌인 경우 더 갈 곳이 없어 제자리 점프만 수행.
function stepLeft() {
  if (currentLane === 'center') currentLane = 'left';
  else if (currentLane === 'right') currentLane = 'center';
  applyLanePosition();
  playJumpMotion();
}

// 오른쪽 방향키 : 중앙→우, 좌→중앙. 이미 우인 경우 더 갈 곳이 없어 제자리 점프만 수행.
function stepRight() {
  if (currentLane === 'center') currentLane = 'right';
  else if (currentLane === 'left') currentLane = 'center';
  applyLanePosition();
  playJumpMotion();
}

// 점프(↓/Space) : 칸 이동 없이 현재 위치에서 제자리 점프만 수행
function jumpInPlace() {
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
  if (key === 'left')  stepLeft();
  if (key === 'right') stepRight();
  if (key === 'jump')  jumpInPlace();
});

document.addEventListener('keydown', (e) => {
  switch (e.key) {
    case 'ArrowLeft':
      e.preventDefault();
      stepLeft();
      break;
    case 'ArrowRight':
      e.preventDefault();
      stepRight();
      break;
    case 'ArrowDown':
    case ' ': // Space
      e.preventDefault();
      jumpInPlace();
      break;
  }
});

/* ===========================
   초기화
=========================== */

initCharacter();