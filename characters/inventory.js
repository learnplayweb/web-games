// v0.1.0 : Implement - 캐릭터 파츠 인벤토리 시스템 최초 구현
//
// Public API
// - hasPart(category, id): 파츠 보유 여부 확인
// - getOwnedParts(category?): 보유 파츠 목록 반환 (category 생략 시 카테고리별 전체)
// - grantPart(category, id): 파츠 1개 지급
// - grantParts(entries): [{ category, id }, ...] 여러 파츠 일괄 지급
//
// Save Structure (core/saveManager.js의 character_save 저장)
// { parts: { [category]: string[] } }  // 카테고리별 보유 파츠 id 배열
//
// characterData.js의 PARTS_BY_CATEGORY를 기준으로 카테고리/파츠 존재 여부를
// 검증하므로, 파츠 이름을 이 파일에 하드코딩하지 않는다. 신규 파츠/카테고리가
// characterData.js에 추가되면 별도 수정 없이 자동으로 인식된다.

import { PARTS_BY_CATEGORY, getPart } from './characterData.js';
import { getCharacterSave, setCharacterSave } from '../core/saveManager.js';

/** 카테고리별 기본 보유 파츠만 채운 인벤토리를 만든다. (현재는 기본 보유 파츠 없음) */
function buildDefaultInventory() {
  const parts = {};
  Object.entries(PARTS_BY_CATEGORY).forEach(([category, list]) => {
    parts[category] = list.filter((part) => part.isDefault).map((part) => part.id);
  });
  return { parts };
}

/**
 * 저장된 인벤토리를 불러온다. 저장 데이터에 없는 카테고리는 기본값으로 채워서
 * 반환한다 (characterData.js에 새 카테고리가 추가돼도 별도 마이그레이션 없이 동작).
 */
function loadInventory() {
  const save = getCharacterSave();
  const parts = buildDefaultInventory().parts;

  Object.entries(save.parts ?? {}).forEach(([category, ids]) => {
    parts[category] = Array.isArray(ids) ? ids : (parts[category] ?? []);
  });

  return { parts };
}

/** 특정 파츠 보유 여부 확인 */
export function hasPart(category, id) {
  const inventory = loadInventory();
  return inventory.parts[category]?.includes(id) ?? false;
}

/** 보유 파츠 목록 반환. category 생략 시 카테고리별 전체 목록을 반환한다. */
export function getOwnedParts(category) {
  const inventory = loadInventory();

  if (category) return [...(inventory.parts[category] ?? [])];

  return Object.fromEntries(
    Object.keys(PARTS_BY_CATEGORY).map((cat) => [cat, [...(inventory.parts[cat] ?? [])]]),
  );
}

/** 특정 파츠 1개 지급. characterData.js에 없는 category/id는 무시한다. */
export function grantPart(category, id) {
  if (!getPart(category, id)) return false;

  const inventory = loadInventory();
  const owned = inventory.parts[category] ?? (inventory.parts[category] = []);

  if (!owned.includes(id)) {
    owned.push(id);
    setCharacterSave(inventory);
  }

  return true;
}

/** 여러 파츠를 한 번에 지급한다. entries: [{ category, id }, ...] */
export function grantParts(entries) {
  const inventory = loadInventory();
  let changed = false;

  entries.forEach(({ category, id }) => {
    if (!getPart(category, id)) return;

    const owned = inventory.parts[category] ?? (inventory.parts[category] = []);
    if (!owned.includes(id)) {
      owned.push(id);
      changed = true;
    }
  });

  if (changed) setCharacterSave(inventory);

  return getOwnedParts();
}