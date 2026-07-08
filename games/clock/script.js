// v0.3.5 : Implement_Stage selection screen
// v0.4.0 : Refactor_Split into script.js / save.js / data/levels.js
// v0.4.1 : Refactor_Remove stage select logic, use URL param for level, redirect to select.html
// v0.4.2 : Implement_Level rules Lv.1~Lv.5, input UI show/hide, fields-based answer check
// v0.4.3 : Fix_Initialization still calling showStageSelect instead of URL param startup
// v0.4.4 : Fix_initInputUI called before declaration / Update_Lv.2 to 15min intervals
// v0.4.5 : Implement_Time calculation levels Lv.6~8, calc-area show/hide
// 의존: data/levels.js (LEVELS, shuffleArray), save.js (loadSave, saveResult)

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

function updateGoldDisplay() {
  document.getElementById('display-gold').textContent = gold;
}

function updateComboDisplay() {
  document.getElementById('display-combo').textContent = currentCombo;
}

function handleCorrectAnswer() {
  gold += 10;
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

const COMBO_MULTIPLIER = 4;
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
  return '★'.repeat(stars) + '☆'.repeat(3 - stars);
}

/* ===========================
   결과 화면
=========================== */

function finishStage() {
  const { currentLevel, correctCount, totalQuestions } = stageState;
  const rate  = Math.round((correctCount / totalQuestions) * 100);
  const stars = calcStars(correctCount, totalQuestions);

  const goldQuiz  = correctCount * GOLD_PER_CORRECT;
  const goldCombo = maxCombo * COMBO_MULTIPLIER;
  const goldStar  = STAR_BONUS[stars];
  const goldTotal = goldQuiz + goldCombo + goldStar;

  saveResult(currentLevel, stars, goldTotal);
  gold += goldTotal;
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

  document.getElementById('result-screen').addEventListener('click', () => {
    window.location.href = 'select.html';
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
      resetInput();
      nextQuestion();
      isJudging = false;
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

const _params = new URLSearchParams(window.location.search);
const _level  = parseInt(_params.get('level'), 10) || 1;

const _save = loadSave();
gold = _save.gold;
updateGoldDisplay();

currentCombo = 0;
maxCombo     = 0;
updateComboDisplay();

initStage(_level);
generateRandomTime();
updateFocus();