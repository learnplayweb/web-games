// v0.10.0
// Spelling Game - 갈림길 표시 버그 수정 + 조작 규칙 완화 + 실패 모달 캐릭터 회전
// - 갈림길 오른쪽 블록이 항상 숨겨지던 버그 수정 (style.display='' 대신 'flex'로 명시)
// - 조작 실수는 갈림길에서 점프를 눌렀을 때만 발생. 일반 블록 전진/갈림길 복귀는 어떤 방향이든 진행됨
// - front 슬롯이 갈림길(choice)이면 두 블록(fork-row)에 정답/오답을 배치, 일반(text)이면 단일 블록
// - 좌우 착지 좌표: block--front 170px + fork-row gap 5rem(80px) → 170/2 + 80/2 = 125px
// - 정답 : 블록 0.6초 초록 플래시 + 캐릭터 correct 세트
// - 오답 : 목숨 차감 없음. 블록 0.6초 빨강 플래시 + 캐릭터 wrong 세트 + 빠른 점멸, 이후 중앙 롤백과 동시에 학습 모달
// - 조작 실수 : 목숨 차감. 캐릭터만 추락+회전(1.6초) 후 빠른 점멸과 함께 원래 칸으로 복귀
// - 정답률/보상 집계는 선택 지점(갈림길) 단위, 첫 시도 결과만 기록 (재시도는 집계에 영향 없음)
// - 목숨 0 또는 문제은행 소진 시 마당 종료. Gold 보상 연동은 이후 단계에서 구현
//
// Public API
// - initCharacter()

import { renderCharacterSvg } from '../../characters/characterRenderer.js';
import { getEquippedParts } from '../../core/saveManager.js';
import { DOE_DWAE_PROBLEMS, DOE_DWAE_GUIDE } from './data/problems/doe-dwae.js';
import { STAGES, NORMAL_STAGE_QUESTION_COUNT, NORMAL_STAGE_LIVES } from './data/stages.js';

/* ===========================
   상수
=========================== */

const CHARACTER_X_OFFSET = 125; // 좌/우 갈림길 착지 좌표 (board-area 가로 중심 기준)
const JUMP_ANIM_DURATION = 400;    // character-jump-arc(0.4s)와 동일하게 유지
const FADE_OUT_DURATION = 180;     // .block--fade-out 트랜지션(0.18s)과 동일하게 유지
const FLASH_DURATION = 600;        // 정오답 블록 플래시 (0.6초, 시계 게임 참고)
const FALL_DURATION = 1600;        // 조작 실수 캐릭터 추락(1.6초)
const BLINK_DURATION = 500;        // 추락/오답 롤백 시 빠른 점멸 시간

/* ===========================
   문제은행 랜덤 출제 : 문장 단위로 뽑은 뒤 토큰을 순서대로 펼쳐 블록 큐 생성
=========================== */

// topic 문자열(stages.js) → 문제은행/학습 가이드 매핑. 주제가 추가되면 여기에도 등록.
const PROBLEM_BANKS = {
  'doe-dwae': DOE_DWAE_PROBLEMS
};
const TOPIC_GUIDES = {
  'doe-dwae': DOE_DWAE_GUIDE
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
const CURRENT_GUIDE = TOPIC_GUIDES[currentStage.topic];

/* ===========================
   캐릭터 초기화 (정면 idle) + 모션 재생 헬퍼
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

// expression/animation을 독립적으로 지정 가능 (예: 조작 실수는 눈·입은 wrong, 움직임은 correct)
function renderCharacterState(expression, animation) {
  if (!characterSvgEl || !characterEquipState) return;
  renderCharacterSvg(characterSvgEl, {
    head: characterEquipState.head,
    body: characterEquipState.body,
    legs: characterEquipState.legs,
    color: characterEquipState.color,
    colorMix: characterEquipState.colorMix,
    expression,
    animation
  });
}

function playCharacterMotion(expression, animation, duration) {
  renderCharacterState(expression, animation);
  setTimeout(() => renderCharacterState('idle', 'idle'), duration);
}

/* ===========================
   보드 상태 : 이전(back)/현재(mid)/다음(front) 슬롯에 실제 아이템 객체를 보관
=========================== */

const backEl       = document.getElementById('board-back');
const midEl        = document.getElementById('board-mid');
const frontLeftEl  = document.getElementById('board-front-left');
const frontRightEl = document.getElementById('board-front-right');

const currentItems = { back: null, mid: null, front: null };
let queuePointer = 0;

// front 슬롯의 현재 아이템을 화면에 반영 (갈림길이면 두 블록, 아니면 왼쪽 블록만)
// 주의: style.display='' 로는 CSS의 #board-front-right{display:none}을 못 이기고 다시 숨겨짐 → 'flex'로 명시
function renderFront() {
  const item = currentItems.front;
  if (!item) return;

  if (item.type === 'choice') {
    resolveChoiceSides(item);
    frontLeftEl.textContent  = item.leftText;
    frontRightEl.textContent = item.rightText;
    frontRightEl.style.display = 'flex';
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

// 최초 화면 : 큐 앞 2개는 이미 지나온 것으로 가정해 이전/현재에 배치, 3번째를 다음(front)으로
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

// 정답/오답 0.6초 블록 플래시 (시계 게임의 정오답 표시 참고, 통일성 유지)
function flashBlock(el, type) {
  const cls = type === 'correct' ? 'block--flash-correct' : 'block--flash-wrong';
  el.classList.add(cls);
  setTimeout(() => el.classList.remove(cls), FLASH_DURATION);
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
   학습 모달 (마당 시작 시 + 갈림길 오답 시 공통 노출). 아무 곳이나 탭하면 닫힘.
   콘텐츠는 주제별 문제은행 파일의 GUIDE 데이터(줄/세그먼트 배열)를 렌더링한다.
=========================== */

const learningModalEl = document.getElementById('learning-modal');
const learningModalTitleEl = document.getElementById('learning-modal-title');
const learningModalTextEl = document.getElementById('learning-modal-text');

// guide.lines: 줄 배열, 각 줄은 세그먼트 배열. { text, emph? } — emph: 'blue' | 'red'
function renderGuideModal(guide) {
  learningModalTitleEl.textContent = guide.title;
  learningModalTextEl.innerHTML = '';

  guide.lines.forEach((line) => {
    const p = document.createElement('p');
    line.forEach((segment) => {
      if (segment.emph === 'blue' || segment.emph === 'red') {
        const span = document.createElement('span');
        span.className = segment.emph === 'blue' ? 'emph-blue' : 'emph-red';
        span.textContent = segment.text;
        p.appendChild(span);
      } else {
        p.appendChild(document.createTextNode(segment.text));
      }
    });
    learningModalTextEl.appendChild(p);
  });
}

function showLearningModal() {
  renderGuideModal(CURRENT_GUIDE);
  learningModalEl.classList.remove('learning-modal--hidden');
}

learningModalEl.addEventListener('click', () => {
  learningModalEl.classList.add('learning-modal--hidden');
});

/* ===========================
   마당 완료 / 실패. 아무 곳이나 탭하면 닫힘 (Gold 보상 연동은 이후 단계에서 구현)
=========================== */

const stageResultEl = document.getElementById('stage-result');
const stageResultTitleEl = document.getElementById('stage-result-title');
const stageResultDetailEl = document.getElementById('stage-result-detail');
const stageResultCharacterEl = document.getElementById('stage-result-character');

let stageEnded = false;
let stageFailed = false; // 탭으로 닫을 때 성공/실패에 따라 다음 동작을 구분하기 위함

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
  stageFailed = false;
  const correctCount = firstAttemptResults.filter(Boolean).length;
  const stars = calcStars(correctCount, TOTAL_CHOICE_POINTS);

  stageResultTitleEl.textContent = '마당 완료!';
  stageResultDetailEl.textContent =
    `${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}\n` +
    `선택 지점 ${correctCount} / ${TOTAL_CHOICE_POINTS} 정답\n` +
    `(Gold 보상 반영은 다음 단계에서 구현)`;
  stageResultCharacterEl.innerHTML = ''; // 완료 모달은 캐릭터 표시 없음
  stageResultEl.classList.remove('stage-result--hidden');
}

function failStage() {
  stageEnded = true;
  stageFailed = true;

  stageResultTitleEl.textContent = '다시 도전해요';
  stageResultDetailEl.textContent = '신중하게 뛰어 봐요!';

  // 실패 모달 전용 캐릭터 : 표정·움직임 모두 wrong 세트
  stageResultCharacterEl.innerHTML = '';
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.classList.add('ingame-character');
  svg.setAttribute('viewBox', '0 0 160 300');
  stageResultCharacterEl.appendChild(svg);
  if (characterEquipState) {
    renderCharacterSvg(svg, {
      head: characterEquipState.head,
      body: characterEquipState.body,
      legs: characterEquipState.legs,
      color: characterEquipState.color,
      colorMix: characterEquipState.colorMix,
      expression: 'wrong',
      animation: 'wrong'
    });
  }

  stageResultEl.classList.remove('stage-result--hidden');
}

stageResultEl.addEventListener('click', () => {
  stageResultEl.classList.add('stage-result--hidden');
  if (stageFailed) {
    // TODO: select 화면 구현 후 이동 처리 연결
    // 예정: window.location.href = '../select.html' 또는 라우팅 함수 호출
  }
});

/* ===========================
   좌/중앙/우 3칸 캐릭터 위치 + 점프 / 추락 / 점멸
=========================== */

const xTrackEl = document.getElementById('character-x-track');
const jumpEl   = document.getElementById('character-jump');

let currentLane = 'center'; // 'left' | 'center' | 'right' (캐릭터가 현재 서 있는 칸)
let isBusy = false; // 정오답/추락 연출이 재생되는 동안 입력 차단

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
  playCharacterMotion('idle', 'correct', JUMP_ANIM_DURATION);
}

// 빠른 점멸 후 자동으로 멈춤 (조작 실수 롤백 / 갈림길 오답 롤백 공통 사용)
function triggerBlink(duration, onDone) {
  jumpEl.classList.add('is-blinking');
  setTimeout(() => {
    jumpEl.classList.remove('is-blinking');
    if (onDone) onDone();
  }, duration);
}

/* ===========================
   조작 실수 처리 (갈림길에서 점프를 눌렀을 때만 발생 — 그 외 상황은 어떤 방향이든 진행됨)
   → 목숨 차감. 캐릭터만 추락+회전 후, 원래 있던 칸으로 빠른 점멸과 함께 복귀.
=========================== */

function handleOperationMistake() {
  livesRemaining -= 1;
  updateHeartsDisplay();

  if (livesRemaining <= 0) {
    failStage();
    return; // 실패 화면으로 전환되므로 추락 연출은 생략
  }

  isBusy = true;
  // 눈·입은 wrong, 움직임(팔다리)은 correct 세트 조합
  playCharacterMotion('wrong', 'correct', FALL_DURATION);

  jumpEl.classList.remove('is-jumping');
  void jumpEl.offsetWidth;
  jumpEl.classList.add('is-falling');

  setTimeout(() => {
    jumpEl.classList.remove('is-falling');
    // 추락 이전 칸(currentLane은 변경한 적 없으므로 그대로) 위치에서 빠른 점멸과 함께 재등장
    applyLanePosition();
    triggerBlink(BLINK_DURATION, () => {
      isBusy = false;
    });
  }, FALL_DURATION);
}

/* ===========================
   조작 판정 상태머신
   phase: 'idle'    - 중앙에서 다음 블록(일반/갈림길) 대기
          'onFork'  - 갈림길 정답을 맞혀 좌/우 블록에 착지, 반대쪽 방향키로 복귀 대기
=========================== */

let phase = 'idle';

// action: 'left' | 'right' | 'jump'
function handleInput(action) {
  if (stageEnded || isBusy) return;

  // 학습 모달이 열려있는 동안은 입력을 무시 (탭으로 먼저 닫아야 함)
  if (!learningModalEl.classList.contains('learning-modal--hidden')) return;

  if (phase === 'onFork') {
    // 어떤 방향(←/→/↓)을 입력해도 중앙으로 복귀하며 다음 블록으로 전진
    currentLane = 'center';
    applyLanePosition();
    playJumpMotion();
    phase = 'idle';
    advancePastFront();
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
    const chosenEl = chosenSide === 'left' ? frontLeftEl : frontRightEl;

    // 선택한 블록에 착지 (정답/오답 공통 연출)
    currentLane = chosenSide;
    applyLanePosition();

    if (isCorrect) {
      playJumpMotion();
      flashBlock(chosenEl, 'correct');
      phase = 'onFork';
    } else {
      // 오답 : 목숨 차감 없음(일반 마당). 0.6초간 빨강 플래시 + wrong 세트 + 빠른 점멸
      isBusy = true;
      flashBlock(chosenEl, 'wrong');
      playCharacterMotion('wrong', 'wrong', FLASH_DURATION);
      jumpEl.classList.add('is-blinking');

      setTimeout(() => {
        jumpEl.classList.remove('is-blinking');
        // 롤백(중앙 복귀)과 동시에 학습 모달 표시
        currentLane = 'center';
        applyLanePosition();
        isBusy = false;
        showLearningModal();
      }, FLASH_DURATION);
    }
    return;
  }

  // 일반 블록 : 어떤 방향(←/→/↓)을 입력해도 전진
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
showLearningModal(); // 마당 시작 시 주제 학습 가이드 먼저 안내