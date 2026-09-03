// v0.4.14 : Adjust spawnEffect parameter order and validate element bounds for accurate rendering
// - 의존: data/levels.js (LEVELS, shuffleArray), core/saveManager.js (SaveManager), characters/characterRenderer.js (renderCharacterSvg)
//
// Public API (Internal Game Logic)
// - setClock(hour, minute, second): SVG 시계 바늘 각도 계산 및 적용
// - getQuizRewardGold(): 이전 최고 별점 기반 문제당 골드 보상 산정
// - checkAnswer(): 사용자의 입력 시각과 정답 시각 비교 판정
// - moveCharacterToRandomPosition(): 캐릭터 컨테이너를 지정된 좌표 목록 중 하나로 이동하고 0~360도 무작위 회전 적용
// - initCharacter(): 저장된 파츠 정보로 SVG 캐릭터를 생성하여 화면에 렌더링하고 최초 위치 설정

import { getClockBestStars, getGold, addGold, saveClockResult, getEquippedParts } from '../../core/saveManager.js';
import { renderCharacterSvg } from '../../characters/characterRenderer.js';
import { LEVELS, shuffleArray } from './data/levels.js';
import { spawnEffect } from '../../characters/assets/effects/effects.js';
import { getEquippedEffect } from '../../characters/inventory.js';

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

let prevBestStars = 0;

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
  addGold(reward); 
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

  initInputUI(levelDef.fields);
}

function showCalcArea(expression) {
  const area = document.getElementById('calc-area');
  area.classList.remove('calc-area--hidden');
  document.getElementById('calc-expression').textContent = expression;
}

function hideCalcArea() {
  document.getElementById('calc-area').classList.add('calc-area--hidden');
}

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

  // 문제가 생성(변경)될 때마다 캐릭터 위치와 기울기 무작위 갱신
  moveCharacterToRandomPosition();
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

const COMBO_MULTIPLIER_TABLE = { 0: 4, 1: 3, 2: 2, 3: 1 };
function getComboMultiplier() {
  return COMBO_MULTIPLIER_TABLE[prevBestStars] ?? 4;
}

const STAR_BONUS       = { 0: 0, 1: 10, 2: 30, 3: 50 };
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
  const goldQuiz  = correctCount * getQuizRewardGold();
  const goldCombo = maxCombo * getComboMultiplier();
  const goldStar = currentLevel === 8
    ? STAR_BONUS[stars]
    : Math.max(0, STAR_BONUS[stars] - STAR_BONUS[prevBestStars]);

  const goldBonus = goldCombo + goldStar;
  const goldTotal = goldQuiz + goldBonus;

  saveClockResult(currentLevel, stars, goldBonus, LEVELS.length);
  gold += goldBonus;                          
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
    history.back();
  }, { once: true });
}

/* ===========================
   정답 판정 및 효과 연동
=========================== */

let isJudging = false;

function checkAnswer() {
  const activeValues = inputState.values.slice(0, inputState.activeCount);
  if (activeValues.some(v => v === '')) return;

  const userHour   = parseInt(inputState.values[0], 10) || 0;
  const userMinute = inputState.activeCount >= 2 ? parseInt(inputState.values[1], 10) : 0;
  const userSecond = inputState.activeCount >= 3 ? parseInt(inputState.values[2], 10) : 0;

  const levelFields = LEVELS[stageState.currentLevel - 1].fields;
  const isCorrect =
    (!levelFields.includes('hour')   || userHour   === currentAnswer.hour)   &&
    (!levelFields.includes('minute') || userMinute === currentAnswer.minute) &&
    (!levelFields.includes('second') || userSecond === currentAnswer.second);

  const inputArea = document.querySelector('.input-area');
  const characterContainer = document.getElementById('character-container');
  const characterSvg = characterContainer ? characterContainer.querySelector('svg') : null;
  const equipState = getEquippedParts();

  isJudging = true;

  if (isCorrect) {
    handleCorrectAnswer(); 
    stageState.correctCount += 1;
    inputArea.classList.add('input-area--correct');

    // [캐릭터 정답 리액션]
    if (characterSvg && equipState.head) {
      renderCharacterSvg(characterSvg, { ...equipState, expression: 'correct', animation: 'correct' });
    }

// [콤보 파티클 효과 연동] 
    // 조건: 3콤보 이상이면서 3의 배수일 때 (3, 6, 9 ...)
 try {
      console.log("현재 콤보:", currentCombo); // 디버깅 1

      if (currentCombo >= 3 && currentCombo % 3 === 0) {
        let equippedEffects = getEquippedEffect(); 
        console.log("가져온 장착 효과:", equippedEffects); // 디버깅 2
        
        if (typeof equippedEffects === 'string') {
          equippedEffects = [equippedEffects];
        }

        if (equippedEffects && equippedEffects.length > 0) {
          const randomEffectId = equippedEffects[Math.floor(Math.random() * equippedEffects.length)];
          console.log("선택된 효과 ID:", randomEffectId); // 디버깅 3
          
        // 수정 코드: characterContainer 껍데기 대신, 실제 형태를 가진 characterSvg를 타겟으로 넘김
          if (typeof spawnEffect === 'function' && characterSvg) {
            spawnEffect(characterSvg, randomEffectId);
          } else {
            console.log("spawnEffect 함수가 없거나 컨테이너를 못 찾음");
          }
        } else {
          console.log("장착된 효과 배열이 비어 있음");
        }
      }
    } catch (e) {
      console.error("파티클 생성 중 에러 발생:", e);
    }

    setTimeout(() => {
      inputArea.classList.remove('input-area--correct');
      // 복구 후 다음 문제로 진행
      if (characterSvg && equipState.head) {
        renderCharacterSvg(characterSvg, { ...equipState, expression: 'idle', animation: 'idle' });
      }
      resetInput();
      nextQuestion();
      isJudging = false;
    }, 600);

  } else {
    handleWrongAnswer(); 
    inputArea.classList.add('input-area--wrong');

    // [캐릭터 오답 리액션]
    if (characterSvg && equipState.head) {
      renderCharacterSvg(characterSvg, { ...equipState, expression: 'wrong', animation: 'wrong' });
    }

    setTimeout(() => {
      inputArea.classList.remove('input-area--wrong');
      // 복구 후 오답 모달 띄우기
      if (characterSvg && equipState.head) {
        renderCharacterSvg(characterSvg, { ...equipState, expression: 'idle', animation: 'idle' });
      }
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
   캐릭터 렌더링 및 이동
=========================== */

// 시계 UI를 가리지 않는 반응형 안전 구역 중심 좌표 (vh, vw 기준)
// 1. 좌상단 (시계 좌측 위) / 2. 우상단 (시계 우측 위)
// 3. 좌하단 (입력칸 좌측) / 4. 우하단 (입력칸 우측)
const SAFE_ZONES = [
  { top: 7, left: 5,  bottom: null, right: null },
  { top: 7, left: null, bottom: null, right: 5  },
  { top: null, left: 5,  bottom: 40, right: null },
  { top: null, left: null, bottom: 40, right: 5  }
];

function moveCharacterToRandomPosition() {
  const container = document.getElementById('character-container');
  if (!container || container.style.display === 'none') return;

  // 1. 안전 구역 중 하나를 무작위 선택
  const zone = SAFE_ZONES[Math.floor(Math.random() * SAFE_ZONES.length)];
  
  // 2. 중심점에서 -3 ~ +3 단위(vh/vw) 만큼 미세 무작위 오프셋 생성
  const randomOffsetX = (Math.random() * 6) - 3;
  const randomOffsetY = (Math.random() * 6) - 3;

  // 3. 0~360도 무작위 각도 생성
  const randomAngle = Math.floor(Math.random() * 361);

  // 4. 위치 적용 (값이 있는 속성에만 오프셋을 더해서 할당)
  container.style.top    = zone.top !== null    ? `${zone.top + randomOffsetY}vh` : 'auto';
  container.style.bottom = zone.bottom !== null ? `${zone.bottom + randomOffsetY}vh` : 'auto';
  container.style.left   = zone.left !== null   ? `${zone.left + randomOffsetX}vw` : 'auto';
  container.style.right  = zone.right !== null  ? `${zone.right + randomOffsetX}vw` : 'auto';
  
  container.style.transform = `rotate(${randomAngle}deg)`;
}


function initCharacter() {
  const container = document.getElementById('character-container');
  if (!container) return;

  const equipState = getEquippedParts();
  
  if (!equipState.head) {
    container.style.display = 'none';
    return;
  }

  const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svgEl.classList.add('ingame-character');
  svgEl.setAttribute('viewBox', '0 0 160 300');
  container.appendChild(svgEl);

  renderCharacterSvg(svgEl, {
    head: equipState.head,
    body: equipState.body,
    legs: equipState.legs,
    color: equipState.color,
    colorMix: equipState.colorMix,
    expression: 'idle'
  });
}

/* ===========================
   초기화
=========================== */

const _params = new URLSearchParams(location.search);
const _level  = parseInt(_params.get('level'), 10) || 1;

gold = getGold();
updateGoldDisplay();

prevBestStars = _level === 8 ? 0 : getClockBestStars(_level);
currentCombo = 0;
maxCombo     = 0;
updateComboDisplay();

initCharacter();
initStage(_level);
generateRandomTime(); // 여기서 최초의 위치(moveCharacterToRandomPosition)가 함께 호출됨
updateFocus();