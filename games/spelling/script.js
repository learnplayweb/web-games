// v0.6.0
// Spelling Game - 문제은행 연동(랜덤 출제) + 블록 전진 연출을 페이드(+스케일)로 변경
// - WORD_QUEUE(임시 플레이스홀더) 제거, doe-dwae 문제은행에서 실제 랜덤 출제
// - 마당(stage 1)에 연결된 주제의 문제은행에서 NORMAL_STAGE_QUESTION_COUNT개 문장을 랜덤으로 뽑고,
//   문장 내부 토큰 순서를 유지한 채로 펼쳐 하나의 블록 큐로 사용 (문장이 쪼개지지 않음)
// - 선택 지점(choice) 판정/좌우 배치 로직은 아직 없어 정답 텍스트만 블록에 표시 (판정 단계에서 교체)
// - 큐를 다 쓰면 처음부터 반복 (마당 종료 판정은 이후 단계에서 구현)
//
// Public API
// - initCharacter()

import { renderCharacterSvg } from '../../characters/characterRenderer.js';
import { getEquippedParts } from '../../core/saveManager.js';
import { DOE_DWAE_PROBLEMS } from './data/problems/doe-dwae.js';
import { STAGES, NORMAL_STAGE_QUESTION_COUNT } from './data/stages.js';

/* ===========================
   상수
=========================== */

const CHARACTER_X_OFFSET = 115; // 좌/우 칸 좌표 (board-area 가로 중심 기준)
const JUMP_ANIM_DURATION = 400; // character-jump-arc(0.4s)와 동일하게 유지
const FADE_OUT_DURATION = 180;  // .block--fade-out 트랜지션(0.18s)과 동일하게 유지

/* ===========================
   문제은행 랜덤 출제 : 문장 단위로 뽑은 뒤 토큰을 순서대로 펼쳐 블록 큐 생성
=========================== */

// topic 문자열(stages.js) → 문제은행 배열 매핑. 주제가 추가되면 여기에도 등록.
const PROBLEM_BANKS = {
  'doe-dwae': DOE_DWAE_PROBLEMS
};

function shuffleArray(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// 문제은행에서 sentenceCount개 문장을 랜덤으로 뽑고, 각 문장의 토큰을 순서 그대로 펼쳐 블록 큐를 만든다.
// 선택 지점(correct/wrong)은 아직 판정 UI가 없어 정답 텍스트만 사용한다.
function buildBlockQueue(problems, sentenceCount) {
  const picked = shuffleArray(problems).slice(0, sentenceCount);
  const queue = [];
  picked.forEach((problem) => {
    problem.tokens.forEach((token) => {
      queue.push(token.text ?? token.correct);
    });
  });
  return queue;
}

// 현재는 마당(stage) 1 = 되/돼 고정. 마당 선택 화면 연동은 이후 단계에서 구현.
const currentStage = STAGES.find((stage) => stage.level === 1);
const BLOCK_QUEUE = buildBlockQueue(PROBLEM_BANKS[currentStage.topic], NORMAL_STAGE_QUESTION_COUNT);

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
   연출 : 페이드아웃(+살짝 축소) → 텍스트 교체 → 자동 페이드인
=========================== */

const boardEls = [
  document.getElementById('board-back'),
  document.getElementById('board-mid'),
  document.getElementById('board-front')
];

let queuePointer = 0; // BLOCK_QUEUE에서 다음에 꺼낼 위치

function nextBlockText() {
  const text = BLOCK_QUEUE[queuePointer % BLOCK_QUEUE.length];
  queuePointer += 1;
  return text;
}

// 화면 최초 진입 시 후/중/전 블록을 큐의 앞 3개로 채움
function initBoard() {
  const [backEl, midEl, frontEl] = boardEls;
  backEl.textContent  = nextBlockText();
  midEl.textContent   = nextBlockText();
  frontEl.textContent = nextBlockText();
}

function advanceBoard() {
  // 1) 페이드아웃(+축소)
  boardEls.forEach((el) => el.classList.add('block--fade-out'));

  setTimeout(() => {
    // 2) 텍스트 교체
    const [backEl, midEl, frontEl] = boardEls;
    backEl.textContent  = midEl.textContent;
    midEl.textContent   = frontEl.textContent;
    frontEl.textContent = nextBlockText();

    // 3) 클래스 제거 → 트랜지션으로 자동 페이드인
    boardEls.forEach((el) => el.classList.remove('block--fade-out'));
  }, FADE_OUT_DURATION);
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
initBoard();