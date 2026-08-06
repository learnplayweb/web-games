// v0.1.0 : 최초 생성 - 캐릭터 상점 화면 스크립트 (섹션 토글, 파츠/색상/저장 모달)
// v0.1.1 : Refactor - placeholder 눈/입, 파츠 슬롯 아이콘을 assets fetch 기반
//          inline SVG(svgloader.js)로 로딩하도록 변경. 화면/기능은 동일.
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
// v0.1.9 : Fix - '../core/svgLoader.js' → '../core/svgloader.js' import 경로 대소문자
//          수정. 로컬(대소문자 미구분 파일시스템)에서는 문제없이 동작했으나 GitHub
//          Pages(대소문자 구분 파일시스템)에서 404가 발생하던 문제 해결.
// v0.1.10 : Refactor - characterData.js/inventory.js가 부위 공유 인벤토리로
//           바뀜에 따라 getPart(id)/getPartQuantity(id)/purchasePart(id)/
//           purchaseRandomPart()로 category 인자를 제거한 호출부 수정.
//           applyPart(category, id)는 "적용할 부위"를 의미하므로 그대로 유지.
// v0.1.11 : Implement - 조합(combine) 기능을 #btn-combine에 연결. inventory.js의
//           canCombine()/combineCharacter()를 사용해 버튼 활성/비활성을 관리하고,
//           조합 성공 시 골드/파츠 배지/캐릭터 미리보기를 즉시 갱신한다.
//           renderCharacterPreview()가 head 외 body/legs 적용 상태도 함께
//           그리도록 확장 (기존 head 전용 동작과 충돌 없음).
// v0.1.12 : Implement - 조합 결과 모달(openCombineResultModal) 추가. 기존
//           #part-modal을 재사용해 지금까지 조합된 캐릭터 전체를 보여주고,
//           [확인](닫기만 함)/[재조합 💎30](다른 모양으로 재조합) 버튼을 연결.
//           조합/재조합 모두 버튼 클릭 시점에 데이터가 이미 반영되며, [확인]은
//           그 상태를 되돌리지 않고 모달만 닫는다.
// v0.1.13 : Fix - 조합/재조합 직후 모달에 이전 상태 캐릭터가 보이던 문제 수정.
//           renderCharacterPreview()가 embedSvgFragment(fetch 기반 비동기)를
//           기다리지 않고 반환해, 그 직후 characterPlaceholder를 복제하면 아직
//           새 SVG가 채워지기 전이었다. renderCharacterPreview()를 async로 바꿔
//           모든 embedSvgFragment를 Promise.all로 기다리도록 하고, 조합/재조합
//           핸들러에서 await한 뒤 openCombineResultModal()을 호출하도록 수정.

import { createHeader, updateHeaderGold } from '../shared/header.js';
import { replaceSvgContent, embedSvgFragment } from '../core/svgloader.js';
import { FACE_ASSETS, getPart, SHOP_COST } from './characterData.js';
import {
  getPartQuantity, purchasePart, purchaseRandomPart, getEquippedPart, applyPart,
  canCombine, combineCharacter, canRecombine, recombineCharacter,
} from './inventory.js';
import { getGold } from '../core/saveManager.js';

createHeader();



// ===========================
// 캐릭터 placeholder 렌더링
// - 아직 한 번도 적용하지 않았으면(getEquippedPart('head') === null) 안내 문구만 표시.
// - 적용된 머리 파츠가 있으면 해당 파츠 SVG + 눈/입(idle)을 fetch해 표시한다.
// - 상체(body)/하체(legs)는 적용(조합)된 경우에만 그리고, 없으면 비워둔다
//   (기존 head 전용 적용 흐름과 충돌하지 않음 — head 없이 body/legs만 채워지는
//   경우는 없다. combineCharacter()가 항상 head → body → legs 순서로 채우기 때문).
// - 기존 정적 head outline(<path>)은 실제 파츠로 대체되므로 숨긴다.
// - 슬롯(head/eyes/mouth/body/leg-part-slot)의 위치·표시 크기는
//   character-shop.html에서 관리한다. 여기서는 어떤 SVG를 넣을지만 결정한다.
// ===========================
const characterPlaceholder = document.querySelector('.character-placeholder');
const headOutlinePath = characterPlaceholder.querySelector('path');
const placeholderText = characterPlaceholder.querySelector('text');
const headPartSlot = document.getElementById('head-part-slot');
const faceEyesSlot = document.getElementById('face-eyes-slot');
const faceMouthSlot = document.getElementById('face-mouth-slot');
const bodyPartSlot = document.getElementById('body-part-slot');
const legPartSlot = document.getElementById('leg-part-slot');

// renderCharacterPreview()는 embedSvgFragment(fetch 기반, 비동기)의 완료를 기다렸다가
// 반환한다. 조합/재조합 직후 캐릭터 전체를 복제해 모달에 보여줘야 하는 곳에서는
// 반드시 이 함수의 완료(await)를 기다린 뒤 복제해야 최신 상태가 보인다.
async function renderCharacterPreview() {
  const equippedHeadId = getEquippedPart('head');

  if (!equippedHeadId) {
    headOutlinePath.style.display = 'none';
    headPartSlot.replaceChildren();
    faceEyesSlot.replaceChildren();
    faceMouthSlot.replaceChildren();
    bodyPartSlot.replaceChildren();
    legPartSlot.replaceChildren();
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
  } else {
    bodyPartSlot.replaceChildren();
  }

  const equippedLegsId = getEquippedPart('legs');
  if (equippedLegsId) {
    pendingEmbeds.push(embedSvgFragment(legPartSlot, getPart(equippedLegsId).assetPath));
  } else {
    legPartSlot.replaceChildren();
  }

  await Promise.all(pendingEmbeds);
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
  const part = partId ? getPart(partId) : null;
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
// 조합(combine) 기능
// - inventory.js의 canCombine()으로 버튼 활성/비활성을 관리한다.
//   (3부위 완료 / 보유 파츠 없음 / 골드 부족 시 비활성 — 시각적 처리는 구입 등
//   기존 비활성 버튼과 동일하게 CSS :disabled 스타일에 맡긴다.)
// - 골드/인벤토리가 바뀔 수 있는 모든 지점(구매/적용/조합 직후, 최초 로드)에서
//   refreshCombineButton()을 호출해 최신 상태를 반영한다.
// ===========================
const combineButton = document.getElementById('btn-combine');

function refreshCombineButton() {
  combineButton.disabled = !canCombine();
}

combineButton.addEventListener('click', async () => {
  const result = combineCharacter();
  if (!result.success) return; // canCombine()으로 사전에 걸러지므로 사실상 도달하지 않음

  updateHeaderGold(result.remainingGold);
  refreshAllPartSlots();
  refreshCombineButton();
  await renderCharacterPreview(); // 모달에 복제할 캐릭터가 최신 상태가 되도록 완료를 기다린다
  openCombineResultModal(result.category);
});

refreshCombineButton();

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
function showPurchaseResult(id) {
  const part = getPart(id);

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
function showRandomDrawing(id) {
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
    showPurchaseResult(id);
  }, RANDOM_DRAW_DELAY_MS);
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

  const buyPrice = isRandom ? SHOP_COST.partRandomPurchase : SHOP_COST.partPurchase;
  const canAffordBuy = getGold() >= buyPrice;
  const buyButton = createPricedButton('modal-card__btn--cancel', '구입', `💎 ${buyPrice}`, !canAffordBuy);
  buyButton.addEventListener('click', () => {
    const result = isRandom
      ? purchaseRandomPart()
      : purchasePart(headPartId);

    if (!result.success) return; // 골드 부족 등: 구매/저장/화면 갱신 없음

    // 골드/수량 배지/버튼 상태는 연출과 무관하게 즉시 갱신한다.
    updateHeaderGold(result.remainingGold);
    refreshAllPartSlots();
    refreshCombineButton(); // 구매로 인벤토리가 늘어 조합 가능 여부가 바뀔 수 있음

    if (isRandom) {
      showRandomDrawing(result.id);
    } else {
      showPurchaseResult(headPartId);
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
        refreshCombineButton(); // 적용으로 인벤토리가 줄어 조합 가능 여부가 바뀔 수 있음
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

// ===========================
// 조합 결과 모달 (기존 #part-modal 재사용)
// - 상단: 지금까지 조합된 캐릭터 전체 미리보기 (character-placeholder를 그대로 복제 —
//   openColorModal()과 동일한 방식). 호출 시점에는 renderCharacterPreview()가 이미
//   최신 상태로 갱신되어 있어야 한다.
// - 하단: [확인](모달을 닫기만 함) / [재조합 💎30](다른 모양 파츠로 재조합).
// - 조합/재조합은 버튼을 누르는 즉시 데이터가 반영된다(inventory.js의
//   combineCharacter()/recombineCharacter() 호출 시점). 이 모달의 [확인]은
//   단순히 화면을 닫을 뿐 그 어떤 상태도 되돌리지 않는다.
// ===========================
function openCombineResultModal(category) {
  clearResultTimers(); // 구입 결과 연출과 같은 DOM/타이머를 공유하므로 정리하고 시작

  const preview = characterPlaceholder.cloneNode(true);
  partModalSvg.replaceChildren(preview);
  partModalName.textContent = '';
  partModalActions.replaceChildren();

  const confirmButton = document.createElement('button');
  confirmButton.type = 'button';
  confirmButton.className = 'modal-card__btn modal-card__btn--confirm';
  confirmButton.textContent = '확인';
  confirmButton.addEventListener('click', closePartModal);

  const canRecombineNow = canRecombine(category);
  const recombineButton = createPricedButton(
    'modal-card__btn--cancel',
    '재조합',
    `💎 ${SHOP_COST.partRecombine}`,
    !canRecombineNow,
  );
  recombineButton.addEventListener('click', async () => {
    const result = recombineCharacter(category);
    if (!result.success) return; // canRecombine()으로 사전에 걸러지므로 사실상 도달하지 않음

    updateHeaderGold(result.remainingGold);
    refreshAllPartSlots();
    refreshCombineButton();
    await renderCharacterPreview(); // 모달에 복제할 캐릭터가 최신 상태가 되도록 완료를 기다린다
    openCombineResultModal(category); // 새 결과로 모달을 다시 연다 (같은 부위 재조합)
  });

  partModalActions.append(confirmButton, recombineButton);
  partModal.classList.remove('modal-overlay--hidden');
}

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