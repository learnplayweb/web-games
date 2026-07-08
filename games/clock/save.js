// v0.1.0 : 최초 생성 - 저장 시스템 (script.js에서 분리)
// 의존: data/levels.js (LEVELS.length 참조)
// v0.1.1 : Lv.8 별점 저장 제외 (마지막 단계 예외 처리)

const SAVE_KEY = 'clockGame_save'; // localStorage 키

/**
 * 기본 저장 데이터를 반환한다.
 * - Lv.1만 해금, Gold 0, 모든 최고 별점 없음(0)
 */
function getDefaultSave() {
  return {
    gold:          0,
    unlockedLevel: 1,                   // 해금된 최고 레벨
    bestStars:     new Array(8).fill(0), // 인덱스 0 = Lv.1, ..., 인덱스 7 = Lv.8
  };
}

/**
 * localStorage에서 저장 데이터를 불러온다.
 * 저장 데이터가 없으면 기본 데이터를 반환한다.
 *
 * @returns {Object} 저장 데이터
 */
function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : getDefaultSave();
  } catch {
    return getDefaultSave();
  }
}

/**
 * 저장 데이터를 localStorage에 기록한다.
 *
 * @param {Object} saveData - 저장할 데이터
 */
function writeSave(saveData) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
  } catch {
    console.warn('저장 실패: localStorage를 사용할 수 없습니다.');
  }
}

/**
 * 단계 종료 시 저장 데이터를 갱신한다.
 * - 최고 별점: 기존보다 높을 때만 갱신
 * - Gold: 총 획득 Gold를 누적
 * - 단계 해금: ★★ 이상이면 다음 단계 해금
 *
 * @param {number} level      - 완료한 레벨 번호
 * @param {number} stars      - 이번 플레이 별점 (0~3)
 * @param {number} goldEarned - 이번 플레이 총 획득 Gold
 * @returns {Object} 갱신된 저장 데이터
 */
function saveResult(level, stars, goldEarned) {
  const save = loadSave();

  // 최고 별점 갱신 (더 높을 때만, Lv.8은 마지막 단계이므로 저장하지 않음)
  if (level !== 8 && stars > save.bestStars[level - 1]) {
    save.bestStars[level - 1] = stars;
  }

  // Gold 누적
  save.gold += goldEarned;

  // 단계 해금: ★★ 이상이고 다음 레벨이 존재하면 해금
  if (stars >= 2 && level < LEVELS.length) {
    const nextLevel = level + 1;
    if (nextLevel > save.unlockedLevel) {
      save.unlockedLevel = nextLevel;
    }
  }

  writeSave(save);
  return save;
}