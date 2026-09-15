// v0.7.0
// Spelling Game - 판정(정답/오답) / 좌우 배치 / 갈림길 UI / 마당 종료 구현
// - front 슬롯이 갈림길(choice)이면 두 블록(fork-row)에 정답/오답을 배치, 일반(text)이면 단일 블록
// - 좌우 착지 좌표 재계산: block--front 100px + fork-row gap 5rem(80px) → 100/2 + 80/2 = 90px
// - 조작 규칙: 일반 블록엔 점프만, 갈림길엔 좌/우만 허용. 어긋나면 조작 실수(목숨 차감)
// - 갈림길 정답 후에는 반대쪽 방향키로 복귀해야 다음으로 전진 (편도 이동 금지)
// - 갈림길 오답: 목숨 차감 없이 학습 모달만 표시, 같은 갈림길 재시도 (일반 마당 규칙)
// - 정답률/보상 집계는 선택 지점(갈림길) 단위, 첫 시도 결과만 기록 (재시도는 집계에 영향 없음)
// - 목숨 0 또는 문제은행 소진 시 마당 종료. Gold 보상 연동은 이후 단계에서 구현
//
// Public API
// - initCharacter()

import { renderCharacterSvg } from '../../characters/characterRenderer.js';
import { getEquippedParts } from '../../core/saveManager.js';
import { DOE_DWAE_PROBLEMS } from './data/problems/doe-dwae.js';
import { STAGES, NORMAL_STAGE_QUESTION_COUNT, NORMAL_STAGE_LIVES } from './data/stages.js';

/* ===========================
   상수
=========================== */

const CHARACTER_X_OFFSET = 90; // 좌/우 갈림길 착지 좌표 (board-area 가로 중심 기준)
const JUMP_ANIM_DURATION = 400; // character-jump-arc(0.4s)와 동일하게 유지
const FADE_OUT_DURATION = 180;  // .block--fade-out 트랜지션(0.18s)과 동일하게 유지
const MISTAKE_ANIM_DURATION = 400; // 조작 실수 시 캐릭터 'wrong' 모션 재생 시간

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
// 토큰이 { text }면 'text' 타입, { correct, wrong }이면 'choice' 타입 아이템으로 변환한다.
function buildBlockQueue(problems, sentenceCount) {
  const picked = shuffleArray(problems).slice(0, sentenceCount);
  const queue = [];
  picked.forEach((problem) => {
    problem.tokens.forEach((token) => {
      if (token.text !== undefined) {
        queue.push({ type: 'text', text: token.text });
      } else {
        queue.push({
          type: 'choice',
          correct: token.correct,
          wrong: token.wrong,
          fixedSide: token.fixedSide,
          _resolved: false,
          _recorded: false
        });
      }
    });
  });
  return queue;
}

// 아이템의 표시 텍스트 (back/mid처럼 이미 지나간 자리는 항상 정답으로 통과했다고 가정)
function displayText(item) {
  return item.type === 'choice' ? item.correct : item.text;
}

// 갈림길 아이템의 좌/우 텍스트를 최초 1회만 계산해 캐싱 (fixedSide 없으면 랜덤 배치)
function resolveChoiceSides(item) {
  if (item.type !== 'choice' || item._resolved) return;
  const correctSide = (item.fixedSide === 'left' || item.fixedSide === 'right')
    ? item.fixedSide
    : (Math.random() < 0.5 ? 'left' : 'right');

  item.correctSide = correctSide;
  item.leftText  = correctSide === 'left'  ? item.correct : item.wrong;
  item.rightText = correctSide === 'right' ? item.correct : item.wrong;
  item._resolved = true;
}

// 현재 마당(stage) 1 = 되/돼 고정. 마당 선택 화면 연동은 이후 단계에서 구현.
const currentStage = STAGES.find((stage) => stage.level === 1);
const BLOCK_QUEUE = buildBlockQueue(PROBLEM_BANKS[currentStage.topic], NORMAL_STAGE_QUESTION_COUNT);
const TOTAL_CHOICE_POINTS = BLOCK_QUEUE.filter((item) => item.type === 'choice').length;

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

function playCharacterMotion(animation, duration) {
  if (!characterSvgEl || !characterEquipState) return;
  renderCharacterSvg(characterSvgEl, {
    head: characterEquipState.head,
    body: characterEquipState.body,
    legs: characterEquipState.legs,
    color: characterEquipState.color,
    colorMix: characterEquipState.colorMix,
    expression: 'idle',
    animation
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
  }, duration);
}

/* ===========================
   보드 상태 : 후(back)/중(mid)/전(front) 슬롯에 실제 아이템 객체를 보관
=========================== */

const backEl       = document.getElementById('board-back');
const midEl        = document.getElementById('board-mid');
const frontLeftEl  = document.getElementById('board-front-left');
const frontRightEl = document.getElementById('board-front-right');

const currentItems = { back: null, mid: null, front: null };
let queuePointer = 0;

// front 슬롯의 현재 아이템을 화면에 반영 (갈림길이면 두 블록, 아니면 왼쪽 블록만)
function renderFront() {
  const item = currentItems.front;
  if (!item) return;

  if (item.type === 'choice') {
    resolveChoiceSides(item);
    frontLeftEl.textContent  = item.leftText;
    frontRightEl.textContent = item.rightText;
    frontRightEl.style.display = '';
  } else {
    frontLeftEl.textContent = item.text;
    frontRightEl.style.display = 'none';
  }
}

// 큐에서 다음 아이템을 front로 끌어옴. 큐가 비었으면 마당 완료 처리.
function pullNextFront() {
  if (queuePointer >= BLOCK_QUEUE.length) {
    currentItems.front = null;
    finishStage();
    return;
  }
  currentItems.front = BLOCK_QUEUE[queuePointer];
  queuePointer += 1;
  renderFront();
}

// 최초 화면 : 큐 앞 2개는 이미 지나온 것으로 가정해 후/중에 배치, 3번째를 front로
function initBoard() {
  currentItems.back = BLOCK_QUEUE[0] ?? null;
  currentItems.mid  = BLOCK_QUEUE[1] ?? null;
  backEl.textContent = currentItems.back ? displayText(currentItems.back) : '';
  midEl.textContent  = currentItems.mid  ? displayText(currentItems.mid)  : '';

  queuePointer = 2;
  pullNextFront();
}

// front를 통과했을 때(일반 블록 점프 성공, 또는 갈림길 정답 후 복귀 성공) 한 칸 전진
function advancePastFront() {
  const boardFadeEls = [backEl, midEl, frontLeftEl, frontRightEl];
  boardFadeEls.forEach((el) => el.classList.add('block--fade-out'));

  setTimeout(() => {
    currentItems.back = currentItems.mid;
    currentItems.mid  = currentItems.front;

    backEl.textContent = currentItems.back ? displayText(currentItems.back) : '';
    midEl.textContent  = currentItems.mid  ? displayText(currentItems.mid)  : '';

    pullNextFront();

    boardFadeEls.forEach((el) => el.classList.remove('block--fade-out'));
  }, FADE_OUT_DURATION);
}

/* ===========================
   정답률 집계 (선택 지점 단위, 첫 시도만 기록)
=========================== */

const firstAttemptResults = [];

function recordChoiceResult(item, isCorrect) {
  if (item._recorded) return;
  item._recorded = true;
  firstAttemptResults.push(isCorrect);
}

/* ===========================
   목숨 (조작 실수에서만 차감 - 일반 마당 규칙)
=========================== */

let livesRemaining = NORMAL_STAGE_LIVES;

function updateHeartsDisplay() {
  const heartEls = document.querySelectorAll('#display-hearts .heart');
  heartEls.forEach((el, idx) => {
    el.textContent = idx < livesRemaining ? '❤️' : '♡';
  });
}

/* ===========================
   학습 모달 (갈림길 오답 시 - 목숨 차감 없음, 탭하면 닫고 재시도)
=========================== */

const learningModalEl = document.getElementById('learning-modal');
const learningModalTextEl = document.getElementById('learning-modal-text');

function showLearningModal(item) {
  learningModalTextEl.textContent = `정답은 "${item.correct}" 예요.`;
  learningModalEl.classList.remove('learning-modal--hidden');
}

learningModalEl.addEventListener('click', () => {
  learningModalEl.classList.add('learning-modal--hidden');
});

/* ===========================
   마당 완료 / 실패 (Gold 보상 연동은 이후 단계에서 구현)
=========================== */

const stageResultEl = document.getElementById('stage-result');
const stageResultTitleEl = document.getElementById('stage-result-title');
const stageResultDetailEl = document.getElementById('stage-result-detail');

let stageEnded = false;

function calcStars(correctCount, total) {
  if (total === 0) return 0;
  const rate = correctCount / total;
  if (rate >= 1) return 3;
  if (rate >= 2 / 3) return 2;
  if (rate >= 1 / 3) return 1;
  return 0;
}

function finishStage() {
  stageEnded = true;
  const correctCount = firstAttemptResults.filter(Boolean).length;
  const stars = calcStars(correctCount, TOTAL_CHOICE_POINTS);

  stageResultTitleEl.textContent = '마당 완료!';
  stageResultDetailEl.textContent =
    `${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}\n` +
    `선택 지점 ${correctCount} / ${TOTAL_CHOICE_POINTS} 정답\n` +
    `(Gold 보상 반영은 다음 단계에서 구현)`;
  stageResultEl.classList.remove('stage-result--hidden');
}

function failStage() {
  stageEnded = true;
  const correctCount = firstAttemptResults.filter(Boolean).length;

  stageResultTitleEl.textContent = '마당 실패';
  stageResultDetailEl.textContent =
    `목숨을 모두 잃었어요.\n` +
    `선택 지점 ${correctCount} / ${TOTAL_CHOICE_POINTS} 정답\n` +
    `보상은 지급되지 않습니다.`;
  stageResultEl.classList.remove('stage-result--hidden');
}

/* ===========================
   좌/중앙/우 3칸 캐릭터 위치 + 점프
=========================== */

const xTrackEl = document.getElementById('character-x-track');
const jumpEl   = document.getElementById('character-jump');

let currentLane = 'center'; // 'left' | 'center' | 'right' (캐릭터가 현재 서 있는 칸)

function applyLanePosition() {
  const offset = currentLane === 'left' ? -CHARACTER_X_OFFSET
               : currentLane === 'right' ? CHARACTER_X_OFFSET
               : 0;
  xTrackEl.style.transform = `translateX(${offset}px)`;
}

function playJumpMotion() {
  jumpEl.classList.remove('is-jumping');
  void jumpEl.offsetWidth; // 리플로우로 애니메이션 재시작
  jumpEl.classList.add('is-jumping');
  playCharacterMotion('correct', JUMP_ANIM_DURATION);
}

/* ===========================
   조작 실수 처리 (일반 블록에 좌우 입력 / 갈림길에 점프 입력 / 복귀 시 잘못된 방향키)
   → 목숨 차감. 칸/큐 상태는 그대로 두고 재시도 가능하게 함.
=========================== */

function handleOperationMistake() {
  livesRemaining -= 1;
  updateHeartsDisplay();
  playCharacterMotion('wrong', MISTAKE_ANIM_DURATION);

  if (livesRemaining <= 0) {
    failStage();
  }
}

/* ===========================
   조작 판정 상태머신
   phase: 'idle'    - 중앙에서 다음 블록(일반/갈림길) 대기
          'onFork'  - 갈림길 정답을 맞혀 좌/우 블록에 착지, 반대쪽 방향키로 복귀 대기
=========================== */

let phase = 'idle';
let forkSide = null; // phase === 'onFork'일 때 현재 서 있는 쪽

// action: 'left' | 'right' | 'jump'
function handleInput(action) {
  if (stageEnded) return;

  // 학습 모달이 열려있는 동안은 입력을 무시 (탭으로 먼저 닫아야 함)
  if (!learningModalEl.classList.contains('learning-modal--hidden')) return;

  if (phase === 'onFork') {
    const returnKey = forkSide === 'left' ? 'right' : 'left';
    if (action === returnKey) {
      // 정상 복귀 : 중앙으로, 다음 블록으로 전진
      currentLane = 'center';
      applyLanePosition();
      playJumpMotion();
      phase = 'idle';
      forkSide = null;
      advancePastFront();
    } else {
      // 점프로 복귀하거나, 반대쪽이 아닌 다른 키를 누른 경우 → 조작 실수
      handleOperationMistake();
    }
    return;
  }

  // phase === 'idle'
  const nextItem = currentItems.front;
  if (!nextItem) return;

  if (nextItem.type === 'choice') {
    // 갈림길 : 좌/우만 허용, 점프는 조작 실수
    if (action === 'jump') {
      handleOperationMistake();
      return;
    }

    const chosenSide = action; // 'left' | 'right'
    const isCorrect = nextItem.correctSide === chosenSide;
    recordChoiceResult(nextItem, isCorrect);

    if (isCorrect) {
      currentLane = chosenSide;
      applyLanePosition();
      playJumpMotion();
      phase = 'onFork';
      forkSide = chosenSide;
    } else {
      // 오답 : 목숨 차감 없음(일반 마당), 학습 모달만 표시 후 같은 갈림길 재시도
      showLearningModal(nextItem);
    }
    return;
  }

  // 일반 블록 : 점프만 허용, 좌우는 조작 실수
  if (action !== 'jump') {
    handleOperationMistake();
    return;
  }

  currentLane = 'center';
  applyLanePosition();
  playJumpMotion();
  advancePastFront();
}

/* ===========================
   조작 바인딩 : 키패드(모바일) / 키보드(PC)
=========================== */

document.querySelector('.keypad-area').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-key]');
  if (!btn) return;
  handleInput(btn.dataset.key);
});

document.addEventListener('keydown', (e) => {
  switch (e.key) {
    case 'ArrowLeft':
      e.preventDefault();
      handleInput('left');
      break;
    case 'ArrowRight':
      e.preventDefault();
      handleInput('right');
      break;
    case 'ArrowDown':
    case ' ': // Space
      e.preventDefault();
      handleInput('jump');
      break;
  }
});

/* ===========================
   초기화
=========================== */

initCharacter();
initBoard();
updateHeartsDisplay();