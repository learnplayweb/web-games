// v0.1.0 : 최초 생성 - setClock(hour, minute, second) 시계 바늘 회전 기능
// v0.1.1 : object 로드 타이밍 문제 수정 (contentDocument 즉시/지연 분기)
// v0.1.2 : SVG 내부 요소 null 오류 수정 - id 존재 여부로 파싱 완료 판단
// v0.1.3 : generateRandomTime() 추가 - 무작위 시각 생성 및 setClock 호출
// v0.1.4 : 키패드 입력 기능 추가 - 시/분/초 입력, 포커스 이동, 삭제

/**
 * SVG 내부 바늘 요소에 실제로 transform을 적용하는 내부 함수
 * setClock에서 SVG 로드 타이밍에 맞춰 호출된다.
 *
 * @param {Document} svgDoc     - object.contentDocument (SVG 내부 문서)
 * @param {number}   hourAngle   - 시침 회전 각도
 * @param {number}   minuteAngle - 분침 회전 각도
 * @param {number}   secondAngle - 초침 회전 각도
 */
function applyHands(svgDoc, hourAngle, minuteAngle, secondAngle) {
  // SVG id로 각 바늘 그룹 선택
  const hourHand   = svgDoc.getElementById('hour-hand');
  const minuteHand = svgDoc.getElementById('minute-hand');
  const secondHand = svgDoc.getElementById('second-hand');

  // 시계 중심(200,200) 기준으로 회전
  hourHand.setAttribute('transform',   `rotate(${hourAngle} 200 200)`);
  minuteHand.setAttribute('transform', `rotate(${minuteAngle} 200 200)`);
  secondHand.setAttribute('transform', `rotate(${secondAngle} 200 200)`);
}

/**
 * 시계 바늘을 지정한 시:분:초로 회전시키는 함수
 * - 시침: 시 + 분의 영향을 반영 (1분마다 0.5도씩 미세하게 이동)
 * - 분침: 분 + 초의 영향을 반영 (1초마다 0.1도씩 미세하게 이동)
 * - 초침: 초 단위로 6도씩 회전
 *
 * @param {number} hour   0~23
 * @param {number} minute 0~59
 * @param {number} second 0~59
 */
function setClock(hour, minute, second) {
  // 각도 계산
  const hourAngle   = (hour % 12) * 30 + minute * 0.5;  // 시침: 30도/시 + 0.5도/분
  const minuteAngle = minute * 6 + second * 0.1;         // 분침: 6도/분 + 0.1도/초
  const secondAngle = second * 6;                        // 초침: 6도/초

  const clockObject = document.getElementById('clock-object');

  // SVG 내부 요소까지 완전히 파싱됐는지 확인하는 함수
  // contentDocument만으로는 내부 요소가 없을 수 있어 id로 직접 검사
  function tryApply() {
    const doc = clockObject.contentDocument;
    if (doc && doc.getElementById('hour-hand')) {
      applyHands(doc, hourAngle, minuteAngle, secondAngle);
    } else {
      // 아직 준비 안 됐으면 load 이벤트 대기
      clockObject.addEventListener('load', () => {
        applyHands(clockObject.contentDocument, hourAngle, minuteAngle, secondAngle);
      });
    }
  }

  tryApply();
}

/**
 * 무작위 시각을 생성하여 setClock()에 전달하는 함수
 * - hour:   1~12
 * - minute: 0~59
 * - second: 0~59
 */
function generateRandomTime() {
  const hour   = Math.floor(Math.random() * 12) + 1;  // 1~12
  const minute = Math.floor(Math.random() * 60);       // 0~59
  const second = Math.floor(Math.random() * 60);       // 0~59
  setClock(hour, minute, second);
}

// 페이지 로드 시 한 번 실행
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
  userAnswer: null,
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
 * 입력값 제출 처리
 * - 입력된 시/분/초를 숫자로 변환하여 userAnswer에 저장
 * - 정답 판정은 추후 구현 예정
 */
function submitAnswer() {
  inputState.userAnswer = {
    hour:   parseInt(inputState.values[0], 10) || 0,
    minute: parseInt(inputState.values[1], 10) || 0,
    second: parseInt(inputState.values[2], 10) || 0,
  };
  console.log('제출된 답:', inputState.userAnswer); // 추후 정답 판정 연동
}

/**
 * 키패드 이벤트 바인딩
 * - keypad-area 내 버튼 클릭을 data-key 속성으로 처리
 * - 이벤트 위임으로 버튼 하나하나에 리스너를 붙이지 않는다
 */
document.querySelector('.keypad-area').addEventListener('click', (e) => {
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