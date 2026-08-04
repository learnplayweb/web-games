// v0.1.0 : 최초 생성
// v0.1.1 : Fix - replaceSvgContent() viewBox 여백 제거 (2배 확대, 고정 비율)
// v0.1.2 : Fix - 고정 비율 대신 실제 도형 bounding box(getBBox) 기반으로
//          viewBox를 재계산하도록 변경. 파일별 여백 차이로 도형이 잘리던
//          문제 해결.
// v0.1.3 : Refactor - embedSvgFragment()가 x/y/width/height를 인자로 받던 방식을
//          제거. 슬롯의 위치·크기는 호출부 SVG(<svg id="..." x y width height>)에서
//          미리 지정해두고, 이 함수는 그 슬롯 엘리먼트에 내용(children)과 viewBox만
//          채워 넣는다. → "위치/크기 = HTML, 표시할 대상 = JS" 역할 분리.
// v0.1.4 : Refactor - "SVG 제작 규격"(모든 캐릭터 SVG는 viewBox="0 0 160 160",
//          중심좌표 (80,80) 기준)이 확정됨에 따라 embedSvgFragment()가 원본 파일에서
//          viewBox를 읽어와 슬롯에 반영하던 동작을 제거. viewBox는 이제 규격값으로
//          고정되어 있으므로 슬롯 쪽 HTML에 정적으로 선언해두면 되고, 이 함수는
//          정말로 "내용(children)만" 채워 넣는다.
//
// Public API
// - replaceSvgContent(svgElement, path): 단일 SVG 슬롯(자체 viewBox 보유)의
//   내용을 fetch한 파일로 교체하고, 실제 도형 bbox 기준으로 viewBox를 재계산한다.
//   (예: 파츠 아이콘처럼 그 자체로 완결된 미리보기 슬롯. 규격을 따르지 않는 임의
//   크기의 아이콘 프리뷰에 적합하므로 이 동작은 유지한다.)
// - embedSvgFragment(slotElement, path): 이미 위치(x, y)·표시 크기(width, height)·
//   viewBox(규격상 "0 0 160 160"으로 고정)가 지정된 슬롯 <svg> 엘리먼트에 fetch한
//   SVG의 내용만 삽입한다. 슬롯의 x/y/width/height/viewBox는 전혀 건드리지 않는다.
//   같은 레벨(예: 머리 파츠 + 눈 + 입)의 슬롯은 서로 동일한 x/y/width/height/viewBox를
//   가지므로, 파츠를 교체해도 위치를 다시 맞출 필요가 없다.

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