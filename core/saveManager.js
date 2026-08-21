// v0.1.10
// Save Manager
// - localStorage 접근을 이 파일로 단일화 (Clock 진행/골드, 캐릭터 인벤토리/적용/이름/색상)
// - 저장 키: clockGame_save, character_save, character_equip_save, character_name_save, character_color_save
// - 디버그용 초기화/설정 함수 포함 (resetSave, resetCharacterSave 등)
// Public API (character_save 관련)
// - getCharacterSave(): 캐릭터 저장 데이터 반환 (없으면 기본값)
// - setCharacterSave(saveData): 캐릭터 저장 데이터 통째로 덮어쓰기
//
// Public API (character_equip_save 관련)
// - getEquippedParts(): 적용 상태 반환 (없으면 기본값)
// - setEquippedParts(equipData): 적용 상태 통째로 덮어쓰기
//
// Public API (character_name_save 관련)
// - getCharacterName(): 캐릭터 이름 반환 (없으면 null)
// - setCharacterName(name): 캐릭터 이름 저장
//
// Public API (character_color_save 관련)
// - getCharacterColorSave(): 색상 보유 수량 데이터 반환 (없으면 기본값)
// - setCharacterColorSave(saveData): 색상 보유 수량 데이터 통째로 덮어쓰기
//
// Public API (디버그 전용)
// - resetSave(): clockGame_save 전체 초기화 (골드 포함)
// - resetClockProgress(): Clock 진행 상태만 초기화 (골드 유지, 신규)
// - resetCharacterSave(): character_save + character_equip_save + character_name_save + character_color_save를 기본값으로 초기화
//
// Public API (Gold 관련)
// - spendGold(amount): 골드가 충분하면 차감 후 true, 부족하면 저장 없이 false
//
// Save Structure (character_save)
// { parts: { [category]: { [id]: number } } }  // 카테고리별 파츠 id → 보유 수량 (예: { head: { circle: 2 } })
//
// Save Structure (character_equip_save)
// { head: string | null, body: string | null, legs: string | null, color: string | null, colorMix: { patternId, colors } | null }
//
// Save Structure (character_name_save)
// string | null  // 캐릭터 이름 (설정 전에는 null)
//
// Save Structure (character_color_save)
// { colors: { [hex]: number } }  // 색상 hex → 보유 수량

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

  // 골드가 충분할 때만 차감하고 저장한다. 부족하면 차감/저장 없이 false 반환.
  function spendGold(amount) {
    const save = load();
    if (save.gold < amount) return false;
    save.gold -= amount;
    write(save);
    return true;
  }

  /* ===== 캐릭터 인벤토리 (공통) ===== */

  const CHARACTER_SAVE_KEY = 'character_save';

  function getDefaultCharacterSave() {
    return { parts: {} };
  }

  function loadCharacter() {
    try {
      const raw = localStorage.getItem(CHARACTER_SAVE_KEY);
      return raw ? JSON.parse(raw) : getDefaultCharacterSave();
    } catch {
      return getDefaultCharacterSave();
    }
  }

  function writeCharacter(saveData) {
    try {
      localStorage.setItem(CHARACTER_SAVE_KEY, JSON.stringify(saveData));
    } catch {
      console.warn('저장 실패: localStorage를 사용할 수 없습니다.');
    }
  }

  export function getCharacterSave() {
    return loadCharacter();
  }

  export function setCharacterSave(saveData) {
    writeCharacter(saveData);
    return saveData;
  }

  /* ===== 캐릭터 적용(equip) 상태 (공통) =====
     인벤토리(character_save)와 별도 키를 사용한다. 같은 키를 공유하면
     inventory.js가 { parts }만 통째로 덮어쓸 때 equip 정보가 함께
     지워질 수 있어, 서로 영향 없이 독립적으로 저장/갱신되도록 분리했다. */

  const CHARACTER_EQUIP_KEY = 'character_equip_save';

  function getDefaultEquip() {
    return {
      head: null, body: null, legs: null, color: null, colorMix: null,
    };
  }

  function loadEquip() {
    try {
      const raw = localStorage.getItem(CHARACTER_EQUIP_KEY);
      return raw ? JSON.parse(raw) : getDefaultEquip();
    } catch {
      return getDefaultEquip();
    }
  }

  function writeEquip(equipData) {
    try {
      localStorage.setItem(CHARACTER_EQUIP_KEY, JSON.stringify(equipData));
    } catch {
      console.warn('저장 실패: localStorage를 사용할 수 없습니다.');
    }
  }

  export function getEquippedParts() {
    return loadEquip();
  }

  export function setEquippedParts(equipData) {
    writeEquip(equipData);
    return equipData;
  }

  // 캐릭터 관련 저장(인벤토리 + 적용 상태 + 이름 + 색상)을 모두 기본값으로 되돌린다. (디버그 전용)
  export function resetCharacterSave() {
    writeCharacter(getDefaultCharacterSave());
    writeEquip(getDefaultEquip());
    writeCharacterName(getDefaultCharacterName());
    writeCharacterColor(getDefaultCharacterColorSave());
  }

  /* ===== 캐릭터 이름 (공통) =====
     인벤토리/적용 상태와 별도 키를 사용해, 어느 한쪽을 통째로 덮어써도 이름이
     함께 지워지지 않도록 분리했다. */

  const CHARACTER_NAME_KEY = 'character_name_save';

  function getDefaultCharacterName() {
    return null;
  }

  function loadCharacterName() {
    try {
      const raw = localStorage.getItem(CHARACTER_NAME_KEY);
      return raw ? JSON.parse(raw) : getDefaultCharacterName();
    } catch {
      return getDefaultCharacterName();
    }
  }

  function writeCharacterName(name) {
    try {
      localStorage.setItem(CHARACTER_NAME_KEY, JSON.stringify(name));
    } catch {
      console.warn('저장 실패: localStorage를 사용할 수 없습니다.');
    }
  }

  export function getCharacterName() {
    return loadCharacterName();
  }

  export function setCharacterName(name) {
    writeCharacterName(name);
    return name;
  }

  /* ===== 캐릭터 색상 인벤토리 (공통) =====
     파츠 인벤토리(character_save)와 구조가 같은 별도 키. 적용된 색상 자체는
     character_equip_save.color에 저장하고, 여기는 "보유 수량"만 다룬다. */

  const CHARACTER_COLOR_KEY = 'character_color_save';

  function getDefaultCharacterColorSave() {
    return { colors: {} };
  }

  function loadCharacterColor() {
    try {
      const raw = localStorage.getItem(CHARACTER_COLOR_KEY);
      return raw ? JSON.parse(raw) : getDefaultCharacterColorSave();
    } catch {
      return getDefaultCharacterColorSave();
    }
  }

  function writeCharacterColor(saveData) {
    try {
      localStorage.setItem(CHARACTER_COLOR_KEY, JSON.stringify(saveData));
    } catch {
      console.warn('저장 실패: localStorage를 사용할 수 없습니다.');
    }
  }

  export function getCharacterColorSave() {
    return loadCharacterColor();
  }

  export function setCharacterColorSave(saveData) {
    writeCharacterColor(saveData);
    return saveData;
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

  // Clock Game 진행 상태(단계 해금/별점)만 기본값으로 되돌리고 골드는 그대로 둔다.
  function resetClockProgress() {
    const save = load();
    const defaults = getDefaultSave();
    write({ ...defaults, gold: save.gold });
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
  spendGold,
  getClockBestStars,
  getClockCurrentStars,
  saveClockResult,
  resetSave,
  resetClockProgress,
  setGold,
  unlockAllClockLevels,
  setAllClockStars,
};