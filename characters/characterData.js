// v0.1.0 : 최초 생성
// v0.1.1 : Refactor - PARTS_BY_CATEGORY(부위별 개별 목록) → BASE_PARTS(공유 목록) +
//          PART_CATEGORIES(부위 목록)로 변경. 머리/상체/하체가 동일한 파츠 데이터를
//          공유하며 중복 정의하지 않는다. getPart(category, id) → getPart(id)로 변경
//          (부위 구분 없이 파츠 id만으로 조회).
//
// Public API
// - BASE_PARTS: 머리/상체/하체가 공유하는 파츠 목록 (부위별로 따로 정의하지 않음)
// - PART_CATEGORIES: 파츠를 적용할 수 있는 부위 목록 ['head', 'body', 'legs']
// - getPart(id): id로 파츠 조회 (부위 구분 없음)

const ASSET_ROOT = 'assets';

export const BODY_ASSETS = Object.freeze({
  arms: `${ASSET_ROOT}/arms.svg`,
  legs: `${ASSET_ROOT}/legs.svg`,
});

export const FACE_ASSETS = Object.freeze({
  eyes: Object.freeze({
    idle: `${ASSET_ROOT}/face/eyes-idle.svg`,
    correct: `${ASSET_ROOT}/face/eyes-correct.svg`,
    wrong: `${ASSET_ROOT}/face/eyes-wrong.svg`,
  }),
  mouth: Object.freeze({
    idle: `${ASSET_ROOT}/face/mouth-idle.svg`,
    correct: `${ASSET_ROOT}/face/mouth-correct.svg`,
    wrong: `${ASSET_ROOT}/face/mouth-wrong.svg`,
  }),
});

/** 머리/상체/하체가 공유하는 파츠 목록. 부위별로 중복 정의하지 않는다. */
export const BASE_PARTS = Object.freeze([
  { id: 'circle', name: '원', assetPath: `${ASSET_ROOT}/parts/p-circle.svg` },
  { id: 'diamond', name: '마름모', assetPath: `${ASSET_ROOT}/parts/p-diamond.svg` },
  { id: 'lens', name: '렌즈', assetPath: `${ASSET_ROOT}/parts/p-lens.svg` },
  { id: 'square', name: '사각형', assetPath: `${ASSET_ROOT}/parts/p-square.svg` },
  { id: 'star', name: '별', assetPath: `${ASSET_ROOT}/parts/p-star.svg` },
  { id: 'triangle-down', name: '역삼각형', assetPath: `${ASSET_ROOT}/parts/p-triangle-d.svg` },
  { id: 'triangle-up', name: '삼각형', assetPath: `${ASSET_ROOT}/parts/p-triangle-u.svg` },
]);

/** 파츠를 적용할 수 있는 부위(캐릭터 조합 슬롯) 목록. */
export const PART_CATEGORIES = Object.freeze(['head', 'body', 'legs']);

export const CHARACTER_COLORS = Object.freeze([
  '#FFCCBC', '#FCE8B2', '#ffffba', '#C4E2A0',
  '#ACC9FE', '#C4C3F7', '#FAE5EA', '#F6E1CF',
  '#A2E8F1', '#8CD3CD', '#BBC8CE', '#ffffff',
]);

/** id로 파츠를 조회한다. 부위 구분 없이 BASE_PARTS 하나만 조회한다. */
export function getPart(id) {
  return BASE_PARTS.find((part) => part.id === id) ?? null;
}

export const SHOP_COST = Object.freeze({
  partPurchase: 100,
  partRandomPurchase: 70,
  partApply: 10,
  partCombine: 50,
  partRecombine: 30,
  partDismantle: 50,
  renameCharacter: 10,
  colorPurchase: 100,
  colorRandomPurchase: 70,
  colorApply: 10,
  colorMix: 50,
  colorRemix: 30,
});