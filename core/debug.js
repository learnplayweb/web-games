// v0.1.0 : 최초 생성 - 개발용 디버그 기능 (SaveManager 경유)
// v0.1.1 : Implement - resetCharacter() 추가 (캐릭터샵 인벤토리/적용 상태 초기화)
// v0.1.2 : Update - resetAll()의 성격 변경: Clock Game 전용 초기화 함수는
//          resetClock()으로 이름 변경(골드 유지, 진행 상태만 초기화).
//          resetAll()은 골드+캐릭터샵+모든 게임 저장 데이터를 초기화하는
//          전역 초기화로 재정의 (추후 도움말 메뉴 등 사용자 노출 가능성 있음).
// 의존: core/saveManager.js (SaveManager)
// 정식 게임 로직에는 관여하지 않음. 배포 시 이 파일 + 이 파일을 로드하는 <script> 태그만 제거하면 됨.

import {
  resetSave,
  resetClockProgress,
  resetCharacterSave,
  setAllClockStars as saveAllClockStars,
  setGold,
  unlockAllClockLevels as unlockClockLevels,
} from './saveManager.js';

  const CLOCK_TOTAL_LEVELS = 8; // Clock Game 전체 단계 수

  // Clock Game 진행 상태(단계 해금/별점)만 초기화. 골드는 그대로 유지한다.
  function resetClock() {
    resetClockProgress();
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

  // 캐릭터샵 저장 데이터(인벤토리 + 적용 상태) 초기화
  function resetCharacter() {
    resetCharacterSave();
  }

  // 골드 + 캐릭터샵 + 모든 게임(향후 추가되는 게임 포함) 저장 데이터를 초기화한다.
  // 새 게임이 추가되면 그 게임의 초기화 함수를 이 안에 함께 호출하도록 확장한다.
  function resetAll() {
    resetSave(); // Clock Game 전체 (골드 포함)
    resetCharacterSave(); // 캐릭터샵 인벤토리 + 적용 상태
    // TODO: 신규 게임 추가 시 해당 게임의 초기화 함수 호출 추가
  }

export {
  resetClock, grantMaxGold, unlockAllClockLevels, setAllClockStars, resetCharacter, resetAll,
};