// v0.1.0 : 최초 생성 - 레벨 데이터 및 shuffleArray (script.js에서 분리)
// v0.2.0 : Implement_Level rules Lv.1~Lv.5 buildPool 구현

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
      // 정각(분=0)과 30분, 1~12시 × 2 = 24가지
      const pool = [];
      for (let hour = 1; hour <= 12; hour++) {
        pool.push({ hour, minute: 0,  second: 0 });
        pool.push({ hour, minute: 30, second: 0 });
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
  { level: 6, totalQuestions: 10, fields: ['hour', 'minute', 'second'], buildPool: null }, // 추후 구현
  { level: 7, totalQuestions: 10, fields: ['hour', 'minute', 'second'], buildPool: null }, // 추후 구현
  { level: 8, totalQuestions: 10, fields: ['hour', 'minute', 'second'], buildPool: null }, // 추후 구현
];