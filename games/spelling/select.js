// v0.7.0
// Spelling Game - 달인 마당 조건부 해금(담당 일반 마당 모두 별 3점) + 잠김 안내 모달

import { getGold, getSpellingBestStars, getSpellingReviewBestStars } from '../../core/saveManager.js';
import { createHeader, updateHeaderGold } from '../../shared/header.js';
import { STAGES } from './data/stages.js';
import { TOPICS } from './data/topics.js';

function starsToString(stars) {
  return '⭐'.repeat(stars) + '☆'.repeat(3 - stars);
}

// topic id → topics.js의 label
function topicLabel(topicId) {
  return TOPICS.find((topic) => topic.id === topicId)?.label ?? topicId;
}

// 해당 stage가 STAGES 안에서 몇 번째 "일반" 마당인지 (1부터 시작) → 화면에 보이는 "마당N" 번호
function normalStageNumber(stage) {
  return STAGES.filter((s) => s.type === 'normal').findIndex((s) => s.level === stage.level) + 1;
}

// topic id → 그 topic이 몇 번째 "일반" 마당인지 (마당N 번호와 동일한 기준)
function normalStageNumberByTopic(topicId) {
  return STAGES.filter((s) => s.type === 'normal').findIndex((s) => s.topic === topicId) + 1;
}

// 달인 마당(review) 하나가 묶고 있는 주제들의 "N~M" 범위 (예: 1~5, 6~10 ...) — 묶음이 늘어나도 자동 계산됨
function reviewRangeLabel(stage) {
  const numbers = stage.topics.map(normalStageNumberByTopic);
  return `${Math.min(...numbers)}~${Math.max(...numbers)}`;
}

// 달인 마당 해금 조건: 묶인 일반 마당(N~M) 전체가 최고 별점 3개
function isReviewUnlocked(stage) {
  return stage.topics.every((topicId) => getSpellingBestStars(topicId) === 3);
}

/* ===========================
   잠김 안내 모달 (select.html 수정 없이 JS에서 1회 생성)
=========================== */
let lockModal = null;
let lockModalText = null;

function closeLockModal() {
  lockModal.hidden = true;
}

// 최초 호출 시에만 DOM 생성 후 재사용
function createLockModal() {
  lockModal = document.createElement('div');
  lockModal.className = 'modal-overlay';
  lockModal.hidden = true;

  const card = document.createElement('div');
  card.className = 'modal-card';
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-modal', 'true');

  lockModalText = document.createElement('p');
  lockModalText.className = 'modal-card__text';

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'modal-card__btn';
  closeBtn.textContent = '확인';
  closeBtn.addEventListener('click', closeLockModal);

  card.append(lockModalText, closeBtn);
  lockModal.appendChild(card);
  document.body.appendChild(lockModal);

  // 모달 바깥(오버레이) 클릭 시 닫기
  lockModal.addEventListener('click', (e) => {
    if (e.target === lockModal) closeLockModal();
  });

  // ESC 키로 닫기
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !lockModal.hidden) closeLockModal();
  });
}

function showLockModal(message) {
  if (!lockModal) createLockModal();
  lockModalText.textContent = message;
  lockModal.hidden = false;
  lockModal.querySelector('.modal-card__btn').focus();
}

function renderStageCards() {
  const list = document.getElementById('stage-card-list');
  list.innerHTML = '';

  STAGES.forEach((stage) => {
    const isReview = stage.type === 'review';

    // 일반 마당은 항상 해금, 달인 마당은 조건 충족 시에만 해금
    const isUnlocked = isReview ? isReviewUnlocked(stage) : true;

    const card = document.createElement('div');
    card.className = `stage-card ${isUnlocked ? 'stage-card--unlocked' : 'stage-card--locked'}`;
    if (isReview) card.classList.add('stage-card--review');

    const name = isReview
      ? `달인 마당. ${reviewRangeLabel(stage)}`
      : `마당${normalStageNumber(stage)}. ${topicLabel(stage.topic)}`;

    const levelLabel = document.createElement('p');
    levelLabel.className = 'stage-card__level';
    levelLabel.textContent = isUnlocked ? name : `🔒 ${name}`;

    const starsLabel = document.createElement('p');
    starsLabel.className = 'stage-card__stars';
    // 달인 마당은 level별 최고 별점(매달 1일 초기화), 일반 마당은 topic별 최고 별점 표시
    starsLabel.textContent = isReview
      ? starsToString(getSpellingReviewBestStars(stage.level))
      : starsToString(getSpellingBestStars(stage.topic));

    card.append(levelLabel, starsLabel);

    if (isUnlocked) {
      card.addEventListener('click', () => {
        location.href = `index.html?level=${stage.level}`;
      });
    } else {
      // 잠김 상태: 이동 대신 안내 모달 (달인 마당만 잠기므로 범위 문구 사용)
      card.addEventListener('click', () => {
        showLockModal(`마당 ${reviewRangeLabel(stage)} 모두\n 별 3점이어야 열려요.`);
      });
    }
    list.appendChild(card);
  });
}

createHeader();
renderStageCards();

// index.html에서 history.back()으로 select.html로 돌아올 때 bfcache 복원이면
// 모듈 스크립트가 재실행되지 않아 최신 저장 데이터(별점 등)를 반영하지 못하는 문제 방지
window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    renderStageCards();
    updateHeaderGold(getGold());
  }
});