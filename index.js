// v0.1.1 : 맞춤법 모험 카드 조건부 활성화(캐릭터 이름 등록 여부) + 잠김 안내 모달
import { createHeader } from './shared/header.js';
import { getCharacterName } from './core/saveManager.js';

createHeader();

const spellingCard  = document.getElementById('card-spelling');
const spellingBadge = document.getElementById('card-spelling-badge');
const lockModal     = document.getElementById('lock-modal');
const lockModalClose = document.getElementById('lock-modal-close');

// 캐릭터 등록 여부: 이름이 저장돼 있으면 등록 상태
// (게임 페널티로 applyPenaltyLoss가 이름을 null로 만들면 자동으로 미등록 처리)
function isCharacterRegistered() {
  return Boolean(getCharacterName());
}

// 카드 상태(활성/잠김) 반영: 클래스·뱃지·aria 한 번에 갱신
function updateSpellingCard() {
  const unlocked = isCharacterRegistered();
  spellingCard.classList.toggle('card--active', unlocked);
  spellingCard.classList.toggle('card--soon', !unlocked);
  spellingCard.setAttribute('aria-disabled', String(!unlocked));
  spellingBadge.classList.toggle('card__badge--play', unlocked);
  spellingBadge.classList.toggle('card__badge--soon', !unlocked);
  spellingBadge.textContent = unlocked ? 'Play' : 'Locked';
}

function openLockModal() {
  lockModal.hidden = false;
  lockModalClose.focus();
}

function closeLockModal() {
  lockModal.hidden = true;
}

// 잠김 상태에서는 링크 이동을 막고 모달 표시 (클릭 시점에 다시 판별해 상태 불일치 방지)
spellingCard.addEventListener('click', (e) => {
  if (isCharacterRegistered()) return;
  e.preventDefault();
  openLockModal();
});

lockModalClose.addEventListener('click', closeLockModal);

// 모달 바깥(오버레이) 클릭 시 닫기
lockModal.addEventListener('click', (e) => {
  if (e.target === lockModal) closeLockModal();
});

// ESC 키로 닫기
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !lockModal.hidden) closeLockModal();
});

updateSpellingCard();

// 뒤로가기(bfcache 복원) 시에도 최신 캐릭터 상태로 다시 판별
window.addEventListener('pageshow', updateSpellingCard);