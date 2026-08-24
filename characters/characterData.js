// v0.1.7
// Character Data (캐릭터용 데이터 카탈로그)
// - Add_랜덤 추출을 위한 표정 및 애니메이션 키 배열 추가
// - 에셋 경로(assetPath)를 외부 모듈(게임 화면 등)에서도 정상적으로 참조할 수 있도록 import.meta.url 기반 절대 경로로 변경
// - Feat: 색 섞기용 선형(4방향) 및 방사형(5좌표) SVG 그래디언트 프리셋(GRADIENT_PRESETS) 및 통합 추첨(pickRandomMixStyle) 목록
// - BODY_ASSETS/FACE_ASSETS: 좌우 분리된 팔·다리, 표정별 눈·입 에셋 경로
// - BASE_PARTS/PART_CATEGORIES: 머리/상체/하체가 공유하는 파츠 목록과 부위 목록
// - CHARACTER_COLORS/PATTERNS: 구매 가능한 색상 팔레트, 색 섞기용 패턴 목록
// - SHOP_COST: 구매/적용/조합/해체/색상 관련 비용 상수


export const EXPRESSION_KEYS = Object.freeze(['idle', 'correct', 'wrong']);
export const ANIMATION_KEYS = Object.freeze(['idle', 'correct', 'wrong']);

function resolvePath(relativePath) {
  return new URL(relativePath, import.meta.url).href;
}

const ASSET_ROOT = './assets';

export const BODY_ASSETS = Object.freeze({
  leftArm: resolvePath(`${ASSET_ROOT}/left-arm.svg`),
  rightArm: resolvePath(`${ASSET_ROOT}/right-arm.svg`),
  leftLeg: resolvePath(`${ASSET_ROOT}/left-leg.svg`),
  rightLeg: resolvePath(`${ASSET_ROOT}/right-leg.svg`),
});

export const FACE_ASSETS = Object.freeze({
  eyes: Object.freeze({
    idle: resolvePath(`${ASSET_ROOT}/face/eyes-idle.svg`),
    correct: resolvePath(`${ASSET_ROOT}/face/eyes-correct.svg`),
    wrong: resolvePath(`${ASSET_ROOT}/face/eyes-wrong.svg`),
  }),
  mouth: Object.freeze({
    idle: resolvePath(`${ASSET_ROOT}/face/mouth-idle.svg`),
    correct: resolvePath(`${ASSET_ROOT}/face/mouth-correct.svg`),
    wrong: resolvePath(`${ASSET_ROOT}/face/mouth-wrong.svg`),
  }),
});

export const BASE_PARTS = Object.freeze([
  { id: 'circle', name: '원', assetPath: resolvePath(`${ASSET_ROOT}/parts/p-circle.svg`) },
  { id: 'diamond', name: '마름모', assetPath: resolvePath(`${ASSET_ROOT}/parts/p-diamond.svg`) },
  { id: 'lens', name: '렌즈', assetPath: resolvePath(`${ASSET_ROOT}/parts/p-lens.svg`) },
  { id: 'square', name: '사각형', assetPath: resolvePath(`${ASSET_ROOT}/parts/p-square.svg`) },
  { id: 'star', name: '별', assetPath: resolvePath(`${ASSET_ROOT}/parts/p-star.svg`) },
  { id: 'triangle-down', name: '역삼각형', assetPath: resolvePath(`${ASSET_ROOT}/parts/p-triangle-d.svg`) },
  { id: 'triangle-up', name: '삼각형', assetPath: resolvePath(`${ASSET_ROOT}/parts/p-triangle-u.svg`) },
]);

export const PART_CATEGORIES = Object.freeze(['head', 'body', 'legs']);

export const CHARACTER_COLORS = Object.freeze([
  '#FFCCBC', '#FCE8B2', '#ffffba', '#d0ebaf',
  '#ACC9FE', '#cdccfa', '#ffe4ef', '#ebd0fa',
  '#A2E8F1', '#96d3ce', '#c0e2f1', '#ffffff',
]);

export const PATTERNS = Object.freeze([
  { id: 'pattern-01', assetPath: resolvePath(`${ASSET_ROOT}/pattern/pattern-01.svg`) },
  { id: 'pattern-02', assetPath: resolvePath(`${ASSET_ROOT}/pattern/pattern-02.svg`) },
  { id: 'pattern-03', assetPath: resolvePath(`${ASSET_ROOT}/pattern/pattern-03.svg`) },
  { id: 'pattern-04', assetPath: resolvePath(`${ASSET_ROOT}/pattern/pattern-04.svg`) },
  { id: 'pattern-05', assetPath: resolvePath(`${ASSET_ROOT}/pattern/pattern-05.svg`) },
  { id: 'pattern-06', assetPath: resolvePath(`${ASSET_ROOT}/pattern/pattern-06.svg`) },
]);

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

export const GRADIENT_PRESETS = [
  { id: 'grad-linear-0', type: 'linear', x1: '0%', y1: '0%', x2: '0%', y2: '100%' },
  { id: 'grad-linear-45', type: 'linear', x1: '0%', y1: '0%', x2: '100%', y2: '100%' },
  { id: 'grad-linear-90', type: 'linear', x1: '0%', y1: '0%', x2: '100%', y2: '0%' },
  { id: 'grad-linear-135', type: 'linear', x1: '0%', y1: '100%', x2: '100%', y2: '0%' },
  { id: 'grad-radial-center', type: 'radial', cx: '50%', cy: '50%', r: '60%' },
  { id: 'grad-radial-tr', type: 'radial', cx: '75%', cy: '13.33%', r: '75%' },
  { id: 'grad-radial-br', type: 'radial', cx: '75%', cy: '86.67%', r: '75%' },
  { id: 'grad-radial-tl', type: 'radial', cx: '25%', cy: '13.33%', r: '75%' },
  { id: 'grad-radial-bl', type: 'radial', cx: '25%', cy: '86.67%', r: '75%' },
];

export function pickRandomMixStyle(excludedId = null) {
  const patternIds = PATTERNS.map((p) => p.id);
  const gradientIds = GRADIENT_PRESETS.map((g) => g.id);
  const allIds = [...patternIds, ...gradientIds];

  let candidates = allIds.filter((id) => id !== excludedId);
  if (candidates.length === 0) candidates = allIds;

  return candidates[Math.floor(Math.random() * candidates.length)];
}

