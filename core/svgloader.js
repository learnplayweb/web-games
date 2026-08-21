// v0.1.5
// SVG Loader
// - replaceSvgContent: 자체 완결형 슬롯(아이콘 등)에 SVG 삽입, bbox 기준 viewBox 재계산
// - embedSvgFragment: 위치/크기가 이미 정해진 슬롯에 SVG 내용(children)만 삽입
// - fetchSvgFragmentRoot: 슬롯에 바로 넣지 않고 SVG 내용을 커스텀 조립할 때 사용(패턴 등)

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
 * fetch한 SVG 파일을 파싱해 그 root <svg> 엘리먼트를 그대로 반환한다(DOM에 삽입하지
 * 않음). 슬롯에 바로 끼워 넣는 embedSvgFragment와 달리, 내용 일부만 꺼내 쓰거나
 * 커스텀하게 조립해야 하는 경우(예: 색 패턴의 특정 그룹만 색칠해 재사용)에 쓴다.
 */
export async function fetchSvgFragmentRoot(path) {
  return parseSvgRoot(path);
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
 * 슬롯(<svg>) 엘리먼트에 fetch한 SVG의 내용을 삽입한다.
 * 슬롯의 위치(x, y)·표시 크기(width, height)·viewBox는 모두 호출부 마크업
 * (HTML/SVG)에 "SVG 제작 규격"(viewBox="0 0 160 160", 중심좌표 (80,80))에
 * 맞춰 이미 지정되어 있다고 가정하며, 이 함수는 그 값을 읽거나 바꾸지 않는다.
 * 순수하게 내용(children)만 교체한다.
 *
 * @param {SVGSVGElement} slotElement x/y/width/height/viewBox가 이미 지정된 슬롯 <svg>.
 * @param {string} path fetch할 SVG 파일 경로.
 * @returns {Promise<SVGSVGElement>} 내용이 채워진 slotElement.
 */
export async function embedSvgFragment(slotElement, path) {
  const root = await parseSvgRoot(path);

  slotElement.replaceChildren(
    ...Array.from(root.childNodes).map((node) => node.cloneNode(true)),
  );

  return slotElement;
}