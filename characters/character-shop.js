// v0.1.36
// Character Shop
// - 파츠/색상 구매(일반/랜덤)·적용, 조합·재조합·해체, 이름 설정/변경, 색 섞기 UI
// - 조합/재조합/색 섞기는 미리보기 후 확인 시에만 확정, renderCharacterPreview는 큐로 순차 실행
// - 색상은 fill:none이 아닌 영역에만 적용, #character-root가 조합 단계별로 자동 정렬·확대
// - 모든 기능 버튼은 조건 기반 활성화, 결과 모달은 확인 버튼 유무에 따라 자동 닫힘/수동 닫힘 구분

import { createHeader, updateHeaderGold } from '../shared/header.js';
import { replaceSvgContent, embedSvgFragment } from '../core/svgloader.js';
import { BODY_ASSETS, FACE_ASSETS, getPart, SHOP_COST } from './characterData.js';
import {
  getPartQuantity, purchasePart, purchaseRandomPart, getEquippedPart, applyPart,
  canCombine, previewCombine, canRecombine, previewRecombine, confirmCombine,
  canDismantle, dismantleCharacter, canSaveCharacter, canRename, renameCharacter,
  getColorQuantity, purchaseColor, purchaseRandomColor, canApplyColor, applyColor, getEquippedColor,
  canMixColor, canRemixColor,
} from './inventory.js';
import { getGold, getCharacterName, setCharacterName } from '../core/saveManager.js';

createHeader();



// ===========================
// 캐릭터 placeholder 렌더링
// - 아직 한 번도 적용하지 않았으면(getEquippedPart('head') === null) 안내 문구만 표시.
// - 적용된 머리 파츠가 있으면 해당 파츠 SVG + 눈/입(idle)을 fetch해 표시한다.
// - 상체(body)/하체(legs)는 적용(조합)된 경우에만 그리고, 없으면 비워둔다
//   (기존 head 전용 적용 흐름과 충돌하지 않음 — head 없이 body/legs만 채워지는
//   경우는 없다. 조합은 항상 head → body → legs 순서로 채우고, 실제 저장은
//   confirmCombine()이 호출되는 [확인] 클릭 시점에만 일어나기 때문).
// - 머리에 눈/입이 딸려오듯, 상체가 적용되면 왼팔/오른팔(BODY_ASSETS.leftArm/
//   rightArm)이, 하체가 적용되면 왼다리/오른다리(BODY_ASSETS.leftLeg/rightLeg)가
//   같은 박스에 함께 그려진다. (애니메이션 적용을 대비해 좌우가 분리된 파일)
// - 조합 단계(머리만/머리+상체/전체)에 따라 내용의 세로 범위·전체 길이가 달라지므로,
//   #character-root의 translate+scale을 매번 다시 계산해 항상 가운데 정렬 + 같은
//   전체 길이로 보이도록 한다 (computeCharacterRootTransform 참고).
// - 기존 정적 head outline(<path>)은 실제 파츠로 대체되므로 숨긴다.
// - 슬롯(head/eyes/mouth/body/left-arm/right-arm/leg-part/left-leg/right-leg-slot)의
//   위치·표시 크기는 character-shop.html에서 관리한다. 여기서는 어떤 SVG를 넣을지만 결정한다.
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

// viewBox="minX minY width height" 문자열에서 height만 뽑아낸다. cloneNode로 만든
// 분리된(off-DOM) 엘리먼트에서도 항상 정확히 동작하도록 속성 문자열을 직접 읽는다.
function getViewBoxHeight(svgElement) {
  const viewBox = svgElement.getAttribute('viewBox') ?? '';
  return Number(viewBox.trim().split(/\s+/)[3] ?? 0);
}

// 조합 단계(머리만 / 머리+상체 / 전체)에 따라 실제로 그려지는 내용의 세로 범위가
// 달라진다. 이 함수는 #character-root에 적용할 translate+scale을 계산해
// (1) 항상 viewBox 세로 중앙에 오고, (2) 부족한 단계는 그만큼 확대해 항상
// "전체(머리+상체+하체)"와 같은 전체 길이로 보이도록 만든다.
// 슬롯의 x/y/width/height 자체는 여전히 character-shop.html이 관리하며,
// 여기서는 이미 선언된 값(headPartSlot 등)을 읽어 계산만 한다.
function computeCharacterRootTransform(hasBody, hasLegs, viewBoxHeight) {
  const centerX = Number(headPartSlot.getAttribute('x')) + Number(headPartSlot.getAttribute('width')) / 2;

  const top = Number(headPartSlot.getAttribute('y'));
  let bottomSlot = headPartSlot;
  if (hasBody) bottomSlot = bodyPartSlot;
  if (hasLegs) bottomSlot = legPartSlot;
  const bottom = Number(bottomSlot.getAttribute('y')) + Number(bottomSlot.getAttribute('height'));

  // "전체(머리+상체+하체)" 단계의 길이를 기준으로 삼아, 그보다 짧은 단계는
  // 그 비율만큼 확대한다(scale > 1). 전체 단계에서는 scale이 1이 된다.
  const referenceBottom = Number(legPartSlot.getAttribute('y')) + Number(legPartSlot.getAttribute('height'));
  const referenceHeight = referenceBottom - top;
  const scale = referenceHeight / (bottom - top);

  // SVG의 "translate(...) scale(...)"은 점에 스케일을 먼저 적용한 뒤 이동시키므로
  // (p' = scale*p + translate), 중심(centerX, 콘텐츠 세로 중심)이 스케일 후에도
  // 제자리(가로 centerX, 세로 viewBox 중앙)에 오도록 translate 값을 역산한다.
  const offsetX = centerX * (1 - scale);
  const offsetY = (viewBoxHeight / 2) - ((top + bottom) / 2) * scale;

  return `translate(${offsetX}, ${offsetY}) scale(${scale})`;
}

function applyCharacterRootTransform(rootElement, hasBody, hasLegs, viewBoxHeight) {
  rootElement.setAttribute('transform', computeCharacterRootTransform(hasBody, hasLegs, viewBoxHeight));
}

// 캐릭터 색상은 머리/상체/하체 "모양(shape)" 파츠의 내부(fill)에만 적용된다.
// 파츠 SVG 작성 방식이 파일마다 달라(class="fill-part" 표기 유무, fill을 속성으로
// 쓰는지 style로 쓰는지 등) 클래스명에는 의존하지 않는다. 대신 모든 파츠 파일에서
// 공통인 규칙 — "외곽선은 항상 fill:none, 채우는 영역은 항상 실제 fill 값을 가진다" —
// 을 이용해 채우는 영역만 정확히 찾아낸다. 이렇게 하면 외곽선·눈·입·팔·다리는
// 항상 원래 모습 그대로 유지된다.
// 세 슬롯(head/body/leg-part-slot)에 같은 색을 적용해 캐릭터 전체가 하나의 색으로
// 이어지도록 하고, 슬롯이 비어 있으면(아직 조합 전) 조용히 건너뛴다 — 나중에
// 조합으로 채워질 때 renderCharacterPreview()가 다시 호출되며 자동으로 반영된다.
// 실제 캐릭터(characterPlaceholder)와 색상 모달의 미리보기 클론이 이 함수를 공유한다.
const COLOR_TARGET_SLOT_IDS = ['head-part-slot', 'body-part-slot', 'leg-part-slot'];

// fill이 style 속성(style="fill:...")과 fill 속성(fill="...") 중 어느 쪽으로 지정돼
// 있든 실제 적용되는 값을 읽어서, "none"이 아닌 경우만(= 채우는 영역만) true를 반환한다.
function isFillLayer(shape) {
  const effectiveFill = shape.style.fill || shape.getAttribute('fill');
  return Boolean(effectiveFill) && effectiveFill !== 'none';
}

function applyColorTint(svgRoot, color) {
  COLOR_TARGET_SLOT_IDS.forEach((slotId) => {
    const slot = svgRoot.querySelector(`#${slotId}`);
    if (!slot) return;

    slot.querySelectorAll('path, circle, ellipse, polygon, rect').forEach((shape) => {
      if (!isFillLayer(shape)) return; // 외곽선(fill:none)은 건드리지 않는다

      shape.setAttribute('fill', color);
      // 일부 파츠 SVG는 fill을 style 속성으로 지정해 두는데, 이는 fill 속성보다
      // 우선순위가 높아 setAttribute만으로는 덮어써지지 않는다. !important로 확실히 이기도록 강제한다.
      shape.style.setProperty('fill', color, 'important');
    });
  });
}

// renderCharacterPreview()는 embedSvgFragment(fetch 기반, 비동기)의 완료를 기다렸다가
// 반환한다. 조합/재조합 직후 캐릭터 전체를 복제해 모달에 보여줘야 하는 곳에서는
// 반드시 이 함수의 완료(await)를 기다린 뒤 복제해야 최신 상태가 보인다.
// renderCharacterPreview()가 겹쳐 호출되면(예: 색 적용 직후 곧바로 다른 파츠를
// 적용하는 등) 먼저 시작된 호출의 embedSvgFragment가 나중에 끝나면서 나중 호출의
// 결과(색상 포함)를 덮어쓰는 경합이 있었다. renderChain으로 모든 호출을 한 줄로
// 줄 세워, 항상 이전 호출이 완전히 끝난 뒤에만 다음 호출이 시작되도록 만든다 —
// 두 렌더가 동시에 같은 슬롯에 쓰는 일 자체가 아예 없어진다.
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

  const equippedColor = getEquippedColor();
  if (equippedColor) {
    applyColorTint(characterPlaceholder, equippedColor);
  }
}

renderCharacterPreview();

// ===========================
// 이름 설정/변경 모달 (같은 #name-modal을 두 모드로 재사용)
// - create: 머리 파츠 최초 적용 시 자동으로 뜬다. 무료, [저장]으로만 닫힘(바깥 클릭 불가).
// - rename: [이름 변경] 버튼으로 연다. 💎(SHOP_COST.renameCharacter) 차감, 바깥 클릭으로도 닫힘.
// - 입력창은 비어 있으면 placeholder("10글자까지 가능합니다.")를 보여주고(HTML 기본 동작),
//   maxlength="10"으로 10자 초과 입력을 막는다(붙여넣기 대비 JS에서 한 번 더 자름).
// ===========================
const nameModal = document.getElementById('name-modal');
const nameModalInput = document.getElementById('name-modal-input');
const nameModalSaveButton = document.getElementById('name-modal-save');
const characterNameLabel = document.querySelector('.character-name');
let nameModalMode = 'create'; // 'create' | 'rename' — openNameModal()이 설정

function refreshNameModalSaveButton() {
  nameModalSaveButton.disabled = nameModalInput.value.trim().length === 0;
}

nameModalInput.addEventListener('input', () => {
  if (nameModalInput.value.length > 10) {
    nameModalInput.value = nameModalInput.value.slice(0, 10); // maxlength 우회(붙여넣기 등) 대비
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
  if (!name) return; // 버튼이 비활성화되어 있어 사실상 도달하지 않음

  if (nameModalMode === 'rename') {
    const result = renameCharacter(name);
    if (!result.success) return; // canRename()으로 사전에 걸러지므로 사실상 도달하지 않음
    updateHeaderGold(result.remainingGold);
  } else {
    setCharacterName(name);
  }

  characterNameLabel.textContent = name;
  refreshSaveButton(); // 저장하기 버튼 활성화 조건에 이름이 포함되므로
  refreshRenameButton(); // rename이었다면 골드가 줄어 다시 판단해야 함
  refreshColorMixButton();
  nameModal.classList.add('modal-overlay--hidden');
});

// create 모드는 바깥 클릭으로 닫히지 않지만, rename 모드는 닫힌다.
nameModal.addEventListener('click', (event) => {
  if (event.target !== nameModal) return;
  if (nameModalMode !== 'rename') return;
  nameModal.classList.add('modal-overlay--hidden');
});

// 이미 저장된 이름이 있으면(재방문) 기본 표시 문구 대신 그 이름을 보여준다.
const savedCharacterName = getCharacterName();
if (savedCharacterName) {
  characterNameLabel.textContent = savedCharacterName;
}

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
//   (머리 미장착 / 두 부위(body/legs) 완료 / 보유 파츠 없음 / 골드 부족 시 비활성 —
//   시각적 처리는 구입 등 기존 비활성 버튼과 동일하게 CSS :disabled 스타일에 맡긴다.)
// - 골드/인벤토리가 바뀔 수 있는 모든 지점(구매/적용/조합/해체 직후, 최초 로드)에서
//   refreshCombineButton()을 호출해 최신 상태를 반영한다.
// - 조합/재조합은 "미리보기"만 한다(골드는 즉시 차감되지만 인벤토리 소비/적용
//   저장은 하지 않음). 모달에서 [확인]을 눌러야 실제로 확정된다 — 원하지 않는
//   결과를 재조합으로 몇 번을 다시 뽑든 확정 전까지는 파츠가 소모되지 않는다.
// ===========================
const combineButton = document.getElementById('btn-combine');

function refreshCombineButton() {
  combineButton.disabled = !canCombine();
}

combineButton.addEventListener('click', () => {
  const preview = previewCombine();
  if (!preview.success) return; // canCombine()으로 사전에 걸러지므로 사실상 도달하지 않음

  updateHeaderGold(preview.remainingGold); // 조합 비용은 미리보기 단계에서 즉시 차감된다
  refreshCombineButton();
  refreshDismantleButton();
  refreshRenameButton();
  refreshColorMixButton();
  openCombinePreviewModal(preview.category, preview.id);
});

refreshCombineButton();

// ===========================
// 해체(dismantle) 기능
// - inventory.js의 canDismantle()로 버튼 활성/비활성을 관리한다.
//   (조합 이력 없음(머리만 있음) / 골드 부족 시 비활성)
// - 가장 마지막으로 조합된 부위만 제거하고, 그 파츠는 인벤토리로 돌아간다.
// - 결과는 버튼 없는 안내 모달(showDismantleResult)로 보여주고 잠시 후 자동으로 닫힌다.
// ===========================
const dismantleButton = document.getElementById('btn-dismantle');

function refreshDismantleButton() {
  dismantleButton.disabled = !canDismantle();
}

dismantleButton.addEventListener('click', async () => {
  const result = dismantleCharacter();
  if (!result.success) return; // canDismantle()으로 사전에 걸러지므로 사실상 도달하지 않음

  updateHeaderGold(result.remainingGold);
  refreshAllPartSlots();
  refreshCombineButton();
  refreshDismantleButton();
  refreshRenameButton();
  refreshColorMixButton();
  await renderCharacterPreview(); // 해체된 상태(팔/다리 숨김 등)가 반영된 뒤 모달에 복제한다
  showDismantleResult();
});

refreshDismantleButton();

// 이름 변경 버튼: 이름이 설정돼 있고 골드가 충분할 때만 활성화 (inventory.js의 canRename()).
const renameButton = document.getElementById('btn-rename');

function refreshRenameButton() {
  renameButton.disabled = !canRename();
}

renameButton.addEventListener('click', () => openNameModal('rename'));
refreshRenameButton();

// 캐릭터 저장하기 버튼: 캐릭터가 존재할 때(머리 적용 + 이름 저장)만 활성화 (inventory.js의 canSaveCharacter()).
const saveButton = document.getElementById('btn-save');

function refreshSaveButton() {
  saveButton.disabled = !canSaveCharacter();
}

refreshSaveButton();

// 색 섞기 버튼: 골드가 섞기 비용 이상일 때만 활성화 (inventory.js의 canMixColor()).
const colorMixButton = document.querySelector('.color-mix-btn');

function refreshColorMixButton() {
  colorMixButton.disabled = !canMixColor();
}

colorMixButton.addEventListener('click', () => openColorMixModal());
refreshColorMixButton();

// 헤더 바(섹션 명이 적힌 사각형) 전체를 클릭 영역으로 사용한다 — 화살표 버튼만
// 클릭 대상이면 영역이 좁아 불편하다는 피드백을 반영. 화살표 버튼도 헤더 안에
// 있으므로 클릭이 자연히 버블링되어 같은 핸들러로 처리된다(중복 바인딩 없음).
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
// - 결과 표시 중에는 스케일 팝업 + 파티클(6~10개) 효과, RESULT_AUTO_CLOSE_MS 후 자동 닫힘
//   (버튼 없이 안내만 하는 모달은 모두 이 상수를 공유한다 — 해체 결과 모달 포함)
// - reopenTimerId: "뽑는 중" → 결과 전환 타이머, autoCloseTimerId: 자동 닫힘 타이머
// ===========================
const RANDOM_DRAW_DELAY_MS = 700; // 요구사항: 약 0.6~0.8초
const RESULT_AUTO_CLOSE_MS = 2500; // 버튼 없는 결과 모달(구입 결과/해체 결과) 공통 자동 닫힘 시간
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

// 지정한 컨테이너 주변에 원형 파티클을 잠깐 흩뿌린다. (Canvas/외부 라이브러리 미사용)
// container는 position:relative인 .part-modal__preview 계열 요소여야 한다.
function spawnResultParticles(container) {
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

  container.appendChild(layer);
  setTimeout(() => layer.remove(), 900);
}

// 구입 결과(획득한 파츠)를 표시하고 RESULT_AUTO_CLOSE_MS 후 원래 파츠 모달(구입/적용
// 버튼이 있는)로 자동 복귀한다 — 모달을 닫지 않아 연속 구입이 가능하다. (랜덤 구입 전용 —
// 일반 구입은 openPartModal()이 배지 갱신 + 파티클로 제자리에서 처리한다.)
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

// 랜덤 구입 전용: "뽑는 중..." 로딩 연출 후 결과를 표시한다.
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
    // 연출 도중 모달이 닫혔다면 결과를 표시하지 않는다.
    if (partModal.classList.contains('modal-overlay--hidden')) return;
    showPurchaseResult(id, slot);
  }, RANDOM_DRAW_DELAY_MS);
}

// 해체 결과를 보여준다 (기존 #part-modal 재사용, 버튼 없이 RESULT_AUTO_CLOSE_MS 후 자동으로 닫힘).
// 상단에는 해체된 상태가 반영된 캐릭터 전체를 보여준다 — 호출 전에 renderCharacterPreview()가
// 이미 최신 상태로 갱신되어 있어야 한다 (dismantleButton 클릭 핸들러에서 await 후 호출).
function showDismantleResult() {
  clearResultTimers();

  const preview = characterPlaceholder.cloneNode(true);
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

  // 일반 구입(랜덤 제외)은 보유 수량 배지를 미리보기 위에 그대로 보여준다 —
  // 그리드의 .part-slot__badge와 같은 디자인을 재사용한다.
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

    if (!result.success) return; // 골드 부족 등: 구매/저장/화면 갱신 없음

    // 골드/수량 배지/버튼 상태는 연출과 무관하게 즉시 갱신한다.
    updateHeaderGold(result.remainingGold);
    refreshAllPartSlots();
    refreshCombineButton(); // 구매로 인벤토리가 늘어 조합 가능 여부가 바뀔 수 있음
    refreshDismantleButton(); // 구매로 골드가 줄어 해체 가능 여부가 바뀔 수 있음
    refreshRenameButton(); // 구매로 골드가 줄어 이름 변경 가능 여부가 바뀔 수 있음
    refreshColorMixButton();

    if (isRandom) {
      showRandomDrawing(result.id, slot);
    } else {
      // 일반 구입은 별도 결과 모달 없이, 제자리에서 배지 수량만 갱신하고 파티클을 터뜨린다.
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
        const isFirstSave = !getEquippedPart('head'); // 머리를 아직 한 번도 적용한 적 없으면 캐릭터 최초 생성
        const result = applyPart('head', headPartId);
        if (!result.success) return; // 미보유/골드 부족 등: 적용/저장/화면 갱신 없음

        updateHeaderGold(result.remainingGold);
        refreshAllPartSlots();
        refreshCombineButton(); // 적용으로 인벤토리가 줄어 조합 가능 여부가 바뀔 수 있음
        refreshDismantleButton(); // 적용으로 골드가 줄어 해체 가능 여부가 바뀔 수 있음
        refreshRenameButton(); // 적용으로 골드가 줄어 이름 변경 가능 여부가 바뀔 수 있음
        refreshColorMixButton();
        refreshSaveButton(); // 머리가 적용됐으니 저장하기 활성화 조건이 바뀔 수 있음
        await renderCharacterPreview(); // await 필수 — 다른 렌더 호출과 겹치면 색 적용이 꼬일 수 있음

        if (isFirstSave) {
          closePartModal();
          openNameModal('create');
        } else {
          openPartModal(slot); // 적용 중 표시/버튼 상태를 즉시 반영
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
// 조합 미리보기 모달 (기존 #part-modal 재사용)
// - 상단: 지금 실제로 저장된 캐릭터(확정된 상태) 위에, 아직 확정되지 않은 미리보기
//   파츠(category/id)만 겹쳐서 보여준다. characterPlaceholder 자체나 저장 데이터는
//   전혀 건드리지 않는다 — 그래서 재조합을 몇 번 반복해도 인벤토리가 줄지 않는다.
// - 하단: [확인](confirmCombine으로 확정 + placeholder 반영 + 모달 닫기) /
//   [재조합 💎30](다른 모양으로 새 미리보기, 아직 미확정 상태 유지).
// - 조합/재조합 버튼을 누르는 시점에 골드만 즉시 차감된다(previewCombine/
//   previewRecombine). 인벤토리 소비와 적용 상태 저장은 오직 confirmCombine()이
//   호출되는 [확인] 클릭 시점에만 일어난다.
// ===========================

// 미리보기 전용 캐릭터 이미지를 만든다. 실제 저장된 상태를 복제한 뒤, 아직
// 확정되지 않은 미리보기 파츠만 해당 슬롯에 겹쳐 그린다.
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

  // 미리보기 파츠까지 포함한 세로 범위를 기준으로 가운데 정렬·전체 길이를 다시 계산한다.
  const hasBody = category === 'body' || Boolean(getEquippedPart('body'));
  const hasLegs = category === 'legs' || Boolean(getEquippedPart('legs'));
  applyCharacterRootTransform(clone.querySelector('#character-root'), hasBody, hasLegs, getViewBoxHeight(clone));

  // 이미 적용된 색이 있으면 방금 끼워 넣은 미리보기 파츠에도 같이 반영한다(머리에만
  // 남아있던 클론 상태를 그대로 두면 새로 합쳐진 부위는 색이 빠진 것처럼 보인다).
  const equippedColor = getEquippedColor();
  if (equippedColor) {
    applyColorTint(clone, equippedColor);
  }

  return clone;
}

async function openCombinePreviewModal(category, id) {
  clearResultTimers(); // 구입 결과 연출과 같은 DOM/타이머를 공유하므로 정리하고 시작

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
    if (!result.success) return; // 이론상 도달하지 않음(미리보기 시점에 이미 검증됨)

    refreshAllPartSlots();
    refreshCombineButton();
    refreshDismantleButton();
    await renderCharacterPreview(); // 확정된 상태를 실제 placeholder에 반영
    closePartModal();
  });

  const canRecombineNow = canRecombine(id); // id(지금 미리보기 중인 파츠)와 다른 모양 후보가 있는지
  const recombineButton = createPricedButton(
    'modal-card__btn--cancel',
    '재조합',
    `💎 ${SHOP_COST.partRecombine}`,
    !canRecombineNow,
  );
  recombineButton.addEventListener('click', () => {
    const reroll = previewRecombine(id);
    if (!reroll.success) return; // canRecombine()으로 사전에 걸러지므로 사실상 도달하지 않음

    updateHeaderGold(reroll.remainingGold); // 재조합 비용도 미리보기 단계에서 즉시 차감된다
    refreshCombineButton();
    refreshDismantleButton();
    refreshRenameButton();
    refreshColorMixButton();
    openCombinePreviewModal(category, reroll.id); // 새 미리보기로 모달을 다시 연다 (여전히 미확정)
  });

  partModalActions.append(confirmButton, recombineButton);
  partModal.classList.remove('modal-overlay--hidden');
}

// ===========================
// 색상 슬롯 보유 수량 배지 갱신
// - inventory.js의 getColorQuantity()를 기준으로 표시한다.
// - 배지 디자인은 파츠 슬롯과 동일하게 .part-slot__badge를 그대로 재사용한다
//   (character-shop.css에서 .color-slot에 position:relative만 추가해 기준점을 맞춤).
// ===========================
function refreshColorSlot(slot) {
  const color = slot.dataset.color;
  if (color === 'random') return; // 랜덤 슬롯은 보유 수량 배지 대상이 아님(파츠 랜덤 박스와 동일)

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
  applyColorTint(previewSvg, color);
  colorModalPreview.replaceChildren(previewSvg);
  colorModalActions.replaceChildren();

  // 보유 수량 배지를 미리보기 위에 그대로 보여준다 — 파츠 모달과 같은 디자인(.part-slot__badge) 재사용.
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
    if (!result.success) return; // 골드 부족 등: 구매/저장/화면 갱신 없음

    updateHeaderGold(result.remainingGold);
    refreshAllColorSlots();
    refreshCombineButton(); // 구매로 골드가 줄어 조합/해체/이름 변경 가능 여부가 바뀔 수 있음
    refreshDismantleButton();
    refreshRenameButton();
    refreshColorMixButton();
    openColorModal(color); // 구입 직후 배지 수량·버튼 상태(적용 활성화 등)를 반영해 다시 연다
    spawnResultParticles(colorModalPreview);
  });

  const canApplyColorNow = canApplyColor(color);
  const applyButton = createPricedButton('modal-card__btn--cancel', '적용', `💎 ${SHOP_COST.colorApply}`, !canApplyColorNow);
  applyButton.addEventListener('click', async () => {
    const result = applyColor(color);
    if (!result.success) return; // canApplyColor()로 사전에 걸러지므로 사실상 도달하지 않음

    updateHeaderGold(result.remainingGold);
    refreshAllColorSlots();
    refreshCombineButton(); // 적용으로 골드가 줄어 조합/해체/이름 변경 가능 여부가 바뀔 수 있음
    refreshDismantleButton();
    refreshRenameButton();
    refreshColorMixButton();
    await renderCharacterPreview(); // 실제 캐릭터에도 색이 반영된 뒤 모달을 닫는다
    colorModal.classList.add('modal-overlay--hidden');
  });

  colorModalActions.append(buyButton, applyButton);
  colorModal.classList.remove('modal-overlay--hidden');
}

// ===========================
// 색상 랜덤 구입 (기존 #part-modal 재사용 — 파츠 랜덤 구입과 동일한 흐름:
// [구입] → "뽑는 중..." → 🎉결과 → 자동으로 랜덤 구입 화면 복귀)
// ===========================
let lastDrawnColor = null; // showColorRandomDrawing → showColorPurchaseResult로 전달할 값

// 색상 랜덤 구입 결과를 표시하고 RESULT_AUTO_CLOSE_MS 후 랜덤 구입 화면으로 자동 복귀한다.
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

// 색상 랜덤 구입 전용: "뽑는 중..." 로딩 연출 후 결과를 표시한다.
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
    // 연출 도중 모달이 닫혔다면 결과를 표시하지 않는다.
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
    if (!result.success) return; // 골드 부족 등: 구매/저장/화면 갱신 없음

    updateHeaderGold(result.remainingGold);
    refreshAllColorSlots();
    refreshCombineButton(); // 구매로 골드가 줄어 조합/해체/이름 변경 가능 여부가 바뀔 수 있음
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
// 색 섞기 모달 (기존 #part-modal 재사용 — 조합 미리보기 모달과 같은 흐름:
// 미리보기 + [확인] + [다시 섞기 💎N]).
// 지금은 UI 흐름만 구성한다 — 실제로 색을 섞어 새로 생성/저장하는 로직은
// 아직 없다(요청에 따라 이후 별도 구현 예정). confirmButton/remixButton은
// 그때 실제 로직으로 교체한다.
// ===========================
function openColorMixModal() {
  clearResultTimers();

  const preview = characterPlaceholder.cloneNode(true); // TODO: 실제로 섞인 색 미리보기로 교체
  partModalSvg.replaceChildren(preview);
  partModalName.textContent = '';
  partModalActions.replaceChildren();

  const confirmButton = document.createElement('button');
  confirmButton.type = 'button';
  confirmButton.className = 'modal-card__btn modal-card__btn--confirm';
  confirmButton.textContent = '확인';
  confirmButton.addEventListener('click', closePartModal); // TODO: 확정 로직(저장/적용) 연결

  const canRemixNow = canRemixColor();
  const remixButton = createPricedButton(
    'modal-card__btn--cancel',
    '다시 섞기',
    `💎 ${SHOP_COST.colorRemix}`,
    !canRemixNow,
  );
  remixButton.addEventListener('click', () => {
    // TODO: 골드 차감 + 새로운 색 생성 로직 연결. 지금은 모달만 다시 연다.
    openColorMixModal();
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