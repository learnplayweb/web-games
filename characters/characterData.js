// v0.1.10 : 
// - 효과(Effect) 데이터 및 가격 정보 추가// Character Data (캐릭터용 데이터 카탈로그)
// - 랜덤 추출을 위한 표정 및 애니메이션 키 배열 추가
// - 에셋 경로(assetPath)를 외부 모듈(게임 화면 등)에서도 정상적으로 참조할 수 있도록 import.meta.url 기반 절대 경로로 변경
// - Feat: 색 섞기용 선형(4방향) 및 방사형(5좌표) SVG 그래디언트 프리셋(GRADIENT_PRESETS) 및 통합 추첨(pickRandomMixStyle) 목록
// - BODY_ASSETS/FACE_ASSETS: 좌우 분리된 팔·다리, 표정별 눈·입 에셋 경로
// - BASE_PARTS/PART_CATEGORIES: 머리/상체/하체가 공유하는 파츠 목록과 부위 목록
// - CHARACTER_COLORS/PATTERNS: 구매 가능한 색상 팔레트, 색 섞기용 패턴 목록
// - SHOP_COST: 구매/적용/조합/해체/색상 관련 비용 상수



// 1. 가장 먼저 경로 관련 변수와 함수를 정의해야 아래에서 쓸 수 있습니다.
const ASSET_ROOT = './assets';

function resolvePath(relativePath) {
  return new URL(relativePath, import.meta.url).href;
}

// 2. 표정/애니메이션 키
export const EXPRESSION_KEYS = Object.freeze(['idle', 'correct', 'wrong']);
export const ANIMATION_KEYS = Object.freeze(['idle', 'correct', 'wrong']);

// 3. 파티클 방식의 효과 배열 (assetPath 대신 uiClass 사용)
export const EFFECTS = Object.freeze([
  // 단순 효과 (500골드)
  { id: 'stardust', name: '별가루', price: 500, type: 'particle', uiClass: 'ui-eff-stardust' },
  { id: 'sparkle', name: '반짝임', price: 500, type: 'particle', uiClass: 'ui-eff-sparkle' },
  { id: 'ring-burst', name: '링 버스트', price: 500, type: 'particle', uiClass: 'ui-eff-ring-burst' },
  { id: 'heart-pop', name: '하트 팝', price: 500, type: 'particle', uiClass: 'ui-eff-heart-pop' },
  { id: 'spark', name: '불꽃', price: 500, type: 'particle', uiClass: 'ui-eff-spark' },
  { id: 'bubble-pop', name: '비누방울', price: 500, type: 'particle', uiClass: 'ui-eff-bubble-pop' },
  { id: 'ribbon-scatter', name: '리본 흩날림', price: 500, type: 'particle', uiClass: 'ui-eff-ribbon' },
  { id: 'cross-flash', name: '크로스 플래시', price: 500, type: 'particle', uiClass: 'ui-eff-cross-flash' },
  { id: 'falling-leaf', name: '낙엽', price: 500, type: 'particle', uiClass: 'ui-eff-falling-leaf' },
  { id: 'water-drop', name: '물방울', price: 500, type: 'particle', uiClass: 'ui-eff-water-drop' },
  
// 화려한 효과 (1000골드) 10종
  { id: 'firework-launch', name: '폭죽 발사', price: 1000, type: 'particle', uiClass: 'ui-eff-firework' },
  { id: 'spiral-whirl', name: '나선 회오리', price: 1000, type: 'particle', uiClass: 'ui-eff-spiral' },
  { id: 'flame-chain', name: '불꽃 사슬', price: 1000, type: 'particle', uiClass: 'ui-eff-flame' },
  { id: 'shooting-star', name: '별똥별', price: 1000, type: 'particle', uiClass: 'ui-eff-shooting-star' },
  { id: 'mega-ring-burst', name: '메가 링 버스트', price: 1000, type: 'particle', uiClass: 'ui-eff-mega-ring' },
  { id: 'confetti-burst', name: '꽃가루 폭발', price: 1000, type: 'particle', uiClass: 'ui-eff-confetti' },
  { id: 'spark-shower', name: '스파크 소나기', price: 1000, type: 'particle', uiClass: 'ui-eff-spark-shower' },
  { id: 'vortex-blast', name: '볼텍스 블래스트', price: 1000, type: 'particle', uiClass: 'ui-eff-vortex' },
  { id: 'laser-volley', name: '레이저 발리', price: 1000, type: 'particle', uiClass: 'ui-eff-laser-volley' },
  { id: 'cross-laser', name: '크로스 레이저', price: 1000, type: 'particle', uiClass: 'ui-eff-cross-laser' },
]);

export function getEffect(id) {
  return EFFECTS.find((eff) => eff.id === id) ?? null;
}


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
  effectApply: 50, // 효과 장착 비용
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

