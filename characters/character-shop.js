// v0.1.0 : 최초 생성 - 캐릭터 상점 화면 스크립트 (섹션 토글, 파츠/색상/저장 모달)
// v0.1.1 : Refactor - placeholder 눈/입, 파츠 슬롯 아이콘을 assets fetch 기반
//          inline SVG(svgLoader.js)로 로딩하도록 변경. 화면/기능은 동일.
// v0.1.2 : Implement - 파츠 구매 기능(구매 버튼, 수량 배지, 골드 표시 갱신) 연결

// Public API
// (없음 — 화면 진입 스크립트, 외부에서 import하지 않음)
// 주요 내부 함수: openPartModal, openColorModal, refreshPartSlot, refreshAllPartSlots
//
// Save Structure
// 이 파일은 저장소를 직접 다루지 않음. core/saveManager.js, characters/inventory.js 참고.

import { createHeader, updateHeaderGold } from '../shared/header.js';
import { replaceSvgContent, embedSvgFragment } from './svgLoader.js';
import { FACE_ASSETS, getPart } from './characterData.js';
import { getPartQuantity, purchasePart, purchaseRandomPart } from './inventory.js';

createHeader();

// ===========================
// 캐릭터 placeholder 얼굴(눈/입) 인라인 로딩
// - assets/face/eyes-idle.svg, mouth-idle.svg를 fetch하여
//   character-placeholder 안의 #face-eyes-slot, #face-mouth-slot 위치에 삽입한다.
// - 프레임(x, y, width, height)은 placeholder viewBox(0 0 160 200) 기준 좌표이며,
//   기존 하드코딩 눈/입이 있던 자리를 참고해 잡은 값이다. 필요 시 조정 가능.
// ===========================
const faceEyesSlot = document.getElementById('face-eyes-slot');
const faceMouthSlot = document.getElementById('face-mouth-slot');

embedSvgFragment(faceEyesSlot, FACE_ASSETS.eyes.idle, { x: 50, y: 50, width: 60, height: 26 });
embedSvgFragment(faceMouthSlot, FACE_ASSETS.mouth.idle, { x: 60, y: 72, width: 40, height: 18 });

// ===========================
// 파츠 슬롯 아이콘 인라인 로딩
// - data-part(HTML 슬롯 번호) → characterData.js의 head 파츠 id 매핑.
// - '원/세모/네모/마름모/별/럭비공/역세모' UI 명칭과 characterData.js의
//   circle/triangle-up/square/diamond/star/lens/triangle-down id를 연결한다.
// - 랜덤 박스(data-part="random")는 고정 아이콘이므로 대상에서 제외한다.
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
  const part = partId ? getPart('head', partId) : null;
  if (!part) return;

  const svgElement = slot.querySelector('.part-slot__svg');
  replaceSvgContent(svgElement, part.assetPath);
});

// ===========================
// 파츠 슬롯 보유 수량 배지 갱신
// - inventory.js의 getPartQuantity()를 기준으로 표시한다.
// - 수량 0: 배지 숨김 + part-slot--locked 유지, 1 이상: 배지 표시 + locked 해제
// ===========================
function refreshPartSlot(slot) {
  const slotId = slot.dataset.part;
  if (slotId === 'random') return;

  const partId = PART_ID_BY_SLOT[slotId];
  const quantity = partId ? getPartQuantity('head', partId) : 0;

  slot.dataset.owned = String(quantity);
  slot.classList.toggle('part-slot--locked', quantity <= 0);

  let badge = slot.querySelector('.part-slot__badge');
  if (quantity > 0) {
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'part-slot__badge';
      slot.appendChild(badge);
    }
    badge.textContent = String(quantity);
  } else if (badge) {
    badge.remove();
  }
}

function refreshAllPartSlots() {
  document.querySelectorAll('.part-slot[data-part]').forEach(refreshPartSlot);
}

refreshAllPartSlots();

function setupToggle(toggleId, bodyId) {
  const button = document.getElementById(toggleId);
  const body = document.getElementById(bodyId);
  button.addEventListener('click', () => {
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
let currentHeadPart = null;

function openPartModal(slot) {
  const slotId = slot.dataset.part;
  const isRandom = slotId === 'random';
  const headPartId = isRandom ? null : PART_ID_BY_SLOT[slotId];
  const owned = headPartId ? getPartQuantity('head', headPartId) : 0;

  partModalSvg.replaceChildren(slot.querySelector('svg').cloneNode(true));
  partModalName.textContent = '';
  partModalActions.replaceChildren();

  const buyButton = document.createElement('button');
  buyButton.type = 'button';
  buyButton.className = 'modal-card__btn modal-card__btn--confirm';
  buyButton.textContent = isRandom ? '구매 💎 70' : '구매 💎 100';
  buyButton.addEventListener('click', () => {
    const result = isRandom
      ? purchaseRandomPart('head')
      : purchasePart('head', headPartId);

    if (!result.success) return; // 골드 부족 등: 구매/저장/화면 갱신 없음

    updateHeaderGold(result.remainingGold);
    refreshAllPartSlots();

    // 특정 파츠 구매는 모달을 다시 그려 수량/버튼 상태를 즉시 반영한다.
    // 랜덤 구매는 어떤 슬롯이 당첨됐는지 이 모달과 무관하므로 닫기만 한다.
    if (isRandom) {
      partModal.classList.add('modal-overlay--hidden');
    } else {
      openPartModal(slot);
    }
  });
  partModalActions.appendChild(buyButton);

  if (!isRandom) {
    if (currentHeadPart === slotId) {
      const appliedMessage = document.createElement('p');
      appliedMessage.className = 'part-modal__applied';
      appliedMessage.textContent = '\uc801\uc6a9 \uc911';
      partModalActions.appendChild(appliedMessage);
    } else {
      const applyButton = document.createElement('button');
      applyButton.type = 'button';
      applyButton.className = 'modal-card__btn modal-card__btn--cancel';
      applyButton.textContent = '적용 💎 10';
      if (owned <= 0) {
        applyButton.disabled = true;
        applyButton.style.opacity = '0.4';
        applyButton.style.cursor = 'default';
      }
      partModalActions.appendChild(applyButton);
    }
  }
  partModal.classList.remove('modal-overlay--hidden');
}

document.querySelectorAll('.part-slot[data-part]').forEach((slot) => {
  slot.addEventListener('click', () => openPartModal(slot));
});
partModal.addEventListener('click', (event) => {
  if (event.target === partModal) partModal.classList.add('modal-overlay--hidden');
});

const colorModal = document.getElementById('color-modal');
const colorModalPreview = document.getElementById('color-modal-preview');
const colorModalActions = document.getElementById('color-modal-actions');
const characterPreview = document.querySelector('.character-placeholder');

function openColorModal(color) {
  const previewSvg = characterPreview.cloneNode(true);
  previewSvg.querySelectorAll('path, line').forEach((element) => element.setAttribute('stroke', color));
  previewSvg.querySelectorAll('circle').forEach((element) => element.setAttribute('fill', color));
  colorModalPreview.replaceChildren(previewSvg);
  colorModalActions.replaceChildren();

  const buyButton = document.createElement('button');
  buyButton.type = 'button';
  buyButton.className = 'modal-card__btn modal-card__btn--confirm';
  buyButton.textContent = '\uad6c\ub9e4 \ud83e\ude99 100';
  const applyButton = document.createElement('button');
  applyButton.type = 'button';
  applyButton.className = 'modal-card__btn modal-card__btn--cancel';
  applyButton.textContent = '\uc801\uc6a9 \ud83e\ude99 10';
  colorModalActions.append(buyButton, applyButton);
  colorModal.classList.remove('modal-overlay--hidden');
}

document.querySelectorAll('.color-slot[data-color]').forEach((slot) => {
  slot.addEventListener('click', () => openColorModal(slot.dataset.color));
});
colorModal.addEventListener('click', (event) => {
  if (event.target === colorModal) colorModal.classList.add('modal-overlay--hidden');
});

const saveModal = document.getElementById('save-modal');
document.getElementById('btn-save').addEventListener('click', () => saveModal.classList.remove('modal-overlay--hidden'));
document.getElementById('modal-cancel').addEventListener('click', () => saveModal.classList.add('modal-overlay--hidden'));
document.getElementById('modal-confirm').addEventListener('click', () => saveModal.classList.add('modal-overlay--hidden'));
saveModal.addEventListener('click', (event) => {
  if (event.target === saveModal) saveModal.classList.add('modal-overlay--hidden');
});