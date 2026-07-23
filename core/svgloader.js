/**
 * SVG 인라인 로더 (DOM 전용)
 * v0.1.0 : 최초 생성 - fetch 기반 inline SVG 삽입 유틸
 *
 * character.js / characterData.js는 DOM, fetch, localStorage에 접근하지 않는
 * 순수 상태 모듈이다 (character.js 상단 주석 참고). 실제 SVG 파일을 불러와
 * 화면에 삽입하는 책임은 이 모듈이 담당하며, 상점/미리보기/게임 화면 어디서든
 * 동일한 방식으로 재사용할 수 있도록 만든다.
 *
 * <img src="...svg">를 쓰지 않고 fetch()로 SVG 텍스트를 읽어 DOM에 직접 삽입한다.
 * → 이후 JS에서 삽입된 SVG 내부 요소(색상 변경 등)를 자유롭게 제어할 수 있다.
 *
 * 제공 함수 2가지
 * 1) replaceSvgContent(svgElement, path)
 *    - 이미 존재하는 <svg> 엘리먼트 내용을 fetch한 SVG로 통째로 교체한다.
 *    - viewBox도 원본 파일 기준으로 갱신된다.
 *    - 파츠 아이콘처럼 그 자체로 독립된 <svg>를 채울 때 사용한다.
 *
 * 2) embedsvgFragment(parentElement, path, frame)
 *    - 기존 svg(또는 svg 내부 <g>) 안의 특정 좌표(x, y, width, height)에
 *      nested <svg>로 삽입한다.
 *    - nested svg는 원본 viewBox를 그대로 사용하므로 frame 크기에 맞춰
 *      비율이 유지된 채 자동으로 축소/확대된다 (SVG 기본 preserveAspectRatio).
 *    - 캐릭터 placeholder 위에 눈/입처럼 다른 svg를 얹어야 할 때 사용한다.
 */

const SVG_NS = 'http://www.w3.org/2000/svg';

/** 동일 경로 중복 fetch를 막기 위한 캐시. 값은 원본 SVG 텍스트. */
const svgTextCache = new Map();

async function fetchSvgText(path) {
  if (svgTextCache.has(path)) return svgTextCache.get(path);

  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`SVG 로드 실패: ${path} (${response.status})`);
  }

  const text = await response.text();
  svgTextCache.set(path, text);
  return text;
}

/** SVG 텍스트를 파싱해 <svg> 루트 엘리먼트를 반환한다. */
async function parseSvgRoot(path) {
  const svgText = await fetchSvgText(path);
  const parsed = new DOMParser().parseFromString(svgText, 'image/svg+xml');
  const root = parsed.documentElement;

  if (root.nodeName !== 'svg') {
    throw new Error(`유효한 SVG 파일이 아닙니다: ${path}`);
  }

  return root;
}

/**
 * 기존 <svg> 엘리먼트의 내용을 fetch한 SVG로 통째로 교체한다.
 * @param {SVGSVGElement} svgElement 내용을 채울 대상 <svg>
 * @param {string} path 불러올 SVG 파일 경로
 */
export async function replaceSvgContent(svgElement, path) {
  const root = await parseSvgRoot(path);

  const viewBox = root.getAttribute('viewBox');
  if (viewBox) svgElement.setAttribute('viewBox', viewBox);

  svgElement.replaceChildren(
    ...Array.from(root.childNodes).map((node) => node.cloneNode(true)),
  );

  return svgElement;
}

/**
 * 기존 svg 내부의 특정 좌표에 nested <svg>로 fetch한 SVG를 삽입한다.
 * @param {SVGElement} parentElement 삽입될 부모(svg 또는 g)
 * @param {string} path 불러올 SVG 파일 경로
 * @param {{x?: number, y?: number, width: number, height: number}} frame 배치할 위치/크기
 * @returns {Promise<SVGSVGElement>} 새로 생성된 nested <svg>
 */
export async function embedSvgFragment(parentElement, path, { x = 0, y = 0, width, height } = {}) {
  const root = await parseSvgRoot(path);
  const viewBox = root.getAttribute('viewBox')
    ?? `0 0 ${root.getAttribute('width') ?? width} ${root.getAttribute('height') ?? height}`;

  const nested = document.createElementNS(SVG_NS, 'svg');
  nested.setAttribute('x', String(x));
  nested.setAttribute('y', String(y));
  nested.setAttribute('width', String(width));
  nested.setAttribute('height', String(height));
  nested.setAttribute('viewBox', viewBox);
  nested.append(...Array.from(root.childNodes).map((node) => node.cloneNode(true)));

  parentElement.replaceChildren(nested);

  return nested;
}