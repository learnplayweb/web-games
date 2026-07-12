/**
 * 캐릭터 에셋 카탈로그
 * 이름, 가격, SVG 파일명, 희귀도, 랜덤박스 포함 여부 등
 * 
 * 이 파일은 `characters/assets/` 아래의 파일 경로와 메타데이터만 관리한다.
 * 에셋을 추가할 때는 해당 목록에 데이터만 추가하면 되며, 화면 렌더링이나
 * SVG 로드 같은 동작은 이 파일에서 하지 않는다.
 */

/** `characterData.js`를 기준으로 한 캐릭터 에셋 루트 경로. */
const ASSET_ROOT = 'assets';

/**
 * 꼬무리의 기본 신체 에셋. 캐릭터 구성에 공통으로 사용한다.
 * 상체를 조합하면 팔을, 하체까지 조합하면 다리를 적용한다.
 */
export const BODY_ASSETS = Object.freeze({
  arms: `${ASSET_ROOT}/arms.svg`,
  legs: `${ASSET_ROOT}/legs.svg`,
});

/**
 * 표정 에셋. 머리(파츠 하나)에 idle을 기본 적용한다.
 * 문제를 맞히거나 틀리면 반응하도록 구현할 수 있다.
 * 상태 키(idle, correct, wrong)를 추가하면 게임·미리보기에서 같은 키로
 * 표정을 선택할 수 있다.
 */
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

/**
 * 장착 가능한 파츠 카탈로그.
 *
 * 카테고리별 배열에 항목을 추가하는 것만으로 파츠를 확장할 수 있다.
 * 현재 에셋 구조에서는 모든 p-*.svg를 head 카테고리로 관리한다.
 */
export const PARTS_BY_CATEGORY = Object.freeze({
  head: Object.freeze([
    { id: 'circle', name: '원', assetPath: `${ASSET_ROOT}/parts/p-circle.svg` },
    { id: 'diamond', name: '마름모', assetPath: `${ASSET_ROOT}/parts/p-diamond.svg` },
    { id: 'lens', name: '렌즈', assetPath: `${ASSET_ROOT}/parts/p-lens.svg` },
    { id: 'square', name: '네모', assetPath: `${ASSET_ROOT}/parts/p-square.svg` },
    { id: 'star', name: '별', assetPath: `${ASSET_ROOT}/parts/p-star.svg` },
    { id: 'triangle-down', name: '역세모', assetPath: `${ASSET_ROOT}/parts/p-triangle-d.svg` },
    { id: 'triangle-up', name: '세모', assetPath: `${ASSET_ROOT}/parts/p-triangle-u.svg` },
  ]),
});

/**
 * 상점 색상 팔레트.
 * 색상은 화면과 무관한 HEX 문자열로만 보관해 미리보기·게임·상점에서 공유한다.
 */
export const CHARACTER_COLORS = Object.freeze([
  '#FFCCBC', '#FCE8B2', '#ffffba', '#C4E2A0',
  '#ACC9FE', '#C4C3F7', '#FAE5EA', '#F6E1CF',
  '#A2E8F1', '#8CD3CD', '#BBC8CE, '#ffffff',
]);

/**
 * 카테고리와 id로 파츠 정보를 찾는다.
 * 존재하지 않는 파츠는 null을 반환해 호출자가 안전하게 기본값을 사용할 수 있다.
 */
export function getPart(category, id) {
  return PARTS_BY_CATEGORY[category]?.find((part) => part.id === id) ?? null;


/**
 * 상점 및 캐릭터 관련 비용 전체 가격표
 * 모든 비용은 Gold 기준으로 관리한다.
 * 밸런스 변경 시 이 값만 수정하면 된다.
 */
export const SHOP_COST = Object.freeze({
  // 파츠
  partPurchase: 100,
  partRandomPurchase: 70,
  partApply: 10,
  partCombine: 50,
  partRecombine: 30,
  partDismantle: 50,

  // 캐릭터
  renameCharacter: 10,

  // 색상
  colorPurchase: 100,
  colorRandomPurchase: 70,
  colorApply: 10,
  colorMix: 50,
  colorRemix: 30,
});
}
