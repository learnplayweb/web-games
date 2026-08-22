// v0.1.44
// Character Shop
// - Fix: 색상 적용 및 색 섞기 확정 시점에 refreshColorMixButton 호출을 연동하여 버튼 활성화/비활성화 상태 실시간 동기화
// - 파츠/색상 구매(일반/랜덤)·적용, 조합·재조합·해체, 이름 설정/변경, 색 섞기(패턴 마블링)
// - 조합/재조합/색 섞기는 미리보기 후 확인 시에만 확정, renderCharacterPreview는 큐로 순차 실행
// - #character-root가 조합 단계별로 자동 정렬·확대, 모든 기능 버튼은 조건 기반 활성화


import { createHeader, updateHeaderGold } from '../shared/header.js';
import { replaceSvgContent, embedSvgFragment, fetchSvgFragmentRoot } from '../core/svgloader.js';
import { BODY_ASSETS, FACE_ASSETS, PATTERNS, getPart, SHOP_COST } from './characterData.js';
import {
  getPartQuantity, purchasePart, purchaseRandomPart, getEquippedPart, applyPart,
  canCombine, previewCombine, canRecombine, previewRecombine, confirmCombine,
  canDismantle, dismantleCharacter, canSaveCharacter, canRename, renameCharacter,
  getColorQuantity, purchaseColor, purchaseRandomColor, canApplyColor, applyColor,
  getEquippedColor, getEquippedColorMix,
  canMixColor, canRemixColor, previewColorMix, previewColorRemix, confirmColorMix,
} from './inventory.js';
import { getGold, getCharacterName, setCharacterName } from '../core/saveManager.js';

createHeader();

// ===========================
// 캐릭터 placeholder 렌더링
// ===========================
const characterPlaceholder = document.querySelector('.character-placeholder');
const headOutlinePath = characterPlaceholder.querySelector('path');
const placeholderText = characterPlaceholder.querySelector('text');
const characterRoot = document.getElementById('character-root');
const headPartSlot = document.getElementById('head-part-slot');
const faceEyesSlot = document.getElementById('face-eyes-slot');
const faceMouthSlot = document.getElementById('face-mouth-slot');
const bodyPartSlot = document.getElementById('body-part-slot');
const leftArmSlot = document.getElementById('left-arm-slot');
const rightArmSlot = document.getElementById('right-arm-slot');
const legPartSlot = document.getElementById('leg-part-slot');
const leftLegSlot = document.getElementById('left-leg-slot');
const rightLegSlot = document.getElementById('right-leg-slot');

function getViewBoxHeight(svgElement) {
  const viewBox = svgElement.getAttribute('viewBox') ?? '';
  return Number(viewBox.trim().split(/\s+/)[3] ?? 0);
}

function computeCharacterRootTransform(hasBody, hasLegs, viewBoxHeight) {
  const centerX = Number(headPartSlot.getAttribute('x')) + Number(headPartSlot.getAttribute('width')) / 2;

  const top = Number(headPartSlot.getAttribute('y'));
  let bottomSlot = headPartSlot;
  if (hasBody) bottomSlot = bodyPartSlot;
  if (hasLegs) bottomSlot = legPartSlot;
  const bottom = Number(bottomSlot.getAttribute('y')) + Number(bottomSlot.getAttribute('height'));

  const referenceBottom = Number(legPartSlot.getAttribute('y')) + Number(legPartSlot.getAttribute('height'));
  const referenceHeight = referenceBottom - top;
  const scale = referenceHeight / (bottom - top);

  const offsetX = centerX * (1 - scale);
  const offsetY = (viewBoxHeight / 2) - ((top + bottom) / 2) * scale;

  return `translate(${offsetX}, ${offsetY}) scale(${scale})`;
}

function applyCharacterRootTransform(rootElement, hasBody, hasLegs, viewBoxHeight) {
  rootElement.setAttribute('transform', computeCharacterRootTransform(hasBody, hasLegs, viewBoxHeight));
}

const COLOR_TARGET_SLOT_IDS = ['head-part-slot', 'body-part-slot', 'leg-part-slot'];

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

function stampFillPartId(svgRoot, slotId, instanceId) {
  const slot = svgRoot.querySelector(`#${slotId}`);
  if (!slot) return;

  const shapes = Array.from(slot.querySelectorAll('path, circle, ellipse, polygon, rect'));
  const fillPart = shapes.find((shape) => shape.id.includes('fill-part'))
    || shapes.find(isFillLayer)
    || shapes.find((shape) => shape.getAttribute('fill') !== 'none');

  if (fillPart) fillPart.id = `${FILL_PART_ID_BY_SLOT[slotId]}-${instanceId}`;
}

function stampAllFillPartIds(svgRoot, instanceId) {
  Object.keys(FILL_PART_ID_BY_SLOT).forEach((slotId) => stampFillPartId(svgRoot, slotId, instanceId));
}

function getSlotLocalTransform(slot) {
  const x = Number(slot.getAttribute('x'));
  const y = Number(slot.getAttribute('y'));
  const width = Number(slot.getAttribute('width'));
  return `translate(${x}, ${y}) scale(${width / 160})`;
}

const SVG_NS = 'http://www.w3.org/2000/svg';
const PATTERN_GROUP_IDS = ['pattern-a', 'pattern-b', 'pattern-c'];

function clearColorMixOverlay(svgRoot) {
  svgRoot.querySelectorAll('[id^="character-color-rect-"]').forEach((el) => el.remove());
  // 모든 defs(루트 및 슬롯 내부)에서 패턴 정리
  svgRoot.querySelectorAll('defs').forEach((defs) => {
    defs.querySelectorAll('[id^="character-color-clip-"], [id^="character-color-pattern-"]').forEach((el) => el.remove());
  });

  COLOR_TARGET_SLOT_IDS.forEach((slotId) => {
    const slot = svgRoot.querySelector(`#${slotId}`);
    if (!slot) return;
    slot.querySelectorAll('path, circle, ellipse, polygon, rect').forEach((shape) => {
      if (shape.style.fill === 'none') {
        shape.style.removeProperty('fill');
      }
    });
  });
}

function rescopeColorInstanceIds(svgRoot) {
  const scopedEls = svgRoot.querySelectorAll(
    '[id^="head-fill-part-"], [id^="body-fill-part-"], [id^="leg-fill-part-"], '
    + '[id^="character-color-clip-"], [id^="character-color-pattern-"], [id^="character-color-rect-"]',
  );
  if (scopedEls.length === 0) return;

  const newInstanceId = nextColorInstanceId();
  const idMap = new Map();
  scopedEls.forEach((el) => {
    const newId = `${el.id.replace(/-[^-]+$/, '')}-${newInstanceId}`;
    idMap.set(el.id, newId);
    el.id = newId;
  });

  svgRoot.querySelectorAll('use[href^="#"]').forEach((use) => {
    const target = idMap.get(use.getAttribute('href').slice(1));
    if (target) use.setAttribute('href', `#${target}`);
  });

  svgRoot.querySelectorAll('[fill^="url(#"], [clip-path^="url(#"]').forEach((el) => {
    ['fill', 'clip-path'].forEach((attr) => {
      const value = el.getAttribute(attr);
      if (!value?.startsWith('url(#')) return;
      const target = idMap.get(value.slice(5, -1));
      if (target) el.setAttribute(attr, `url(#${target})`);
    });
  });
}

function prepareSimpleColorPreview(svgRoot) {
  clearColorMixOverlay(svgRoot);
  svgRoot.querySelectorAll('[id^="head-fill-part-"], [id^="body-fill-part-"], [id^="leg-fill-part-"]').forEach((el) => {
    el.removeAttribute('id');
    el.style.removeProperty('fill');
  });
}

/**
 * 색 섞기 결과(패턴 + 최대 3색)를 svgRoot 전체에 적용한다. (최적화 버전)
 * - 최상위 루트 defs에 단 1개의 160x300 pattern만 생성하여 전역 좌표계를 공유
 * - 슬롯별 중복 패턴 생성 및 불필요한 역변환 연산 제거
 */
async function applyColorMixToRoot(svgRoot, patternId, colors, instanceId) {
  const patternDef = PATTERNS.find((pattern) => pattern.id === patternId);
  if (!patternDef) return;

  const patternRoot = await fetchSvgFragmentRoot(patternDef.assetPath);
  let patternGroup = patternRoot.querySelector('#pattern')?.cloneNode(true);
  if (!patternGroup && patternRoot.id === 'pattern') {
    patternGroup = patternRoot.cloneNode(true);
  }
  if (!patternGroup) return;

  // 3가지 색상 주입
  PATTERN_GROUP_IDS.forEach((groupId, index) => {
    const shape = patternGroup.querySelector(`#${groupId}`);
    if (shape) {
      const chosenColor = colors[index] ?? colors[colors.length - 1];
      shape.setAttribute('fill', chosenColor);
      shape.style.setProperty('fill', chosenColor, 'important');
    }
  });

  clearColorMixOverlay(svgRoot);

  // 최상위 루트 svgRoot의 직속 defs 생성/탐색
  let defs = Array.from(svgRoot.children).find((el) => el.tagName.toLowerCase() === 'defs');
  if (!defs) {
    defs = document.createElementNS(SVG_NS, 'defs');
    svgRoot.insertBefore(defs, svgRoot.firstChild);
  }

  // 1개의 단일 공통 패턴 요소 생성 (160x300)
  const patternElId = `character-color-pattern-${instanceId}`;
  const patternEl = document.createElementNS(SVG_NS, 'pattern');
  patternEl.setAttribute('id', patternElId);
  patternEl.setAttribute('patternUnits', 'userSpaceOnUse');
  patternEl.setAttribute('width', '160');
  patternEl.setAttribute('height', '300');
  patternEl.setAttribute('viewBox', '0 0 160 300');
  patternEl.appendChild(patternGroup);
  defs.appendChild(patternEl);

  // 모든 슬롯의 채우기 도형에 동일한 단일 패턴 적용
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

let renderChain = Promise.resolve();

function renderCharacterPreview() {
  renderChain = renderChain.then(() => renderCharacterPreviewOnce());
  return renderChain;
}

async function renderCharacterPreviewOnce() {
  const equippedHeadId = getEquippedPart('head');

  if (!equippedHeadId) {
    headOutlinePath.style.display = 'none';
    headPartSlot.replaceChildren();
    faceEyesSlot.replaceChildren();
    faceMouthSlot.replaceChildren();
    bodyPartSlot.replaceChildren();
    leftArmSlot.replaceChildren();
    rightArmSlot.replaceChildren();
    legPartSlot.replaceChildren();
    leftLegSlot.replaceChildren();
    rightLegSlot.replaceChildren();
    placeholderText.style.display = '';
    return;
  }

  const part = getPart(equippedHeadId);
  headOutlinePath.style.display = 'none';
  placeholderText.style.display = 'none';

  const pendingEmbeds = [
    embedSvgFragment(headPartSlot, part.assetPath),
    embedSvgFragment(faceEyesSlot, FACE_ASSETS.eyes.idle),
    embedSvgFragment(faceMouthSlot, FACE_ASSETS.mouth.idle),
  ];

  const equippedBodyId = getEquippedPart('body');
  if (equippedBodyId) {
    pendingEmbeds.push(embedSvgFragment(bodyPartSlot, getPart(equippedBodyId).assetPath));
    pendingEmbeds.push(embedSvgFragment(leftArmSlot, BODY_ASSETS.leftArm));
    pendingEmbeds.push(embedSvgFragment(rightArmSlot, BODY_ASSETS.rightArm));
  } else {
    bodyPartSlot.replaceChildren();
    leftArmSlot.replaceChildren();
    rightArmSlot.replaceChildren();
  }

  const equippedLegsId = getEquippedPart('legs');
  if (equippedLegsId) {
    pendingEmbeds.push(embedSvgFragment(legPartSlot, getPart(equippedLegsId).assetPath));
    pendingEmbeds.push(embedSvgFragment(leftLegSlot, BODY_ASSETS.leftLeg));
    pendingEmbeds.push(embedSvgFragment(rightLegSlot, BODY_ASSETS.rightLeg));
  } else {
    legPartSlot.replaceChildren();
    leftLegSlot.replaceChildren();
    rightLegSlot.replaceChildren();
  }

  applyCharacterRootTransform(characterRoot, Boolean(equippedBodyId), Boolean(equippedLegsId), getViewBoxHeight(characterPlaceholder));

  await Promise.all(pendingEmbeds);

  const instanceId = nextColorInstanceId();
  stampFillPartId(characterPlaceholder, 'head-part-slot', instanceId);
  if (equippedBodyId) stampFillPartId(characterPlaceholder, 'body-part-slot', instanceId);
  if (equippedLegsId) stampFillPartId(characterPlaceholder, 'leg-part-slot', instanceId);

  const equippedColorMix = getEquippedColorMix();
  const equippedColor = getEquippedColor();
  if (equippedColorMix) {
    await applyColorMixToRoot(characterPlaceholder, equippedColorMix.patternId, equippedColorMix.colors, instanceId);
  } else {
    clearColorMixOverlay(characterPlaceholder);
    if (equippedColor) applyColorTint(characterPlaceholder, equippedColor);
  }
}

renderCharacterPreview();

// ===========================
// 이름 설정/변경 모달
// ===========================
const nameModal = document.getElementById('name-modal');
const nameModalInput = document.getElementById('name-modal-input');
const nameModalSaveButton = document.getElementById('name-modal-save');
const characterNameLabel = document.querySelector('.character-name');
let nameModalMode = 'create';

function refreshNameModalSaveButton() {
  nameModalSaveButton.disabled = nameModalInput.value.trim().length === 0;
}

nameModalInput.addEventListener('input', () => {
  if (nameModalInput.value.length > 10) {
    nameModalInput.value = nameModalInput.value.slice(0, 10);
  }
  refreshNameModalSaveButton();
});

function openNameModal(mode) {
  nameModalMode = mode;
  nameModalInput.value = mode === 'rename' ? (getCharacterName() ?? '') : '';
  nameModalSaveButton.textContent = mode === 'rename' ? `저장 💎 ${SHOP_COST.renameCharacter}` : '저장';
  refreshNameModalSaveButton();
  nameModal.classList.remove('modal-overlay--hidden');
  nameModalInput.focus();
}

nameModalSaveButton.addEventListener('click', () => {
  const name = nameModalInput.value.trim();
  if (!name) return;

  if (nameModalMode === 'rename') {
    const result = renameCharacter(name);
    if (!result.success) return;
    updateHeaderGold(result.remainingGold);
  } else {
    setCharacterName(name);
  }

  characterNameLabel.textContent = name;
  refreshSaveButton();
  refreshRenameButton();
  refreshColorMixButton();
  nameModal.classList.add('modal-overlay--hidden');
});

nameModal.addEventListener('click', (event) => {
  if (event.target !== nameModal) return;
  if (nameModalMode !== 'rename') return;
  nameModal.classList.add('modal-overlay--hidden');
});

const savedCharacterName = getCharacterName();
if (savedCharacterName) {
  characterNameLabel.textContent = savedCharacterName;
}

// ===========================
// 파츠 슬롯 아이콘 인라인 로딩
// ===========================
const PART_ID_BY_SLOT = {
  1: 'circle',
  2: 'triangle-up',
  3: 'square',
  4: 'diamond',
  5: 'star',
  6: 'lens',
  7: 'triangle-down',
};

document.querySelectorAll('.part-slot[data-part]').forEach((slot) => {
  const slotId = slot.dataset.part;
  if (slotId === 'random') return;

  const partId = PART_ID_BY_SLOT[slotId];
  const part = partId ? getPart(partId) : null;
  if (!part) return;

  const svgElement = slot.querySelector('.part-slot__svg');
  replaceSvgContent(svgElement, part.assetPath);
});

// ===========================
// 파츠 슬롯 보유 수량 배지 갱신
// ===========================
function renderBadgeContent(badge, quantity) {
  const displayNumber = quantity > 99 ? '99' : String(quantity);
  const numberSpan = document.createElement('span');
  numberSpan.textContent = displayNumber;

  if (quantity > 99) {
    const plusSup = document.createElement('sup');
    plusSup.className = 'part-slot__badge-plus';
    plusSup.textContent = '+';
    badge.replaceChildren(numberSpan, plusSup);
  } else {
    badge.replaceChildren(numberSpan);
  }
}

function refreshPartSlot(slot) {
  const slotId = slot.dataset.part;
  if (slotId === 'random') return;

  const partId = PART_ID_BY_SLOT[slotId];
  const quantity = partId ? getPartQuantity(partId) : 0;

  slot.dataset.owned = String(quantity);
  slot.classList.toggle('part-slot--locked', quantity <= 0);

  let badge = slot.querySelector('.part-slot__badge');
  if (quantity > 0) {
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'part-slot__badge';
      slot.appendChild(badge);
    }
    renderBadgeContent(badge, quantity);
  } else if (badge) {
    badge.remove();
  }
}

function refreshAllPartSlots() {
  document.querySelectorAll('.part-slot[data-part]').forEach(refreshPartSlot);
}

refreshAllPartSlots();

// ===========================
// 조합 / 해체 / 저장 / 색 섞기 버튼
// ===========================
const combineButton = document.getElementById('btn-combine');

function refreshCombineButton() {
  combineButton.disabled = !canCombine();
}

combineButton.addEventListener('click', () => {
  const preview = previewCombine();
  if (!preview.success) return;

  updateHeaderGold(preview.remainingGold);
  refreshCombineButton();
  refreshDismantleButton();
  refreshRenameButton();
  refreshColorMixButton();
  openCombinePreviewModal(preview.category, preview.id);
});

refreshCombineButton();

const dismantleButton = document.getElementById('btn-dismantle');

function refreshDismantleButton() {
  dismantleButton.disabled = !canDismantle();
}

dismantleButton.addEventListener('click', async () => {
  const result = dismantleCharacter();
  if (!result.success) return;

  updateHeaderGold(result.remainingGold);
  refreshAllPartSlots();
  refreshCombineButton();
  refreshDismantleButton();
  refreshRenameButton();
  refreshColorMixButton();
  await renderCharacterPreview();
  showDismantleResult();
});

refreshDismantleButton();

const renameButton = document.getElementById('btn-rename');

function refreshRenameButton() {
  renameButton.disabled = !canRename();
}

renameButton.addEventListener('click', () => openNameModal('rename'));
refreshRenameButton();

const saveButton = document.getElementById('btn-save');

function refreshSaveButton() {
  saveButton.disabled = !canSaveCharacter();
}

refreshSaveButton();

const colorMixButton = document.querySelector('.color-mix-btn');

function refreshColorMixButton() {
  colorMixButton.disabled = !canMixColor();
}

colorMixButton.addEventListener('click', () => {
  const preview = previewColorMix();
  if (!preview.success) return;

  updateHeaderGold(preview.remainingGold);
  refreshColorMixButton();
  openColorMixModal(preview.patternId, preview.colors);
});
refreshColorMixButton();

function setupToggle(toggleId, bodyId) {
  const button = document.getElementById(toggleId);
  const header = button.closest('.shop-section__header');
  const body = document.getElementById(bodyId);
  header.addEventListener('click', () => {
    const isHidden = body.classList.toggle('shop-section__body--hidden');
    button.textContent = isHidden ? '\u25b6' : '\u25bc';
    button.setAttribute('aria-expanded', String(!isHidden));
  });
}

setupToggle('toggle-color', 'color-body');
setupToggle('toggle-decoration', 'decoration-body');

const partModal = document.getElementById('part-modal');
const partModalSvg = document.getElementById('part-modal-svg');
const partModalName = document.getElementById('part-modal-name');
const partModalActions = document.getElementById('part-modal-actions');

function createPricedButton(variantClass, label, price, disabled = false) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `modal-card__btn modal-card__btn--priced ${variantClass}`;
  button.disabled = disabled;

  const labelSpan = document.createElement('span');
  labelSpan.className = 'modal-card__btn-label';
  labelSpan.textContent = label;

  const priceSpan = document.createElement('span');
  priceSpan.className = 'modal-card__btn-price';
  priceSpan.textContent = price;

  button.append(labelSpan, priceSpan);
  return button;
}

const RANDOM_DRAW_DELAY_MS = 700;
const RESULT_AUTO_CLOSE_MS = 2500;
const PARTICLE_COLORS = ['#ffffff', '#bfe6ff', '#fff6b3'];

let reopenTimerId = null;
let autoCloseTimerId = null;

function clearResultTimers() {
  if (reopenTimerId) { clearTimeout(reopenTimerId); reopenTimerId = null; }
  if (autoCloseTimerId) { clearTimeout(autoCloseTimerId); autoCloseTimerId = null; }
}

function closePartModal() {
  clearResultTimers();
  partModal.classList.add('modal-overlay--hidden');
}

function spawnResultParticles(container) {
  const layer = document.createElement('div');
  layer.className = 'part-modal__particles';

  const count = 6 + Math.floor(Math.random() * 5);
  for (let i = 0; i < count; i += 1) {
    const particle = document.createElement('span');
    particle.className = 'part-modal__particle';
    const angle = (360 / count) * i + (Math.random() * 20 - 10);
    const distance = 34 + Math.random() * 18;
    const size = 4 + Math.random() * 4;
    particle.style.setProperty('--angle', `${angle}deg`);
    particle.style.setProperty('--distance', `${distance}px`);
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    particle.style.background = PARTICLE_COLORS[i % PARTICLE_COLORS.length];
    layer.appendChild(particle);
  }

  container.appendChild(layer);
  setTimeout(() => layer.remove(), 900);
}

function showPurchaseResult(id, slot) {
  const part = getPart(id);

  const iconSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  iconSvg.setAttribute('viewBox', '0 0 56 56');
  iconSvg.classList.add('part-modal__result-icon');
  partModalSvg.replaceChildren(iconSvg);
  replaceSvgContent(iconSvg, part.assetPath);
  spawnResultParticles(partModalSvg);

  partModalName.textContent = '';
  partModalActions.replaceChildren();
  const resultText = document.createElement('p');
  resultText.className = 'part-modal__result-text';
  resultText.textContent = '🎉 꼬무리 조각 획득';
  partModalActions.appendChild(resultText);

  clearResultTimers();
  autoCloseTimerId = setTimeout(() => openPartModal(slot), RESULT_AUTO_CLOSE_MS);
}

function showRandomDrawing(id, slot) {
  const spinner = document.createElement('div');
  spinner.className = 'part-modal__spinner';
  spinner.textContent = '💎';
  partModalSvg.replaceChildren(spinner);

  partModalName.textContent = '';
  partModalActions.replaceChildren();
  const drawingText = document.createElement('p');
  drawingText.className = 'part-modal__drawing-text';
  drawingText.textContent = '뽑는 중...';
  partModalActions.appendChild(drawingText);

  clearResultTimers();
  reopenTimerId = setTimeout(() => {
    reopenTimerId = null;
    if (partModal.classList.contains('modal-overlay--hidden')) return;
    showPurchaseResult(id, slot);
  }, RANDOM_DRAW_DELAY_MS);
}

function showDismantleResult() {
  clearResultTimers();

  const preview = characterPlaceholder.cloneNode(true);
  rescopeColorInstanceIds(preview);
  partModalSvg.replaceChildren(preview);
  partModalName.textContent = '';
  partModalActions.replaceChildren();

  const resultText = document.createElement('p');
  resultText.className = 'part-modal__result-text';
  resultText.textContent = '🎉 해체 성공';
  partModalActions.appendChild(resultText);

  partModal.classList.remove('modal-overlay--hidden');
  autoCloseTimerId = setTimeout(closePartModal, RESULT_AUTO_CLOSE_MS);
}

function openPartModal(slot) {
  clearResultTimers();
  const slotId = slot.dataset.part;
  const isRandom = slotId === 'random';
  const headPartId = isRandom ? null : PART_ID_BY_SLOT[slotId];
  const owned = headPartId ? getPartQuantity(headPartId) : 0;

  partModalSvg.replaceChildren(slot.querySelector('svg').cloneNode(true));
  partModalName.textContent = '';
  partModalActions.replaceChildren();

  if (!isRandom && owned > 0) {
    const badge = document.createElement('span');
    badge.className = 'part-slot__badge';
    renderBadgeContent(badge, owned);
    partModalSvg.appendChild(badge);
  }

  const buyPrice = isRandom ? SHOP_COST.partRandomPurchase : SHOP_COST.partPurchase;
  const canAffordBuy = getGold() >= buyPrice;
  const buyButton = createPricedButton('modal-card__btn--cancel', '구입', `💎 ${buyPrice}`, !canAffordBuy);
  buyButton.addEventListener('click', () => {
    const result = isRandom
      ? purchaseRandomPart()
      : purchasePart(headPartId);

    if (!result.success) return;

    updateHeaderGold(result.remainingGold);
    refreshAllPartSlots();
    refreshCombineButton();
    refreshDismantleButton();
    refreshRenameButton();
    refreshColorMixButton();

    if (isRandom) {
      showRandomDrawing(result.id, slot);
    } else {
      openPartModal(slot);
      spawnResultParticles(partModalSvg);
    }
  });
  partModalActions.appendChild(buyButton);

  if (!isRandom) {
    const equippedHeadId = getEquippedPart('head');
    if (equippedHeadId === headPartId) {
      const appliedMessage = document.createElement('p');
      appliedMessage.className = 'part-modal__applied';
      appliedMessage.textContent = '적용 성공';
      partModalActions.appendChild(appliedMessage);
    } else {
      const canApply = owned > 0 && getGold() >= SHOP_COST.partApply;
      const applyButton = createPricedButton('modal-card__btn--cancel', '적용', `💎 ${SHOP_COST.partApply}`, !canApply);
      applyButton.addEventListener('click', async () => {
        const isFirstSave = !getEquippedPart('head');
        const result = applyPart('head', headPartId);
        if (!result.success) return;

        updateHeaderGold(result.remainingGold);
        refreshAllPartSlots();
        refreshCombineButton();
        refreshDismantleButton();
        refreshRenameButton();
        refreshColorMixButton();
        refreshSaveButton();
        await renderCharacterPreview();

        if (isFirstSave) {
          closePartModal();
          openNameModal('create');
        } else {
          openPartModal(slot);
        }
      });
      partModalActions.appendChild(applyButton);
    }
  }
  partModal.classList.remove('modal-overlay--hidden');
}

document.querySelectorAll('.part-slot[data-part]').forEach((slot) => {
  slot.addEventListener('click', () => openPartModal(slot));
});
partModal.addEventListener('click', (event) => {
  if (event.target === partModal) closePartModal();
});

// ===========================
// 조합 미리보기 모달
// ===========================
async function buildCombinePreviewClone(category, id) {
  const clone = characterPlaceholder.cloneNode(true);
  const part = getPart(id);

  if (category === 'body') {
    await Promise.all([
      embedSvgFragment(clone.querySelector('#body-part-slot'), part.assetPath),
      embedSvgFragment(clone.querySelector('#left-arm-slot'), BODY_ASSETS.leftArm),
      embedSvgFragment(clone.querySelector('#right-arm-slot'), BODY_ASSETS.rightArm),
    ]);
  } else if (category === 'legs') {
    await Promise.all([
      embedSvgFragment(clone.querySelector('#leg-part-slot'), part.assetPath),
      embedSvgFragment(clone.querySelector('#left-leg-slot'), BODY_ASSETS.leftLeg),
      embedSvgFragment(clone.querySelector('#right-leg-slot'), BODY_ASSETS.rightLeg),
    ]);
  }

  const hasBody = category === 'body' || Boolean(getEquippedPart('body'));
  const hasLegs = category === 'legs' || Boolean(getEquippedPart('legs'));
  applyCharacterRootTransform(clone.querySelector('#character-root'), hasBody, hasLegs, getViewBoxHeight(clone));

  const instanceId = nextColorInstanceId();
  stampFillPartId(clone, 'head-part-slot', instanceId);
  if (hasBody) stampFillPartId(clone, 'body-part-slot', instanceId);
  if (hasLegs) stampFillPartId(clone, 'leg-part-slot', instanceId);

  const equippedColorMix = getEquippedColorMix();
  const equippedColor = getEquippedColor();
  if (equippedColorMix) {
    await applyColorMixToRoot(clone, equippedColorMix.patternId, equippedColorMix.colors, instanceId);
  } else {
    clearColorMixOverlay(clone);
    if (equippedColor) applyColorTint(clone, equippedColor);
  }

  return clone;
}

async function openCombinePreviewModal(category, id) {
  clearResultTimers();

  const preview = await buildCombinePreviewClone(category, id);
  partModalSvg.replaceChildren(preview);
  partModalName.textContent = '';
  partModalActions.replaceChildren();

  const confirmButton = document.createElement('button');
  confirmButton.type = 'button';
  confirmButton.className = 'modal-card__btn modal-card__btn--confirm';
  confirmButton.textContent = '확인';
  confirmButton.addEventListener('click', async () => {
    const result = confirmCombine(category, id);
    if (!result.success) return;

    refreshAllPartSlots();
    refreshCombineButton();
    refreshDismantleButton();
    refreshColorMixButton();
    await renderCharacterPreview();
    closePartModal();
  });

  const canRecombineNow = canRecombine(id);
  const recombineButton = createPricedButton(
    'modal-card__btn--cancel',
    '재조합',
    `💎 ${SHOP_COST.partRecombine}`,
    !canRecombineNow,
  );
  recombineButton.addEventListener('click', () => {
    const reroll = previewRecombine(id);
    if (!reroll.success) return;

    updateHeaderGold(reroll.remainingGold);
    refreshCombineButton();
    refreshDismantleButton();
    refreshRenameButton();
    refreshColorMixButton();
    openCombinePreviewModal(category, reroll.id);
  });

  partModalActions.append(confirmButton, recombineButton);
  partModal.classList.remove('modal-overlay--hidden');
}

// ===========================
// 색상 슬롯 및 모달
// ===========================
function refreshColorSlot(slot) {
  const color = slot.dataset.color;
  if (color === 'random') return;

  const quantity = getColorQuantity(color);

  let badge = slot.querySelector('.part-slot__badge');
  if (quantity > 0) {
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'part-slot__badge';
      slot.appendChild(badge);
    }
    renderBadgeContent(badge, quantity);
  } else if (badge) {
    badge.remove();
  }
}

function refreshAllColorSlots() {
  document.querySelectorAll('.color-slot[data-color]').forEach(refreshColorSlot);
}

refreshAllColorSlots();

const colorModal = document.getElementById('color-modal');
const colorModalPreview = document.getElementById('color-modal-preview');
const colorModalActions = document.getElementById('color-modal-actions');

function openColorModal(color) {
  const previewSvg = characterPlaceholder.cloneNode(true);
  prepareSimpleColorPreview(previewSvg);
  applyColorTint(previewSvg, color);
  colorModalPreview.replaceChildren(previewSvg);
  colorModalActions.replaceChildren();

  const ownedColorQuantity = getColorQuantity(color);
  if (ownedColorQuantity > 0) {
    const badge = document.createElement('span');
    badge.className = 'part-slot__badge';
    renderBadgeContent(badge, ownedColorQuantity);
    colorModalPreview.appendChild(badge);
  }

  const canAffordColorBuy = getGold() >= SHOP_COST.colorPurchase;
  const buyButton = createPricedButton('modal-card__btn--cancel', '구입', `💎 ${SHOP_COST.colorPurchase}`, !canAffordColorBuy);
  buyButton.addEventListener('click', () => {
    const result = purchaseColor(color);
    if (!result.success) return;

    updateHeaderGold(result.remainingGold);
    refreshAllColorSlots();
    refreshCombineButton();
    refreshDismantleButton();
    refreshRenameButton();
    refreshColorMixButton();
    openColorModal(color);
    spawnResultParticles(colorModalPreview);
  });

  const canApplyColorNow = canApplyColor(color);
  const applyButton = createPricedButton('modal-card__btn--cancel', '적용', `💎 ${SHOP_COST.colorApply}`, !canApplyColorNow);
  applyButton.addEventListener('click', async () => {
    const result = applyColor(color);
    if (!result.success) return;

    updateHeaderGold(result.remainingGold);
    refreshAllColorSlots();
    refreshCombineButton();
    refreshDismantleButton();
    refreshRenameButton();
    refreshColorMixButton();
    await renderCharacterPreview();
    colorModal.classList.add('modal-overlay--hidden');
  });

  colorModalActions.append(buyButton, applyButton);
  colorModal.classList.remove('modal-overlay--hidden');
}

let lastDrawnColor = null;

function showColorPurchaseResult(color) {
  const swatch = document.createElement('div');
  swatch.className = 'part-modal__result-icon';
  swatch.style.cssText = 'width:100%;height:100%;border-radius:50%;';
  swatch.style.background = color;
  partModalSvg.replaceChildren(swatch);
  spawnResultParticles(partModalSvg);

  partModalName.textContent = '';
  partModalActions.replaceChildren();
  const resultText = document.createElement('p');
  resultText.className = 'part-modal__result-text';
  resultText.textContent = '🎉 색상 획득';
  partModalActions.appendChild(resultText);

  clearResultTimers();
  autoCloseTimerId = setTimeout(openColorRandomModal, RESULT_AUTO_CLOSE_MS);
}

function showColorRandomDrawing() {
  const spinner = document.createElement('div');
  spinner.className = 'part-modal__spinner';
  spinner.textContent = '💎';
  partModalSvg.replaceChildren(spinner);

  partModalName.textContent = '';
  partModalActions.replaceChildren();
  const drawingText = document.createElement('p');
  drawingText.className = 'part-modal__drawing-text';
  drawingText.textContent = '뽑는 중...';
  partModalActions.appendChild(drawingText);

  clearResultTimers();
  reopenTimerId = setTimeout(() => {
    reopenTimerId = null;
    if (partModal.classList.contains('modal-overlay--hidden')) return;
    showColorPurchaseResult(lastDrawnColor);
  }, RANDOM_DRAW_DELAY_MS);
}

function openColorRandomModal() {
  clearResultTimers();

  const questionSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  questionSvg.setAttribute('viewBox', '0 0 56 56');
  questionSvg.innerHTML = '<circle cx="28" cy="28" r="21" fill="none" stroke="#b0bac6" stroke-width="2.5"/>'
    + '<text x="28" y="34" font-size="18" text-anchor="middle" fill="#b0bac6">?</text>';
  partModalSvg.replaceChildren(questionSvg);
  partModalName.textContent = '';
  partModalActions.replaceChildren();

  const canAffordBuy = getGold() >= SHOP_COST.colorRandomPurchase;
  const buyButton = createPricedButton('modal-card__btn--cancel', '구입', `💎 ${SHOP_COST.colorRandomPurchase}`, !canAffordBuy);
  buyButton.addEventListener('click', () => {
    const result = purchaseRandomColor();
    if (!result.success) return;

    updateHeaderGold(result.remainingGold);
    refreshAllColorSlots();
    refreshCombineButton();
    refreshDismantleButton();
    refreshRenameButton();
    refreshColorMixButton();
    lastDrawnColor = result.color;
    showColorRandomDrawing();
  });
  partModalActions.appendChild(buyButton);

  partModal.classList.remove('modal-overlay--hidden');
}

document.querySelectorAll('.color-slot[data-color]').forEach((slot) => {
  slot.addEventListener('click', () => {
    if (slot.dataset.color === 'random') {
      openColorRandomModal();
    } else {
      openColorModal(slot.dataset.color);
    }
  });
});
colorModal.addEventListener('click', (event) => {
  if (event.target === colorModal) colorModal.classList.add('modal-overlay--hidden');
});

// ===========================
// 색 섞기 모달
// ===========================
async function buildColorMixPreviewClone(patternId, colors) {
  const clone = characterPlaceholder.cloneNode(true);

  const instanceId = nextColorInstanceId();
  stampFillPartId(clone, 'head-part-slot', instanceId);
  if (getEquippedPart('body')) stampFillPartId(clone, 'body-part-slot', instanceId);
  if (getEquippedPart('legs')) stampFillPartId(clone, 'leg-part-slot', instanceId);

  await applyColorMixToRoot(clone, patternId, colors, instanceId);
  return clone;
}

async function openColorMixModal(patternId, colors) {
  clearResultTimers();

  const preview = await buildColorMixPreviewClone(patternId, colors);
  partModalSvg.replaceChildren(preview);
  partModalName.textContent = '';
  partModalActions.replaceChildren();

  const confirmButton = document.createElement('button');
  confirmButton.type = 'button';
  confirmButton.className = 'modal-card__btn modal-card__btn--confirm';
  confirmButton.textContent = '확인';
  confirmButton.addEventListener('click', async () => {
    confirmColorMix(patternId, colors);
    refreshAllColorSlots();
    refreshColorMixButton();
    await renderCharacterPreview();
    closePartModal();
  });

  const previewNewColor = colors[colors.length - 1];
  const canRemixNow = canRemixColor(previewNewColor, patternId);
  const remixButton = createPricedButton(
    'modal-card__btn--cancel',
    '다시 섞기',
    `💎 ${SHOP_COST.colorRemix}`,
    !canRemixNow,
  );
  remixButton.addEventListener('click', () => {
    const reroll = previewColorRemix(previewNewColor, patternId);
    if (!reroll.success) return;

    updateHeaderGold(reroll.remainingGold);
    refreshColorMixButton();
    openColorMixModal(reroll.patternId, reroll.colors);
  });

  partModalActions.append(confirmButton, remixButton);
  partModal.classList.remove('modal-overlay--hidden');
}

const saveModal = document.getElementById('save-modal');
document.getElementById('btn-save').addEventListener('click', () => saveModal.classList.remove('modal-overlay--hidden'));
document.getElementById('modal-cancel').addEventListener('click', () => saveModal.classList.add('modal-overlay--hidden'));
document.getElementById('modal-confirm').addEventListener('click', () => saveModal.classList.add('modal-overlay--hidden'));
saveModal.addEventListener('click', (event) => {
  if (event.target === saveModal) saveModal.classList.add('modal-overlay--hidden');
});