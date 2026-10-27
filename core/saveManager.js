// v0.7.0 : Update_공용 지갑(Gold)을 wallet_save 키로 분리 (구버전 clockGame_save.gold(26.11월 삭제할 것)에서 자동 복사, 원본은 백업으로 유지)
// 
// Save Manager
// - localStorage 접근을 이 파일로 단일화 (공용 지갑, Clock 진행, 캐릭터 인벤토리/적용/이름/색상, 맞춤법 게임 진행)
// - 저장 키: wallet_save, clockGame_save, character_save, character_equip_save, character_name_save, character_color_save,
//            character_effect_save, spellingGame_save, 새 게임은 {게임id}Game_save (일반 게임 공통 저장)
// - Gold는 게임 공용 지갑(wallet_save)을 사용한다 (모든 게임이 여기 적립/차감). 게임 코드는 getGold/addGold/spendGold만 쓴다
//   (예전에는 clockGame_save.gold에 있었으며, 처음 실행할 때 wallet_save로 자동 복사된다. 구버전 필드는 삭제하지 않고 백업으로 남긴다)
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
// Public API (character_effect_save 관련)
// - getCharacterEffectSave(): 효과 보유 상태 반환 (없으면 기본값)
// - setCharacterEffectSave(saveData): 효과 보유 상태 통째로 덮어쓰기
//
// Public API (맞춤법 게임 관련)
// - getSpellingBestStars(topic): 해당 주제(마당)의 최고 별점 반환 (없으면 0)
// - saveSpellingResult(topic, stars, goldEarned): 마당 정상 완료 시 1회 호출.
//   최고 별점 갱신 + Gold를 공용 지갑에 적립을 한 번에 처리 (게임 중간엔 호출하지 않음)
// - getSpellingReviewBestStars(level): 해당 달인 마당(level)의 이번 기간 최고 별점 반환 (없거나 초기화됐으면 0)
// - saveSpellingReviewResult(level, stars, goldEarned): 달인 마당 정상 완료 시 1회 호출.
//   해당 level의 최고 별점 갱신(더 높을 때만) + Gold를 공용 지갑에 적립. 달인 마당 별점은 매달 1일 자동 초기화
// - checkSpellingPeriodReset(): 달인 마당 별점 월 초기화 여부를 확인해 필요하면 초기화 (메인 화면 접속 시 1회 호출용)
//
// Public API (일반 게임 공통 — 새 게임은 saveManager에 함수를 추가하지 않고 이 함수들을 사용)
// - 게임id: 영문 소문자로 시작하는 영문/숫자 (저장 키 {게임id}Game_save). 'clock'은 전용 저장 구조라 사용 불가
// - getStageBestStars(gameId, stageKey): 일반 단계 최고 별점 (없으면 0, 초기화 없음)
// - getStageReviewBestStars(gameId, stageKey): 복습 단계 규칙 B(월별 초기화) 최고 별점 (없거나 초기화됐으면 0)
// - getStageRecentStars(gameId, stageKey): 복습 단계 규칙 A(매번 덮어씀) 최근 별점 (없으면 0)
// - saveStageResult(gameId, stageKey, stars, goldEarned, kind): 단계 정상 완료 시 1회 호출. 별점 저장 + Gold를 공용 지갑에 적립
//   kind: 'normal'(최고 별점, 기본) | 'review-monthly'(규칙 B: 월별 초기화 최고 별점) | 'review-recent'(규칙 A: 최근 별점)
//   반환: { stars: 저장된 별점, gold: 적립 후 보유 Gold }
// - checkGamePeriodReset(gameId): 월별 초기화 여부를 확인해 필요하면 초기화 (메인 화면 접속 시 1회 호출용)
// - resetGameSave(gameId): 해당 게임 저장 데이터 초기화 (디버그 전용)
//
// Public API (디버그 전용)
// - resetSave(): clockGame_save 전체 + 공용 지갑(골드) 초기화
// - resetClockProgress(): Clock 진행 상태만 초기화 (골드 유지)
// - resetCharacterSave(): character_save + character_equip_save + character_name_save + character_color_save를 기본값으로 초기화
//
// Public API (Gold 관련)
// - getGold(), addGold(amount): 공용 지갑 조회 / 추가
// - spendGold(amount): 골드가 충분하면 차감 후 true, 부족하면 저장 없이 false
//
// Save Structure (wallet_save)
// { gold: number }  // 공용 지갑. 없으면 clockGame_save.gold(구버전 위치)에서 복사해 생성
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
//
// Save Structure (spellingGame_save)
// { bestStars: { [topic]: number }, reviewBestStars: { [level]: number }, recentStars: { [key]: number }, reviewPeriod: 'YYYY-MM' }
//   (일반 게임 공통 저장도 같은 구조. recentStars는 복습 단계 규칙 A에서만 사용되며 없으면 빈 객체로 보정)
//   bestStars: 일반 마당 주제별 최고 별점(0~3, 초기화 없음)
//   reviewBestStars: 달인 마당 level별 최고 별점. reviewPeriod(마지막 초기화 연월)가 현재 연월과 다르면 비움

  const SAVE_KEY = 'clockGame_save'; // localStorage 키 (기존 키 유지)

  // 기본 저장 데이터 (Clock Game 진행 상태. 골드는 공용 지갑 wallet_save로 분리됨)
  function getDefaultSave() {
    return {
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

// Clock 진행 상태 반환. 구버전 호환을 위해 gold는 공용 지갑 값으로 채워서 돌려준다.
export function getClockSave() {
  return { ...load(), gold: getGold() };
}

  function write(saveData) {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
    } catch {
      console.warn('저장 실패: localStorage를 사용할 수 없습니다.');
    }
  }

  /* ===== Gold (공통) — 공용 지갑 wallet_save =====
     예전에는 골드가 clockGame_save.gold에 들어 있었다. 처음 지갑을 읽을 때 그 값을 wallet_save로 복사한다.
     - 복사만 하고 clockGame_save의 gold 필드는 지우지 않는다 (문제 시 되돌릴 백업. 이후엔 갱신되지 않음)
     - wallet_save가 한 번 만들어지면 그 값만 사용한다 (골드가 0이어도 구버전 값으로 되돌아가지 않음) */

  const WALLET_KEY = 'wallet_save';

  function getDefaultWallet() {
    return { gold: 0 };
  }

  // 구버전 위치(clockGame_save.gold)의 골드. 없거나 숫자가 아니면 null  1. 여기부터
  function readLegacyGold() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const gold = JSON.parse(raw)?.gold;
      return Number.isFinite(gold) ? gold : null;
    } catch {
      return null;
    }
  }
  // 여기까지 삭제하고 2. loadWallet() 

  function writeWallet(wallet) {
    try {
      localStorage.setItem(WALLET_KEY, JSON.stringify(wallet));
    } catch {
      console.warn('저장 실패: localStorage를 사용할 수 없습니다.');
    }
  }

  function loadWallet() {
    try {
      const raw = localStorage.getItem(WALLET_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (data && Number.isFinite(data.gold)) return { gold: data.gold };
      }
    } catch {
      // 지갑 데이터가 깨졌으면 아래에서 구버전 값으로 복구 또는 0으로 시작
    }

    // 지갑이 아직 없거나 깨진 경우: 구버전 골드를 복사 (구버전 데이터가 없는 새 사용자는 저장 없이 0으로 시작) 2. 여기부터
    const legacyGold = readLegacyGold();
    if (legacyGold === null) return getDefaultWallet();

    const wallet = { gold: legacyGold };
    writeWallet(wallet);
    return wallet;
  // 여기까지 삭제하고 return getDefaultWallet(); 추가할 것. 3. resetClockProgress()의 한 줄 삭제
  }

  function getGold() {
    return loadWallet().gold;
  }

  // 골드 즉시 추가 저장 (게임 중 문제당 지급 등). 추가 후 보유 골드를 반환
  function addGold(amount) {
    const wallet = loadWallet();
    wallet.gold += amount;
    writeWallet(wallet);
    return wallet.gold;
  }

  // 골드가 충분할 때만 차감하고 저장한다. 부족하면 차감/저장 없이 false 반환.
  function spendGold(amount) {
    const wallet = loadWallet();
    if (wallet.gold < amount) return false;
    wallet.gold -= amount;
    writeWallet(wallet);
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
      effect: null // 새로 추가된 효과 슬롯
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

  // 캐릭터 관련 저장(인벤토리 + 적용 상태 + 이름 + 색상 + 효과)을 모두 기본값으로 되돌린다. (디버그 전용)
  export function resetCharacterSave() {
    writeCharacter(getDefaultCharacterSave());
    writeEquip(getDefaultEquip());
    writeCharacterName(getDefaultCharacterName());
    writeCharacterColor(getDefaultCharacterColorSave());
    writeCharacterEffect(getDefaultCharacterEffectSave());
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

  /* ===== 캐릭터 효과 인벤토리 (공통)  ===== */
  const CHARACTER_EFFECT_KEY = 'character_effect_save';

  function getDefaultCharacterEffectSave() {
    return { effects: {} }; // id: boolean (보유 여부)
  }

  function loadCharacterEffect() {
    try {
      const raw = localStorage.getItem(CHARACTER_EFFECT_KEY);
      return raw ? JSON.parse(raw) : getDefaultCharacterEffectSave();
    } catch {
      return getDefaultCharacterEffectSave();
    }
  }

  function writeCharacterEffect(saveData) {
    try {
      localStorage.setItem(CHARACTER_EFFECT_KEY, JSON.stringify(saveData));
    } catch {
      console.warn('저장 실패: localStorage를 사용할 수 없습니다.');
    }
  }

  function getCharacterEffectSave() {
    return loadCharacterEffect();
  }

  function setCharacterEffectSave(saveData) {
    writeCharacterEffect(saveData);
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

    const gold = addGold(goldEarned); // 골드는 공용 지갑에 적립

    if (stars >= 2 && level < totalLevels) {
      const nextLevel = level + 1;
      if (nextLevel > save.unlockedLevel) {
        save.unlockedLevel = nextLevel;
      }
    }

    write(save);
    return { ...save, gold }; // 구버전 호환: 반환값에 적립 후 골드 포함
  }

  /* ===== 일반 게임 공통 저장 (맞춤법 + 새 게임) =====
     게임별 저장 키: `${gameId}Game_save` (맞춤법은 기존 키 spellingGame_save 그대로).
     Gold는 모든 게임이 같이 쓰는 공용 지갑(wallet_save)에 적립한다.
     진행 중(문제 풀이 중) 임시 데이터는 script.js 안의 메모리 변수로만 관리되고,
     이 저장 함수는 단계를 정상적으로 완료했을 때 finishStage()에서 딱 한 번만 호출된다.
     → 새로고침/중도 이탈 시엔 이 함수가 호출된 적이 없으므로 보상이 저장되지 않는다.

     저장 구조: { bestStars, reviewBestStars, recentStars, reviewPeriod }
     - bestStars:       일반 단계 최고 별점 (초기화 없음)
     - reviewBestStars: 복습 단계 규칙 B 최고 별점 (reviewPeriod가 현재 연월과 다르면 비움)
     - recentStars:     복습 단계 규칙 A 최근 별점 (매 플레이 덮어씀) */

  // clockGame_save는 골드·해금·배열 별점이 들어 있는 전용 구조라 일반 저장으로 쓰면 데이터가 깨진다.
  const RESERVED_GAME_IDS = ['clock'];

  function isValidGameId(gameId) {
    const valid = typeof gameId === 'string'
      && /^[a-z][A-Za-z0-9]*$/.test(gameId)
      && !RESERVED_GAME_IDS.includes(gameId);
    if (!valid) console.error(`잘못된 게임 id: ${gameId} (영문 소문자로 시작하는 영문/숫자, ${RESERVED_GAME_IDS.join('/')} 제외)`);
    return valid;
  }

  function gameSaveKey(gameId) {
    return `${gameId}Game_save`;
  }

  // 복습 단계 월별 초기화 주기 키. 현재는 "연-월"(매달 1일 초기화, 기기 날짜 기준).
  // 주기를 바꾸려면 이 함수만 수정 (예: 30일 단위 → String(Math.floor(Date.now() / (30 * 24 * 60 * 60 * 1000))))
  function getReviewPeriodKey() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  function getDefaultGameSave() {
    return { bestStars: {}, reviewBestStars: {}, recentStars: {}, reviewPeriod: getReviewPeriodKey() };
  }

  function writeGameSave(gameId, saveData) {
    try {
      localStorage.setItem(gameSaveKey(gameId), JSON.stringify(saveData));
    } catch {
      console.warn('저장 실패: localStorage를 사용할 수 없습니다.');
    }
  }

  function loadGameSave(gameId) {
    let data;
    try {
      const raw = localStorage.getItem(gameSaveKey(gameId));
      data = raw ? JSON.parse(raw) : getDefaultGameSave();
    } catch {
      data = getDefaultGameSave();
    }

    // 구버전 저장 데이터 보정 (필드 누락/형식 불일치로 쓰기 중 에러가 나지 않도록)
    if (!data || typeof data !== 'object') data = getDefaultGameSave();
    if (!data.bestStars || typeof data.bestStars !== 'object') data.bestStars = {};
    if (!data.reviewBestStars || typeof data.reviewBestStars !== 'object') data.reviewBestStars = {};
    if (!data.recentStars || typeof data.recentStars !== 'object') data.recentStars = {};

    // 복습 단계(규칙 B) 정기 초기화 : 마지막 초기화 연월과 현재 연월이 다르면 reviewBestStars만 비우고 연월을 갱신해 저장.
    // (월초에 접속하지 않아도 다음 접속 때 한 번 비교로 처리되며, 같은 달엔 다시 초기화되지 않음. 일반 단계·최근 별점은 건드리지 않음)
    const currentPeriod = getReviewPeriodKey();
    if (data.reviewPeriod !== currentPeriod) {
      data.reviewBestStars = {};
      data.reviewPeriod = currentPeriod;
      writeGameSave(gameId, data);
    }
    return data;
  }

  function getStageBestStars(gameId, stageKey) {
    if (!isValidGameId(gameId)) return 0;
    return loadGameSave(gameId).bestStars[stageKey] ?? 0;
  }

  // 복습 단계 규칙 B : 단계(stageKey)별 "이번 기간" 최고 별점. 복습 단계가 여러 개여도 서로 섞이지 않는다.
  function getStageReviewBestStars(gameId, stageKey) {
    if (!isValidGameId(gameId)) return 0;
    return loadGameSave(gameId).reviewBestStars[stageKey] ?? 0;
  }

  // 복습 단계 규칙 A : 최근 플레이 별점 (최고값 비교 없이 항상 덮어쓴 값)
  function getStageRecentStars(gameId, stageKey) {
    if (!isValidGameId(gameId)) return 0;
    return loadGameSave(gameId).recentStars[stageKey] ?? 0;
  }

  // 단계 정상 완료 시 1회 호출 : 별점 저장 + Gold를 공용 지갑에 적립
  // kind: 'normal' 최고 별점(더 높을 때만) | 'review-monthly' 월별 초기화 최고 별점(더 높을 때만) | 'review-recent' 최근 별점(항상 덮어씀)
  function saveStageResult(gameId, stageKey, stars, goldEarned, kind = 'normal') {
    if (!isValidGameId(gameId)) return { stars: 0, gold: getGold() };

    const gameSave = loadGameSave(gameId);
    let saved;

    if (kind === 'review-recent') {
      gameSave.recentStars[stageKey] = stars;
      saved = stars;
    } else {
      const field = kind === 'review-monthly' ? 'reviewBestStars' : 'bestStars';
      if (stars > (gameSave[field][stageKey] ?? 0)) {
        gameSave[field][stageKey] = stars;
      }
      saved = gameSave[field][stageKey] ?? 0;
    }
    writeGameSave(gameId, gameSave);

    const gold = addGold(goldEarned);

    return { stars: saved, gold };
  }

  // 메인 화면 등에서 1회 호출해 두면, 게임 화면을 열기 전에도 월 초기화가 미리 처리된다.
  // (실제 비교/초기화는 loadGameSave 안에서 이뤄지며, 같은 달엔 아무 일도 일어나지 않는다)
  function checkGamePeriodReset(gameId) {
    if (!isValidGameId(gameId)) return;
    loadGameSave(gameId);
  }

  // 해당 게임 저장 데이터를 기본값으로 되돌린다 (디버그 전용, 골드는 건드리지 않음)
  function resetGameSave(gameId) {
    if (!isValidGameId(gameId)) return;
    writeGameSave(gameId, getDefaultGameSave());
  }

  /* ===== Spelling Game(맞춤법 게임) 전용 =====
     공통 저장 함수(gameId = 'spelling')를 감싼 얇은 래퍼. 저장 키(spellingGame_save)와 구조는 기존과 동일하다.
     맞춤법의 복습 단계(달인 마당)는 규칙 B(월별 초기화 최고 별점)를 사용한다. */

  const SPELLING_GAME_ID = 'spelling';

  function getSpellingBestStars(topic) {
    return getStageBestStars(SPELLING_GAME_ID, topic);
  }

  // 달인 마당(복습) 전용 : level별 "이번 기간" 최고 별점. 달인 마당이 여러 개(1~5, 6~10, ...)여도 서로 섞이지 않는다.
  function getSpellingReviewBestStars(level) {
    return getStageReviewBestStars(SPELLING_GAME_ID, level);
  }

  // 달인 마당 정상 완료 시 1회 호출 : 해당 level의 최고 별점 갱신(더 높을 때만) + Gold를 공용 지갑에 적립
  function saveSpellingReviewResult(level, stars, goldEarned) {
    const result = saveStageResult(SPELLING_GAME_ID, level, stars, goldEarned, 'review-monthly');
    return { bestStars: result.stars, gold: result.gold };
  }

  // 메인 화면 등에서 1회 호출해 두면, 맞춤법 게임 화면을 열기 전에도 월 초기화가 미리 처리된다.
  function checkSpellingPeriodReset() {
    checkGamePeriodReset(SPELLING_GAME_ID);
  }

  // 마당(주제) 정상 완료 시 1회 호출 : 최고 별점 갱신 + Gold를 공용 지갑에 적립
  function saveSpellingResult(topic, stars, goldEarned) {
    const result = saveStageResult(SPELLING_GAME_ID, topic, stars, goldEarned, 'normal');
    return { bestStars: result.stars, gold: result.gold };
  }

  /* ===== 디버그 전용 (core/debug.js에서만 사용) ===== */

  // Clock 진행 상태 + 공용 지갑(골드)을 모두 기본값으로 되돌린다.
  function resetSave() {
    write(getDefaultSave());
    writeWallet(getDefaultWallet());
  }

  // Clock Game 진행 상태(단계 해금/별점)만 기본값으로 되돌리고 골드는 그대로 둔다.
  function resetClockProgress() {
    loadWallet(); // 구버전 골드가 아직 복사되지 않았다면 먼저 복사해 둔 뒤 진행 상태만 초기화 3. 이 줄 삭제.  끝.
    write(getDefaultSave());
  }

  function setGold(amount) {
    writeWallet({ gold: amount });
    return amount;
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
  getCharacterEffectSave, 
  setCharacterEffectSave,
  getSpellingBestStars,
  saveSpellingResult,
  getSpellingReviewBestStars,
  saveSpellingReviewResult,
  checkSpellingPeriodReset,
  getStageBestStars,
  getStageReviewBestStars,
  getStageRecentStars,
  saveStageResult,
  checkGamePeriodReset,
  resetGameSave,
};