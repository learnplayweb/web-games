// v0.23.0
// Spelling Game - 결과 모달(완료/실패 공통) 닫으면 마당 선택 화면으로 이동 + 학습 모달 강조색 초록(emph-green) 추가
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
import { getEquippedParts, getSpellingBestStars, saveSpellingResult, saveSpellingReviewResult } from '../../core/saveManager.js';
import { spawnEffect } from '../../characters/assets/effects/effects.js';
import { pickRandomEquippedEffect } from '../../characters/inventory.js';
import { DOE_DWAE_PROBLEMS, DOE_DWAE_GUIDE } from './data/problems/01-doe-dwae.js';
import { AN_ANH_PROBLEMS, AN_ANH_GUIDE } from './data/problems/02-an-anh.js';
import { GAJ_GAT_GASS_PROBLEMS, GAJ_GAT_GASS_GUIDE } from './data/problems/03-gaj-gat-gass.js';
import { DEON_DEUN_PROBLEMS, DEON_DEUN_GUIDE } from './data/problems/04-deon-deun.js';
import { DAE_DE_PROBLEMS, DAE_DE_GUIDE } from './data/problems/05-dae-de.js';
import { STAGES, NORMAL_STAGE_QUESTION_COUNT, NORMAL_STAGE_LIVES, REVIEW_STAGE_QUESTION_COUNT, REVIEW_STAGE_LIVES } from './data/stages.js';

/* ===========================
   상수
=========================== */

const CHARACTER_X_OFFSET = 109; // 좌/우 갈림길 착지 좌표 (board-area 가로 중심 기준)
const JUMP_ANIM_DURATION = 260;    // character-jump-arc(0.26s)와 동일하게 유지 — 좌우 이동(0.26s)에 맞춤
const FADE_OUT_DURATION = 180;     // .block--fade-out 트랜지션(0.18s)과 동일하게 유지
const FLASH_DURATION = 400;        // 정오답 블록 플래시/추락 (0.4초, block-collapse와 동일하게 맞춤)
const FALL_DURATION = 1600;        // 조작 실수 캐릭터 추락(1.6초)
const BLINK_DURATION = 500;        // 추락/오답 롤백 시 빠른 점멸 시간
const REVIEW_WRONG_FALL_DURATION = 500; // 달인 마당 오답 시 블록+캐릭터 동시 추락 시간 (일반 마당보다 빠르게)

/* ===========================
   문제은행 랜덤 출제 : 문장 단위로 뽑은 뒤 토큰을 순서대로 펼쳐 블록 큐 생성
=========================== */

// topic 문자열(stages.js) → 문제은행/학습 가이드 매핑. 주제가 추가되면 여기에도 등록.
const PROBLEM_BANKS = {
  'doe-dwae':     DOE_DWAE_PROBLEMS,
  'an-anh':       AN_ANH_PROBLEMS,
  'gaj-gat-gass': GAJ_GAT_GASS_PROBLEMS,
  'deon-deun':    DEON_DEUN_PROBLEMS,
  'dae-de':       DAE_DE_PROBLEMS
};
const TOPIC_GUIDES = {
  'doe-dwae':     DOE_DWAE_GUIDE,
  'an-anh':       AN_ANH_GUIDE,
  'gaj-gat-gass': GAJ_GAT_GASS_GUIDE,
  'deon-deun':    DEON_DEUN_GUIDE,
  'dae-de':       DAE_DE_GUIDE
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

// select.html에서 넘어온 마당(level)로 진입.
// URL의 ?level= 파라미터로 마당을 선택 (시계 게임과 동일한 방식). 없거나 잘못되면 1번 마당으로 진입.
const requestedLevel = parseInt(new URLSearchParams(location.search).get('level'), 10) || 1;
const currentStage = STAGES.find((stage) => stage.level === requestedLevel) ?? STAGES[0];
const IS_REVIEW_STAGE = currentStage.type === 'review';

// 달인 마당(복습)은 topics(복수) 여러 주제의 문제은행을 하나로 합쳐 사용, 일반 마당은 topic(단수) 하나만 사용
function getStageProblemPool(stage) {
  if (stage.type === 'review') {
    return stage.topics.flatMap((topic) => PROBLEM_BANKS[topic] ?? []);
  }
  return PROBLEM_BANKS[stage.topic] ?? [];
}

const STAGE_QUESTION_COUNT = IS_REVIEW_STAGE ? REVIEW_STAGE_QUESTION_COUNT : NORMAL_STAGE_QUESTION_COUNT;
const STAGE_LIVES          = IS_REVIEW_STAGE ? REVIEW_STAGE_LIVES : NORMAL_STAGE_LIVES;

const BLOCK_QUEUE = buildBlockQueue(getStageProblemPool(currentStage), STAGE_QUESTION_COUNT);
const TOTAL_CHOICE_POINTS = BLOCK_QUEUE.filter((item) => item.type === 'choice').length;
// 달인 마당은 여러 주제를 섞어 다루므로 단일 학습 가이드가 맞지 않아 사용하지 않음(오답 모달 자체가 없기도 함)
const CURRENT_GUIDE = IS_REVIEW_STAGE ? null : TOPIC_GUIDES[currentStage.topic];

// 이번 판을 시작하기 "이전"의 최고 별점 (보상 계산 기준). 완료 후 갱신되므로 게임 시작 시점에 한 번만 읽는다.
// 달인 마당은 최고 별점을 저장하지 않고 "감소 규칙을 적용하지 않는다" → 항상 최고 등급(0)으로 계산한다.
const PREV_BEST_STARS = IS_REVIEW_STAGE ? 0 : getSpellingBestStars(currentStage.topic);

/* ===========================
   보상 테이블 (기존 정리안 그대로) : 상수로 관리해 밸런스 조정이 쉽도록 함
=========================== */

// 선택 지점당 Gold : 이전 최고 별점이 낮을수록(=처음 도전에 가까울수록) 더 많이 지급
const CHOICE_GOLD_BY_STARS = { 0: 10, 1: 7, 2: 4, 3: 1 };
// 콤보 보너스 배율 : 최장 콤보 × 배율. 이전 최고 별점이 낮을수록 배율이 큼
const COMBO_MULTIPLIER_BY_STARS = { 0: 4, 1: 3, 2: 2, 3: 1 };
// 별점 자체의 가치 (누적) : 별점 보상 = 새 최고 별 가치 − 이전 최고 별 가치
const STAR_VALUE = { 0: 0, 1: 10, 2: 30, 3: 50 };

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

// 이전/현재/다음 블록은 레인 오프셋(+페이드아웃 축소)을 인라인 style.transform으로 직접 관리한다.
// translateX(0px) ↔ translateX(0px) scale(0.94)처럼 transform 함수 개수 자체가 바뀌면
// 브라우저가 보간(트랜지션) 없이 순간 전환해버릴 수 있어, 평소에도 scale(1)을 항상 포함시켜
// transform 함수 구성을 항상 동일하게 유지한다 (스케일 값만 바뀌므로 확실히 보간됨).
function setBlockTransform(el, lane, scaledDown) {
  el.style.transform = `translateX(${laneOffsetPx(lane)}px) scale(${scaledDown ? 0.94 : 1})`;
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
// scaledDown: true면 축소(0.94) 상태를 유지한 채로 위치만 갱신 (콘텐츠 교체 스냅 단계에서 사용)
function renderBack(scaledDown = false) {
  if (currentItems.back) {
    backEl.classList.remove('block--hidden');
    backEl.textContent = displayText(currentItems.back);
    setBlockTransform(backEl, currentItems.back.__lane, scaledDown);
  } else {
    backEl.classList.add('block--hidden');
    backEl.textContent = '';
  }
}

// 현재(mid) 블록 반영. __lane 스냅샷에 따라 좌/우로 위치할 수 있음(갈림길 정답이 흘러온 경우).
function renderMid(scaledDown = false) {
  if (currentItems.mid) {
    midEl.textContent = displayText(currentItems.mid);
    setBlockTransform(midEl, currentItems.mid.__lane, scaledDown);
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
  setBlockTransform(frontLeftEl,  'center', false);
  setBlockTransform(frontRightEl, 'center', false);

  queuePointer = 1;
  pullNextFront();
}

// front를 통과했을 때(일반 블록 통과, 또는 갈림길 정답 후 흐름 입력) 한 칸 전진.
// 이 시점의 currentLane을 mid로 승격되는 아이템에 스냅샷하여, 이후 캐릭터가 다른 레인으로 이동해도
// 이미 지나간 이 블록은 자신이 답해진 레인을 그대로 유지한 채 흘러간다.
function advancePastFront() {
  // 페이드아웃(트랜지션 있음) : 이전/현재 블록은 "현재 레인을 유지한 채" 살짝 축소
  setBlockTransform(backEl, currentItems.back ? currentItems.back.__lane : 'center', true);
  setBlockTransform(midEl,  currentItems.mid  ? currentItems.mid.__lane  : 'center', true);
  setBlockTransform(frontLeftEl,  'center', true);
  setBlockTransform(frontRightEl, 'center', true);

  const boardFadeEls = [backEl, midEl, frontLeftEl, frontRightEl];
  boardFadeEls.forEach((el) => el.classList.add('block--fade-out')); // opacity만 담당 (transform은 위에서 인라인으로 처리)

  setTimeout(() => {
    currentItems.back = currentItems.mid;
    currentItems.mid  = currentItems.front;
    if (currentItems.mid) currentItems.mid.__lane = currentLane;

    // 1) 콘텐츠 교체 + 새 레인 "위치"로 트랜지션 없이 즉시 스냅 (축소값 0.94는 그대로 유지한 채)
    //    → 위치만 스냅하고 스케일은 다음 단계에서 애니메이션되므로, 슬라이드도 안 생기고 축소→원복 연출도 유지됨
    boardFadeEls.forEach((el) => { el.style.transition = 'none'; });

    renderBack(true);
    renderMid(true);
    pullNextFront();
    setBlockTransform(frontLeftEl,  'center', true);
    setBlockTransform(frontRightEl, 'center', true);

    void backEl.offsetWidth; // 강제 리플로우로 스냅을 확정(트랜지션 없이 적용)

    // 2) 트랜지션 복구 → 위치는 이미 목표값이라 안 움직이고, 스케일(0.94→1)과 opacity만 애니메이션
    boardFadeEls.forEach((el) => { el.style.transition = ''; });
    renderBack(false);
    renderMid(false);
    setBlockTransform(frontLeftEl,  'center', false);
    setBlockTransform(frontRightEl, 'center', false);
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
// fast=true면 달인 마당 전용(더 빠른 추락, 블록+캐릭터 동시 추락에 사용)
function collapseBlock(el, fast = false) {
  el.classList.add(fast ? 'block--collapse-fast' : 'block--collapse');
}
function resetCollapsedBlock(el) {
  el.classList.remove('block--collapse', 'block--collapse-fast');
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
   콤보 (연속 정답 카운트). 시계 게임과 동일한 규칙:
   - 정답(선택 지점) 시 +1, 오답/조작 실수 시 0으로 리셋
   - 3콤보마다(3, 6, 9 ...) 장착된 이펙트 재생
=========================== */

let currentCombo = 0;
let maxCombo = 0;

function updateComboDisplay() {
  document.getElementById('display-combo').textContent = currentCombo;
}

function increaseCombo() {
  currentCombo += 1;
  if (currentCombo > maxCombo) maxCombo = currentCombo;
  updateComboDisplay();

  if (currentCombo >= 3 && currentCombo % 3 === 0) {
    playEventEffect('combo', characterSvgEl);
  }
}

function resetCombo() {
  currentCombo = 0;
  updateComboDisplay();
}

// 시계 게임의 playEventEffect와 동일 (장착된 이펙트를 캐릭터 위치에 재생)
function playEventEffect(eventType, targetElement) {
  try {
    if (!targetElement || typeof spawnEffect !== 'function') return;

    if (eventType === 'combo') {
      const effectId = pickRandomEquippedEffect();
      if (effectId) {
        spawnEffect(targetElement, effectId);
      }
    }
    // 추후 'correct', 'clear' 등 다른 이벤트 추가 가능
  } catch (e) {
    console.error('이벤트 효과 실행 중 에러 발생:', e);
  }
}

/* ===========================
   목숨 (조작 실수에서만 차감 - 일반 마당 규칙)
=========================== */

let livesRemaining = STAGE_LIVES;

// 목숨 개수(일반 3 / 달인 마당 5)만큼 하트 슬롯을 생성 (최초 1회)
function renderHeartSlots() {
  const container = document.getElementById('display-hearts');
  container.innerHTML = '';
  for (let i = 0; i < STAGE_LIVES; i++) {
    const heart = document.createElement('span');
    heart.className = 'heart';
    heart.textContent = '❤️';
    container.appendChild(heart);
  }
}

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

  const EMPH_CLASS = { blue: 'emph-blue', red: 'emph-red', green: 'emph-green' };

  guide.lines.forEach((line) => {
    const p = document.createElement('p');
    line.forEach((segment) => {
      if (EMPH_CLASS[segment.emph]) {
        const span = document.createElement('span');
        span.className = EMPH_CLASS[segment.emph];
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
   마당 완료 / 실패. 아무 곳이나 탭 또는 방향키/스페이스바로 닫힘
   완료 시에만 별점·콤보·선택지점 보상을 계산해 saveSpellingResult()로 1회 저장
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
const resultGoldQuizEl  = document.getElementById('result-gold-quiz');
const resultGoldComboEl = document.getElementById('result-gold-combo');
const resultGoldStarEl  = document.getElementById('result-gold-star');
const resultGoldTotalEl = document.getElementById('result-gold-total');

// 실패 카드
const stageResultTitleEl = document.getElementById('stage-result-title');
const stageResultDetailEl = document.getElementById('stage-result-detail');
const stageResultCharacterEl = document.getElementById('stage-result-character');

let stageEnded = false;
let stageFailed = false; // 완료/실패 카드 중 어떤 게 떠 있는지 추적용 (현재는 닫기 동작 분기엔 쓰지 않음)

function calcStars(correctCount, total) {
  if (total === 0) return 0;
  const rate = correctCount / total;
  if (rate >= 1) return 3;
  if (rate >= 2 / 3) return 2;
  if (rate >= 1 / 3) return 1;
  return 0;
}

// 마당을 정상적으로 완료했을 때만 호출된다 (새로고침/이탈 시엔 이 함수 자체가 호출되지 않으므로
// firstAttemptResults/maxCombo 같은 진행 중 임시 데이터가 저장으로 이어지지 않는다).
function finishStage() {
  stageEnded = true;
  stageFailed = false;

  const correctCount = firstAttemptResults.filter(Boolean).length;
  const total = TOTAL_CHOICE_POINTS;
  const stars = calcStars(correctCount, total);
  const rate = total === 0 ? 0 : Math.round((correctCount / total) * 100);

  // 보상 계산 — 게임 중엔 지급하지 않고 여기서 한 번에 계산+저장
  // 문제/콤보 보상은 PREV_BEST_STARS 기준(달인 마당은 항상 0 = 감소 규칙 미적용, 매번 최고 등급)
  // 별점 보상도 동일한 델타 공식이지만, PREV_BEST_STARS가 0이면 STAR_VALUE[stars] - 0이 되어
  // "매 플레이마다 별점 가치 전액 지급"이라는 달인 마당 규칙과 자연히 일치한다.
  const goldQuiz  = correctCount * (CHOICE_GOLD_BY_STARS[PREV_BEST_STARS] ?? CHOICE_GOLD_BY_STARS[0]);
  const goldCombo = maxCombo * (COMBO_MULTIPLIER_BY_STARS[PREV_BEST_STARS] ?? COMBO_MULTIPLIER_BY_STARS[0]);
  const goldStar  = Math.max(0, STAR_VALUE[stars] - STAR_VALUE[PREV_BEST_STARS]);
  const goldTotal = goldQuiz + goldCombo + goldStar;

  if (IS_REVIEW_STAGE) {
    saveSpellingReviewResult(stars, goldTotal); // 최고값 비교 없이 항상 최근 별점으로 덮어씀
  } else {
    saveSpellingResult(currentStage.topic, stars, goldTotal);
  }

  resultLevelEl.textContent = IS_REVIEW_STAGE ? '달인 마당 완료!' : '마당 완료!';
  resultStarsEl.textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);
  resultScoreEl.textContent = `${correctCount} / ${total}`;
  resultRateEl.textContent = `정답률 ${rate}%`;
  resultComboEl.textContent = `최고 콤보 🔥 ${maxCombo}`;
  resultGoldQuizEl.textContent  = `💎 ${goldQuiz}`;
  resultGoldComboEl.textContent = `💎 ${goldCombo}`;
  resultGoldStarEl.textContent  = `💎 ${goldStar}`;
  resultGoldTotalEl.textContent = `💎 ${goldTotal}`;

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
  location.href = 'select.html'; // 완료/실패 관계없이 결과 확인 후엔 마당 선택 화면으로
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
  resetCombo();
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
    if (isCorrect) increaseCombo(); else resetCombo();

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
    } else if (IS_REVIEW_STAGE) {
      // 달인 마당 오답 : 목숨 차감, 학습 모달 없음. 블록+캐릭터가 함께(더 빠르게) 추락 후 롤백.
      isBusy = true;

      livesRemaining -= 1;
      updateHeartsDisplay();

      flashBlock(wrongEl, 'wrong');
      collapseBlock(wrongEl, true); // 더 빠른 추락
      flashBlock(correctEl, 'correct');

      // 캐릭터 : 눈·입은 wrong, 움직임은 correct 세트 + 추락하며 회전
      playCharacterMotion('wrong', 'correct', REVIEW_WRONG_FALL_DURATION);
      jumpEl.classList.remove('is-jumping');
      void jumpEl.offsetWidth;
      jumpEl.classList.add('is-falling-fast');

      if (livesRemaining <= 0) {
        setTimeout(() => failStage(), REVIEW_WRONG_FALL_DURATION);
        return;
      }

      setTimeout(() => {
        jumpEl.classList.remove('is-falling-fast');
        clearFlash(wrongEl);
        clearFlash(correctEl);
        resetCollapsedBlock(wrongEl);
        currentLane = 'center';
        applyLanePosition();
        triggerBlink(BLINK_DURATION, () => {
          isBusy = false;
        });
      }, REVIEW_WRONG_FALL_DURATION);
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
renderHeartSlots();
updateHeartsDisplay();
updateComboDisplay();
if (!IS_REVIEW_STAGE) {
  showLearningModal(); // 마당 시작 시 주제 학습 가이드 먼저 안내 (달인 마당은 여러 주제가 섞여 있어 생략)
}