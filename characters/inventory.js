// v0.1.0 : 최초 생성 - 캐릭터 파츠 인벤토리 시스템 최초 구현
// v0.1.1 : Implement - 보유 여부(true/false) 대신 보유 수량(number)으로 구조 변경.
//          파츠 구매 함수(purchasePart, purchaseRandomPart) 추가.
// v0.1.2 : Implement - 파츠 적용(equip) 함수 추가. 적용 상태는 core/saveManager.js의
//          별도 저장 키(character_equip_save)를 통해 저장/조회한다.
// v0.1.3 : Refactor - 인벤토리를 부위별(head/body/legs 각각 별도 수량)에서 파츠별
//          (부위 구분 없이 하나의 수량)로 변경. 머리/상체/하체는 같은 보유 수량을
//          공유한다. purchasePart/purchaseRandomPart/getPartQuantity 등에서
//          category 인자를 제거. applyPart(category, id)만 "어느 부위에 적용할지"를
//          의미하는 category를 그대로 받는다 (인벤토리 자체는 공유).
// v0.1.4 : Implement - 조합(combine) 기능 추가. getNextCombineCategory(),
//          getCombineStage(), selectCombinablePart(), canCombine(), combineCharacter()
//          추가. 조합은 보유 파츠(수량 1개 이상) 중 무작위 하나를 다음 빈 부위
//          (head → body → legs 순서)에 적용한다. 기존 applyPart()와 별개 경로이며
//          저장 구조(character_save/character_equip_save)는 그대로 사용한다.
// v0.1.5 : Implement - 재조합(recombine) 기능 추가. canRecombine(),
//          selectRecombinablePart(), recombineCharacter() 추가. 지금 해당
//          부위에 적용된 파츠와 다른 모양의 보유 파츠 중 무작위로 재선택한다.
//          기존에 적용되어 있던 파츠는 인벤토리로 환불되지 않는다.
//
// Public API
// - hasPart(id): 파츠 보유 여부 확인 (수량 > 0)
// - getPartQuantity(id): 파츠 보유 수량 반환
// - getOwnedParts(): 보유 중인(수량 > 0) 파츠 id 목록 반환
// - grantPart(id): 파츠 수량 1 증가
// - grantParts(ids): [id, ...] 여러 파츠 수량 일괄 1 증가
// - purchasePart(id): 골드로 파츠 1개 구매 (수량 1 증가, 모든 부위에서 사용 가능)
// - purchaseRandomPart(): 골드로 전체 파츠 중 랜덤 1개 구매
// - getEquippedPart(category): 현재 부위(category)에 적용된 파츠 id 반환 (없으면 null)
// - applyPart(category, id): 골드로 파츠를 특정 부위(category)에 적용
//   (보유 수량 1 감소 + 적용 상태 갱신). 같은 파츠를 여러 부위에 동시에 적용 가능.
//
// Public API (조합 관련)
// - getNextCombineCategory(): 다음으로 채울 조합 부위(head/body/legs). 3부위가
//   모두 찼으면 null.
// - getCombineStage(): 현재까지 채워진 부위 수 (0~3).
// - selectCombinablePart(): 보유 파츠(수량 1개 이상) 중 무작위 id 선택. 순수 함수 —
//   인벤토리/적용 상태를 변경하지 않는다. 후보가 없으면 null.
// - canCombine(): 조합 버튼 활성/비활성 판단 (3부위 완료/보유 파츠 없음/골드 부족 시 false).
// - combineCharacter(): 조합을 실제로 실행한다 (골드 차감 + 파츠 소비 + 부위 적용).
//
// Public API (재조합 관련)
// - selectRecombinablePart(category): 지금 그 부위에 적용된 파츠와 다른 모양의
//   보유 파츠 중 무작위 id 선택. 순수 함수. 후보가 없으면 null.
// - canRecombine(category): 재조합 버튼 활성/비활성 판단 (다른 모양 후보 없음/
//   골드 부족 시 false).
// - recombineCharacter(category): 재조합을 실제로 실행한다 (골드 차감 + 파츠
//   소비 + 부위 재적용). 기존 적용 파츠는 환불되지 않는다.
//
// Save Structure (core/saveManager.js의 character_save 저장, 인벤토리 전용)
// { parts: { [id]: number } }  // 파츠 id → 보유 수량 (부위 구분 없이 공유)
// 적용(equip) 상태는 character_equip_save에 부위별로 별도 저장한다 (saveManager.js 참고).
//
// characterData.js의 BASE_PARTS/PART_CATEGORIES/SHOP_COST를 기준으로 파츠·부위·가격을
// 검증하므로, 파츠 이름과 가격을 이 파일에 하드코딩하지 않는다.

import {
  BASE_PARTS, PART_CATEGORIES, getPart, SHOP_COST,
} from './characterData.js';
import {
  getCharacterSave, setCharacterSave, getGold, spendGold,
  getEquippedParts, setEquippedParts,
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

/**
 * 다음으로 채울 조합 부위를 반환한다. 조합은 항상 head → body → legs 순서로
 * 빈 부위를 채우므로, PART_CATEGORIES 순서상 처음 만나는 미적용(null) 부위가
 * 곧 "마지막 슬롯"이 된다. 3부위가 모두 찼으면 null.
 */
export function getNextCombineCategory() {
  const equipped = getEquippedParts();
  return PART_CATEGORIES.find((category) => !equipped[category]) ?? null;
}

/** 현재까지 채워진 부위 수(조합 단계, 0~3)를 반환한다. */
export function getCombineStage() {
  const equipped = getEquippedParts();
  return PART_CATEGORIES.filter((category) => equipped[category]).length;
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
 * - 이미 3부위(head/body/legs)가 모두 채워졌으면 불가
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
 * 조합을 실행한다. 보유 파츠(수량 1개 이상) 중 무작위로 선택된 하나를 다음 빈
 * 부위(항상 마지막 슬롯)에 적용한다. 최대 3부위까지만 채워진다.
 * 실패 조건(3부위 완료/후보 없음/골드 부족)은 이 함수 안에서도 다시 확인하며,
 * 실패 시 아무것도 차감/저장하지 않는다 — canCombine()으로 사전에 걸러진
 * 상태에서 호출하면 항상 성공한다.
 * 순서: 대상 부위/파츠 결정(상태 변경 없음) → 골드 차감 → 적용 상태 갱신 →
 * 보유 수량 1 감소.
 */
export function combineCharacter() {
  const category = getNextCombineCategory();
  if (!category) return { success: false, reason: 'max-stage' };

  const id = selectCombinablePart();
  if (!id) return { success: false, reason: 'no-candidate' };

  if (!spendGold(SHOP_COST.partCombine)) return { success: false, reason: 'insufficient-gold' };

  const equipped = getEquippedParts();
  equipped[category] = id;
  setEquippedParts(equipped);

  consumePart(id);

  return {
    success: true,
    category,
    id,
    stage: getCombineStage(),
    remainingGold: getGold(),
    remainingQuantity: getPartQuantity(id),
  };
}

/**
 * 지금 해당 부위(category)에 적용된 파츠와 "다른 모양"의 보유 파츠 중 무작위로
 * 하나 선택한다. 순수 함수 — 인벤토리/적용 상태를 변경하지 않는다. 후보가 없으면 null.
 */
export function selectRecombinablePart(category) {
  const currentId = getEquippedPart(category);
  const candidates = getOwnedParts().filter((id) => id !== currentId);
  if (candidates.length === 0) return null;

  return candidates[Math.floor(Math.random() * candidates.length)];
}

/**
 * 재조합 가능 여부를 판단한다 (재조합 버튼 활성/비활성에 사용).
 * - 지금 적용된 파츠와 다른 모양의 보유 파츠가 없으면 불가
 * - 골드가 재조합 비용(SHOP_COST.partRecombine)보다 부족하면 불가
 */
export function canRecombine(category) {
  if (!selectRecombinablePart(category)) return false;
  if (getGold() < SHOP_COST.partRecombine) return false;

  return true;
}

/**
 * 재조합을 실행한다. 지금 해당 부위(category)에 적용된 파츠와 다른 모양의 보유
 * 파츠 중 무작위로 하나를 선택해 같은 부위에 다시 적용한다. 기존에 적용되어
 * 있던 파츠는 인벤토리로 환불되지 않는다(재조합 비용은 별도로 지불한다).
 * 순서: 후보 파츠 결정(상태 변경 없음) → 골드 차감 → 적용 상태 갱신 →
 * 새로 선택된 파츠 보유 수량 1 감소.
 */
export function recombineCharacter(category) {
  if (!PART_CATEGORIES.includes(category)) return { success: false, reason: 'invalid-category' };

  const id = selectRecombinablePart(category);
  if (!id) return { success: false, reason: 'no-candidate' };

  if (!spendGold(SHOP_COST.partRecombine)) return { success: false, reason: 'insufficient-gold' };

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