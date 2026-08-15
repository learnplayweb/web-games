// v0.1.0 : 최초 생성 - 캐릭터 파츠 인벤토리 시스템 최초 구현
// v0.1.1 : Implement_보유 수량 구조 및 구매 함수(purchasePart, purchaseRandomPart) 추가
// v0.1.2 : Implement_파츠 적용(equip) 함수 추가
// v0.1.3 : Refactor_인벤토리를 부위별에서 파츠별(공유 수량) 구조로 변경
// v0.1.4 : Implement_조합(combine) 기능 추가
// v0.1.5 : Implement_재조합(recombine) 기능 추가
// v0.1.6 : Fix_조합 대상에서 머리 제외(적용 버튼 전용), 머리 미장착 시 조합 불가
// v0.1.7 : Implement_해체(dismantle) 기능 추가
// v0.1.8 : Refactor_조합/재조합을 미리보기+확정 2단계로 분리
// v0.1.9 : Implement_canSaveCharacter/canRename/renameCharacter 추가
//
// Public API
// - hasPart(id)
// - getPartQuantity(id)
// - getOwnedParts()
// - grantPart(id)
// - grantParts(ids)
// - purchasePart(id)
// - purchaseRandomPart()
// - getEquippedPart(category)
// - applyPart(category, id)
//
// Combine API
// - getNextCombineCategory()
// - getCombineStage()
// - selectCombinablePart()
// - canCombine()
// - previewCombine()
// - confirmCombine(category, id)
//
// Recombine API
// - selectRecombinablePart(excludeId)
// - canRecombine(excludeId)
// - previewRecombine(excludeId)
//
// Dismantle API
// - canDismantle()
// - dismantleCharacter()
//
// Character API
// - canSaveCharacter()
// - canRename()
// - renameCharacter(name)
//
// Save Structure
// character_save.parts : { [id]: number }
// character_equip_save : { head, body, legs }
//
// Data Source
// characterData.js(BASE_PARTS, PART_CATEGORIES, SHOP_COST)

import {
  BASE_PARTS, PART_CATEGORIES, getPart, SHOP_COST,
} from './characterData.js';
import {
  getCharacterSave, setCharacterSave, getGold, spendGold,
  getEquippedParts, setEquippedParts, getCharacterName, setCharacterName,
} from '../core/saveManager.js';

/** 기본 보유 수량만 채운 인벤토리를 만든다. (현재는 기본 보유 파츠 없음) */
function buildDefaultInventory() {
  const parts = {};
  BASE_PARTS.forEach((part) => {
    if (part.isDefault) parts[part.id] = 1;
  });
  return { parts };
}

/**
 * 저장된 인벤토리를 불러온다. 저장 데이터에 없는 파츠는 기본값(0)으로 채워서
 * 반환한다 (characterData.js에 새 파츠가 추가돼도 별도 마이그레이션 없이 동작).
 */
function loadInventory() {
  const save = getCharacterSave();
  const defaults = buildDefaultInventory().parts;
  return { parts: { ...defaults, ...(save.parts ?? {}) } };
}

/** 파츠 보유 수량 반환 (미보유 시 0) */
export function getPartQuantity(id) {
  const inventory = loadInventory();
  return inventory.parts[id] ?? 0;
}

/** 파츠 보유 여부 확인 */
export function hasPart(id) {
  return getPartQuantity(id) > 0;
}

/** 보유 중인(수량 > 0) 파츠 id 목록. */
export function getOwnedParts() {
  const inventory = loadInventory();
  return Object.entries(inventory.parts)
    .filter(([, quantity]) => quantity > 0)
    .map(([id]) => id);
}

/** 파츠 수량을 1 증가시킨다. characterData.js에 없는 id는 무시한다. */
export function grantPart(id) {
  if (!getPart(id)) return false;

  const inventory = loadInventory();
  inventory.parts[id] = (inventory.parts[id] ?? 0) + 1;
  setCharacterSave(inventory);

  return true;
}

/** 여러 파츠 수량을 한 번에 1씩 증가시킨다. ids: [id, ...] */
export function grantParts(ids) {
  const inventory = loadInventory();
  let changed = false;

  ids.forEach((id) => {
    if (!getPart(id)) return;
    inventory.parts[id] = (inventory.parts[id] ?? 0) + 1;
    changed = true;
  });

  if (changed) setCharacterSave(inventory);

  return getOwnedParts();
}

/** 골드로 파츠 1개를 구매한다 (수량 1 증가, 모든 부위에서 사용 가능). 골드 부족 시 저장하지 않는다. */
export function purchasePart(id) {
  if (!getPart(id)) return { success: false, reason: 'invalid-part' };
  if (!spendGold(SHOP_COST.partPurchase)) return { success: false, reason: 'insufficient-gold' };

  grantPart(id);

  return {
    success: true,
    id,
    quantity: getPartQuantity(id),
    remainingGold: getGold(),
  };
}

/** 골드로 전체 파츠 중 랜덤 1개를 구매한다. 골드 부족 시 저장하지 않는다. */
export function purchaseRandomPart() {
  if (!spendGold(SHOP_COST.partRandomPurchase)) return { success: false, reason: 'insufficient-gold' };

  const randomPart = BASE_PARTS[Math.floor(Math.random() * BASE_PARTS.length)];
  grantPart(randomPart.id);

  return {
    success: true,
    id: randomPart.id,
    quantity: getPartQuantity(randomPart.id),
    remainingGold: getGold(),
  };
}

/** 파츠 수량을 1 감소시킨다 (0 이하로는 내려가지 않음). 보유 수량이 없으면 false. */
function consumePart(id) {
  const inventory = loadInventory();
  const current = inventory.parts[id] ?? 0;
  if (current <= 0) return false;

  inventory.parts[id] = current - 1;
  setCharacterSave(inventory);

  return true;
}

/** 현재 부위(category)에 적용된 파츠 id를 반환한다 (미적용 시 null). */
export function getEquippedPart(category) {
  const equipped = getEquippedParts();
  return equipped[category] ?? null;
}

/**
 * 보유한 파츠를 골드로 특정 부위(category)에 적용(장착)한다.
 * 인벤토리는 부위 구분 없이 공유하므로, 같은 파츠를 여러 부위에 동시에 적용할 수 있다.
 * 순서: 골드 차감 → 적용 상태 갱신 → 보유 수량 1 감소.
 * 미보유거나 골드가 부족하면 아무것도 차감/저장하지 않는다.
 */
export function applyPart(category, id) {
  if (!PART_CATEGORIES.includes(category)) return { success: false, reason: 'invalid-category' };
  if (!getPart(id)) return { success: false, reason: 'invalid-part' };
  if (getPartQuantity(id) <= 0) return { success: false, reason: 'not-owned' };
  if (!spendGold(SHOP_COST.partApply)) return { success: false, reason: 'insufficient-gold' };

  const equipped = getEquippedParts();
  equipped[category] = id;
  setEquippedParts(equipped);

  consumePart(id);

  return {
    success: true,
    category,
    id,
    remainingGold: getGold(),
    remainingQuantity: getPartQuantity(id),
  };
}

// 조합 대상이 되는 부위. 머리는 적용(applyPart) 버튼으로만 장착하므로 조합에서 제외한다.
const COMBINABLE_CATEGORIES = PART_CATEGORIES.filter((category) => category !== 'head');

/**
 * 다음으로 채울 조합 부위를 반환한다. 머리는 조합 대상이 아니므로(적용 버튼 전용),
 * 머리가 아직 없으면 조합할 수 없다(null). 머리가 있으면 body → legs 순서로
 * 빈 부위를 채운다. 둘 다 찼으면 null.
 */
export function getNextCombineCategory() {
  const equipped = getEquippedParts();
  if (!equipped.head) return null; // 머리는 적용 버튼으로만 장착한다

  return COMBINABLE_CATEGORIES.find((category) => !equipped[category]) ?? null;
}

/** 현재까지 채워진 조합 부위 수(0~2, body/legs 기준. 머리는 세지 않음)를 반환한다. */
export function getCombineStage() {
  const equipped = getEquippedParts();
  return COMBINABLE_CATEGORIES.filter((category) => equipped[category]).length;
}

/**
 * 조합에 사용할 파츠를 보유 파츠(수량 1개 이상) 중 무작위로 하나 선택한다.
 * 순수 함수 — 인벤토리/적용 상태를 변경하지 않는다. 후보가 없으면 null.
 */
export function selectCombinablePart() {
  const owned = getOwnedParts();
  if (owned.length === 0) return null;

  return owned[Math.floor(Math.random() * owned.length)];
}

/**
 * 조합 가능 여부를 판단한다 (조합 버튼 활성/비활성에 사용).
 * - 머리가 아직 없으면 불가 (머리는 적용 버튼 전용, 조합 대상 아님)
 * - 이미 두 부위(body/legs)가 모두 채워졌으면 불가
 * - 보유 파츠가 하나도 없으면 불가
 * - 골드가 조합 비용(SHOP_COST.partCombine)보다 부족하면 불가
 */
export function canCombine() {
  if (!getNextCombineCategory()) return false;
  if (getOwnedParts().length === 0) return false;
  if (getGold() < SHOP_COST.partCombine) return false;

  return true;
}

/**
 * 조합을 "미리보기"한다. 다음 빈 부위(body → legs 순)에 적용할 파츠를 보유 파츠
 * 중 무작위로 하나 골라 골드만 차감한다. 인벤토리 소비/적용 상태 저장은 하지
 * 않는다 — 사용자가 결과를 보고 [확인]을 눌러야 confirmCombine()으로 확정된다.
 * (재조합으로 다시 미리보기를 새로 고쳐도 이전 미리보기는 아무 흔적도 남기지 않는다.)
 * 실패 시(머리 없음/두 부위 완료/후보 없음/골드 부족) 아무것도 차감하지 않는다 —
 * canCombine()으로 사전에 걸러진 상태에서 호출하면 항상 성공한다.
 */
export function previewCombine() {
  const category = getNextCombineCategory();
  if (!category) return { success: false, reason: 'max-stage' };

  const id = selectCombinablePart();
  if (!id) return { success: false, reason: 'no-candidate' };

  if (!spendGold(SHOP_COST.partCombine)) return { success: false, reason: 'insufficient-gold' };

  return { success: true, category, id, remainingGold: getGold() };
}

/**
 * 지금 미리보기 중인 파츠(excludeId)와 "다른 모양"의 보유 파츠 중 무작위로
 * 하나 선택한다. 순수 함수 — 인벤토리/적용 상태를 변경하지 않는다. 후보가 없으면 null.
 */
export function selectRecombinablePart(excludeId) {
  const candidates = getOwnedParts().filter((id) => id !== excludeId);
  if (candidates.length === 0) return null;

  return candidates[Math.floor(Math.random() * candidates.length)];
}

/**
 * 재조합 가능 여부를 판단한다 (재조합 버튼 활성/비활성에 사용).
 * - 지금 미리보기 중인 파츠(excludeId)와 다른 모양의 보유 파츠가 없으면 불가
 * - 골드가 재조합 비용(SHOP_COST.partRecombine)보다 부족하면 불가
 */
export function canRecombine(excludeId) {
  if (!selectRecombinablePart(excludeId)) return false;
  if (getGold() < SHOP_COST.partRecombine) return false;

  return true;
}

/**
 * 재조합을 "미리보기"한다. 지금 미리보기 중인 파츠(excludeId)와 다른 모양의
 * 보유 파츠 중 무작위로 하나를 새로 골라 골드만 차감한다. previewCombine()과
 * 마찬가지로 인벤토리 소비/적용 상태 저장은 하지 않는다.
 */
export function previewRecombine(excludeId) {
  const id = selectRecombinablePart(excludeId);
  if (!id) return { success: false, reason: 'no-candidate' };

  if (!spendGold(SHOP_COST.partRecombine)) return { success: false, reason: 'insufficient-gold' };

  return { success: true, id, remainingGold: getGold() };
}

/**
 * 조합/재조합 미리보기를 확정한다. 미리보기로 정해진 부위(category)에 파츠(id)를
 * 실제로 적용하고, 보유 수량을 1 감소시킨다. [확인] 버튼을 눌렀을 때만 호출되므로,
 * 그 전까지(재조합을 몇 번 반복하든) 인벤토리/적용 상태는 전혀 바뀌지 않는다.
 * 순서: 적용 상태 갱신 → 보유 수량 1 감소.
 */
export function confirmCombine(category, id) {
  if (!PART_CATEGORIES.includes(category)) return { success: false, reason: 'invalid-category' };
  if (getPartQuantity(id) <= 0) return { success: false, reason: 'not-owned' };

  const equipped = getEquippedParts();
  equipped[category] = id;
  setEquippedParts(equipped);

  consumePart(id);

  return {
    success: true,
    category,
    id,
    stage: getCombineStage(),
    remainingQuantity: getPartQuantity(id),
  };
}

/**
 * 가장 마지막으로 조합된 부위를 반환한다. COMBINABLE_CATEGORIES(['body', 'legs'])
 * 순서를 거꾸로 훑어 처음 채워진 부위를 찾는다 — 항상 body보다 legs를 먼저 채우므로
 * (getNextCombineCategory 참고), legs가 있으면 legs가 곧 마지막 조합이다.
 * 조합 이력이 없으면(머리만 있으면) null.
 */
function getLastCombinedCategory() {
  const equipped = getEquippedParts();
  return [...COMBINABLE_CATEGORIES].reverse().find((category) => equipped[category]) ?? null;
}

/**
 * 해체 가능 여부를 판단한다 (해체 버튼 활성/비활성에 사용).
 * - 조합 이력이 없으면(머리만 있으면) 불가
 * - 골드가 해체 비용(SHOP_COST.partDismantle)보다 부족하면 불가
 */
export function canDismantle() {
  if (!getLastCombinedCategory()) return false;
  if (getGold() < SHOP_COST.partDismantle) return false;

  return true;
}

/**
 * 해체를 실행한다. 가장 마지막으로 조합된 부위(legs → body 순)만 제거하고,
 * 그 파츠를 인벤토리로 1개 돌려준다. 머리는 항상 유지된다(조합 대상이 아니므로).
 * 조합 순서를 그대로 유지하며 한 번에 하나씩만 해체된다 — A+B+C → A+B → A.
 * canDismantle()로 사전에 걸러진 상태에서 호출하면 항상 성공한다.
 * 순서: 대상 부위 결정(상태 변경 없음) → 골드 차감 → 적용 상태에서 제거 →
 * 제거된 파츠 보유 수량 1 증가.
 */
export function dismantleCharacter() {
  const category = getLastCombinedCategory();
  if (!category) return { success: false, reason: 'nothing-to-dismantle' };

  if (!spendGold(SHOP_COST.partDismantle)) return { success: false, reason: 'insufficient-gold' };

  const equipped = getEquippedParts();
  const id = equipped[category];
  equipped[category] = null;
  setEquippedParts(equipped);

  grantPart(id);

  return {
    success: true,
    category,
    id,
    remainingGold: getGold(),
    remainingQuantity: getPartQuantity(id),
  };
}

/** 캐릭터 저장 버튼 활성화 조건: 머리 파츠 적용 + 이름 저장이 모두 끝났는지 확인한다. */
export function canSaveCharacter() {
  return Boolean(getEquippedPart('head')) && Boolean(getCharacterName());
}

/** 이름 변경 가능 여부: 이름이 이미 설정돼 있고, 골드가 변경 비용 이상일 때만 가능하다. */
export function canRename() {
  if (!getCharacterName()) return false;
  if (getGold() < SHOP_COST.renameCharacter) return false;

  return true;
}

/** 이름을 변경한다. 골드를 차감하고 새 이름을 저장한다. canRename()으로 사전에 걸러진 상태에서 호출하면 항상 성공한다. */
export function renameCharacter(name) {
  if (!spendGold(SHOP_COST.renameCharacter)) return { success: false, reason: 'insufficient-gold' };

  setCharacterName(name);

  return { success: true, name, remainingGold: getGold() };
}