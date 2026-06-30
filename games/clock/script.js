// v0.1.0 : 최초 생성 - setClock(hour, minute, second) 시계 바늘 회전 기능

/**
 * 시계 바늘을 지정한 시:분:초로 회전시키는 함수
 * - 시침: 시 + 분의 영향을 반영 (1분마다 0.5도씩 미세하게 이동)
 * - 분침: 분 + 초의 영향을 반영 (1초마다 0.1도씩 미세하게 이동)
 * - 초침: 초 단위로 6도씩 회전
 *
 * @param {number} hour   0~23 (12시간제로 환산하여 계산)
 * @param {number} minute 0~59
 * @param {number} second 0~59
 */
function setClock(hour, minute, second) {
  // object 태그 내부의 SVG 문서에 접근
  const clockObject = document.getElementById('clock-object');
  const svgDoc = clockObject.contentDocument;

  // SVG가 아직 로드되지 않았다면 로드 완료 후 다시 시도
  if (!svgDoc) {
    clockObject.addEventListener('load', () => setClock(hour, minute, second));
    return;
  }

  // SVG 내부의 바늘 그룹(<g>) 요소를 id로 선택
  const hourHand = svgDoc.getElementById('hour-hand');
  const minuteHand = svgDoc.getElementById('minute-hand');
  const secondHand = svgDoc.getElementById('second-hand');

  // 시침 각도: 한 시간(360/12=30도) + 분에 따른 미세 이동(분당 0.5도)
  const hourAngle = (hour % 12) * 30 + minute * 0.5;

  // 분침 각도: 1분=6도 + 초에 따른 미세 이동(초당 0.1도)
  const minuteAngle = minute * 6 + second * 0.1;

  // 초침 각도: 1초=6도
  const secondAngle = second * 6;

  // transform="rotate(각도 중심x 중심y)" 형태로 시계 중심(200,200) 기준 회전
  hourHand.setAttribute('transform', `rotate(${hourAngle} 200 200)`);
  minuteHand.setAttribute('transform', `rotate(${minuteAngle} 200 200)`);
  secondHand.setAttribute('transform', `rotate(${secondAngle} 200 200)`);
}

// 동작 확인용 호출: 7시 9분 2초
setClock(7, 9, 2);