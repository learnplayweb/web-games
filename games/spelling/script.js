// v0.4.0
// Spelling Game - Stage 3-2: 블록 스크롤(전진) 연출
// - 점프(↓/Space/점프 버튼) 입력 시 캐릭터는 제자리 점프, 블록 3칸의 텍스트가 후←중←전←신규 순으로 순환
// - 문제은행 연동 전이므로 임시 단어 배열(WORD_QUEUE)을 순환 사용 (실제 문제 데이터는 이후 단계에서 교체)
// - 갈림길(2블록)은 판정 로직을 붙이는 단계에서 재도입 예정. 현재는 단일 전(front) 블록만 사용
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
const SCROLL_TRANSITION_DURATION = 180; // .block--scrolling 트랜지션(0.18s)과 동일하게 유지

// 임시 플레이스홀더 단어 (문제은행 연동 전 데모용, 실제 데이터로 이후 교체 예정)
const WORD_QUEUE = ['밥을', '먹지', '않았더니', '배가', '고프다', '오늘', '하루도', '무사히', '지나갔다', '다행이다'];

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
   블록 스크롤(전진) : 점프 입력 시 텍스트가 후←중←전←신규 순으로 순환
=========================== */

const backEl  = document.getElementById('board-back');
const midEl   = document.getElementById('board-mid');
const frontEl = document.getElementById('board-front');

// 초기 화면(밥을/먹지/않았더니)에 이어질 다음 단어부터 큐 포인터 시작
let wordIndex = 3;

function advanceBoard() {
  // [전진 연출] 세 블록 모두 살짝 페이드아웃 → 텍스트 교체 → 트랜지션으로 자동 페이드인
  [backEl, midEl, frontEl].forEach((el) => el.classList.add('block--scrolling'));

  setTimeout(() => {
    backEl.textContent  = midEl.textContent;
    midEl.textContent   = frontEl.textContent;
    frontEl.textContent = WORD_QUEUE[wordIndex];
    wordIndex = (wordIndex + 1) % WORD_QUEUE.length;

    [backEl, midEl, frontEl].forEach((el) => el.classList.remove('block--scrolling'));
  }, SCROLL_TRANSITION_DURATION);
}

/* ===========================
   좌/중앙/우 3칸 상대 이동 (캐릭터 좌표만 변경, 블록 스크롤과는 독립 동작)
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

// 점프(↓/Space) : 캐릭터는 제자리 점프, 동시에 블록이 한 칸 전진
function jumpInPlace() {
  playJumpMotion();
  advanceBoard();
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