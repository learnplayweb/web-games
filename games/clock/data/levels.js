// v0.1.0 : 최초 생성 - 레벨 데이터 및 shuffleArray (script.js에서 분리)
// v0.2.0 : Implement_Level rules Lv.1~Lv.5 buildPool 구현
// v0.3.0 : Implement_Time calculation levels Lv.6~Lv.8
// v0.3.1 : Polish_Unified sign for Lv.7~8, expression format with leading sign + space

/**
 * 배열을 무작위로 섞는 함수 (Fisher-Yates 알고리즘)
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
 * - fields:         판정에 사용할 입력 필드 ('hour', 'minute', 'second')
 * - buildPool():    출제 가능한 전체 문제 목록 배열 반환
 *                   Lv.6~Lv.8은 추후 구현
 */
const LEVELS = [
  {
    level: 1,
    totalQuestions: 5,
    fields: ['hour'],
    buildPool() {
      // 1시~12시, 분·초 고정 0
      const pool = [];
      for (let hour = 1; hour <= 12; hour++) {
        pool.push({ hour, minute: 0, second: 0 });
      }
      return pool;
    },
  },
  {
    level: 2,
    totalQuestions: 10,
    fields: ['hour', 'minute'],
    buildPool() {
      // 15분 단위(15, 30, 45분), 정각 제외, 1~12시 × 3 = 36가지
      const pool = [];
      for (let hour = 1; hour <= 12; hour++) {
        for (const minute of [15, 30, 45]) {
          pool.push({ hour, minute, second: 0 });
        }
      }
      return pool;
    },
  },
  {
    level: 3,
    totalQuestions: 10,
    fields: ['hour', 'minute'],
    buildPool() {
      // 5분 단위(0,5,10,...,55), 1~12시 × 12 = 144가지
      const pool = [];
      for (let hour = 1; hour <= 12; hour++) {
        for (let minute = 0; minute < 60; minute += 5) {
          pool.push({ hour, minute, second: 0 });
        }
      }
      return pool;
    },
  },
  {
    level: 4,
    totalQuestions: 10,
    fields: ['hour', 'minute'],
    buildPool() {
      // 모든 분(0~59), 1~12시 × 60 = 720가지
      const pool = [];
      for (let hour = 1; hour <= 12; hour++) {
        for (let minute = 0; minute < 60; minute++) {
          pool.push({ hour, minute, second: 0 });
        }
      }
      return pool;
    },
  },
  {
    level: 5,
    totalQuestions: 10,
    fields: ['hour', 'minute', 'second'],
    buildPool() {
      // 모든 시·분·초 조합, 1~12시 × 60분 × 60초 = 43200가지
      // 전체를 배열로 만들면 너무 크므로 무작위 샘플링으로 대체
      const pool = [];
      const used = new Set();
      while (pool.length < 50) { // 충분한 후보 생성 후 앞 10개 사용
        const hour   = Math.floor(Math.random() * 12) + 1;
        const minute = Math.floor(Math.random() * 60);
        const second = Math.floor(Math.random() * 60);
        const key    = `${hour}-${minute}-${second}`;
        if (!used.has(key)) {
          used.add(key);
          pool.push({ hour, minute, second });
        }
      }
      return pool;
    },
  },
  { level: 6, totalQuestions: 10, fields: ['hour', 'minute', 'second'], buildPool() { return buildCalcPool(6); } },
  { level: 7, totalQuestions: 10, fields: ['hour', 'minute', 'second'], buildPool() { return buildCalcPool(7); } },
  { level: 8, totalQuestions: 10, fields: ['hour', 'minute', 'second'], buildPool() { return buildCalcPool(8); } },
];
/* ===========================
   시간 계산 헬퍼 함수 (Lv.6~8)
=========================== */

/**
 * 시각(시,분,초)에 델타(dh,dm,ds)를 더한 결과를 12시간제로 반환한다.
 * - 초→분 올림/내림, 분→시 올림/내림 처리 포함
 * - 12시간제: 1~12 순환
 */
function addTime(hour, minute, second, dh, dm, ds) {
  let s = second + ds;
  let m = minute + dm;
  let h = hour   + dh;

  m += Math.floor(s / 60);
  s  = ((s % 60) + 60) % 60;

  h += Math.floor(m / 60);
  m  = ((m % 60) + 60) % 60;

  h = ((h - 1) % 12 + 12) % 12 + 1;

  return { hour: h, minute: m, second: s };
}

/**
 * 델타값으로 계산식 텍스트를 만든다.
 * - 부호는 맨 앞에 한 번만 표시하고 그 뒤에 공백을 추가한다.
 * - 단위들은 모두 같은 방향(부호 통일)임을 전제로 한다.
 * 예) "+ 2시간 30분", "- 35분 15초", "+ 1시간 20분 15초"
 *
 * @param {number} dh - 시간 델타 (부호 통일된 값)
 * @param {number} dm - 분 델타
 * @param {number} ds - 초 델타
 */
function makeExpression(dh, dm, ds) {
  // 사용된 델타 중 하나로 부호 결정 (모두 같은 방향이므로 첫 번째 비영값 사용)
  const sign = (dh || dm || ds) > 0 ? '+ ' : '- ';

  const parts = [];
  if (dh !== 0) parts.push(`${Math.abs(dh)}시간`);
  if (dm !== 0) parts.push(`${Math.abs(dm)}분`);
  if (ds !== 0) parts.push(`${Math.abs(ds)}초`);

  return sign + parts.join(' ');
}

/**
 * 레벨별 계산 문제 pool을 생성한다.
 * 각 문제: { hour, minute, second, baseHour, baseMinute, baseSecond, expression }
 * - hour/minute/second: 정답(계산 결과)
 * - base*: 시계에 표시할 기준 시각
 * - expression: 화면에 표시할 계산식
 *
 * Lv.7·8: 여러 단위를 하나의 연산으로 표시하기 위해 부호를 통일한다.
 * (예: + 2시간 30분 / - 35분 15초. 단위별로 다른 부호는 사용하지 않는다.)
 */
function buildCalcPool(level) {
  const pool = [];
  const used = new Set();

  const hourMags   = [1,2,3,4,5];
  const minuteMags = [5,10,15,25,35,45,55];
  const secondMags = [5,10,15,25,35,45,55];

  const baseHours   = [1,2,3,4,5,6,7,8,9,10,11,12];
  const baseMinutes = [0,5,10,15,20,25,30,35,40,45,50,55];
  const baseSeconds = [0,5,10,15,20,25,30,35,40,45,50,55];

  // 레벨별 사용 단위 조합 [useHour, useMinute, useSecond]
  const combos = {
    6: [[true,false,false],[false,true,false],[false,false,true]],
    7: [[true,true,false],[true,false,true],[false,true,true]],
    8: [[true,true,true]],
  };

  const rand    = arr => arr[Math.floor(Math.random() * arr.length)];
  const randSign = ()  => Math.random() < 0.5 ? 1 : -1;

  while (pool.length < 50) {
    const [useH, useM, useS] = rand(combos[level]);

    const bh = rand(baseHours);
    const bm = (useM || useS) ? rand(baseMinutes) : 0;
    const bs = useS            ? rand(baseSeconds)  : 0;

    // Lv.7·8: 부호를 하나로 통일 (모든 단위에 같은 부호 적용)
    const sign = level === 6 ? randSign() : randSign();
    const dh = useH ? sign * rand(hourMags)   : 0;
    const dm = useM ? sign * rand(minuteMags) : 0;
    const ds = useS ? sign * rand(secondMags) : 0;

    const key = `${bh}-${bm}-${bs}-${dh}-${dm}-${ds}`;
    if (used.has(key)) continue;
    used.add(key);

    const result = addTime(bh, bm, bs, dh, dm, ds);

    pool.push({
      hour:       result.hour,
      minute:     result.minute,
      second:     result.second,
      baseHour:   bh,
      baseMinute: bm,
      baseSecond: bs,
      expression: makeExpression(dh, dm, ds),
    });
  }

  return pool;
}