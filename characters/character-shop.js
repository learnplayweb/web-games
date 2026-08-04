// v0.1.0 : 최초 생성 - 캐릭터 상점 화면 스크립트 (섹션 토글, 파츠/색상/저장 모달)
// v0.1.1 : Refactor - placeholder 눈/입, 파츠 슬롯 아이콘을 assets fetch 기반
//          inline SVG(svgLoader.js)로 로딩하도록 변경. 화면/기능은 동일.
// v0.1.2 : Implement - 파츠 구매 기능(구매 버튼, 수량 배지, 골드 표시 갱신) 연결
// v0.1.3 : Polish - 구매/적용 버튼을 좌(라벨)/우(가격) 구조로 변경, 가격 상수(SHOP_COST) 사용
// v0.1.4 : Polish - 구입 버튼 문구/스타일을 적용 버튼과 통일, 골드 부족 시 비활성화,
//          수량 배지를 원형(99+ 상한)으로 변경
// v0.1.5 : Implement - 일반/랜덤 구입 결과 모달(파티클, 랜덤 연출) 추가.
//          기존 part-modal(#part-modal-svg/#part-modal-actions)을 결과 화면으로 재사용.
// v0.1.6 : Implement - 파츠 적용(equip) 기능 연결. placeholder를 미적용/적용 상태에
//          따라 조건부로 그리도록 변경 (미적용: 안내 문구만, 적용: 실제 머리 파츠+눈/입).
// v0.1.7 : Refactor - 파츠 조합 슬롯(head/eyes/mouth)의 위치/크기 관리를
//          character-shop.html(<svg x y width height>)로 이전. head-part-slot을
//          JS에서 동적 생성하던 코드를 제거하고 HTML에 선언된 엘리먼트를 그대로 사용.
//          embedSvgFragment() 호출도 위치/크기 인자 없이 (slot, path)만 전달하도록 변경.
// v0.1.8 : "SVG 제작 규격"(viewBox="0 0 160 160", 중심좌표 (80,80)) 확정에 따라
//          slot의 viewBox까지 character-shop.html에 고정 선언됨. 이 파일의 호출
//          코드는 변경 없음 — embedSvgFragment(slot, path)는 이전부터 이미
//          위치/크기/viewBox를 모두 슬롯 쪽(HTML)에 맡기는 형태였다.

import { createHeader, updateHeaderGold } from '../shared/header.js';
import { replaceSvgContent, embedSvgFragment } from '../core/svgLoader.js';
import { FACE_ASSETS, getPart, SHOP_COST } from './characterData.js';
import {
  getPartQuantity, purchasePart, purchaseRandomPart, getEquippedPart, applyPart,
} from './inventory.js';
import { getGold } from '../core/saveManager.js';

createHeader();



// ===========================
// 캐릭터 placeholder 렌더링
// - 아직 한 번도 적용하지 않았으면(getEquippedPart('head') === null) 안내 문구만 표시.
// - 적용된 머리 파츠가 있으면 해당 파츠 SVG + 눈/입(idle)을 fetch해 표시한다.
// - 기존 정적 head outline(<path>)은 실제 파츠로 대체되므로 숨긴다.
// - 슬롯(head-part-slot/face-eyes-slot/face-mouth-slot)의 위치·표시 크기는
//   character-shop.html에서 관리한다. 여기서는 어떤 SVG를 넣을지만 결정한다.
// ===========================
const characterPlaceholder = document.querySelector('.character-placeholder');
const headOutlinePath = characterPlaceholder.querySelector('path');
const placeholderText = characterPlaceholder.querySelector('text');
const headPartSlot = document.getElementById('head-part-slot');
const faceEyesSlot = document.getElementById('face-eyes-slot');
const faceMouthSlot = document.getElementById('face-mouth-slot');

function renderCharacterPreview() {
  const equippedHeadId = getEquippedPart('head');

  if (!equippedHeadId) {
    headOutlinePath.style.display = 'none';
    headPartSlot.replaceChildren();
    faceEyesSlot.replaceChildren();
    faceMouthSlot.replaceChildren();
    placeholderText.style.display = '';
    return;
  }

  const part = getPart('head', equippedHeadId);
  headOutlinePath.style.display = 'none';
  placeholderText.style.display = 'none';
  embedSvgFragment(headPartSlot, part.assetPath);
  embedSvgFragment(faceEyesSlot, FACE_ASSETS.eyes.idle);
  embedSvgFragment(faceMouthSlot, FACE_ASSETS.mouth.idle);
}

renderCharacterPreview();

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
// - 1~99는 실제 수량, 100 이상은 "99" + 위첨자 "+"로 표시(.part-slot__badge-plus)
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
    renderBadgeContent(badge, quantity);
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

// 좌측 라벨("구입"/"적용") + 우측 가격(💎 n) 구조의 버튼을 생성한다.
// textContent를 통째로 바꾸지 않고, 가격은 별도 span(.modal-card__btn-price)에만 넣어
// 이후 가격만 갱신해야 할 때 이 span만 건드리면 되도록 한다.
// 구입/적용 버튼은 동일한 modal-card__btn--cancel 스타일을 공유하며,
// disabled 상태의 시각적 처리는 CSS(.modal-card__btn--priced:disabled)에서 일괄 담당한다.
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

// ===========================
// 구입 결과 연출 (기존 #part-modal을 재사용)
// - 일반 구입: 결과를 바로 표시
// - 랜덤 구입: "뽑는 중..." 연출(0.7초) 후 결과 표시
// - 결과 표시 중에는 스케일 팝업 + 파티클(6~10개) 효과, 3초 후 자동 닫힘
// - reopenTimerId: "뽑는 중" → 결과 전환 타이머, autoCloseTimerId: 자동 닫힘 타이머
// ===========================
const RANDOM_DRAW_DELAY_MS = 700; // 요구사항: 약 0.6~0.8초
const RESULT_AUTO_CLOSE_MS = 3000;
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

// 파츠 아이콘 주변에 원형 파티클을 잠깐 흩뿌린다. (Canvas/외부 라이브러리 미사용)
function spawnResultParticles() {
  const layer = document.createElement('div');
  layer.className = 'part-modal__particles';

  const count = 6 + Math.floor(Math.random() * 5); // 6~10개
  for (let i = 0; i < count; i += 1) {
    const particle = document.createElement('span');
    particle.className = 'part-modal__particle';
    const angle = (360 / count) * i + (Math.random() * 20 - 10);
    const distance = 34 + Math.random() * 18; // px
    const size = 4 + Math.random() * 4; // 4~8px
    particle.style.setProperty('--angle', `${angle}deg`);
    particle.style.setProperty('--distance', `${distance}px`);
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    particle.style.background = PARTICLE_COLORS[i % PARTICLE_COLORS.length];
    layer.appendChild(particle);
  }

  partModalSvg.appendChild(layer);
  setTimeout(() => layer.remove(), 900);
}

// 구입 결과(획득한 파츠)를 표시하고 3초 뒤 자동으로 닫는다.
function showPurchaseResult(category, id) {
  const part = getPart(category, id);

  const iconSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  iconSvg.setAttribute('viewBox', '0 0 56 56');
  iconSvg.classList.add('part-modal__result-icon');
  partModalSvg.replaceChildren(iconSvg);
  replaceSvgContent(iconSvg, part.assetPath);
  spawnResultParticles();

  partModalName.textContent = '';
  partModalActions.replaceChildren();
  const resultText = document.createElement('p');
  resultText.className = 'part-modal__result-text';
  resultText.textContent = '🎉 꼬무리 조각 획득';
  partModalActions.appendChild(resultText);

  clearResultTimers();
  autoCloseTimerId = setTimeout(closePartModal, RESULT_AUTO_CLOSE_MS);
}

// 랜덤 구입 전용: "뽑는 중..." 로딩 연출 후 결과를 표시한다.
function showRandomDrawing(category, id) {
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
    // 연출 도중 모달이 닫혔다면 결과를 표시하지 않는다.
    if (partModal.classList.contains('modal-overlay--hidden')) return;
    showPurchaseResult(category, id);
  }, RANDOM_DRAW_DELAY_MS);
}

function openPartModal(slot) {
  clearResultTimers();
  const slotId = slot.dataset.part;
  const isRandom = slotId === 'random';
  const headPartId = isRandom ? null : PART_ID_BY_SLOT[slotId];
  const owned = headPartId ? getPartQuantity('head', headPartId) : 0;

  partModalSvg.replaceChildren(slot.querySelector('svg').cloneNode(true));
  partModalName.textContent = '';
  partModalActions.replaceChildren();

  const buyPrice = isRandom ? SHOP_COST.partRandomPurchase : SHOP_COST.partPurchase;
  const canAffordBuy = getGold() >= buyPrice;
  const buyButton = createPricedButton('modal-card__btn--cancel', '구입', `💎 ${buyPrice}`, !canAffordBuy);
  buyButton.addEventListener('click', () => {
    const result = isRandom
      ? purchaseRandomPart('head')
      : purchasePart('head', headPartId);

    if (!result.success) return; // 골드 부족 등: 구매/저장/화면 갱신 없음

    // 골드/수량 배지/버튼 상태는 연출과 무관하게 즉시 갱신한다.
    updateHeaderGold(result.remainingGold);
    refreshAllPartSlots();

    if (isRandom) {
      showRandomDrawing('head', result.id);
    } else {
      showPurchaseResult('head', headPartId);
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
      applyButton.addEventListener('click', () => {
        const result = applyPart('head', headPartId);
        if (!result.success) return; // 미보유/골드 부족 등: 적용/저장/화면 갱신 없음

        updateHeaderGold(result.remainingGold);
        refreshAllPartSlots();
        renderCharacterPreview();
        openPartModal(slot); // 적용 중 표시/버튼 상태를 즉시 반영
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

const colorModal = document.getElementById('color-modal');
const colorModalPreview = document.getElementById('color-modal-preview');
const colorModalActions = document.getElementById('color-modal-actions');

function openColorModal(color) {
  const previewSvg = characterPlaceholder.cloneNode(true);
  previewSvg.querySelectorAll('path, line').forEach((element) => element.setAttribute('stroke', color));
  previewSvg.querySelectorAll('circle').forEach((element) => element.setAttribute('fill', color));
  colorModalPreview.replaceChildren(previewSvg);
  colorModalActions.replaceChildren();

  const canAffordColorBuy = getGold() >= SHOP_COST.colorPurchase;
  const buyButton = createPricedButton('modal-card__btn--cancel', '구입', `💎 ${SHOP_COST.colorPurchase}`, !canAffordColorBuy);
  const applyButton = createPricedButton('modal-card__btn--cancel', '적용', `💎 ${SHOP_COST.colorApply}`);
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