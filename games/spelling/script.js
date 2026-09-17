// v0.11.0
// Spelling Game - 갈림길 흐름 버그 수정 + 레인(좌/중/우) 상태 유지 + 초기 이전 블록 숨김
// - 시작 시 이전(back) 블록은 숨김. 첫 전진이 일어나야 비로소 나타남
// - 갈림길 정답 후 "흐름" 입력(어떤 방향이든 OK)은 캐릭터 레인을 표준 스텝 규칙으로 갱신(점프=유지, 반대방향=중앙 복귀, 같은방향=유지)
//   하고 보드를 전진시킨다. 정답 블록이 그 레인(좌/우)을 유지한 채로 이전/현재 슬롯까지 따라 흐른다(스냅샷 __lane).
// - 일반 블록은 여전히 '중앙 도착'이 유일한 안전 조건. 표준 스텝 결과가 중앙이 아니면 조작 실수(추락+목숨차감).
// - 갈림길 오답 : 선택한(오답) 블록만 추락 연출, 정답 블록은 그대로 유지 → 복습 마당에서 블록+캐릭터 동시 추락으로 재활용 예정
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
// __lane : 이 아이템이 이전/현재 슬롯으로 흘러올 때의 좌/중/우 위치 스냅샷 (advancePastFront에서 갱신)
function buildBlockQueue(problems, sentenceCount) {
  const picked = shuffleArray(problems).slice(0, sentenceCount);
  const queue = [];
  picked.forEach((problem) => {
    problem.tokens.forEach((token) => {
      if (token.text !== undefined) {
        queue.push({ type: 'text', text: token.text, __lane: 'center' });
      } else {
        queue.push({
          type: 'choice',
          correct: token.correct,
          wrong: token.wrong,
          fixedSide: token.fixedSide,
          _resolved: false,
          _recorded: false,
          __lane: 'center'
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

// 레인('left'|'center'|'right') → x축 이동량(px). 캐릭터와 이전/현재 블록이 공통으로 사용.
function laneOffsetPx(lane) {
  return lane === 'left' ? -CHARACTER_X_OFFSET : lane === 'right' ? CHARACTER_X_OFFSET : 0;
}

// 표준 스텝 규칙 : 점프=유지, 반대쪽 방향=중앙 복귀, 같은 방향(또는 중앙에서 그 방향)=그대로 유지
function stepLane(lane, action) {
  if (action === 'left')  return lane === 'right' ? 'center' : 'left';
  if (action === 'right') return lane === 'left'  ? 'center' : 'right';
  return lane; // jump
}

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

// 이전(back) 블록 반영. 아이템이 없으면(시작 시) 아예 숨김 — 흘러온 적 없는 자리이므로.
function renderBack() {
  if (currentItems.back) {
    backEl.classList.remove('block--hidden');
    backEl.textContent = displayText(currentItems.back);
    backEl.style.transform = `translateX(${laneOffsetPx(currentItems.back.__lane)}px)`;
  } else {
    backEl.classList.add('block--hidden');
    backEl.textContent = '';
  }
}

// 현재(mid) 블록 반영. __lane 스냅샷에 따라 좌/우로 위치할 수 있음(갈림길 정답이 흘러온 경우).
function renderMid() {
  if (currentItems.mid) {
    midEl.textContent = displayText(currentItems.mid);
    midEl.style.transform = `translateX(${laneOffsetPx(currentItems.mid.__lane)}px)`;
  } else {
    midEl.textContent = '';
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

// 최초 화면 : 이전(back)은 아직 흘러온 것이 없으므로 숨김. 현재(mid)=큐[0], 다음(front)=큐[1].
function initBoard() {
  currentItems.back = null;
  currentItems.mid  = BLOCK_QUEUE[0] ?? null;
  renderBack();
  renderMid();

  queuePointer = 1;
  pullNextFront();
}

// front를 통과했을 때(일반 블록 통과, 또는 갈림길 정답 후 흐름 입력) 한 칸 전진.
// 이 시점의 currentLane을 mid로 승격되는 아이템에 스냅샷하여, 이후 캐릭터가 다른 레인으로 이동해도
// 이미 지나간 이 블록은 자신이 답해진 레인을 그대로 유지한 채 흘러간다.
function advancePastFront() {
  const boardFadeEls = [backEl, midEl, frontLeftEl, frontRightEl];
  boardFadeEls.forEach((el) => el.classList.add('block--fade-out'));

  setTimeout(() => {
    currentItems.back = currentItems.mid;
    currentItems.mid  = currentItems.front;
    if (currentItems.mid) currentItems.mid.__lane = currentLane;

    renderBack();
    renderMid();
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

// 갈림길 오답 시 : 선택한(오답) 블록만 추락. 정답 블록은 그대로 둔다.
// 복습 마당에서는 블록+캐릭터가 함께, 더 빠르게 추락하도록 이 함수를 재활용할 예정.
function collapseBlock(el) {
  el.classList.add('block--collapse');
}
function resetCollapsedBlock(el) {
  el.classList.remove('block--collapse');
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
  xTrackEl.style.transform = `translateX(${laneOffsetPx(currentLane)}px)`;
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
          'onFork'  - 갈림길 정답을 맞혀 좌/우 블록에 착지, 다음 "흐름" 입력을 기다리는 중
=========================== */

let phase = 'idle';

// action: 'left' | 'right' | 'jump'
function handleInput(action) {
  if (stageEnded || isBusy) return;

  // 학습 모달이 열려있는 동안은 입력을 무시 (탭으로 먼저 닫아야 함)
  if (!learningModalEl.classList.contains('learning-modal--hidden')) return;

  if (phase === 'onFork') {
    // 갈림길 정답을 밟은 뒤의 "흐름" 입력 : 어떤 방향이든 보드가 전진한다.
    // 캐릭터 레인은 표준 스텝 규칙으로 갱신 (점프/같은방향=유지, 반대방향=중앙 복귀) — 조작 실수 판정의 기준이 되므로 중요.
    currentLane = stepLane(currentLane, action);
    applyLanePosition();
    playJumpMotion();
    phase = 'idle';
    advancePastFront(); // mid로 승격되며 currentLane이 __lane으로 스냅샷됨
    return;
  }

  // phase === 'idle'
  const nextItem = currentItems.front;
  if (!nextItem) return;

  if (nextItem.type === 'choice') {
    // 갈림길의 최초 선택 : 좌/우만 허용(절대 위치 지정), 점프는 조작 실수
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
      // 오답 : 목숨 차감 없음(일반 마당). 0.6초간 빨강 플래시 + wrong 세트 + 빠른 점멸 + 오답 블록만 추락
      isBusy = true;
      flashBlock(chosenEl, 'wrong');
      collapseBlock(chosenEl); // 정답 블록(반대쪽)은 그대로 유지
      playCharacterMotion('wrong', 'wrong', FLASH_DURATION);
      jumpEl.classList.add('is-blinking');

      setTimeout(() => {
        jumpEl.classList.remove('is-blinking');
        resetCollapsedBlock(chosenEl); // 재시도를 위해 원상 복구
        // 롤백(중앙 복귀)과 동시에 학습 모달 표시
        currentLane = 'center';
        applyLanePosition();
        isBusy = false;
        showLearningModal();
      }, FLASH_DURATION);
    }
    return;
  }

  // 일반 블록 : 표준 스텝 결과가 반드시 '중앙'이어야 안전하게 통과. 아니면 조작 실수(추락+목숨차감).
  const resultLane = stepLane(currentLane, action);
  if (resultLane !== 'center') {
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
showLearningModal(); // 마당 시작 시 주제 학습 가이드 먼저 안내