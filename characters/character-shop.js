import { createHeader } from '../shared/header.js';

createHeader();

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
