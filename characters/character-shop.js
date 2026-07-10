// v0.1.0 : 최초 생성 - 캐릭터 상점 UI 동작 (기능 미구현)

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