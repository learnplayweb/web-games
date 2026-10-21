// v0.1.2 : 캐릭터 등록 시 헤더 설명을 랜덤 인사말 + 캐릭터 이름 문구로 변경
import { createHeader } from './shared/header.js';
import { getCharacterName } from './core/saveManager.js';

createHeader();

const siteDesc       = document.getElementById('site-desc');
const spellingCard   = document.getElementById('card-spelling');
const spellingBadge  = document.getElementById('card-spelling-badge');
const lockModal      = document.getElementById('lock-modal');
const lockModalClose = document.getElementById('lock-modal-close');

// 인사말 후보: 접속(페이지 로드)할 때마다 이 중 하나가 랜덤으로 선택됨
const GREETINGS = ['반가워요', '안녕하세요', '어서오세요', '환영해요'];

// 기본 문구는 HTML에 적힌 값을 그대로 사용 (문구를 한 곳에서만 관리)
const DEFAULT_DESC = siteDesc.textContent;

// 이번 접속에서 쓸 인사말: 모듈 로드 시 1회만 뽑아 고정
// (뒤로가기로 돌아와 pageshow가 다시 실행돼도 인사말이 바뀌지 않도록)
const currentGreeting = GREETINGS[Math.floor(Math.random() * GREETINGS.length)];

// 캐릭터 등록 여부: 이름이 저장돼 있으면 등록 상태
// (게임 페널티로 applyPenaltyLoss가 이름을 null로 만들면 자동으로 미등록 처리)
function isCharacterRegistered() {
  return Boolean(getCharacterName());
}

// 헤더 설명 반영: 등록 시 "인사말, 이름의 주인님!", 미등록 시 기본 문구
function updateGreeting() {
  const name = getCharacterName();
  // textContent 사용: 이름에 특수문자가 있어도 HTML로 해석되지 않음
  siteDesc.textContent = name
    ? `${currentGreeting}, ${name}의 주인님!`
    : DEFAULT_DESC;
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

// 캐릭터 상태에 따라 바뀌는 화면 요소를 한 번에 갱신
function refreshCharacterState() {
  updateGreeting();
  updateSpellingCard();
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

refreshCharacterState();

// 뒤로가기(bfcache 복원) 시에도 최신 캐릭터 상태로 다시 판별 (인사말은 유지, 이름/카드만 갱신)
window.addEventListener('pageshow', refreshCharacterState);