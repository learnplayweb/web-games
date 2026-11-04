// core v0.2.0 : 맞춤법 전체 단계 해금(unlockAllSpellingStages)·초기화(resetSpelling) 추가
// 의존: core/saveManager.js (SaveManager)
// 정식 게임 로직에는 관여하지 않음. 배포 시 이 파일 + 이 파일을 로드하는 <script> 태그만 제거하면 됨.

import {
  resetSave,
  resetClockProgress,
  resetCharacterSave,
  resetGameSave,
  setAllStageStars,
  setAllClockStars as saveAllClockStars,
  setGold,
  unlockAllClockLevels as unlockClockLevels,
} from './saveManager.js';

  const CLOCK_TOTAL_LEVELS = 8; // Clock Game 전체 단계 수

  // saveManager의 일반 게임 공통 저장(getStageBestStars 등)을 쓰는 게임 id 목록. 새 게임을 추가하면 여기에 id를 추가한다.
  const GENERIC_GAME_IDS = ['spelling'];

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

  // 맞춤법 게임 저장 데이터(마당 별점, 달인 마당 별점, 무한 마당 최근 기록) 초기화. 골드는 유지한다.
  function resetSpelling() {
    resetGameSave('spelling');
  }

  // 맞춤법 전체 단계 해금: 해금이 "별점 3점" 조건이므로 일반 마당·달인 마당 별점을 모두 3점으로 설정한다.
  // (달인 마당 해금 = 묶인 일반 마당 모두 3점, 무한 마당 해금 = 모든 달인 마당 3점)
  // 마당 목록은 게임 데이터에서 읽으므로 마당이 늘어도 자동 반영된다. 게임 데이터는 호출할 때만 동적으로 불러온다.
  async function unlockAllSpellingStages() {
    const { STAGES } = await import('../games/spelling/data/stages.js');
    setAllStageStars('spelling', STAGES.filter((stage) => stage.type === 'normal').map((stage) => stage.topic), 3, 'normal');
    setAllStageStars('spelling', STAGES.filter((stage) => stage.type === 'review').map((stage) => stage.level), 3, 'review-monthly');
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
    GENERIC_GAME_IDS.forEach(resetGameSave); // 일반 게임 공통 저장 (맞춤법 등)
  }

export {
  resetClock, grantMaxGold, unlockAllClockLevels, setAllClockStars, resetCharacter, resetAll,
  resetSpelling, unlockAllSpellingStages,
};