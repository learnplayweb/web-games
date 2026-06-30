// v0.1.0 : 최초 생성 - setClock(hour, minute, second) 시계 바늘 회전 기능
// v0.1.1 : object 로드 타이밍 문제 수정 (contentDocument 즉시/지연 분기)

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

  // SVG가 이미 로드된 경우 즉시 실행
  // 아직 로드 중인 경우 load 이벤트 대기 후 실행
  if (clockObject.contentDocument) {
    applyHands(clockObject.contentDocument, hourAngle, minuteAngle, secondAngle);
  } else {
    clockObject.addEventListener('load', () => {
      applyHands(clockObject.contentDocument, hourAngle, minuteAngle, secondAngle);
    });
  }
}

// 동작 확인용 호출: 7시 9분 2초
setClock(7, 9, 2);