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