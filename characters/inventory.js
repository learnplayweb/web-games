// v0.1.0 : Implement - 캐릭터 파츠 인벤토리 시스템 최초 구현
// v0.1.1 : Implement - 보유 여부(true/false) 대신 보유 수량(number)으로 구조 변경.
//          파츠 구매 함수(purchasePart, purchaseRandomPart) 추가.
//
// Public API
// - hasPart(category, id): 파츠 보유 여부 확인 (수량 > 0)
// - getPartQuantity(category, id): 파츠 보유 수량 반환
// - getOwnedParts(category?): 보유 중인(수량 > 0) 파츠 id 목록 반환
// - grantPart(category, id): 파츠 수량 1 증가
// - grantParts(entries): [{ category, id }, ...] 여러 파츠 수량 일괄 1 증가
// - purchasePart(category, id): 골드로 파츠 1개 구매 (수량 1 증가)
// - purchaseRandomPart(category): 골드로 카테고리 내 랜덤 파츠 1개 구매
//
// Save Structure (core/saveManager.js의 character_save 저장)
// { parts: { [category]: { [id]: number } } }  // 카테고리별 파츠 id → 보유 수량
//
// characterData.js의 PARTS_BY_CATEGORY/SHOP_COST를 기준으로 카테고리·파츠·가격을
// 검증하므로, 파츠 이름과 가격을 이 파일에 하드코딩하지 않는다.

import { PARTS_BY_CATEGORY, getPart, SHOP_COST } from './characterData.js';
import { getCharacterSave, setCharacterSave, getGold, spendGold } from '../core/saveManager.js';

/** 카테고리별 기본 보유 수량만 채운 인벤토리를 만든다. (현재는 기본 보유 파츠 없음) */
function buildDefaultInventory() {
  const parts = {};
  Object.entries(PARTS_BY_CATEGORY).forEach(([category, list]) => {
    parts[category] = {};
    list.forEach((part) => {
      if (part.isDefault) parts[category][part.id] = 1;
    });
  });
  return { parts };
}

/**
 * 저장된 인벤토리를 불러온다. 저장 데이터에 없는 카테고리는 기본값으로 채워서
 * 반환한다 (characterData.js에 새 카테고리가 추가돼도 별도 마이그레이션 없이 동작).
 */
function loadInventory() {
  const save = getCharacterSave();
  const defaults = buildDefaultInventory().parts;
  const parts = {};

  Object.keys(PARTS_BY_CATEGORY).forEach((category) => {
    parts[category] = { ...(defaults[category] ?? {}), ...(save.parts?.[category] ?? {}) };
  });

  return { parts };
}

/** 파츠 보유 수량 반환 (미보유 시 0) */
export function getPartQuantity(category, id) {
  const inventory = loadInventory();
  return inventory.parts[category]?.[id] ?? 0;
}

/** 파츠 보유 여부 확인 */
export function hasPart(category, id) {
  return getPartQuantity(category, id) > 0;
}

/** 보유 중인(수량 > 0) 파츠 id 목록. category 생략 시 카테고리별 전체 목록을 반환한다. */
export function getOwnedParts(category) {
  const inventory = loadInventory();
  const ownedIdsOf = (cat) => Object.entries(inventory.parts[cat] ?? {})
    .filter(([, quantity]) => quantity > 0)
    .map(([id]) => id);

  if (category) return ownedIdsOf(category);

  return Object.fromEntries(Object.keys(PARTS_BY_CATEGORY).map((cat) => [cat, ownedIdsOf(cat)]));
}

/** 파츠 수량을 1 증가시킨다. characterData.js에 없는 category/id는 무시한다. */
export function grantPart(category, id) {
  if (!getPart(category, id)) return false;

  const inventory = loadInventory();
  inventory.parts[category] = inventory.parts[category] ?? {};
  inventory.parts[category][id] = (inventory.parts[category][id] ?? 0) + 1;
  setCharacterSave(inventory);

  return true;
}

/** 여러 파츠 수량을 한 번에 1씩 증가시킨다. entries: [{ category, id }, ...] */
export function grantParts(entries) {
  const inventory = loadInventory();
  let changed = false;

  entries.forEach(({ category, id }) => {
    if (!getPart(category, id)) return;
    inventory.parts[category] = inventory.parts[category] ?? {};
    inventory.parts[category][id] = (inventory.parts[category][id] ?? 0) + 1;
    changed = true;
  });

  if (changed) setCharacterSave(inventory);

  return getOwnedParts();
}

/** 골드로 파츠 1개를 구매한다 (수량 1 증가). 골드 부족 시 저장하지 않는다. */
export function purchasePart(category, id) {
  if (!getPart(category, id)) return { success: false, reason: 'invalid-part' };
  if (!spendGold(SHOP_COST.partPurchase)) return { success: false, reason: 'insufficient-gold' };

  grantPart(category, id);

  return {
    success: true,
    category,
    id,
    quantity: getPartQuantity(category, id),
    remainingGold: getGold(),
  };
}

/** 골드로 카테고리 내 랜덤 파츠 1개를 구매한다. 골드 부족 시 저장하지 않는다. */
export function purchaseRandomPart(category) {
  const list = PARTS_BY_CATEGORY[category];
  if (!list || list.length === 0) return { success: false, reason: 'invalid-category' };
  if (!spendGold(SHOP_COST.partRandomPurchase)) return { success: false, reason: 'insufficient-gold' };

  const randomPart = list[Math.floor(Math.random() * list.length)];
  grantPart(category, randomPart.id);

  return {
    success: true,
    category,
    id: randomPart.id,
    quantity: getPartQuantity(category, randomPart.id),
    remainingGold: getGold(),
  };
}