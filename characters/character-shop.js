// v0.1.0 : 최초 생성 - 캐릭터 상점 화면 스크립트 (섹션 토글, 파츠/색상/저장 모달)
// v0.1.1 : Refactor - placeholder 눈/입, 파츠 슬롯 아이콘을 assets fetch 기반
//          inline SVG(svgLoader.js)로 로딩하도록 변경. 화면/기능은 동일.

import { createHeader } from '../shared/header.js';
import { replaceSvgContent, embedSvgFragment } from '../core/svgloader.js';
import { FACE_ASSETS, getPart } from './characterData.js';

createHeader();

// ===========================
// 캐릭터 placeholder 얼굴(눈/입) 인라인 로딩
// - assets/face/eyes-idle.svg, mouth-idle.svg를 fetch하여
//   character-placeholder 안의 #face-eyes-slot, #face-mouth-slot 위치에 삽입한다.
// - 프레임(x, y, width, height)은 placeholder viewBox(0 0 160 200) 기준 좌표이며,
//   기존 하드코딩 눈/입이 있던 자리를 참고해 잡은 값이다. 크기 조정 가능.
// ===========================
const faceEyesSlot = document.getElementById('face-eyes-slot');
const faceMouthSlot = document.getElementById('face-mouth-slot');

embedSvgFragment(faceEyesSlot, FACE_ASSETS.eyes.idle, { x: 20, y: 50, width: 120, height: 52 });
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
  const partId = slot.dataset.part;
  const owned = parseInt(slot.dataset.owned ?? '0', 10);
  const isRandom = partId === 'random';
  partModalSvg.replaceChildren(slot.querySelector('svg').cloneNode(true));
  partModalName.textContent = '';
  partModalActions.replaceChildren();

  const buyButton = document.createElement('button');
  buyButton.type = 'button';
  buyButton.className = 'modal-card__btn modal-card__btn--confirm';
  buyButton.textContent = isRandom ? '\uad6c\ub9e4 \ud83e\ude99 70' : '\uad6c\ub9e4 \ud83e\ude99 100';
  partModalActions.appendChild(buyButton);

  if (!isRandom) {
    if (currentHeadPart === partId) {
      const appliedMessage = document.createElement('p');
      appliedMessage.className = 'part-modal__applied';
      appliedMessage.textContent = '\uc801\uc6a9 \uc911';
      partModalActions.appendChild(appliedMessage);
    } else {
      const applyButton = document.createElement('button');
      applyButton.type = 'button';
      applyButton.className = 'modal-card__btn modal-card__btn--cancel';
      applyButton.textContent = '\uc801\uc6a9 \ud83e\ude99 10';
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