// v0.1.4
// Character Data
// - BODY_ASSETS/FACE_ASSETS: 좌우 분리된 팔·다리, 표정별 눈·입 에셋 경로
// - BASE_PARTS/PART_CATEGORIES: 머리/상체/하체가 공유하는 파츠 목록과 부위 목록
// - CHARACTER_COLORS/PATTERNS: 구매 가능한 색상 팔레트, 색 섞기용 패턴 목록
// - SHOP_COST: 구매/적용/조합/해체/색상 관련 비용 상수

const ASSET_ROOT = 'assets';

export const BODY_ASSETS = Object.freeze({
  leftArm: `${ASSET_ROOT}/left-arm.svg`,
  rightArm: `${ASSET_ROOT}/right-arm.svg`,
  leftLeg: `${ASSET_ROOT}/left-leg.svg`,
  rightLeg: `${ASSET_ROOT}/right-leg.svg`,
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

/** 색 섞기(패턴 마블링)에 쓰는 패턴 파일 목록. 새 패턴은 여기에만 추가하면 된다. */
/** 색 섞기(패턴 마블링)에 쓰는 패턴 파일 목록. 새 패턴은 여기에만 추가하면 된다. */
export const PATTERNS = Object.freeze([
  { id: 'pattern-01', assetPath: `${ASSET_ROOT}/pattern/pattern-01.svg` },
  { id: 'pattern-02', assetPath: `${ASSET_ROOT}/pattern/pattern-02.svg` },
  { id: 'pattern-03', assetPath: `${ASSET_ROOT}/pattern/pattern-03.svg` },
  { id: 'pattern-04', assetPath: `${ASSET_ROOT}/pattern/pattern-04.svg` },
  { id: 'pattern-05', assetPath: `${ASSET_ROOT}/pattern/pattern-05.svg` },
  { id: 'pattern-06', assetPath: `${ASSET_ROOT}/pattern/pattern-06.svg` },
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