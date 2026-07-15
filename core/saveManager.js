// v0.1.0 : 최초 생성 - Clock Game의 save.js 저장 기능을 이전, LocalStorage 접근 단일화
// v0.1.1 : Add_디버그용 함수(resetSave, setGold, unlockAllClockLevels, setAllClockStars) 추가
// 의존: 없음 (LocalStorage 직접 접근은 이 파일에서만 수행)
// 기존 저장 데이터(clockGame_save) 구조/키를 그대로 유지하여 호환성 보장
// 향후 다른 게임/캐릭터 시스템 저장 기능 추가 시 이 파일에 함수를 확장한다.

  const SAVE_KEY = 'clockGame_save'; // localStorage 키 (기존 키 유지)

  // 기본 저장 데이터 (기존 save.js getDefaultSave와 동일 구조)
  function getDefaultSave() {
    return {
      gold:          0,
      unlockedLevel: 1,
      bestStars:     new Array(8).fill(0), // Clock Game 단계별 최고 별점
      currentStars:  0,                    // Clock Game Lv.8 최근 플레이 별점
    };
  }

function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      return raw ? JSON.parse(raw) : getDefaultSave();
    } catch {
      return getDefaultSave();
    }
}

export function getClockSave() {
  return load();
}

  function write(saveData) {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
    } catch {
      console.warn('저장 실패: localStorage를 사용할 수 없습니다.');
    }
  }

  /* ===== Gold (공통) ===== */

  function getGold() {
    return load().gold;
  }

  // 골드 즉시 추가 저장 (게임 중 문제당 지급 등)
  function addGold(amount) {
    const save = load();
    save.gold += amount;
    write(save);
    return save.gold;
  }

  /* ===== Clock Game 전용 ===== */

  function getClockBestStars(level) {
    return load().bestStars[level - 1] ?? 0;
  }

  function getClockCurrentStars() {
    return load().currentStars ?? 0;
  }

  // 단계 종료 시 최고 별점 / 최근 별점(Lv.8) / 골드 누적 / 단계 해금을 한 번에 처리
  // totalLevels: 다음 단계 해금 판정을 위한 전체 레벨 수 (script.js에서 LEVELS.length 전달)
  function saveClockResult(level, stars, goldEarned, totalLevels) {
    const save = load();

    if (level !== 8 && stars > save.bestStars[level - 1]) {
      save.bestStars[level - 1] = stars;
    }

    if (level === 8) {
      save.currentStars = stars; // 최고값 비교 없이 항상 덮어씀
    }

    save.gold += goldEarned;

    if (stars >= 2 && level < totalLevels) {
      const nextLevel = level + 1;
      if (nextLevel > save.unlockedLevel) {
        save.unlockedLevel = nextLevel;
      }
    }

    write(save);
    return save;
  }

  /* ===== 디버그 전용 (core/debug.js에서만 사용) ===== */

  function resetSave() {
    write(getDefaultSave());
  }

  function setGold(amount) {
    const save = load();
    save.gold = amount;
    write(save);
    return save.gold;
  }

  function unlockAllClockLevels(totalLevels) {
    const save = load();
    save.unlockedLevel = totalLevels;
    write(save);
    return save;
  }

  // Lv.1~(totalLevels-1)은 bestStars, 마지막 단계는 currentStars까지 함께 설정
  function setAllClockStars(stars, totalLevels) {
    const save = load();
    for (let i = 0; i < totalLevels - 1; i++) {
      save.bestStars[i] = stars;
    }
    save.currentStars = stars;
    write(save);
    return save;
  }

export {
  getGold,
  addGold,
  getClockBestStars,
  getClockCurrentStars,
  saveClockResult,
  resetSave,
  setGold,
  unlockAllClockLevels,
  setAllClockStars,
};
