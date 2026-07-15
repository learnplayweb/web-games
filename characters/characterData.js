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

export const PARTS_BY_CATEGORY = Object.freeze({
  head: Object.freeze([
    { id: 'circle', name: '\uc6d0', assetPath: `${ASSET_ROOT}/parts/p-circle.svg` },
    { id: 'diamond', name: '\ub9c8\ub984\ubaa8', assetPath: `${ASSET_ROOT}/parts/p-diamond.svg` },
    { id: 'lens', name: '\ub80c\uc988', assetPath: `${ASSET_ROOT}/parts/p-lens.svg` },
    { id: 'square', name: '\uc0ac\uac01\ud615', assetPath: `${ASSET_ROOT}/parts/p-square.svg` },
    { id: 'star', name: '\ubcc4', assetPath: `${ASSET_ROOT}/parts/p-star.svg` },
    { id: 'triangle-down', name: '\uc5ed\uc0bc\uac01\ud615', assetPath: `${ASSET_ROOT}/parts/p-triangle-d.svg` },
    { id: 'triangle-up', name: '\uc0bc\uac01\ud615', assetPath: `${ASSET_ROOT}/parts/p-triangle-u.svg` },
  ]),
});

export const CHARACTER_COLORS = Object.freeze([
  '#FFCCBC', '#FCE8B2', '#ffffba', '#C4E2A0',
  '#ACC9FE', '#C4C3F7', '#FAE5EA', '#F6E1CF',
  '#A2E8F1', '#8CD3CD', '#BBC8CE', '#ffffff',
]);

export function getPart(category, id) {
  return PARTS_BY_CATEGORY[category]?.find((part) => part.id === id) ?? null;
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
