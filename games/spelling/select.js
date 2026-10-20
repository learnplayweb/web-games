// v0.6.0
// Spelling Game - 달인 마당 카드에 최근 별점 대신 level별 최고 별점(매달 1일 초기화) 표시

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

// 복습 마당 해금 조건(이후 구현 예정) : 일반 마당 전체가 최고 별점 3개일 때만 해금
// function isReviewUnlocked(stage) {
//   return stage.topics.every((topicId) => getSpellingBestStars(topicId) === 3);
// }

function renderStageCards() {
  const list = document.getElementById('stage-card-list');
  list.innerHTML = '';

  STAGES.forEach((stage) => {
    const isReview = stage.type === 'review';

    // 잠금 로직 자리 (현재는 항상 해금) : 준비되면 아래 주석으로 교체
    // const isUnlocked = isReview ? isReviewUnlocked(stage) : true;
    const isUnlocked = true;

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
    // 달인 마당은 최고 별점을 저장하지 않고, 가장 최근 플레이 별점만 표시한다.
    starsLabel.textContent = isReview
      ? starsToString(getSpellingReviewBestStars(stage.level))
      : starsToString(getSpellingBestStars(stage.topic));

    card.append(levelLabel, starsLabel);
    if (isUnlocked) {
      card.addEventListener('click', () => {
        location.href = `index.html?level=${stage.level}`;
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