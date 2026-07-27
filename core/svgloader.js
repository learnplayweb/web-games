// v0.1.0 : 최초 생성
// v0.1.1 : Fix - replaceSvgContent() viewBox 여백 제거 (2배 확대, 고정 비율)
// v0.1.2 : Fix - 고정 비율 대신 실제 도형 bounding box(getBBox) 기반으로
//          viewBox를 재계산하도록 변경. 파일별 여백 차이로 도형이 잘리던
//          문제 해결.

const SVG_NS = 'http://www.w3.org/2000/svg';

// 동일 경로 중복 fetch를 막기 위한 캐시 (경로 → 원본 SVG 텍스트)
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
 * 기존 <svg> 엘리먼트 내용을 fetch한 SVG로 통째로 교체한다.
 * 원본 파일의 viewBox를 그대로 믿지 않고, DOM에 삽입한 뒤 실제로 그려진
 * 도형의 bounding box를 측정해 그 좌표로 viewBox를 다시 잡는다.
 * → 파일마다 여백이 달라도 항상 도형에 꽉 차게(약간의 여유만 두고) 표시된다.
 */
export async function replaceSvgContent(svgElement, path) {
  const root = await parseSvgRoot(path);

  svgElement.replaceChildren(
    ...Array.from(root.childNodes).map((node) => node.cloneNode(true)),
  );

  // svgElement가 DOM에 붙어 있어야 getBBox()가 정확한 값을 반환한다.
  const bbox = svgElement.getBBox();
  if (bbox.width > 0 && bbox.height > 0) {
    // stroke가 path 경계 바깥으로 삐져나오는 경우를 대비해 10% 여유를 둔다.
    const paddingX = bbox.width * 0.1;
    const paddingY = bbox.height * 0.1;
    svgElement.setAttribute(
      'viewBox',
      `${bbox.x - paddingX} ${bbox.y - paddingY} ${bbox.width + paddingX * 2} ${bbox.height + paddingY * 2}`,
    );
  }

  return svgElement;
}

/**
 * 기존 svg 내부의 특정 좌표에 nested <svg>로 fetch한 SVG를 삽입한다.
 * nested svg는 원본 viewBox를 그대로 사용하므로 frame 크기에 맞춰
 * 비율이 유지된 채 자동으로 축소/확대된다.
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