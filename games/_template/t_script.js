// template v0.1.3 : 저장·이전 별점을 saveManager 일반 함수(getStageBestStars/saveStageResult)로 연결, 단계 종류(STAGE_KIND)로 복습 단계 규칙 A/B 선택
// <게임 이름> - 새 게임 시작용 뼈대
//
// 사용법
// - 이 파일을 games\<게임id>\script.js로 복사한 뒤 TODO(게임별) 부분만 채운다.
// - 전체 규칙은 AI_RULES.md 참고. AI에게 요청할 때는 이 파일과 AI_RULES.md를 함께 첨부한다.
// - [공통] 구간은 모든 게임이 같은 방식이므로 가능한 한 그대로 둔다.
//   (보상 수치·계산식은 core\reward.js 한 곳에서만 수정)
//
// Public API
// - initCharacter()
// - finishStage()

import { renderCharacterSvg } from '../../characters/characterRenderer.js';
import { calcStars, starsToString, calcRewardGold } from '../../core/reward.js';
import {
  getEquippedParts,
  getStageBestStars,
  getStageReviewBestStars,
  saveStageResult,
} from '../../core/saveManager.js';
import { spawnEffect } from '../../characters/assets/effects/effects.js';
import { pickRandomEquippedEffect } from '../../characters/inventory.js';

/* ===========================
   상수
=========================== */

const TOTAL_QUESTIONS = 10;     // TODO(게임별): 한 단계의 문제 수
const COMBO_EFFECT_INTERVAL = 3; // [공통] N콤보마다 장착된 효과 재생
// TODO(게임별): 정오답 리액션 지속 시간(ms). 시계는 600 고정, 맞춤법은 동작별로 다름(점프 260 / 추락 1600 등)
const REACTION_DURATION = 600;

/* ===========================
   단계 진입 + 이전 최고 별점 (보상 기준)
=========================== */

// 선택 화면에서 ?level= 파라미터로 진입 (없거나 잘못되면 1번 단계)
const requestedLevel = parseInt(new URLSearchParams(location.search).get('level'), 10) || 1;

// TODO(게임별): saveManager에 저장할 때 쓰는 게임 id (영문 소문자로 시작하는 영문/숫자, 'clock'은 사용 불가)
const GAME_ID = 'myGame';
const stageKey = String(requestedLevel); // TODO(게임별): 단계를 식별하는 키 (맞춤법은 주제 id / level 사용)

// TODO(게임별): 이 단계의 종류 (복습 단계 규칙은 reward-system.md 참고)
//  - 'normal':         일반 단계 (최고 별점 저장, 이전 최고 별점 기준으로 보상 감소)
//  - 'review-recent':  복습 단계 규칙 A (시계 Lv.8 방식): 이전 별점 0 고정 + 별 보상 전액, 최근 별점 저장
//  - 'review-monthly': 복습 단계 규칙 B (맞춤법 달인 마당 방식): 일반 단계와 같은 계산, 최고 별점은 매달 초기화
const STAGE_KIND = 'normal';

// [공통] 이전 최고 별점은 플레이 시작 시 1회만 읽어 고정 (플레이 도중 바뀌지 않음)
const prevBestStars = {
  normal: () => getStageBestStars(GAME_ID, stageKey),
  'review-monthly': () => getStageReviewBestStars(GAME_ID, stageKey),
  'review-recent': () => 0, // 규칙 A는 이전 별점이 없는 것으로 계산
}[STAGE_KIND]();

/* ===========================
   진행 상태
=========================== */

let answeredCount = 0;
let correctCount = 0;
let stageEnded = false; // [공통] finishStage 중복 실행 방지 (보상 중복 지급 방지)

/* ===========================
   캐릭터 초기화 [공통]
=========================== */

let characterSvgEl = null;
let characterEquipState = null;

function initCharacter() {
  const container = document.getElementById('character-container');
  if (!container) return;

  const equipped = getEquippedParts();
  characterEquipState = equipped;

  characterSvgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  characterSvgEl.classList.add('ingame-character');
  characterSvgEl.setAttribute('viewBox', '0 0 160 300');
  container.appendChild(characterSvgEl);

  renderCharacterSvg(characterSvgEl, {
    head: equipped.head,
    body: equipped.body,
    legs: equipped.legs,
    color: equipped.color,
    colorMix: equipped.colorMix,
    expression: 'idle',
    animation: 'idle',
  });
}

// 표정(expression)과 동작(animation)을 독립적으로 지정 (값: 'idle' | 'correct' | 'wrong')
function renderCharacterState(expression, animation) {
  if (!characterSvgEl || !characterEquipState) return;
  renderCharacterSvg(characterSvgEl, {
    head: characterEquipState.head,
    body: characterEquipState.body,
    legs: characterEquipState.legs,
    color: characterEquipState.color,
    colorMix: characterEquipState.colorMix,
    expression,
    animation,
  });
}

// 정오답 리액션: 지정한 표정·동작을 보여준 뒤 duration(ms) 후 평소 모습(idle)으로 복귀
function playCharacterMotion(expression, animation, duration) {
  renderCharacterState(expression, animation);
  setTimeout(() => renderCharacterState('idle', 'idle'), duration);
}

/* ===========================
   콤보 + 효과 [공통]
   - 정답 시 +1, 오답 시 0으로 리셋, 3콤보마다(3, 6, 9 ...) 장착된 효과 재생
=========================== */

let currentCombo = 0;
let maxCombo = 0;

function updateComboDisplay() {
  document.getElementById('display-combo').textContent = currentCombo;
}

// 장착된 효과를 대상 요소 위치에 재생 (실패해도 게임 진행에 영향 없도록 보호)
function playEventEffect(eventType, targetElement) {
  try {
    if (!targetElement || typeof spawnEffect !== 'function') return;

    if (eventType === 'combo') {
      const effectId = pickRandomEquippedEffect();
      if (effectId) spawnEffect(targetElement, effectId);
    }
  } catch (e) {
    console.error('이벤트 효과 실행 중 에러 발생:', e);
  }
}

function increaseCombo() {
  currentCombo += 1;
  if (currentCombo > maxCombo) maxCombo = currentCombo;
  updateComboDisplay();

  if (currentCombo >= COMBO_EFFECT_INTERVAL && currentCombo % COMBO_EFFECT_INTERVAL === 0) {
    playEventEffect('combo', characterSvgEl);
  }
}

function resetCombo() {
  currentCombo = 0;
  updateComboDisplay();
}

/* ===========================
   문제 진행 (TODO 게임별)
=========================== */

function showNextQuestion() {
  // TODO(게임별): 다음 문제를 화면에 표시
}

// 리액션이 진행되는 동안 입력을 잠그는 플래그 (시계 방식). TODO(게임별): 필요 없으면 제거
let isJudging = false;

// 게임별 정오답 판정 결과를 넘겨 호출: 콤보/집계 + 캐릭터 리액션 후 다음 문제 또는 종료
function submitAnswer(isCorrect) {
  if (stageEnded || isJudging) return;
  isJudging = true;

  answeredCount += 1;
  if (isCorrect) {
    correctCount += 1;
    increaseCombo();
    // TODO(게임별): 표정·동작 조합과 시간은 게임마다 다름 (맞춤법은 상황별로 'idle'/'wrong' 표정 + 'correct'/'wrong' 동작 조합 사용)
    playCharacterMotion('correct', 'correct', REACTION_DURATION);
  } else {
    resetCombo();
    playCharacterMotion('wrong', 'wrong', REACTION_DURATION);
  }

  // 리액션이 끝난 뒤 다음 문제로 진행
  setTimeout(() => {
    isJudging = false;
    if (answeredCount >= TOTAL_QUESTIONS) finishStage();
    else showNextQuestion();
  }, REACTION_DURATION);
}

/* ===========================
   단계 종료 · 보상 · 결과 화면 [공통]
   - 게임 중에는 Gold를 지급하지 않고, 정상 완료 후 여기서 1회만 계산+저장
=========================== */

const stageResultEl = document.getElementById('stage-result');

function finishStage() {
  if (stageEnded) return; // 중복 실행 방지
  stageEnded = true;

  const stars = calcStars(correctCount, TOTAL_QUESTIONS);
  const rate = TOTAL_QUESTIONS === 0 ? 0 : Math.round((correctCount / TOTAL_QUESTIONS) * 100);

  const { goldQuiz, goldCombo, goldStar, goldTotal } = calcRewardGold({
    correctCount,
    maxCombo,
    stars,
    prevBestStars,
    fullStarBonus: STAGE_KIND === 'review-recent', // 복습 단계 규칙 A는 별 보상을 차액이 아닌 전액 지급
  });

  // 저장 중 예외가 나도 결과 화면은 반드시 표시
  try {
    saveStageResult(GAME_ID, stageKey, stars, goldTotal, STAGE_KIND);
  } catch (e) {
    console.error('결과 저장 중 오류:', e);
  }

  document.getElementById('result-level').textContent = `Lv.${requestedLevel} 완료!`;
  document.getElementById('result-stars').textContent = starsToString(stars);
  document.getElementById('result-score').textContent = `${correctCount} / ${TOTAL_QUESTIONS}`;
  document.getElementById('result-rate').textContent = `정답률 ${rate}%`;
  document.getElementById('result-combo').textContent = `최고 콤보 🔥 ${maxCombo}`;
  document.getElementById('result-gold-quiz').textContent = `💎 ${goldQuiz}`;
  document.getElementById('result-gold-combo').textContent = `💎 ${goldCombo}`;
  document.getElementById('result-gold-star').textContent = `💎 ${goldStar}`;
  document.getElementById('result-gold-total').textContent = `💎 ${goldTotal}`;

  stageResultEl.classList.remove('stage-result--hidden');
}

/* ===========================
   선택 화면으로 나가기 [공통]
   - history.back()으로 돌아가 기록이 쌓이지 않게 함 (메인 → 선택 → 게임 구조 유지)
   - 이전 기록이 없는 직접 진입이면 선택 화면으로 교체 이동
=========================== */

let isLeavingToSelect = false;

function goToSelect() {
  if (isLeavingToSelect) return; // 중복 호출 방지: history.back()이 두 번 실행되면 두 단계 뒤로 감
  isLeavingToSelect = true;
  if (history.length > 1) history.back();
  else location.replace('select.html');
}

// 뒤로/앞으로 이동으로 이 화면이 복원(bfcache)될 때 다시 이동할 수 있도록 초기화
window.addEventListener('pageshow', () => { isLeavingToSelect = false; });

stageResultEl.addEventListener('click', goToSelect);

/* ===========================
   시작
=========================== */

function startStage() {
  initCharacter();
  updateComboDisplay();
  // TODO(게임별): 문제 준비(섞기 등)
  showNextQuestion();
}

startStage();