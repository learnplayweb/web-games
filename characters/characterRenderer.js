// v0.2.1
// Character Renderer
// - Fix: 애니메이션 타겟을 슬롯(<svg>)에서 삽입 내용물을 감싸는 그룹(<g>)으로 변경하여 회전축 밀림 현상 해결

import { embedSvgFragment, fetchSvgFragmentRoot } from '../core/svgloader.js';
import { BODY_ASSETS, FACE_ASSETS, GRADIENT_PRESETS, PATTERNS, getPart } from './characterData.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

const SLOT_DEFINITIONS = [
  { id: 'head-part-slot', x: 0, y: 20, width: 160, height: 160, animClass: 'anim-head' },
  { id: 'face-eyes-slot', x: 0, y: 20, width: 160, height: 160, animClass: 'anim-head' },
  { id: 'face-mouth-slot', x: 0, y: 20, width: 160, height: 160, animClass: 'anim-head' },
  { id: 'body-part-slot', x: 35, y: 124, width: 90, height: 90, animClass: 'anim-body' },
  { id: 'left-arm-slot', x: 30, y: 118, width: 100, height: 100, animClass: 'anim-left-arm' },
  { id: 'right-arm-slot', x: 30, y: 118, width: 100, height: 100, animClass: 'anim-right-arm' },
  { id: 'leg-part-slot', x: 35, y: 174, width: 90, height: 90, animClass: 'anim-body-lower' },
  { id: 'left-leg-slot', x: 30, y: 173, width: 100, height: 100, animClass: 'anim-left-leg' },
  { id: 'right-leg-slot', x: 30, y: 173, width: 100, height: 100, animClass: 'anim-right-leg' },
];

const COLOR_TARGET_SLOT_IDS = ['head-part-slot', 'body-part-slot', 'leg-part-slot'];
const PATTERN_GROUP_IDS = ['pattern-a', 'pattern-b', 'pattern-c'];

const FILL_PART_ID_BY_SLOT = {
  'head-part-slot': 'head-fill-part',
  'body-part-slot': 'body-fill-part',
  'leg-part-slot': 'leg-fill-part',
};

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
      // 기존에 슬롯(<svg>) 자체에 주던 animClass 삭제
      root.appendChild(slot);
    }
  });

  return root;
}

/**
 * 에셋을 불러와 슬롯에 삽입하되, 내용물 전체를 <g class="animClass">로 감싸서 넣는 헬퍼 함수
 */
async function embedAndWrapAnim(slotElement, assetPath, animClass) {
  await embedSvgFragment(slotElement, assetPath);
  
  // 삽입된 모든 자식 요소를 모음
  const children = Array.from(slotElement.childNodes);
  if (children.length === 0) return;

  // 래퍼 <g> 생성 및 클래스 부여
  const wrapper = document.createElementNS(SVG_NS, 'g');
  if (animClass) wrapper.classList.add(animClass);

  // 자식 요소들을 래퍼 안으로 이동
  children.forEach(child => wrapper.appendChild(child));
  
  // 래퍼를 슬롯에 삽입
  slotElement.appendChild(wrapper);
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

export async function renderCharacterSvg(svgElement, config) {
  const {
    head, body, legs,
    color, colorMix,
    expression = 'idle',
    animation = 'idle',
    placeholderText = '아직 꼬무리가 없어요'
  } = config;

  Array.from(svgElement.classList).forEach(cls => {
    if (cls.startsWith('state-')) svgElement.classList.remove(cls);
  });
  if (animation) svgElement.classList.add(`state-${animation}`);

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
      textEl.setAttribute('x', '80');
      textEl.setAttribute('y', '100');
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
  
  pendingEmbeds.push(embedAndWrapAnim(root.querySelector('#face-eyes-slot'), FACE_ASSETS.eyes[expression] || FACE_ASSETS.eyes.idle, 'anim-head'));
  pendingEmbeds.push(embedAndWrapAnim(root.querySelector('#face-mouth-slot'), FACE_ASSETS.mouth[expression] || FACE_ASSETS.mouth.idle, 'anim-head'));

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