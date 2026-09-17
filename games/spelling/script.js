// v0.13.0
// Spelling Game - 갈림길 정답 시 진행 타이밍을 일반 블록과 동일하게(180ms 즉시 전진) 수정
// - 이전에는 0.6초 플래시/추락이 끝난 뒤에야 전진해서 일반 블록보다 느리게 느껴짐 → 전진(advancePastFront)을 먼저 걸고
//   색상 플래시/추락 연출은 그 위에 얹기만 함(전진을 지연시키지 않음). 연출 클래스는 180ms 뒤 정리.
// - 갈림길에서 좌/우 입력 시 그 자리에서 바로 판정+연출+보드 전진까지 한 번에 처리
//   정답 선택: 정답 블록 초록 플래시 + 오답 블록(반대쪽) 추락(빨강 플래시 없이) → 즉시 전진
//   오답 선택: 선택한(오답) 블록 빨강 플래시+추락, 정답 블록도 초록 플래시 → 0.6초 후 중앙 롤백 + 학습 모달(전진 없음, 재시도)
// - 시작 시 이전(back) 블록은 자리는 차지하되 안 보임(visibility:hidden, 레이아웃 유지). 첫 전진 후 보임.
// - 일반 블록은 여전히 '중앙 도착'이 유일한 안전 조건. 표준 스텝 결과가 중앙이 아니면 조작 실수(추락+목숨차감).
// - 정답이 흘러온 블록은 자신이 답해진 레인(좌/우)을 유지한 채 이전/현재 슬롯까지 흐른다 (__lane 스냅샷).
// - 학습 모달 / 마당 결과 모달 : 탭 또는 방향키·스페이스바로 닫힘 (PC에서 마우스 없이도 진행 가능)
// - 좌우 착지 좌표: block--front 170px + fork-row gap 3rem(48px) → 170/2 + 48/2 = 109px
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

const CHARACTER_X_OFFSET = 109; // 좌/우 갈림길 착지 좌표 (board-area 가로 중심 기준)
const JUMP_ANIM_DURATION = 400;    // character-jump-arc(0.4s)와 동일하게 유지
const FADE_OUT_DURATION = 180;     // .block--fade-out 트랜지션(0.18s)과 동일하게 유지
const FLASH_DURATION = 600;        // 정오답 블록 플래시/추락 (0.6초, 시계 게임 참고)
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
  el.classList.add(type === 'correct' ? 'block--flash-correct' : 'block--flash-wrong');
}
function clearFlash(el) {
  el.classList.remove('block--flash-correct', 'block--flash-wrong');
}

// 오답 블록 추락 연출 : 정답/오답 선택 여부와 무관하게 "오답인 블록"에는 항상 적용된다.
// 복습 마당에서는 블록+캐릭터가 함께, 더 빠르게 추락하는 변형으로 이 함수를 재활용할 예정.
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

function closeLearningModal() {
  learningModalEl.classList.add('learning-modal--hidden');
}

learningModalEl.addEventListener('click', closeLearningModal);

/* ===========================
   마당 완료 / 실패. 아무 곳이나 탭 또는 방향키/스페이스바로 닫힘 (Gold 보상 연동은 이후 단계에서 구현)
=========================== */

const stageResultEl = document.getElementById('stage-result');
const successCardEl = document.getElementById('stage-result-success');
const failureCardEl = document.getElementById('stage-result-failure');

// 완료 카드 (시계 게임 result-card 레이아웃)
const resultLevelEl = document.getElementById('result-level');
const resultStarsEl = document.getElementById('result-stars');
const resultScoreEl = document.getElementById('result-score');
const resultRateEl  = document.getElementById('result-rate');
const resultComboEl = document.getElementById('result-combo');

// 실패 카드
const stageResultTitleEl = document.getElementById('stage-result-title');
const stageResultDetailEl = document.getElementById('stage-result-detail');
const stageResultCharacterEl = document.getElementById('stage-result-character');

let stageEnded = false;
let stageFailed = false; // 탭/키 입력으로 닫을 때 성공/실패에 따라 다음 동작을 구분하기 위함

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
  const total = TOTAL_CHOICE_POINTS;
  const stars = calcStars(correctCount, total);
  const rate = total === 0 ? 0 : Math.round((correctCount / total) * 100);

  resultLevelEl.textContent = '마당 완료!';
  resultStarsEl.textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);
  resultScoreEl.textContent = `${correctCount} / ${total}`;
  resultRateEl.textContent = `정답률 ${rate}%`;
  resultComboEl.textContent = '최고 콤보 🔥 -'; // 콤보 집계·Gold 보상 로직은 다음 단계에서 구현 (이번엔 레이아웃만)

  successCardEl.style.display = 'flex';
  failureCardEl.style.display = 'none';
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

  successCardEl.style.display = 'none';
  failureCardEl.style.display = 'flex';
  stageResultEl.classList.remove('stage-result--hidden');
}


function closeStageResult() {
  stageResultEl.classList.add('stage-result--hidden');
  if (stageFailed) {
    // TODO: select 화면 구현 후 이동 처리 연결
    // 예정: window.location.href = '../select.html' 또는 라우팅 함수 호출
  }
}

stageResultEl.addEventListener('click', closeStageResult);

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
   조작 판정 : 입력이 들어오면 그 자리에서 바로 판정+연출+보드 전진까지 처리한다 (대기 단계 없음)
=========================== */

// action: 'left' | 'right' | 'jump'
function handleInput(action) {
  if (stageEnded || isBusy) return;

  const nextItem = currentItems.front;
  if (!nextItem) return;

  if (nextItem.type === 'choice') {
    // 갈림길 : 좌/우만 허용(절대 위치 지정), 점프는 조작 실수
    if (action === 'jump') {
      handleOperationMistake();
      return;
    }

    const chosenSide = action; // 'left' | 'right'
    const isCorrect = nextItem.correctSide === chosenSide;
    recordChoiceResult(nextItem, isCorrect);

    const chosenEl = chosenSide === 'left' ? frontLeftEl : frontRightEl;
    const otherEl  = chosenSide === 'left' ? frontRightEl : frontLeftEl;
    const correctEl = isCorrect ? chosenEl : otherEl;
    const wrongEl   = isCorrect ? otherEl  : chosenEl;

    currentLane = chosenSide; // 고른 블록 쪽에 착지
    applyLanePosition();

    if (isCorrect) {
      // 정답 : 일반 블록과 동일한 타이밍(180ms)으로 즉시 전진. 색상/추락 연출은 그 위에 얹을 뿐 전진을 지연시키지 않는다.
      playJumpMotion();
      flashBlock(correctEl, 'correct');   // 초록 플래시만 (빨강 없음)
      collapseBlock(wrongEl);             // 반대쪽(오답)은 추락
      advancePastFront();
      setTimeout(() => {
        clearFlash(correctEl);
        resetCollapsedBlock(wrongEl);
      }, FADE_OUT_DURATION);
    } else {
      // 오답 : 목숨 차감 없음(일반 마당). 고른(오답) 블록은 빨강 플래시+추락, 정답 블록은 초록 플래시.
      // 전진하지 않고 0.6초 후 중앙 롤백 + 학습 모달(재시도).
      isBusy = true;
      flashBlock(wrongEl, 'wrong');
      collapseBlock(wrongEl);
      flashBlock(correctEl, 'correct');
      playCharacterMotion('wrong', 'wrong', FLASH_DURATION);
      jumpEl.classList.add('is-blinking');

      setTimeout(() => {
        jumpEl.classList.remove('is-blinking');
        clearFlash(wrongEl);
        clearFlash(correctEl);
        resetCollapsedBlock(wrongEl); // 재시도를 위해 원상 복구
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
   모달이 열려있으면 입력은 모달을 닫는 데만 사용되고 게임 입력으로 전달되지 않는다.
=========================== */

function isAnyModalOpen() {
  return !learningModalEl.classList.contains('learning-modal--hidden')
      || !stageResultEl.classList.contains('stage-result--hidden');
}

function closeOpenModal() {
  if (!learningModalEl.classList.contains('learning-modal--hidden')) {
    closeLearningModal();
  } else if (!stageResultEl.classList.contains('stage-result--hidden')) {
    closeStageResult();
  }
}

document.querySelector('.keypad-area').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-key]');
  if (!btn) return;
  if (isAnyModalOpen()) { closeOpenModal(); return; }
  handleInput(btn.dataset.key);
});

document.addEventListener('keydown', (e) => {
  const isGameKey = e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ';
  if (!isGameKey) return;
  e.preventDefault();

  if (isAnyModalOpen()) { closeOpenModal(); return; }

  switch (e.key) {
    case 'ArrowLeft':  handleInput('left');  break;
    case 'ArrowRight': handleInput('right'); break;
    case 'ArrowDown':
    case ' ':          handleInput('jump');  break;
  }
});

/* ===========================
   초기화
=========================== */

initCharacter();
initBoard();
updateHeartsDisplay();
showLearningModal(); // 마당 시작 시 주제 학습 가이드 먼저 안내