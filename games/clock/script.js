// v0.1.0 : 최초 생성 - setClock(hour, minute, second) 시계 바늘 회전 기능
// v0.1.1 : object 로드 타이밍 문제 수정 (contentDocument 즉시/지연 분기)
// v0.1.2 : SVG 내부 요소 null 오류 수정 - id 존재 여부로 파싱 완료 판단
// v0.1.3 : generateRandomTime() 추가 - 무작위 시각 생성 및 setClock 호출
// v0.1.4 : 키패드 입력 기능 추가 - 시/분/초 입력, 포커스 이동, 삭제
// v0.1.5 : 정답 판정 기능 추가 - checkAnswer(), 정답/오답 처리
// v0.1.6 : 버그 수정 - 판정 중 키패드 차단(isJudging), 빈값 제출 방어, 정답/오답 시각 피드백
// v0.1.7 : 골드/콤보 시스템 추가 - gold, currentCombo, maxCombo, 표시 갱신 함수
// v0.1.8 : 아이콘 표시 변경(🪙/🔥), CSS min-width로 위치 고정
// v0.1.9 : 콤보 버그 수정 - 오답 낸 문제 재도전 정답 시 콤보 미증가 (wrongOnCurrentProblem)
// v0.2.0 : 오답 시 즉시 다음 문제로 이동, wrongOnCurrentProblem 플래그 제거
// v0.2.1 : 분침 각도 계산에서 초 영향 제거 (분당 6도 고정)
// v0.2.2 : <object> → inline SVG로 전환, setClock 단순화 (로드 타이밍 로직 제거)
// v0.3.2 : Implement_Stage reward system - star rating, quiz/combo/star gold
// v0.3.3 : Polish_Remove emoji from quiz/combo/star gold rows in result screen
// v0.3.4 : Implement_Save and unlock system - localStorage, best stars, gold accumulation, level unlock

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
  const hourAngle   = (hour % 12) * 30 + minute * 0.5;  // 시침: 30도/시 + 0.5도/분
  const minuteAngle = minute * 6;                        // 분침: 6도/분
  const secondAngle = second * 6;                        // 초침: 6도/초

  document.getElementById('hour-hand').setAttribute('transform',   `rotate(${hourAngle} 200 200)`);
  document.getElementById('minute-hand').setAttribute('transform', `rotate(${minuteAngle} 200 200)`);
  document.getElementById('second-hand').setAttribute('transform', `rotate(${secondAngle} 200 200)`);
}

/**
 * 현재 문제의 정답 시각을 저장하는 객체
 * generateRandomTime() 호출 시 갱신된다.
 */
const currentAnswer = { hour: 0, minute: 0, second: 0 };

/* ===========================
   골드 / 콤보 시스템
=========================== */

// 게임 상태 변수
let gold         = 0;  // 누적 골드 (저장 데이터에서 불러온 값으로 초기화)
let currentCombo = 0;  // 현재 연속 정답 수
let maxCombo     = 0;  // 최고 콤보 기록

/* ===========================
   저장 시스템 (localStorage)
=========================== */

const SAVE_KEY = 'clockGame_save'; // localStorage 키

/**
 * 기본 저장 데이터를 반환한다.
 * - Lv.1만 해금, Gold 0, 모든 최고 별점 없음(0)
 */
function getDefaultSave() {
  return {
    gold:        0,
    unlockedLevel: 1,                   // 해금된 최고 레벨
    bestStars:   new Array(8).fill(0),  // 인덱스 0 = Lv.1, ..., 인덱스 7 = Lv.8
  };
}

/**
 * localStorage에서 저장 데이터를 불러온다.
 * 저장 데이터가 없으면 기본 데이터를 반환한다.
 *
 * @returns {Object} 저장 데이터
 */
function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : getDefaultSave();
  } catch {
    return getDefaultSave();
  }
}

/**
 * 저장 데이터를 localStorage에 기록한다.
 *
 * @param {Object} saveData - 저장할 데이터
 */
function writeSave(saveData) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
  } catch {
    console.warn('저장 실패: localStorage를 사용할 수 없습니다.');
  }
}

/**
 * 단계 종료 시 저장 데이터를 갱신한다.
 * - 최고 별점: 기존보다 높을 때만 갱신
 * - Gold: 총 획득 Gold를 누적
 * - 단계 해금: ★★ 이상이면 다음 단계 해금
 *
 * @param {number} level    - 완료한 레벨 번호
 * @param {number} stars    - 이번 플레이 별점 (0~3)
 * @param {number} goldEarned - 이번 플레이 총 획득 Gold
 */
function saveResult(level, stars, goldEarned) {
  const save = loadSave();

  // 최고 별점 갱신 (더 높을 때만)
  if (stars > save.bestStars[level - 1]) {
    save.bestStars[level - 1] = stars;
  }

  // Gold 누적
  save.gold += goldEarned;

  // 단계 해금: ★★ 이상이고 다음 레벨이 존재하면 해금
  if (stars >= 2 && level < LEVELS.length) {
    const nextLevel = level + 1;
    if (nextLevel > save.unlockedLevel) {
      save.unlockedLevel = nextLevel;
    }
  }

  writeSave(save);
  return save;
}

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
 * checkAnswer()의 정답 분기에서 호출된다.
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
 * checkAnswer()의 오답 분기에서 호출된다.
 */
function handleWrongAnswer() {
  currentCombo = 0;
  updateComboDisplay();
}

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
   단계(Level) 진행 시스템
=========================== */

/**
 * 배열을 무작위로 섞는 함수 (Fisher-Yates 알고리즘)
 * 원본 배열을 직접 수정하고 반환한다.
 *
 * @param {Array} arr - 섞을 배열
 * @returns {Array}   - 섞인 배열 (같은 참조)
 */
function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * 레벨 정의 데이터
 * - level:          레벨 번호
 * - totalQuestions: 출제 문제 수
 * - buildPool():    출제 가능한 전체 문제 목록을 배열로 반환하는 함수
 *                   이 배열을 셔플한 뒤 앞에서부터 순서대로 출제한다.
 *                   Lv.2~Lv.8은 데이터 구조만 준비, buildPool 실제 구현은 추후 진행
 */
const LEVELS = [
  {
    level: 1,
    totalQuestions: 5,
    buildPool() {
      // 1시~12시, 분·초 고정 0 → 12가지 문제 전체 목록
      const pool = [];
      for (let hour = 1; hour <= 12; hour++) {
        pool.push({ hour, minute: 0, second: 0 });
      }
      return pool; // 호출 측에서 셔플 후 앞 5개 사용
    },
  },
  { level: 2, totalQuestions: 10, buildPool: null }, // 정각/30분 - 추후 구현
  { level: 3, totalQuestions: 10, buildPool: null }, // 5분 단위 - 추후 구현
  { level: 4, totalQuestions: 10, buildPool: null }, // 모든 분 - 추후 구현
  { level: 5, totalQuestions: 10, buildPool: null }, // 시·분·초 - 추후 구현
  { level: 6, totalQuestions: 10, buildPool: null }, // 단일 단위 계산 - 추후 구현
  { level: 7, totalQuestions: 10, buildPool: null }, // 두 단위 계산 - 추후 구현
  { level: 8, totalQuestions: 10, buildPool: null }, // 세 단위 계산 - 추후 구현
];

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
 * - buildPool()로 전체 목록 생성 → shuffleArray()로 무작위 정렬
 * - 단계를 다시 시작할 때도 이 함수를 호출하면 pool이 새로 생성된다.
 *
 * @param {number} level - 시작할 레벨 번호 (1~8)
 */
function initStage(level) {
  const levelDef = LEVELS[level - 1];

  stageState.currentLevel   = level;
  stageState.questionIndex  = 0;
  stageState.totalQuestions = levelDef.totalQuestions;
  stageState.correctCount   = 0;

  // 전체 목록 생성 후 셔플, totalQuestions 개수만큼 잘라서 사용
  const pool = shuffleArray(levelDef.buildPool());
  stageState.questionPool = pool.slice(0, levelDef.totalQuestions);
}

/* ===========================
   보상 시스템 상수
=========================== */

// 콤보 보너스 배율 (maxCombo × COMBO_MULTIPLIER)
const COMBO_MULTIPLIER = 4;

// 별점별 보너스 Gold
const STAR_BONUS = { 0: 0, 1: 10, 2: 30, 3: 50 };

// 문제당 기본 Gold (최고 별점 '없음' 가정)
const GOLD_PER_CORRECT = 10;

/**
 * 정답률에 따라 별점(0~3)을 반환한다.
 * ★★★ : 100%
 * ★★  : 2/3 이상
 * ★   : 1/3 이상
 * 없음 : 1/3 미만
 *
 * @param {number} correct - 정답 수
 * @param {number} total   - 전체 문제 수
 * @returns {number} 0~3
 */
function calcStars(correct, total) {
  const ratio = correct / total;
  if (ratio >= 1)         return 3;
  if (ratio >= 2 / 3)    return 2;
  if (ratio >= 1 / 3)    return 1;
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

/**
 * 단계 종료 처리 및 결과 화면 표시
 * - 별점, 보상 Gold 계산
 * - 저장 데이터 갱신 (최고 별점, 누적 Gold, 단계 해금)
 */
function finishStage() {
  const { currentLevel, correctCount, totalQuestions } = stageState;
  const rate  = Math.round((correctCount / totalQuestions) * 100);
  const stars = calcStars(correctCount, totalQuestions);

  // Gold 계산
  const goldQuiz  = correctCount * GOLD_PER_CORRECT;
  const goldCombo = maxCombo * COMBO_MULTIPLIER;
  const goldStar  = STAR_BONUS[stars];
  const goldTotal = goldQuiz + goldCombo + goldStar;

  // 저장 및 누적 Gold 갱신
  saveResult(currentLevel, stars, goldTotal);
  gold += goldTotal;
  updateGoldDisplay();

  // 결과 화면 갱신
  document.getElementById('result-level').textContent      = `Lv.${currentLevel} 완료!`;
  document.getElementById('result-stars').textContent      = starsToString(stars);
  document.getElementById('result-score').textContent      = `${correctCount} / ${totalQuestions}`;
  document.getElementById('result-rate').textContent       = `정답률 ${rate}%`;
  document.getElementById('result-combo').textContent      = `최고 콤보 🔥 ${maxCombo}`;

  // gold 행: 숫자만 표시 (quiz/combo/star 이모지 없음, total만 💎 유지)
  document.querySelector('#result-gold-quiz  .result-gold-value').textContent = goldQuiz;
  document.querySelector('#result-gold-combo .result-gold-value').textContent = goldCombo;
  document.querySelector('#result-gold-star  .result-gold-value').textContent = goldStar;
  document.querySelector('#result-gold-total .result-gold-value').textContent = `💎 ${goldTotal}`;

  document.getElementById('result-screen').classList.remove('result-screen--hidden');
}

/**
 * 다음 문제로 이동하거나 단계를 종료한다.
 * - 남은 문제가 있으면 다음 문제를 생성한다.
 * - 모든 문제가 끝나면 finishStage()를 호출한다.
 */
function nextQuestion() {
  stageState.questionIndex += 1;

  if (stageState.questionIndex < stageState.totalQuestions) {
    generateRandomTime();
  } else {
    finishStage();
  }
}

// 페이지 로드 시 저장 데이터 불러오기 → gold 초기화 → Lv.1 시작
const _save = loadSave();
gold = _save.gold;
updateGoldDisplay();

initStage(1);
generateRandomTime();

/* ===========================
   키패드 입력 기능
=========================== */

/**
 * 입력 상태 관리 객체
 * - fields: 시/분/초 순서의 입력칸 id 배열
 * - values: 각 입력칸의 현재 입력 문자열 ('', '1', '12' 등)
 * - current: 현재 선택된 입력칸 인덱스 (0=시, 1=분, 2=초)
 * - userAnswer: 제출된 최종 입력값 (정답 판정 시 사용 예정)
 */
const inputState = {
  fields: ['input-hour', 'input-minute', 'input-second'],
  values: ['', '', ''],
  current: 0,
};

/**
 * 현재 선택된 입력칸을 시각적으로 표시하고
 * 나머지 입력칸의 선택 표시를 제거한다.
 */
function updateFocus() {
  inputState.fields.forEach((id, i) => {
    const el = document.getElementById(id);
    if (i === inputState.current) {
      el.classList.add('input-box--active');
    } else {
      el.classList.remove('input-box--active');
    }
  });
}

/**
 * 입력칸의 표시 텍스트를 현재 values 기준으로 갱신한다.
 * 입력 전(빈 값)은 '--', 입력 중/완료는 숫자 문자열을 표시한다.
 *
 * @param {number} index - 갱신할 입력칸 인덱스
 */
function updateDisplay(index) {
  const el = document.getElementById(inputState.fields[index]);
  el.textContent = inputState.values[index] === '' ? '--' : inputState.values[index];
}

/**
 * 숫자 키 입력 처리
 * - 현재 입력칸에 최대 2자리까지 입력
 * - 2자리가 되면 더 이상 입력을 받지 않는다 (자동 이동 없음)
 *
 * @param {string} digit - 입력된 숫자 문자 ('0'~'9')
 */
function handleDigit(digit) {
  const current = inputState.current;
  const val = inputState.values[current];

  // 이미 2자리면 무시
  if (val.length >= 2) return;

  inputState.values[current] = val + digit;
  updateDisplay(current);
}

/**
 * 삭제(←) 버튼 처리
 * - 현재 입력칸에 값이 있으면 마지막 글자 삭제
 * - 비어 있으면 이전 입력칸으로 이동 (시 영역에서는 이동 안 함)
 */
function handleBack() {
  const current = inputState.current;
  const val = inputState.values[current];

  if (val.length > 0) {
    // 마지막 글자 삭제
    inputState.values[current] = val.slice(0, -1);
    updateDisplay(current);
  } else if (current > 0) {
    // 비어 있으면 이전 칸으로 이동
    inputState.current -= 1;
    updateFocus();
  }
}

/**
 * 다음(→) 버튼 처리
 * - 시/분: 다음 입력칸으로 이동
 * - 초: 현재 입력값을 제출 처리 (정답 판정은 추후 구현)
 */
function handleNext() {
  const current = inputState.current;

  if (current < 2) {
    // 다음 입력칸으로 이동
    inputState.current += 1;
    updateFocus();
  } else {
    // 초 입력 완료 → 제출
    submitAnswer();
  }
}

/**
 * 입력 영역을 초기화하는 함수
 * - 모든 입력값을 비우고 표시를 '--'로 되돌린다.
 * - 선택 위치를 시(hour)로 초기화한다.
 */
function resetInput() {
  inputState.values  = ['', '', ''];
  inputState.current = 0;
  inputState.fields.forEach((id, i) => updateDisplay(i));
  updateFocus();
}

/**
 * 정답 판정 함수
 * - 입력값을 숫자로 변환하여 currentAnswer와 비교한다.
 * - 앞의 0 유무는 영향 없음 ("07" === 7, "7" === 7)
 * - 입력값이 하나라도 비어 있으면 판정하지 않는다.
 * - 정답: Gold +10, Combo +1, 새 문제 생성
 * - 오답: Combo 초기화, 바로 다음 문제로 넘어감
 */
function checkAnswer() {
  if (inputState.values.some(v => v === '')) {
    console.log('입력값이 비어 있습니다.');
    return;
  }

  const userHour   = parseInt(inputState.values[0], 10);
  const userMinute = parseInt(inputState.values[1], 10);
  const userSecond = parseInt(inputState.values[2], 10);

  const isCorrect =
    userHour   === currentAnswer.hour   &&
    userMinute === currentAnswer.minute &&
    userSecond === currentAnswer.second;

  const inputArea = document.querySelector('.input-area');

  // 피드백 표시 중 키패드 입력 차단
  isJudging = true;

  if (isCorrect) {
    console.log('Correct!');
    handleCorrectAnswer();
    stageState.correctCount += 1; // 정답 카운트
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

/**
 * 입력값 제출 처리
 * - checkAnswer()에 위임한다.
 */
function submitAnswer() {
  checkAnswer();
}

/**
 * 키패드 이벤트 바인딩
 * - isJudging: 판정 중(피드백 표시 중)에는 키패드 입력 전체를 차단한다.
 *   setTimeout 타이머 방식은 피드백 시간(600ms)과 불일치 위험이 있어 사용하지 않는다.
 */
let isJudging = false;

document.querySelector('.keypad-area').addEventListener('click', (e) => {
  if (isJudging) return;
  const btn = e.target.closest('[data-key]');
  if (!btn) return;

  const key = btn.dataset.key;

  if (key === 'back') {
    handleBack();
  } else if (key === 'next') {
    handleNext();
  } else {
    handleDigit(key);
  }
});

// 초기 포커스 설정 (시 영역 활성화)
updateFocus();