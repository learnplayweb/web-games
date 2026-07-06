// v0.1.0 : 최초 생성 - 레벨 데이터 및 shuffleArray (script.js에서 분리)

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