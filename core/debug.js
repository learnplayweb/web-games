// v0.1.0 : 최초 생성 - 개발용 디버그 기능 (SaveManager 경유)
// 의존: core/saveManager.js (SaveManager)
// 정식 게임 로직에는 관여하지 않음. 배포 시 이 파일 + 이 파일을 로드하는 <script> 태그만 제거하면 됨.

import {
  resetSave,
  setAllClockStars as saveAllClockStars,
  setGold,
  unlockAllClockLevels as unlockClockLevels,
} from './saveManager.js';

  const CLOCK_TOTAL_LEVELS = 8; // Clock Game 전체 단계 수

  // 전체 저장 데이터 초기화 (기본값으로 되돌림)
  function resetAll() {
    resetSave();
  }

  // Gold를 99999로 즉시 설정
  function grantMaxGold() {
    setGold(99999);
  }

  // Clock Game 전 단계 해금
  function unlockAllClockLevels() {
    unlockClockLevels(CLOCK_TOTAL_LEVELS);
  }

  // Clock Game 전 단계 별점을 stars(1~3)로 일괄 설정
  function setAllClockStars(stars) {
    saveAllClockStars(stars, CLOCK_TOTAL_LEVELS);
  }

export { resetAll, grantMaxGold, unlockAllClockLevels, setAllClockStars };
