// v0.3.5 : Implement_Stage selection screen
// v0.4.0 : Refactor_Split into script.js / save.js / data/levels.js
// v0.4.1 : Refactor_Remove stage select logic, use URL param for level, redirect to select.html
// v0.4.2 : Implement_Level rules Lv.1~Lv.5, input UI show/hide, fields-based answer check
// v0.4.3 : Fix_Initialization still calling showStageSelect instead of URL param startup
// 의존: data/levels.js (LEVELS, shuffleArray), save.js (loadSave, saveResult)

/* ===========================
   시계 표시
=========================== */

/**
 * 시계 바늘을 지정한 시:분:초로 회전시키는 함수
 * - inline SVG이므로 document.getElementById로 직접 접근 (로드 대기 불필요)
 * - 시침: 30도/시 + 0.5도/분
 * - 분침: 6도/분
 * - 초침: 6도/초
 *
 * @param {number} hour   1~12
 * @param {number} minute 0~59
 * @param {number} second 0~59
 */
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

// 현재 문제의 정답 시각
const currentAnswer = { hour: 0, minute: 0, second: 0 };

// 게임 상태 변수
let gold         = 0;  // 누적 골드 (저장 데이터에서 불러온 값으로 초기화)
let currentCombo = 0;  // 현재 연속 정답 수
let maxCombo     = 0;  // 최고 콤보 기록

/** Gold 표시를 현재 gold 값으로 갱신한다. */
function updateGoldDisplay() {
  document.getElementById('display-gold').textContent = gold;
}

/** Combo 표시를 현재 currentCombo 값으로 갱신한다. */
function updateComboDisplay() {
  document.getElementById('display-combo').textContent = currentCombo;
}

/**
 * 정답 시 처리: Gold +10, Combo +1, maxCombo 갱신, 표시 업데이트
 */
function handleCorrectAnswer() {
  gold += 10;
  currentCombo += 1;
  if (currentCombo > maxCombo) maxCombo = currentCombo;
  updateGoldDisplay();
  updateComboDisplay();
}

/**
 * 오답 시 처리: Combo 초기화, 표시 업데이트 (Gold 감소 없음)
 */
function handleWrongAnswer() {
  currentCombo = 0;
  updateComboDisplay();
}

/* ===========================
   문제 생성
=========================== */

/**
 * 현재 문제를 pool에서 꺼내 시계에 표시하는 함수
 * - stageState.questionPool[questionIndex] 를 순서대로 사용
 * - 중복 없이 출제되며, 단계 재시작 시 pool이 새로 생성된다.
 */
function generateRandomTime() {
  const { hour, minute, second } = stageState.questionPool[stageState.questionIndex];

  currentAnswer.hour   = hour;
  currentAnswer.minute = minute;
  currentAnswer.second = second;

  setClock(hour, minute, second);
}

/* ===========================
   단계 진행
=========================== */

/**
 * 현재 단계 진행 상태
 * - currentLevel:    현재 플레이 중인 레벨 번호 (1~8)
 * - questionIndex:   현재 문제 번호 (0부터 시작)
 * - totalQuestions:  현재 레벨의 전체 문제 수
 * - correctCount:    정답 개수
 * - questionPool:    셔플된 문제 목록 (이 순서대로 출제)
 */
const stageState = {
  currentLevel:   1,
  questionIndex:  0,
  totalQuestions: LEVELS[0].totalQuestions,
  correctCount:   0,
  questionPool:   [],
};

/**
 * 단계 시작 시 문제 pool을 생성하고 셔플하여 stageState에 저장한다.
 *
 * @param {number} level - 시작할 레벨 번호 (1~8)
 */
function initStage(level) {
  const levelDef = LEVELS[level - 1];

  stageState.currentLevel   = level;
  stageState.questionIndex  = 0;
  stageState.totalQuestions = levelDef.totalQuestions;
  stageState.correctCount   = 0;

  const pool = shuffleArray(levelDef.buildPool());
  stageState.questionPool = pool.slice(0, levelDef.totalQuestions);

  // 현재 레벨에 맞는 입력 UI 표시/숨김
  initInputUI(levelDef.fields);
}

/**
 * 다음 문제로 이동하거나 단계를 종료한다.
 */
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

/**
 * 정답률에 따라 별점(0~3)을 반환한다.
 * ★★★ : 100% / ★★ : 2/3 이상 / ★ : 1/3 이상 / 없음 : 1/3 미만
 */
function calcStars(correct, total) {
  const ratio = correct / total;
  if (ratio >= 1)      return 3;
  if (ratio >= 2 / 3) return 2;
  if (ratio >= 1 / 3) return 1;
  return 0;
}

/**
 * 별점 숫자를 별 문자열로 변환한다.
 * @param {number} stars - 0~3
 * @returns {string} 예: '★★☆'
 */
function starsToString(stars) {
  return '★'.repeat(stars) + '☆'.repeat(3 - stars);
}

/* ===========================
   UI 갱신 (결과 화면)
=========================== */

/**
 * 단계 종료 처리 및 결과 화면 표시
 */
function finishStage() {
  const { currentLevel, correctCount, totalQuestions } = stageState;
  const rate  = Math.round((correctCount / totalQuestions) * 100);
  const stars = calcStars(correctCount, totalQuestions);

  const goldQuiz  = correctCount * GOLD_PER_CORRECT;
  const goldCombo = maxCombo * COMBO_MULTIPLIER;
  const goldStar  = STAR_BONUS[stars];
  const goldTotal = goldQuiz + goldCombo + goldStar;

  // 저장 및 누적 Gold 갱신
  saveResult(currentLevel, stars, goldTotal);
  gold += goldTotal;
  updateGoldDisplay();

  // 결과 화면 갱신
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

  // 결과 화면 탭/클릭 시 단계 선택 화면으로 이동
  document.getElementById('result-screen').addEventListener('click', () => {
    window.location.href = 'select.html';
  }, { once: true });
}

/* ===========================
   초기화
=========================== */

// URL 파라미터에서 레벨 번호를 읽어 게임 시작
// 예: index.html?level=1
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

const inputState = {
  fields:       ['input-hour', 'input-minute', 'input-second'], // 전체 필드 id
  activeCount:  1,    // 현재 레벨에서 사용하는 필드 수 (initInputUI에서 설정)
  values:       ['', '', ''],
  current:      0,
};

/**
 * 현재 레벨의 fields에 맞게 입력 UI를 표시/숨김 처리한다.
 * - 사용하지 않는 입력 그룹은 숨긴다.
 * @param {string[]} fields - 현재 레벨의 활성 필드 배열 (예: ['hour'], ['hour','minute'])
 */
function initInputUI(fields) {
  const fieldMap = { hour: 0, minute: 1, second: 2 };
  const groups   = document.querySelectorAll('.input-group');

  groups.forEach((group, i) => {
    // 현재 레벨 fields에 해당 인덱스가 포함되는지 확인
    const isActive = fields.some(f => fieldMap[f] === i);
    group.style.display = isActive ? '' : 'none';
  });

  inputState.activeCount = fields.length;
}

/** 현재 선택된 입력칸을 시각적으로 표시한다. */
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

/**
 * 입력칸 표시 텍스트를 갱신한다.
 * @param {number} index - 갱신할 입력칸 인덱스
 */
function updateDisplay(index) {
  const el = document.getElementById(inputState.fields[index]);
  el.textContent = inputState.values[index] === '' ? '--' : inputState.values[index];
}

/** 숫자 키 입력 처리 (최대 2자리) */
function handleDigit(digit) {
  const current = inputState.current;
  const val     = inputState.values[current];
  if (val.length >= 2) return;
  inputState.values[current] = val + digit;
  updateDisplay(current);
}

/** 삭제(←) 버튼 처리 */
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

/** 다음(→) 버튼 처리 - activeCount 기준으로 마지막 필드 여부 판단 */
function handleNext() {
  if (inputState.current < inputState.activeCount - 1) {
    inputState.current += 1;
    updateFocus();
  } else {
    checkAnswer();
  }
}

/** 입력 영역 초기화 */
function resetInput() {
  inputState.values  = ['', '', ''];
  inputState.current = 0;
  for (let i = 0; i < inputState.activeCount; i++) updateDisplay(i);
  updateFocus();
}

/* ===========================
   정답 판정
=========================== */

let isJudging = false;

/**
 * 정답 판정 함수
 * - 빈 입력값이 있으면 판정하지 않는다.
 * - 정답: Gold +10, Combo +1, 다음 문제
 * - 오답: Combo 초기화, 다음 문제
 */
function checkAnswer() {
  // 활성 필드만 빈값 체크
  const activeValues = inputState.values.slice(0, inputState.activeCount);
  if (activeValues.some(v => v === '')) {
    console.log('입력값이 비어 있습니다.');
    return;
  }

  const userHour   = parseInt(inputState.values[0], 10) || 0;
  const userMinute = inputState.activeCount >= 2 ? parseInt(inputState.values[1], 10) : 0;
  const userSecond = inputState.activeCount >= 3 ? parseInt(inputState.values[2], 10) : 0;

  // 활성 필드만 비교 (숨겨진 필드는 정답과 무관하게 일치로 처리)
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
  if (key === 'back')       handleBack();
  else if (key === 'next')  handleNext();
  else                      handleDigit(key);
});

/* ===========================
   초기화
=========================== */

// URL 파라미터에서 레벨 번호를 읽어 게임 시작
// 예: index.html?level=2
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