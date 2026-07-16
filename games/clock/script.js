// v0.3.5 : Implement_Stage selection screen
// v0.4.0 : Refactor_Split into script.js / save.js / data/levels.js
// v0.4.1 : Refactor_Remove stage select logic, use URL param for level, redirect to select.html
// v0.4.2 : Implement_Level rules Lv.1~Lv.5, input UI show/hide, fields-based answer check
// v0.4.3 : Fix_Initialization still calling showStageSelect instead of URL param startup
// v0.4.4 : Fix_initInputUI called before declaration / Update_Lv.2 to 15min intervals
// v0.4.5 : Implement_Time calculation levels Lv.6~8, calc-area show/hide
// v0.4.6 : Implement_Dynamic quiz reward based on previous best stars
// v0.4.7 : Fix_Gold double payment - quiz gold saved immediately, bonus gold at finishStage only
// v0.4.8 : Refactor_Centralize save system into SaveManager (LocalStorage 직접/간접 접근 제거)
// v0.4.9 : Fix_별점 보너스를 (새 최고 별 가치 - 이전 최고 별 가치) 델타 방식으로 계산 (일반 레벨), Lv.8은 매 플레이 고정 지급 유지
// v0.4.10 : Implement_오답 시 정답 확인 모달 표시, 바깥(오버레이) 클릭 시 닫고 다음 문제로 진행
// v0.4.11 : Fix_콤보 보너스(COMBO_MULTIPLIER)가 이전 최고 별점 기준 상수 테이블로 적용되지 않던 문제 수정
// 의존: data/levels.js (LEVELS, shuffleArray), core/saveManager.js (SaveManager)

import { getClockBestStars, getGold, addGold, saveClockResult } from '../../core/saveManager.js';
import { LEVELS, shuffleArray } from './data/levels.js';

/* ===========================
   시계 표시
=========================== */

function setClock(hour, minute, second) {
  const hourAngle   = (hour % 12) * 30 + minute * 0.5;
  const minuteAngle = minute * 6;
  const secondAngle = second * 6;

  document.getElementById('hour-hand').setAttribute('transform',   `rotate(${hourAngle} 200 200)`);
  document.getElementById('minute-hand').setAttribute('transform', `rotate(${minuteAngle} 200 200)`);
  document.getElementById('second-hand').setAttribute('transform', `rotate(${secondAngle} 200 200)`);
}

/* ===========================
   골드 / 콤보 상태
=========================== */

const currentAnswer = { hour: 0, minute: 0, second: 0 };

let gold         = 0;
let currentCombo = 0;
let maxCombo     = 0;

// 플레이 시작 시점의 이전 최고 별점 (플레이 중 변경되지 않음)
// - Lv.1~7 : 결과 화면에서 별점 보너스(goldStar)를 델타 계산할 때도 이 값을 기준으로 사용
// - Lv.8   : 항상 0으로 고정 (문제 정답 보상용, 별점 보너스는 별도로 매 플레이 고정 지급)
let prevBestStars = 0;

/**
 * 이전 최고 별점을 기준으로 문제당 지급 Gold를 반환한다.
 * - 없음(0) : +10
 * - ★(1)   : +7
 * - ★★(2)  : +4
 * - ★★★(3) : +1
 * Lv.8은 예외 없이 항상 bestStars=0 기준(+10)으로 계산하므로
 * 초기화 시 prevBestStars=0으로 고정된다.
 *
 * @returns {number} 지급 Gold
 */
function getQuizRewardGold() {
  const table = { 0: 10, 1: 7, 2: 4, 3: 1 };
  return table[prevBestStars] ?? 10;
}

function updateGoldDisplay() {
  document.getElementById('display-gold').textContent = gold;
}

function updateComboDisplay() {
  document.getElementById('display-combo').textContent = currentCombo;
}

function handleCorrectAnswer() {
  const reward = getQuizRewardGold();
  gold += reward;
  addGold(reward); // 게임 중 지급분 즉시 저장 (SaveManager 경유)
  currentCombo += 1;
  if (currentCombo > maxCombo) maxCombo = currentCombo;
  updateGoldDisplay();
  updateComboDisplay();
}

function handleWrongAnswer() {
  currentCombo = 0;
  updateComboDisplay();
}

/* ===========================
   오답 정답 확인 모달
=========================== */

/**
 * 현재 레벨의 fields에 해당하는 정답만 "N시/N분/N초" 형태로 조합한다.
 * (해당 레벨에서 입력하지 않는 필드는 표시하지 않음)
 * @returns {string}
 */
function formatAnswerText() {
  const levelFields = LEVELS[stageState.currentLevel - 1].fields;
  const parts = [];
  if (levelFields.includes('hour'))   parts.push(`${currentAnswer.hour}시`);
  if (levelFields.includes('minute')) parts.push(`${currentAnswer.minute}분`);
  if (levelFields.includes('second')) parts.push(`${currentAnswer.second}초`);
  return parts.join(' ');
}

function showAnswerModal() {
  document.getElementById('answer-modal-value').textContent = formatAnswerText();
  document.getElementById('answer-modal').classList.remove('answer-modal--hidden');
}

function hideAnswerModal() {
  document.getElementById('answer-modal').classList.add('answer-modal--hidden');
}

// 모달 바깥(오버레이) 클릭 시에만 닫히도록 처리 (카드 내부 클릭은 무시)
// 닫히는 시점에 다음 문제로 진행하며, 그 전까지는 isJudging=true 상태를 유지해 키패드 입력을 막는다.
document.getElementById('answer-modal').addEventListener('click', (e) => {
  if (e.target.id !== 'answer-modal') return;
  hideAnswerModal();
  resetInput();
  nextQuestion();
  isJudging = false;
});

/* ===========================
   입력 UI
=========================== */

const inputState = {
  fields:      ['input-hour', 'input-minute', 'input-second'],
  activeCount: 1,
  values:      ['', '', ''],
  current:     0,
};

/**
 * 현재 레벨의 fields에 맞게 입력 그룹을 표시/숨김 처리한다.
 * @param {string[]} fields - 예: ['hour'], ['hour','minute']
 */
function initInputUI(fields) {
  const fieldMap = { hour: 0, minute: 1, second: 2 };
  const groups   = document.querySelectorAll('.input-group');

  groups.forEach((group, i) => {
    const isActive = fields.some(f => fieldMap[f] === i);
    group.style.display = isActive ? '' : 'none';
  });

  inputState.activeCount = fields.length;
}

function updateFocus() {
  for (let i = 0; i < inputState.activeCount; i++) {
    const el = document.getElementById(inputState.fields[i]);
    if (i === inputState.current) {
      el.classList.add('input-box--active');
    } else {
      el.classList.remove('input-box--active');
    }
  }
}

function updateDisplay(index) {
  const el = document.getElementById(inputState.fields[index]);
  el.textContent = inputState.values[index] === '' ? '--' : inputState.values[index];
}

function handleDigit(digit) {
  const current = inputState.current;
  const val     = inputState.values[current];
  if (val.length >= 2) return;
  inputState.values[current] = val + digit;
  updateDisplay(current);
}

function handleBack() {
  const current = inputState.current;
  const val     = inputState.values[current];

  if (val.length > 0) {
    inputState.values[current] = val.slice(0, -1);
    updateDisplay(current);
  } else if (current > 0) {
    inputState.current -= 1;
    updateFocus();
  }
}

function handleNext() {
  if (inputState.current < inputState.activeCount - 1) {
    inputState.current += 1;
    updateFocus();
  } else {
    checkAnswer();
  }
}

function resetInput() {
  inputState.values  = ['', '', ''];
  inputState.current = 0;
  for (let i = 0; i < inputState.activeCount; i++) updateDisplay(i);
  updateFocus();
}

/* ===========================
   단계 진행
=========================== */

const stageState = {
  currentLevel:   1,
  questionIndex:  0,
  totalQuestions: LEVELS[0].totalQuestions,
  correctCount:   0,
  questionPool:   [],
};

function initStage(level) {
  const levelDef = LEVELS[level - 1];

  stageState.currentLevel   = level;
  stageState.questionIndex  = 0;
  stageState.totalQuestions = levelDef.totalQuestions;
  stageState.correctCount   = 0;

  const pool = shuffleArray(levelDef.buildPool());
  stageState.questionPool = pool.slice(0, levelDef.totalQuestions);

  // 입력 UI를 현재 레벨 fields에 맞게 설정
  initInputUI(levelDef.fields);
}

/** 계산식 영역 표시 (Lv.6~8) */
function showCalcArea(expression) {
  const area = document.getElementById('calc-area');
  area.classList.remove('calc-area--hidden');
  document.getElementById('calc-expression').textContent = expression;
}

/** 계산식 영역 숨김 (Lv.1~5) */
function hideCalcArea() {
  document.getElementById('calc-area').classList.add('calc-area--hidden');
}

/**
 * 현재 문제를 pool에서 꺼내 시계에 표시한다.
 * - Lv.1~5: 정답 시각을 시계에 표시
 * - Lv.6~8: 기준 시각(base*)을 시계에, 계산식(expression)을 별도 영역에 표시
 *           정답은 계산 결과(hour/minute/second)
 */
function generateRandomTime() {
  const q = stageState.questionPool[stageState.questionIndex];

  currentAnswer.hour   = q.hour;
  currentAnswer.minute = q.minute;
  currentAnswer.second = q.second;

  if (q.expression !== undefined) {
    setClock(q.baseHour, q.baseMinute, q.baseSecond);
    showCalcArea(q.expression);
  } else {
    setClock(q.hour, q.minute, q.second);
    hideCalcArea();
  }
}

function nextQuestion() {
  stageState.questionIndex += 1;

  if (stageState.questionIndex < stageState.totalQuestions) {
    generateRandomTime();
  } else {
    finishStage();
  }
}

/* ===========================
   보상 계산
=========================== */

// 콤보 보너스 배율: 이전 최고 별점이 높을수록(=이미 잘 하는 단계일수록) 낮은 배율 적용
// - 없음(0) : ×4
// - ★(1)   : ×3
// - ★★(2)  : ×2
// - ★★★(3) : ×1
// Lv.8은 prevBestStars가 항상 0으로 고정되므로 자동으로 ×4(감소 없음) 적용됨
// 밸런스 테스트 결과에 따라 이 테이블 값만 조정하면 된다.
const COMBO_MULTIPLIER_TABLE = { 0: 4, 1: 3, 2: 2, 3: 1 };

function getComboMultiplier() {
  return COMBO_MULTIPLIER_TABLE[prevBestStars] ?? 4;
}

// 별 1개당 가치 (별점 보너스 계산의 기준값)
// - Lv.1~7 : 신규 달성 시 (새 별 가치 - 이전 최고 별 가치)만큼만 지급
// - Lv.8   : 매 플레이 해당 stars의 값을 그대로 고정 지급 (감소/누적 없음)
const STAR_BONUS       = { 0: 0, 1: 10, 2: 30, 3: 50 };
const GOLD_PER_CORRECT = 10;

function calcStars(correct, total) {
  const ratio = correct / total;
  if (ratio >= 1)      return 3;
  if (ratio >= 2 / 3) return 2;
  if (ratio >= 1 / 3) return 1;
  return 0;
}

function starsToString(stars) {
  return '\u2605'.repeat(stars) + '\u2606'.repeat(3 - stars);
}

/* ===========================
   결과 화면
=========================== */

function finishStage() {
  const { currentLevel, correctCount, totalQuestions } = stageState;
  const rate  = Math.round((correctCount / totalQuestions) * 100);
  const stars = calcStars(correctCount, totalQuestions);

  // 게임 중 이미 지급된 문제 정답 골드 (getQuizRewardGold() 기준)
  const goldQuiz  = correctCount * getQuizRewardGold();

  // 결과 화면에서 추가 지급할 콤보 보너스 + 별점 보너스
  // 콤보 보너스 배율은 이전 최고 별점(prevBestStars) 기준 COMBO_MULTIPLIER_TABLE을 따른다.
  const goldCombo = maxCombo * getComboMultiplier();

  // 별점 보너스
  // - Lv.8(최종 레벨) : 매 플레이 stars 기준 고정 지급 (최고 별점 저장/누적 없음, 감소 없음)
  // - Lv.1~7          : 최초 도전 또는 최고 별점 갱신 시에만 (새 최고 별 가치 - 이전 최고 별 가치)만큼 지급
  //                      별점 유지/하락 시 0 (음수 방지)
  const goldStar = currentLevel === 8
    ? STAR_BONUS[stars]
    : Math.max(0, STAR_BONUS[stars] - STAR_BONUS[prevBestStars]);

  const goldBonus = goldCombo + goldStar; // 결과 화면에서 추가 지급분

  const goldTotal = goldQuiz + goldBonus;

  // 저장 (최고 별점/Lv.8 최근 별점 갱신, 누적 골드, 단계 해금) - SaveManager 경유
  saveClockResult(currentLevel, stars, goldBonus, LEVELS.length); // 추가 지급분만 저장에 반영
  gold += goldBonus;                          // 게임 중 지급분(goldQuiz)은 이미 반영됨
  updateGoldDisplay();

  document.getElementById('result-level').textContent = `Lv.${currentLevel} 완료!`;
  document.getElementById('result-stars').textContent = starsToString(stars);
  document.getElementById('result-score').textContent = `${correctCount} / ${totalQuestions}`;
  document.getElementById('result-rate').textContent  = `정답률 ${rate}%`;
  document.getElementById('result-combo').textContent = `최고 콤보 🔥 ${maxCombo}`;

  document.querySelector('#result-gold-quiz  .result-gold-value').textContent = goldQuiz;
  document.querySelector('#result-gold-combo .result-gold-value').textContent = goldCombo;
  document.querySelector('#result-gold-star  .result-gold-value').textContent = goldStar;
  document.querySelector('#result-gold-total .result-gold-value').textContent = `💎 ${goldTotal}`;

  document.getElementById('result-screen').classList.remove('result-screen--hidden');

  // 결과 화면 탭/클릭 시 단계 선택 화면으로 복귀
  // history.back()으로 select.html이 자연스럽게 복원됨
  document.getElementById('result-screen').addEventListener('click', () => {
    history.back();
  }, { once: true });
}

/* ===========================
   정답 판정
=========================== */

let isJudging = false;

function checkAnswer() {
  const activeValues = inputState.values.slice(0, inputState.activeCount);
  if (activeValues.some(v => v === '')) {
    console.log('입력값이 비어 있습니다.');
    return;
  }

  const userHour   = parseInt(inputState.values[0], 10) || 0;
  const userMinute = inputState.activeCount >= 2 ? parseInt(inputState.values[1], 10) : 0;
  const userSecond = inputState.activeCount >= 3 ? parseInt(inputState.values[2], 10) : 0;

  const levelFields = LEVELS[stageState.currentLevel - 1].fields;
  const isCorrect =
    (!levelFields.includes('hour')   || userHour   === currentAnswer.hour)   &&
    (!levelFields.includes('minute') || userMinute === currentAnswer.minute) &&
    (!levelFields.includes('second') || userSecond === currentAnswer.second);

  const inputArea = document.querySelector('.input-area');
  isJudging = true;

  if (isCorrect) {
    console.log('Correct!');
    handleCorrectAnswer();
    stageState.correctCount += 1;
    inputArea.classList.add('input-area--correct');
    setTimeout(() => {
      inputArea.classList.remove('input-area--correct');
      resetInput();
      nextQuestion();
      isJudging = false;
    }, 600);
  } else {
    console.log('Wrong!');
    handleWrongAnswer();
    inputArea.classList.add('input-area--wrong');
    setTimeout(() => {
      inputArea.classList.remove('input-area--wrong');
      // 정답 확인 모달 표시. 바깥(오버레이) 클릭 시 모달의 click 리스너에서
      // resetInput() / nextQuestion() / isJudging 해제를 처리하므로 여기서는 호출하지 않는다.
      showAnswerModal();
    }, 600);
  }
}

/* ===========================
   키패드 이벤트 바인딩
=========================== */

document.querySelector('.keypad-area').addEventListener('click', (e) => {
  if (isJudging) return;
  const btn = e.target.closest('[data-key]');
  if (!btn) return;

  const key = btn.dataset.key;
  if (key === 'back')      handleBack();
  else if (key === 'next') handleNext();
  else                     handleDigit(key);
});

/* ===========================
   초기화
=========================== */

const _params = new URLSearchParams(location.search);
const _level  = parseInt(_params.get('level'), 10) || 1;

gold = getGold();
updateGoldDisplay();

// 플레이 시작 시점의 이전 최고 별점 저장
// Lv.8은 예외: 항상 0(별 없음 기준, +10 지급)
prevBestStars = _level === 8 ? 0 : getClockBestStars(_level);

currentCombo = 0;
maxCombo     = 0;
updateComboDisplay();

initStage(_level);
generateRandomTime();
updateFocus();