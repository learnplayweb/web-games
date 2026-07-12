/**
 * 캐릭터 상태 생성기 (캐릭터가 무엇을 하는가)
 * 캐릭터 생성, 화면에 표시, 조합, 해체, 적용, 저장, 불러오기 등

 * 이 모듈은 characterData.js의 카탈로그만 사용해 캐릭터 정보를 만든다.
 * DOM, HTML, SVG fetch, localStorage에는 접근하지 않으므로 상점·미리보기·게임
 * 어느 화면에서도 같은 상태 객체를 재사용할 수 있다.
 */

import {
  BODY_ASSETS,
  CHARACTER_COLORS,
  FACE_ASSETS,
  PARTS_BY_CATEGORY,
  getPart,
} from './characterData.js';

/** 캐릭터를 처음 만들 때 사용할 기본 표정 상태. */
export const DEFAULT_EXPRESSION = 'idle';

/** 캐릭터를 처음 만들 때 사용할 기본 색상. */
export const DEFAULT_COLOR = CHARACTER_COLORS[0];

/**
 * 요청한 색상이 팔레트에 없으면 기본 색상을 반환한다.
 * 색상 데이터는 characterData.js만 변경해 확장할 수 있다.
 */
function resolveColor(color) {
  return CHARACTER_COLORS.includes(color) ? color : DEFAULT_COLOR;
}

/**
 * 카테고리별 장착 파츠 id를 검증하고, 유효하지 않으면 null로 정리한다.
 * 새 파츠 카테고리가 characterData.js에 추가되면 자동으로 결과에 포함된다.
 */
function resolveParts(selectedParts = {}) {
  return Object.fromEntries(
    Object.keys(PARTS_BY_CATEGORY).map((category) => {
      const selectedId = selectedParts[category] ?? null;
      const part = selectedId ? getPart(category, selectedId) : null;

      return [category, part?.id ?? null];
    }),
  );
}

/**
 * 현재 표정에 맞는 얼굴 에셋을 선택한다.
 * 알 수 없는 표정은 idle 상태로 안전하게 되돌린다.
 */
function resolveFaceAssets(expression) {
  const state = FACE_ASSETS.eyes[expression] ? expression : DEFAULT_EXPRESSION;

  return {
    state,
    eyes: FACE_ASSETS.eyes[state],
    mouth: FACE_ASSETS.mouth[state],
  };
}

/**
 * 캐릭터 상태 객체를 생성한다.
 *
 * @param {object} options
 * @param {string|null} [options.name=null] 캐릭터 이름. 저장 기능이 구현되면 전달한다.
 * @param {string} [options.color] 적용할 HEX 색상.
 * @param {string} [options.expression='idle'] 얼굴 표정 상태.
 * @param {object} [options.parts={}] 카테고리별 장착 파츠 id. 예: { head: 'circle' }
 * @returns {object} 렌더링에 필요한 선택값과 에셋 경로를 포함한 순수 상태 객체.
 */
export function createCharacter({
  name = null,
  color = DEFAULT_COLOR,
  expression = DEFAULT_EXPRESSION,
  parts = {},
} = {}) {
  const selectedParts = resolveParts(parts);
  const partAssets = Object.fromEntries(
    Object.entries(selectedParts).map(([category, id]) => [
      category,
      id ? getPart(category, id)?.assetPath ?? null : null,
    ]),
  );

  return {
    name,
    color: resolveColor(color),
    parts: selectedParts,
    assets: {
      body: BODY_ASSETS,
      face: resolveFaceAssets(expression),
      parts: partAssets,
    },
  };
}

/**
 * 기본 캐릭터 상태.
 * 화면별로 상태가 필요할 때는 이 값을 수정하지 말고 createCharacter()를 호출한다.
 */
export const DEFAULT_CHARACTER = Object.freeze(createCharacter());
