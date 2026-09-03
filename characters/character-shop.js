// v0.1.49
// Character Shop
// Add_효과 파티클 연동 및 버튼 활성화 조건 강화

import { createHeader, updateHeaderGold } from '../shared/header.js';
import { replaceSvgContent } from '../core/svgloader.js';
import { getPart, SHOP_COST, EXPRESSION_KEYS, ANIMATION_KEYS, EFFECTS } from './characterData.js';
import { renderCharacterSvg } from './characterRenderer.js';
import {
  getPartQuantity, purchasePart, purchaseRandomPart, getEquippedPart, applyPart,
  canCombine, previewCombine, canRecombine, previewRecombine, confirmCombine,
  canDismantle, dismantleCharacter, canSaveCharacter, canRename, renameCharacter,
  getColorQuantity, purchaseColor, purchaseRandomColor, canApplyColor, applyColor,
  getEquippedColor, getEquippedColorMix,
  canMixColor, canRemixColor, previewColorMix, previewColorRemix, confirmColorMix,
  hasEffect, getEquippedEffect, purchaseEffect, canApplyEffect, applyEffect
} from './inventory.js';
import { getGold, getCharacterName, setCharacterName } from '../core/saveManager.js';

// 효과 파티클 제어 스크립트 임포트 (renderEffectPreview 추가)
import { renderEffectThumbnail, setEffectThumbnailActive, renderEffectPreview } from './assets/effects/effects.js';
createHeader();

/* ===========================
   캐릭터 렌더링 및 터치 반응
=========================== */
const characterPlaceholder = document.querySelector('.character-placeholder');
let renderChain = Promise.resolve();
let isCharacterReacting = false; // 연타 방지 플래그

function renderCharacterPreview() {
  renderChain = renderChain.then(() => renderCharacterPreviewOnce());
  return renderChain;
}

// customConfig를 받아 기본 상태 위에 덮어씌움
async function renderCharacterPreviewOnce(customConfig = null) {
  const baseConfig = {
    head: getEquippedPart('head'),
    body: getEquippedPart('body'),
    legs: getEquippedPart('legs'),
    color: getEquippedColor(),
    colorMix: getEquippedColorMix(),
    eyes: 'idle',
    mouth: 'idle',
    animation: 'idle'
  };
  
  const config = { ...baseConfig, ...customConfig };
  await renderCharacterSvg(characterPlaceholder, config);
}

// 터치(클릭) 시 랜덤 리액션 발동
characterPlaceholder.addEventListener('click', () => {
  // 이미 반응 중이거나, 머리가 없으면(빈 플레이스홀더면) 무시
  if (isCharacterReacting || !getEquippedPart('head')) return;
  
  isCharacterReacting = true;

  // 랜덤 요소 뽑기
  const randomEye = EXPRESSION_KEYS[Math.floor(Math.random() * EXPRESSION_KEYS.length)];
  const randomMouth = EXPRESSION_KEYS[Math.floor(Math.random() * EXPRESSION_KEYS.length)];
  const randomAnim = ANIMATION_KEYS[Math.floor(Math.random() * ANIMATION_KEYS.length)];

  // 랜덤 상태 적용
  renderCharacterPreviewOnce({ eyes: randomEye, mouth: randomMouth, animation: randomAnim });

  // 3초 뒤 원래 상태로 복구 (애니메이션 길이와 같아야 자연스러움)
  setTimeout(() => {
    renderCharacterPreviewOnce(); // 파라미터 없이 부르면 기본(idle) 상태로 돌아감
    isCharacterReacting = false;
  }, 3000);
});

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
// 파츠 슬롯 아이콘 로딩 & 상태 갱신
// ===========================
const PART_ID_BY_SLOT = {
  1: 'circle', 2: 'triangle-up', 3: 'square', 4: 'diamond',
  5: 'star', 6: 'lens', 7: 'triangle-down',
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
function refreshCombineButton() { combineButton.disabled = !canCombine(); }
combineButton.addEventListener('click', () => {
  const preview = previewCombine();
  if (!preview.success) return;

  updateHeaderGold(preview.remainingGold);
  refreshCombineButton(); refreshDismantleButton(); refreshRenameButton(); refreshColorMixButton();
  openCombinePreviewModal(preview.category, preview.id);
});
refreshCombineButton();

const dismantleButton = document.getElementById('btn-dismantle');
function refreshDismantleButton() { dismantleButton.disabled = !canDismantle(); }
dismantleButton.addEventListener('click', () => {
  openDismantlePreviewModal();
});
refreshDismantleButton();

const renameButton = document.getElementById('btn-rename');
function refreshRenameButton() { renameButton.disabled = !canRename(); }
renameButton.addEventListener('click', () => openNameModal('rename'));
refreshRenameButton();

const saveButton = document.getElementById('btn-save');
function refreshSaveButton() { saveButton.disabled = !canSaveCharacter(); }
refreshSaveButton();

const colorMixButton = document.querySelector('.color-mix-btn');
function refreshColorMixButton() { colorMixButton.disabled = !canMixColor(); }
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

// 해체 후의 캐릭터 설정(config)을 계산하는 헬퍼 함수
async function buildDismantlePreviewClone() {
  const clone = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  clone.setAttribute('viewBox', '0 0 160 300');
  
  const currentHead = getEquippedPart('head');
  const currentBody = getEquippedPart('body');
  const currentLegs = getEquippedPart('legs');

  // 해체 로직: 다리가 있으면 다리 제거, 다리가 없고 몸이 있으면 몸 제거
  const config = {
    head: currentHead,
    body: currentLegs ? currentBody : null,
    legs: null,
    color: getEquippedColor(),
    colorMix: getEquippedColorMix(),
    expression: 'idle',
    animation: 'idle'
  };
  
  await renderCharacterSvg(clone, config);
  return clone;
}

// 해체 미리보기 모달 열기 (기존 showDismantleResult 대체)
async function openDismantlePreviewModal() {
  clearResultTimers();

  const preview = await buildDismantlePreviewClone();
  partModalSvg.replaceChildren(preview);
  partModalName.textContent = '';
  partModalActions.replaceChildren();

  // [확인] 버튼 생성
  const confirmButton = document.createElement('button');
  confirmButton.type = 'button';
  confirmButton.className = 'modal-card__btn modal-card__btn--confirm';
  confirmButton.textContent = '확인';
  
  confirmButton.addEventListener('click', async () => {
    // 확인 클릭 시 실제 인벤토리에서 해체 및 골드 차감 처리
    const result = dismantleCharacter(); 
    if (!result.success) return;

    updateHeaderGold(result.remainingGold);
    refreshAllPartSlots(); 
    refreshCombineButton(); 
    refreshDismantleButton();
    refreshRenameButton(); 
    refreshColorMixButton();
    await renderCharacterPreview(); // 메인 플레이스홀더 화면 갱신
    
    closePartModal();
  });

  partModalActions.appendChild(confirmButton);
  partModal.classList.remove('modal-overlay--hidden');
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
    const result = isRandom ? purchaseRandomPart() : purchasePart(headPartId);
    if (!result.success) return;

    updateHeaderGold(result.remainingGold);
    refreshAllPartSlots();
    refreshCombineButton(); refreshDismantleButton(); refreshRenameButton(); refreshColorMixButton();

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
        refreshCombineButton(); refreshDismantleButton(); refreshRenameButton(); refreshColorMixButton(); refreshSaveButton();
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
  const clone = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  clone.setAttribute('viewBox', '0 0 160 300');
  
  const config = {
    head: getEquippedPart('head'),
    body: getEquippedPart('body'),
    legs: getEquippedPart('legs'),
    color: getEquippedColor(),
    colorMix: getEquippedColorMix(),
  };
  config[category] = id;
  
  await renderCharacterSvg(clone, config);
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
    refreshCombineButton(); refreshDismantleButton(); refreshColorMixButton();
    await renderCharacterPreview();
    closePartModal();
  });

  const canRecombineNow = canRecombine(id);
  const recombineButton = createPricedButton(
    'modal-card__btn--cancel', '재조합', `💎 ${SHOP_COST.partRecombine}`, !canRecombineNow,
  );
  recombineButton.addEventListener('click', () => {
    const reroll = previewRecombine(id);
    if (!reroll.success) return;

    updateHeaderGold(reroll.remainingGold);
    refreshCombineButton(); refreshDismantleButton(); refreshRenameButton(); refreshColorMixButton();
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

async function openColorModal(color) {
  const previewSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  previewSvg.setAttribute('viewBox', '0 0 160 300');
  
  await renderCharacterSvg(previewSvg, {
    head: getEquippedPart('head'),
    body: getEquippedPart('body'),
    legs: getEquippedPart('legs'),
    color: color,
    colorMix: null
  });

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
    refreshAllColorSlots(); refreshCombineButton(); refreshDismantleButton(); refreshRenameButton(); refreshColorMixButton();
    openColorModal(color);
    spawnResultParticles(colorModalPreview);
  });

  const canApplyColorNow = canApplyColor(color);
  const applyButton = createPricedButton('modal-card__btn--cancel', '적용', `💎 ${SHOP_COST.colorApply}`, !canApplyColorNow);
  applyButton.addEventListener('click', async () => {
    const result = applyColor(color);
    if (!result.success) return;

    updateHeaderGold(result.remainingGold);
    refreshAllColorSlots(); refreshCombineButton(); refreshDismantleButton(); refreshRenameButton(); refreshColorMixButton();
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
    refreshAllColorSlots(); refreshCombineButton(); refreshDismantleButton(); refreshRenameButton(); refreshColorMixButton();
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
  const clone = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  clone.setAttribute('viewBox', '0 0 160 300');
  
  await renderCharacterSvg(clone, {
    head: getEquippedPart('head'),
    body: getEquippedPart('body'),
    legs: getEquippedPart('legs'),
    color: null,
    colorMix: { patternId, colors }
  });
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
    'modal-card__btn--cancel', '다시 섞기', `💎 ${SHOP_COST.colorRemix}`, !canRemixNow,
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


/* ===========================
   효과(Effect) 슬롯 및 모달
=========================== */

const effectGrid = document.getElementById('effect-grid');
const effectModal = document.getElementById('effect-modal');
const effectModalTitle = document.getElementById('effect-modal-title');
const effectModalPreview = document.getElementById('effect-modal-preview');
const effectModalName = document.getElementById('effect-modal-name');
const effectModalActions = document.getElementById('effect-modal-actions');

let effectAnimationIntervalId = null; 

/** 상점 화면에 20개의 효과 슬롯을 동적으로 생성하고 상태를 갱신합니다. */
function renderEffectSlots() {
  effectGrid.replaceChildren();

  EFFECTS.forEach(effect => {
    const isOwned = hasEffect(effect.id);
    const equippedEffects = getEquippedEffect();
    const isEquipped = Array.isArray(equippedEffects) ? equippedEffects.includes(effect.id) : equippedEffects === effect.id;

    // 슬롯 껍데기
    const slot = document.createElement('div');
    slot.className = 'part-slot effect-slot';
    if (!isOwned) slot.classList.add('part-slot--locked');
    
    // 파티클 썸네일(정지 이미지) 렌더링
    const thumbnailContainer = document.createElement('div');
    thumbnailContainer.style.width = '100%';
    thumbnailContainer.style.height = '100%';
    renderEffectThumbnail(thumbnailContainer, effect.id); 
    
    slot.appendChild(thumbnailContainer);

    // 배지 처리
    if (isOwned) {
      const badge = document.createElement('span');
      badge.className = 'part-slot__badge';
      
      if (isEquipped) {
        badge.innerHTML = '✓';
        badge.style.background = '#4caf82'; 
        badge.style.color = '#ffffff';
      } else {
        badge.innerHTML = ''; 
        badge.style.width = '12px';  
        badge.style.height = '12px';
        badge.style.padding = '0';
      }
      slot.appendChild(badge);
    }

    // 클릭 시 모달 열기
    slot.addEventListener('click', () => openEffectModal(effect));

    effectGrid.appendChild(slot);
  });
}

/** 파티클 파괴/중지 (모달 닫을 때 호출) */
function clearEffectTimers() {
  if (effectAnimationIntervalId) {
    clearInterval(effectAnimationIntervalId);
    effectAnimationIntervalId = null;
  }
}

/** 효과 모달 닫기 */
function closeEffectModal() {
  clearEffectTimers();
  effectModal.classList.add('modal-overlay--hidden');
}

/** 효과 모달 열기 */
async function openEffectModal(effect) {
  clearEffectTimers();

  effectModalTitle.textContent = effect.name;
  effectModalName.textContent = '';
  effectModalActions.replaceChildren();

  // 1. 캐릭터 미리보기 SVG 생성 및 렌더링
  const previewSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  previewSvg.setAttribute('viewBox', '0 0 160 300');
  previewSvg.classList.add('character-placeholder'); 
  
  await renderCharacterSvg(previewSvg, {
    head: getEquippedPart('head'),
    body: getEquippedPart('body'),
    legs: getEquippedPart('legs'),
    color: getEquippedColor(),
    colorMix: getEquippedColorMix(),
    expression: 'idle',
    animation: 'idle'
  });

  // 2. 모달용 파티클 프리뷰 컨테이너 생성
  const particleContainer = document.createElement('div');
  particleContainer.style.position = 'absolute';
  particleContainer.style.inset = '0';
  particleContainer.style.pointerEvents = 'none';

  effectModalPreview.replaceChildren(particleContainer, previewSvg);

// 3. 파티클 애니메이션 랜덤 반복 재생 제어 (하드 리셋 방식)
  const ANIMATION_DURATION = 600; // 파티클 애니메이션 시간(ms)

  function triggerParticle() {
    // 1) 랜덤 파티클 DOM 새로 그리기 & .active 부여로 재생 시작
    renderEffectPreview(particleContainer, effect.id, previewSvg);
    setEffectThumbnailActive(particleContainer, true);

    // 2) 애니메이션이 끝나는 정확한 시점에 .active 제거 (잔상 숨김)
    setTimeout(() => {
      setEffectThumbnailActive(particleContainer, false);
      // (만약 그래도 남는 요소가 있다면 아래 주석을 해제하여 DOM을 완전히 비워버리세요)
       particleContainer.replaceChildren();
    }, ANIMATION_DURATION);
  }
  
  // 모달이 열리면 즉시 1회 재생
  triggerParticle();
  
  // (애니메이션 0.6초 + 대기 1초 = 1.6초) 주기로 반복 트리거
  effectAnimationIntervalId = setInterval(triggerParticle, ANIMATION_DURATION + 1000);


  // 4. 하단 버튼 영역 (구입 / 적용 상태 제어)
  const isOwned = hasEffect(effect.id);
  const hasCharacter = Boolean(getEquippedPart('head')); 
  
  if (!isOwned) {
    const canAffordBuy = getGold() >= effect.price;
    const isBuyDisabled = !hasCharacter || !canAffordBuy;
    const buyButton = createPricedButton('modal-card__btn--cancel', '구입', `💎 ${effect.price}`, isBuyDisabled);
    
    buyButton.addEventListener('click', () => {
      const result = purchaseEffect(effect.id);
      if (!result.success) return;

      updateHeaderGold(result.remainingGold);
      renderEffectSlots();
      openEffectModal(effect); 
    });
    effectModalActions.appendChild(buyButton);

  } else {
    const equippedEffects = getEquippedEffect();
    const isEquipped = Array.isArray(equippedEffects) ? equippedEffects.includes(effect.id) : equippedEffects === effect.id;
    if (isEquipped) {
      const appliedMessage = document.createElement('p');
      appliedMessage.className = 'part-modal__applied';
      appliedMessage.textContent = '적용 중';
      effectModalActions.appendChild(appliedMessage);
    } else {
      const canApply = canApplyEffect(effect.id);
      const isApplyDisabled = !hasCharacter || !canApply;
      const applyButton = createPricedButton('modal-card__btn--cancel', '적용', `💎 ${SHOP_COST.effectApply}`, isApplyDisabled);
      
      applyButton.addEventListener('click', () => {
        const result = applyEffect(effect.id);
        if (!result.success) return;

        updateHeaderGold(result.remainingGold);
        renderEffectSlots();
        openEffectModal(effect); 
      });
      effectModalActions.appendChild(applyButton);
    }
  }

  effectModal.classList.remove('modal-overlay--hidden');
}

effectModal.addEventListener('click', (event) => {
  if (event.target === effectModal) closeEffectModal();
});

renderEffectSlots();