// v0.1.0 : 최초 생성 - 캐릭터 상점 UI 동작 (기능 미구현)
// v0.1.1 : 파츠 슬롯 클릭 모달 추가

/* ===========================
   Gold 표시
=========================== */
try {
  const save = JSON.parse(localStorage.getItem('clockGame_save') || '{}');
  document.getElementById('display-gold').textContent = save.gold ?? 0;
} catch {
  document.getElementById('display-gold').textContent = 0;
}

/* ===========================
   접기/펼치기 토글
=========================== */

/**
 * 섹션 헤더 토글 버튼 동작
 * @param {string} toggleId - 토글 버튼 id
 * @param {string} bodyId   - 토글 대상 body id
 */
function setupToggle(toggleId, bodyId) {
  const btn  = document.getElementById(toggleId);
  const body = document.getElementById(bodyId);

  btn.addEventListener('click', () => {
    const isHidden = body.classList.toggle('shop-section__body--hidden');
    btn.textContent    = isHidden ? '▼' : '▲';
    btn.setAttribute('aria-expanded', String(!isHidden));
  });
}

setupToggle('toggle-color',      'color-body');
setupToggle('toggle-decoration', 'decoration-body');

/* ===========================
   파츠 슬롯 클릭 → 모달
=========================== */

const partModal        = document.getElementById('part-modal');
const partModalSvg     = document.getElementById('part-modal-svg');
const partModalName    = document.getElementById('part-modal-name');
const partModalActions = document.getElementById('part-modal-actions');

// 현재 적용 중인 파츠 id (더미 상태: 없음)
let currentHeadPart = null;

/**
 * 파츠 모달을 열고 내용을 구성한다.
 * @param {HTMLElement} slot - 클릭된 파츠 슬롯 요소
 */
function openPartModal(slot) {
  const partId   = slot.dataset.part;
  const partName = slot.dataset.name;
  const owned    = parseInt(slot.dataset.owned ?? '0', 10);
  const isRandom = partId === 'random';

  // SVG 복사하여 크게 표시
  const svgEl = slot.querySelector('svg').cloneNode(true);
  partModalSvg.innerHTML = '';
  partModalSvg.appendChild(svgEl);

  // 이름 표시
  partModalName.textContent = partName;

  // 버튼 구성
  partModalActions.innerHTML = '';

  // 구매 버튼 (항상 표시)
  const buyBtn = document.createElement('button');
  buyBtn.type      = 'button';
  buyBtn.className = 'modal-card__btn modal-card__btn--confirm';
  buyBtn.textContent = isRandom ? '구매 💎 60' : '구매 💎 100';
  // TODO: 구매 기능 구현
  partModalActions.appendChild(buyBtn);

  // 적용 버튼 (랜덤 박스 제외)
  if (!isRandom) {
    if (currentHeadPart === partId) {
      // 현재 적용 중인 파츠
      const appliedMsg = document.createElement('p');
      appliedMsg.className   = 'part-modal__applied';
      appliedMsg.textContent = '적용 중';
      partModalActions.appendChild(appliedMsg);
    } else {
      const applyBtn = document.createElement('button');
      applyBtn.type      = 'button';
      applyBtn.className = 'modal-card__btn modal-card__btn--cancel';
      applyBtn.textContent = '적용 💎 10';
      // 미보유 시 비활성화
      if (owned <= 0) {
        applyBtn.disabled = true;
        applyBtn.style.opacity = '0.4';
        applyBtn.style.cursor  = 'default';
      }
      // TODO: 적용 기능 구현
      partModalActions.appendChild(applyBtn);
    }
  }

  partModal.classList.remove('modal-overlay--hidden');
}

// 파츠 슬롯 이벤트 위임
document.querySelector('.parts-grid').addEventListener('click', (e) => {
  const slot = e.target.closest('[data-part]');
  if (!slot) return;
  openPartModal(slot);
});

// 파츠 모달 배경 클릭 시 닫기
partModal.addEventListener('click', (e) => {
  if (e.target === partModal) {
    partModal.classList.add('modal-overlay--hidden');
  }
});

/* ===========================
   저장 모달
=========================== */
const saveModal   = document.getElementById('save-modal');
const btnSave     = document.getElementById('btn-save');
const modalCancel = document.getElementById('modal-cancel');
const modalConfirm = document.getElementById('modal-confirm');

// 저장하기 버튼 → 모달 표시
btnSave.addEventListener('click', () => {
  saveModal.classList.remove('modal-overlay--hidden');
});

// 취소 버튼 → 모달 닫기
modalCancel.addEventListener('click', () => {
  saveModal.classList.add('modal-overlay--hidden');
});

// 저장 버튼 → 추후 구현 (현재는 모달만 닫음)
modalConfirm.addEventListener('click', () => {
  saveModal.classList.add('modal-overlay--hidden');
  // TODO: 캐릭터 저장 기능 구현
});

// 모달 배경 클릭 시 닫기
saveModal.addEventListener('click', (e) => {
  if (e.target === saveModal) {
    saveModal.classList.add('modal-overlay--hidden');
  }
});