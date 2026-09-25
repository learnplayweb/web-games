// v0.3.0
// Spelling Game - 마당 선택 화면 (시계 게임 select.js 구조 재사용)
// - STAGES(data/stages.js)를 기준으로 카드를 렌더링. 일반 마당은 주제별 최고 별점(getSpellingBestStars) 표시
// - 달인 마당(복습, type: 'review')은 카드 표시명 "달인 마당. 1~5". 최고 별점은 저장 안 하고 최근 별점만 표시(getSpellingReviewRecentStars)
// - 달인 마당 잠금(1~5마당 모두 별 3개 시 해금)은 아직 구현하지 않고, 코드만 준비해 주석 처리해 둠(현재는 항상 해금 상태)

import { getGold, getSpellingBestStars, getSpellingReviewRecentStars } from '../../core/saveManager.js';
import { createHeader, updateHeaderGold } from '../../shared/header.js';
import { STAGES } from './data/stages.js';

// topic 문자열 → 카드에 표시할 이름
// ※ 마당3(gaj-gat-gass)은 실제 stages.js에서 사용자가 직접 고친 topic 문자열을 기준으로 매핑함.
//    이 파일에서 보고 있는 stages.js와 실제 배포본의 topic 문자열이 다르면 이 표의 키도 맞춰서 고칠 것.
const STAGE_LABELS = {
  'doe-dwae':      '마당1. 되 / 돼',
  'an-anh':        '마당2. 안 / 않',
  'gaj-gat-gass':  '마당3. 갔 / 갖 / 같',
  'deon-deun':     '마당4. 던 / 든',
  'dae-de':        '마당5. 대 / 데',
};

function starsToString(stars) {
  return '⭐'.repeat(stars) + '☆'.repeat(3 - stars);
}

// 복습 마당 해금 조건(이후 구현 예정) : 일반 마당 전체가 최고 별점 3개일 때만 해금
// function isReviewUnlocked() {
//   return STAGES
//     .filter((stage) => stage.type === 'normal')
//     .every((stage) => getSpellingBestStars(stage.topic) === 3);
// }

function renderStageCards() {
  const list = document.getElementById('stage-card-list');
  list.innerHTML = '';

  STAGES.forEach((stage) => {
    const isReview = stage.type === 'review';

    // 잠금 로직 자리 (현재는 항상 해금) : 준비되면 아래 주석으로 교체
    // const isUnlocked = isReview ? isReviewUnlocked() : true;
    const isUnlocked = true;

    const card = document.createElement('div');
    card.className = `stage-card ${isUnlocked ? 'stage-card--unlocked' : 'stage-card--locked'}`;
    if (isReview) card.classList.add('stage-card--review');

    const name = isReview ? '달인 마당. 1~5' : (STAGE_LABELS[stage.topic] ?? stage.topic);

    const levelLabel = document.createElement('p');
    levelLabel.className = 'stage-card__level';
    levelLabel.textContent = isUnlocked ? name : `🔒 ${name}`;

    const starsLabel = document.createElement('p');
    starsLabel.className = 'stage-card__stars';
    // 달인 마당은 최고 별점을 저장하지 않고, 가장 최근 플레이 별점만 표시한다.
    starsLabel.textContent = isReview
      ? starsToString(getSpellingReviewRecentStars())
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