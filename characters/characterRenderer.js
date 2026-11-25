// characters v0.4.0 : setCharacterFace 추가 (눈·입 슬롯만 교체, 전체 다시 그리기 없이 표정 변경)
// characterRenderer.js
// - SVG 캐릭터 슬롯 조립 및 렌더링 (head/body/legs/eyes/mouth)
// - 애니메이션 클래스 다중 래핑, 눈 깜빡임 origin 동적 계산
// - 색상 틴트 및 컬러믹스(그라디언트/패턴) 적용
// - 동작: animation('state-*' 한 클래스로 전체 부위) 또는 motions({ body, arms, legs } 슬롯별 'mo-*' 클래스)


import { embedSvgFragment, fetchSvgFragmentRoot } from '../core/svgloader.js';
import { BODY_ASSETS, FACE_ASSETS, GRADIENT_PRESETS, PATTERNS, getPart } from './characterData.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

const SLOT_DEFINITIONS = [
  { id: 'head-part-slot', x: 0, y: 20, width: 160, height: 160 },
  { id: 'face-eyes-slot', x: 0, y: 20, width: 160, height: 160 },
  { id: 'face-mouth-slot', x: 0, y: 20, width: 160, height: 160 },
  { id: 'body-part-slot', x: 35, y: 124, width: 90, height: 90 },
  { id: 'left-arm-slot', x: 30, y: 118, width: 100, height: 100 },
  { id: 'right-arm-slot', x: 30, y: 118, width: 100, height: 100 },
  { id: 'leg-part-slot', x: 35, y: 174, width: 90, height: 90 },
  { id: 'left-leg-slot', x: 30, y: 173, width: 100, height: 100 },
  { id: 'right-leg-slot', x: 30, y: 173, width: 100, height: 100 },
];

const COLOR_TARGET_SLOT_IDS = ['head-part-slot', 'body-part-slot', 'leg-part-slot'];
const PATTERN_GROUP_IDS = ['pattern-a', 'pattern-b', 'pattern-c'];

const FILL_PART_ID_BY_SLOT = {
  'head-part-slot': 'head-fill-part',
  'body-part-slot': 'body-fill-part',
  'leg-part-slot': 'leg-fill-part',
};

// 눈 에셋(FACE_ASSETS.eyes)의 SVG 내부 로컬 좌표 (slot viewBox 0 0 160 160 기준)
// ⚠️ 눈 SVG 에셋 파일 자체를 수정(위치/크기 변경)하면 이 값도 반드시 갱신할 것
const EYE_LOCAL_CENTER = { x: 80, y: 83 };

let colorInstanceCounter = 0;
function nextColorInstanceId() {
  colorInstanceCounter += 1;
  return `ci${colorInstanceCounter}`;
}

function initializeCharacterSvg(svgElement) {
  if (!svgElement.getAttribute('viewBox')) {
    svgElement.setAttribute('viewBox', '0 0 160 300');
  }

  let root = svgElement.querySelector('#character-root');
  if (!root) {
    root = document.createElementNS(SVG_NS, 'g');
    root.id = 'character-root';
    svgElement.appendChild(root);
  }

  SLOT_DEFINITIONS.forEach((def) => {
    let slot = root.querySelector(`#${def.id}`);
    if (!slot) {
      slot = document.createElementNS(SVG_NS, 'svg');
      slot.id = def.id;
      slot.setAttribute('x', def.x);
      slot.setAttribute('y', def.y);
      slot.setAttribute('width', def.width);
      slot.setAttribute('height', def.height);
      slot.setAttribute('viewBox', '0 0 160 160');
      root.appendChild(slot);
    }
  });

  return root;
}

/**
 * 에셋을 불러와 슬롯에 삽입하되, 여러 클래스가 전달되면 <g>를 겹겹이 감싸 개별 애니메이션이 가능하도록 처리
 */
async function embedAndWrapAnim(slotElement, assetPath, animClass) {
  await embedSvgFragment(slotElement, assetPath);
  
  const children = Array.from(slotElement.childNodes);
  if (children.length === 0) return;

  let targetParent = slotElement;

  if (animClass) {
    // 띄어쓰기로 분리하여 각각 새로운 <g>로 래핑
    const classes = animClass.split(' ');
    classes.forEach(cls => {
      if (!cls) return;
      const g = document.createElementNS(SVG_NS, 'g');
      g.classList.add(cls);
      targetParent.appendChild(g);
      targetParent = g;
    });
  } else {
    const g = document.createElementNS(SVG_NS, 'g');
    targetParent.appendChild(g);
    targetParent = g;
  }

  children.forEach(child => targetParent.appendChild(child));
}

function computeCharacterRootTransform(hasBody, hasLegs, viewBoxHeight, headSlot, bodySlot, legSlot) {
  const centerX = Number(headSlot.getAttribute('x')) + Number(headSlot.getAttribute('width')) / 2;
  const top = Number(headSlot.getAttribute('y'));
  let bottomSlot = headSlot;
  if (hasBody) bottomSlot = bodySlot;
  if (hasLegs) bottomSlot = legSlot;
  const bottom = Number(bottomSlot.getAttribute('y')) + Number(bottomSlot.getAttribute('height'));
  const referenceBottom = Number(legSlot.getAttribute('y')) + Number(legSlot.getAttribute('height'));
  const referenceHeight = referenceBottom - top;
  const scale = referenceHeight / (bottom - top);
  const offsetX = centerX * (1 - scale);
  const offsetY = (viewBoxHeight / 2) - ((top + bottom) / 2) * scale;
  return `translate(${offsetX}, ${offsetY}) scale(${scale})`;
}

function isFillLayer(shape) {
  const effectiveFill = shape.style.fill || shape.getAttribute('fill');
  return Boolean(effectiveFill) && effectiveFill !== 'none';
}

function applyColorTint(svgRoot, color) {
  COLOR_TARGET_SLOT_IDS.forEach((slotId) => {
    const slot = svgRoot.querySelector(`#${slotId}`);
    if (!slot) return;
    slot.querySelectorAll('path, circle, ellipse, polygon, rect').forEach((shape) => {
      if (shape.getAttribute('fill') === 'none' && !shape.style.fill) return;
      shape.setAttribute('fill', color);
      shape.style.setProperty('fill', color, 'important');
    });
  });
}

function stampFillPartId(svgRoot, slotId, instanceId) {
  const slot = svgRoot.querySelector(`#${slotId}`);
  if (!slot) return;
  const shapes = Array.from(slot.querySelectorAll('path, circle, ellipse, polygon, rect'));
  const fillPart = shapes.find((shape) => shape.id.includes('fill-part'))
    || shapes.find(isFillLayer)
    || shapes.find((shape) => shape.getAttribute('fill') !== 'none');
  if (fillPart) fillPart.id = `${FILL_PART_ID_BY_SLOT[slotId]}-${instanceId}`;
}

function setEyesBlinkOrigin(root) {
  const eyeSlot = root.querySelector('#face-eyes-slot');
  const slotX = Number(eyeSlot.getAttribute('x'));
  const slotY = Number(eyeSlot.getAttribute('y'));

  const centerX = slotX + EYE_LOCAL_CENTER.x;
  const centerY = slotY + EYE_LOCAL_CENTER.y;

  eyeSlot.style.transformOrigin = `${centerX}px ${centerY}px`;
}

function clearColorMixOverlay(svgRoot) {
  svgRoot.querySelectorAll('[id^="character-color-rect-"]').forEach((el) => el.remove());
  svgRoot.querySelectorAll('defs').forEach((defs) => {
    defs.querySelectorAll('[id^="character-color-clip-"], [id^="character-color-pattern-"]').forEach((el) => el.remove());
  });
  COLOR_TARGET_SLOT_IDS.forEach((slotId) => {
    const slot = svgRoot.querySelector(`#${slotId}`);
    if (!slot) return;
    slot.querySelectorAll('path, circle, ellipse, polygon, rect').forEach((shape) => {
      if (shape.style.fill === 'none') shape.style.removeProperty('fill');
    });
  });
}

async function applyColorMixToRoot(svgRoot, patternId, colors, instanceId) {
  clearColorMixOverlay(svgRoot);
  let defs = Array.from(svgRoot.children).find((el) => el.tagName.toLowerCase() === 'defs');
  if (!defs) {
    defs = document.createElementNS(SVG_NS, 'defs');
    svgRoot.insertBefore(defs, svgRoot.firstChild);
  }
  const gradientPreset = GRADIENT_PRESETS.find((g) => g.id === patternId);
  if (gradientPreset) {
    const gradElId = `character-color-pattern-${instanceId}`;
    const tagName = gradientPreset.type === 'linear' ? 'linearGradient' : 'radialGradient';
    const gradEl = document.createElementNS(SVG_NS, tagName);
    gradEl.setAttribute('id', gradElId);
    if (gradientPreset.type === 'linear') {
      gradEl.setAttribute('x1', gradientPreset.x1); gradEl.setAttribute('y1', gradientPreset.y1);
      gradEl.setAttribute('x2', gradientPreset.x2); gradEl.setAttribute('y2', gradientPreset.y2);
    } else {
      gradEl.setAttribute('cx', gradientPreset.cx); gradEl.setAttribute('cy', gradientPreset.cy);
      gradEl.setAttribute('r', gradientPreset.r);
    }
    const uniqueColors = [...new Set(colors)];
    const stops = uniqueColors.length === 2
      ? [{ offset: '0%', color: uniqueColors[0] }, { offset: '100%', color: uniqueColors[1] }]
      : [{ offset: '0%', color: colors[0] }, { offset: '50%', color: colors[1] }, { offset: '100%', color: colors[2] }];
    stops.forEach(({ offset, color }) => {
      const stop = document.createElementNS(SVG_NS, 'stop');
      stop.setAttribute('offset', offset); stop.setAttribute('stop-color', color);
      gradEl.appendChild(stop);
    });
    defs.appendChild(gradEl);
    COLOR_TARGET_SLOT_IDS.forEach((slotId) => {
      const slot = svgRoot.querySelector(`#${slotId}`);
      if (!slot) return;
      slot.querySelectorAll('path, circle, ellipse, polygon, rect').forEach((shape) => {
        if (shape.getAttribute('fill') === 'none' && !shape.style.fill) return;
        shape.setAttribute('fill', `url(#${gradElId})`);
        shape.style.setProperty('fill', `url(#${gradElId})`, 'important');
      });
    });
  } else {
    const patternDef = PATTERNS.find((pattern) => pattern.id === patternId);
    if (!patternDef) return;
    const patternRoot = await fetchSvgFragmentRoot(patternDef.assetPath);
    let patternGroup = patternRoot.querySelector('#pattern')?.cloneNode(true);
    if (!patternGroup && patternRoot.id === 'pattern') patternGroup = patternRoot.cloneNode(true);
    if (!patternGroup) return;
    PATTERN_GROUP_IDS.forEach((groupId, index) => {
      const shape = patternGroup.querySelector(`#${groupId}`);
      if (shape) {
        const chosenColor = colors[index] ?? colors[colors.length - 1];
        shape.setAttribute('fill', chosenColor);
        shape.style.setProperty('fill', chosenColor, 'important');
      }
    });
    const patternElId = `character-color-pattern-${instanceId}`;
    const patternEl = document.createElementNS(SVG_NS, 'pattern');
    patternEl.setAttribute('id', patternElId);
    patternEl.setAttribute('patternUnits', 'userSpaceOnUse');
    patternEl.setAttribute('width', '160');
    patternEl.setAttribute('height', '300');
    patternEl.setAttribute('viewBox', '0 0 160 300');
    patternEl.appendChild(patternGroup);
    defs.appendChild(patternEl);
    COLOR_TARGET_SLOT_IDS.forEach((slotId) => {
      const slot = svgRoot.querySelector(`#${slotId}`);
      if (!slot) return;
      slot.querySelectorAll('path, circle, ellipse, polygon, rect').forEach((shape) => {
        if (shape.getAttribute('fill') === 'none' && !shape.style.fill) return;
        shape.setAttribute('fill', `url(#${patternElId})`);
        shape.style.setProperty('fill', `url(#${patternElId})`, 'important');
      });
    });
  }
}

// 눈·입 표정 교체 요청마다 번호를 매겨, 느리게 도착한 이전 요청이 나중에 덮어쓰지 못하게 한다
let faceSwapCounter = 0;

async function swapFaceAsset(wrapper, assetPath) {
  faceSwapCounter += 1;
  const token = String(faceSwapCounter);
  wrapper.dataset.faceToken = token;

  const assetRoot = await fetchSvgFragmentRoot(assetPath); // 에셋 텍스트는 svgloader가 캐시하므로 두 번째부터는 즉시

  // 더 새로운 교체 요청이 있었거나, 그 사이 캐릭터가 다시 그려져 이 래퍼가 사라졌으면 쓰지 않는다
  if (wrapper.dataset.faceToken !== token || !wrapper.isConnected) return;
  wrapper.replaceChildren(...Array.from(assetRoot.childNodes).map((node) => node.cloneNode(true)));
}

/**
 * 눈·입 표정만 바꾼다 (캐릭터 전체를 다시 그리지 않음).
 * - eyes / mouth: FACE_ASSETS의 키. 지정하지 않은 쪽은 그대로 둔다.
 * - 슬롯 안의 애니메이션 래퍼(<g class="anim-head anim-eyes"> 등)는 그대로 두고 내용만 교체하므로,
 *   둥실둥실 같은 동작이 처음부터 다시 시작해 머리와 어긋나는 일이 없다.
 * - 아직 그려지지 않았거나 머리가 없는 상태(플레이스홀더)면 아무것도 하지 않고 false를 돌려준다.
 *   (호출부가 renderCharacterSvg로 전체를 그리면 된다)
 */
export async function setCharacterFace(svgElement, { eyes, mouth } = {}) {
  const root = svgElement.querySelector('#character-root');
  const eyeWrapper = root?.querySelector('#face-eyes-slot g.anim-eyes');
  const mouthWrapper = root?.querySelector('#face-mouth-slot > g.anim-head');
  if (!eyeWrapper || !mouthWrapper) return false;

  const jobs = [];
  if (eyes !== undefined) jobs.push(swapFaceAsset(eyeWrapper, FACE_ASSETS.eyes[eyes] || FACE_ASSETS.eyes.idle));
  if (mouth !== undefined) jobs.push(swapFaceAsset(mouthWrapper, FACE_ASSETS.mouth[mouth] || FACE_ASSETS.mouth.idle));
  await Promise.all(jobs);
  return true;
}

// 동작 슬롯: body(머리+눈·입+상체+하체), arms(좌우 팔), legs(좌우 다리)
const MOTION_SLOTS = ['body', 'arms', 'legs'];

function clearMotionClasses(svgElement) {
  Array.from(svgElement.classList).forEach((cls) => {
    if (cls.startsWith('state-') || cls.startsWith('mo-')) svgElement.classList.remove(cls);
  });
}

/**
 * 슬롯별 동작만 교체한다 (파츠를 다시 불러오지 않으므로 즉시 반영).
 * motions: { body, arms, legs } — 값은 character-anim.css에 정의된 동작 이름 (예: 'bounce'). 지정하지 않은 슬롯은 동작 없음.
 */
export function setCharacterMotions(svgElement, motions) {
  clearMotionClasses(svgElement);
  MOTION_SLOTS.forEach((slot) => {
    const name = motions?.[slot];
    if (name) svgElement.classList.add(`mo-${slot}-${name}`);
  });
}

// motions가 있으면 슬롯별 클래스(mo-*), 없으면 기존 방식(state-<animation>)으로 적용
function applyMotionClasses(svgElement, animation, motions) {
  if (motions) {
    setCharacterMotions(svgElement, {
      body: motions.body ?? animation,
      arms: motions.arms ?? animation,
      legs: motions.legs ?? animation,
    });
    return;
  }
  clearMotionClasses(svgElement);
  if (animation) svgElement.classList.add(`state-${animation}`);
}

export async function renderCharacterSvg(svgElement, config) {
  const {
    head, body, legs,
    color, colorMix,
    expression = 'idle',
    eyes, mouth,
    animation = 'idle',
    motions,
    placeholderText = 'ㅠ _ ㅠ'
  } = config;

  applyMotionClasses(svgElement, animation, motions);

  const root = initializeCharacterSvg(svgElement);

  let outline = svgElement.querySelector('path.placeholder-outline');
  let textEl = svgElement.querySelector('text.placeholder-text');

  if (!head) {
    root.querySelectorAll('svg').forEach((slot) => slot.replaceChildren());
    if (!outline) {
      outline = document.createElementNS(SVG_NS, 'path');
      outline.classList.add('placeholder-outline');
      outline.setAttribute('d', 'M80,20 C105,18 125,35 126,58 C127,82 110,100 85,102 C60,104 42,88 40,64 C38,40 55,22 80,20 Z');
      outline.setAttribute('fill', 'none');
      outline.setAttribute('stroke', '#b0bac6');
      outline.setAttribute('stroke-width', '3');
      outline.setAttribute('stroke-linecap', 'round');
      svgElement.insertBefore(outline, root);
    }
    if (!textEl) {
      textEl = document.createElementNS(SVG_NS, 'text');
      textEl.classList.add('placeholder-text');
      textEl.setAttribute('x', '83'); // 플레이스홀더 내 텍스트 위치
      textEl.setAttribute('y', '80');
      textEl.setAttribute('font-size', '17');
      textEl.setAttribute('fill', '#b0bac6');
      textEl.setAttribute('text-anchor', 'middle');
      svgElement.insertBefore(textEl, root);
    }
    outline.style.display = '';
    textEl.textContent = placeholderText;
    textEl.style.display = '';
    return;
  }

  if (outline) outline.style.display = 'none';
  if (textEl) textEl.style.display = 'none';

  const pendingEmbeds = [];

  const headPart = getPart(head);
  if (headPart) pendingEmbeds.push(embedAndWrapAnim(root.querySelector('#head-part-slot'), headPart.assetPath, 'anim-head'));
  
  const eyeState = eyes || expression;
  const mouthState = mouth || expression;

  // 눈 슬롯에 'anim-head' (둥실둥실) 와 'anim-eyes' (깜빡임) 동시 적용 (띄어쓰기)
  pendingEmbeds.push(embedAndWrapAnim(root.querySelector('#face-eyes-slot'), FACE_ASSETS.eyes[eyeState] || FACE_ASSETS.eyes.idle, 'anim-head anim-eyes'));
  pendingEmbeds.push(embedAndWrapAnim(root.querySelector('#face-mouth-slot'), FACE_ASSETS.mouth[mouthState] || FACE_ASSETS.mouth.idle, 'anim-head'));

  if (body) {
    const bodyPart = getPart(body);
    if (bodyPart) pendingEmbeds.push(embedAndWrapAnim(root.querySelector('#body-part-slot'), bodyPart.assetPath, 'anim-body'));
    pendingEmbeds.push(embedAndWrapAnim(root.querySelector('#left-arm-slot'), BODY_ASSETS.leftArm, 'anim-left-arm'));
    pendingEmbeds.push(embedAndWrapAnim(root.querySelector('#right-arm-slot'), BODY_ASSETS.rightArm, 'anim-right-arm'));
  } else {
    root.querySelector('#body-part-slot').replaceChildren();
    root.querySelector('#left-arm-slot').replaceChildren();
    root.querySelector('#right-arm-slot').replaceChildren();
  }

  if (legs) {
    const legPart = getPart(legs);
    if (legPart) pendingEmbeds.push(embedAndWrapAnim(root.querySelector('#leg-part-slot'), legPart.assetPath, 'anim-body-lower'));
    pendingEmbeds.push(embedAndWrapAnim(root.querySelector('#left-leg-slot'), BODY_ASSETS.leftLeg, 'anim-left-leg'));
    pendingEmbeds.push(embedAndWrapAnim(root.querySelector('#right-leg-slot'), BODY_ASSETS.rightLeg, 'anim-right-leg'));
  } else {
    root.querySelector('#leg-part-slot').replaceChildren();
    root.querySelector('#left-leg-slot').replaceChildren();
    root.querySelector('#right-leg-slot').replaceChildren();
  }

  const viewBoxHeight = Number((svgElement.getAttribute('viewBox') || '').split(/\s+/)[3] || 300);
  root.setAttribute('transform', computeCharacterRootTransform(
    !!body, !!legs, viewBoxHeight,
    root.querySelector('#head-part-slot'),
    root.querySelector('#body-part-slot'),
    root.querySelector('#leg-part-slot')
  ));

  await Promise.all(pendingEmbeds);
  setEyesBlinkOrigin(root);

  const instanceId = nextColorInstanceId();
  stampFillPartId(svgElement, 'head-part-slot', instanceId);
  if (body) stampFillPartId(svgElement, 'body-part-slot', instanceId);
  if (legs) stampFillPartId(svgElement, 'leg-part-slot', instanceId);

  if (colorMix) {
    await applyColorMixToRoot(svgElement, colorMix.patternId, colorMix.colors, instanceId);
  } else {
    clearColorMixOverlay(svgElement);
    if (color) applyColorTint(svgElement, color);
  }
}