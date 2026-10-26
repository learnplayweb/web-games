// v0.1.0 : 단계 선택 화면 공통 모듈 최초 생성 (시계·맞춤법 select.js의 카드 렌더링·헤더·뒤로가기 갱신 통합)
//
// 사용법 (games\<id>\select.js)
//   import { initStageSelect } from '../../shared/stageSelect.js';
//   initStageSelect({ getCards: () => [ { level, name, stars, unlocked } ] });
//
// getCards()가 돌려주는 카드 정보 (해금 조건·별점·이름은 게임별 규칙이므로 게임이 계산)
// - level:         ?level= 파라미터로 게임 화면에 넘길 단계 번호
// - name:          카드에 표시할 이름
// - stars:         0~3 (표시용 최고/최근 별점)
// - unlocked:      true면 클릭 시 게임 화면으로 이동
// - review:        (선택) 복습 단계 카드면 true → 연노랑 카드
// - onLockedClick: (선택) 잠긴 카드를 눌렀을 때 실행할 함수 (예: 잠김 안내 모달). 없으면 아무 일도 없음
//
// Public API
// - initStageSelect({ getCards, gameUrl })

import { getGold } from '../core/saveManager.js';
import { starsToEmoji } from '../core/reward.js';
import { createHeader, updateHeaderGold } from './header.js';

// 카드 1개 DOM 생성
function buildCard(card, gameUrl) {
  const { level, name, stars, unlocked, review = false, onLockedClick } = card;

  const element = document.createElement('div');
  element.className = `stage-card ${unlocked ? 'stage-card--unlocked' : 'stage-card--locked'}`;
  if (review) element.classList.add('stage-card--review');

  const levelLabel = document.createElement('p');
  levelLabel.className = 'stage-card__level';
  levelLabel.textContent = unlocked ? name : `\u{1F512} ${name}`; // 잠김이면 🔒 접두

  const starsLabel = document.createElement('p');
  starsLabel.className = 'stage-card__stars';
  starsLabel.textContent = starsToEmoji(stars);

  element.append(levelLabel, starsLabel);

  if (unlocked) {
    element.addEventListener('click', () => {
      location.href = `${gameUrl}?level=${level}`;
    });
  } else if (onLockedClick) {
    element.addEventListener('click', onLockedClick);
  }

  return element;
}

export function initStageSelect({ getCards, gameUrl = 'index.html' }) {
  const list = document.getElementById('stage-card-list');

  // 카드 목록을 최신 저장 데이터로 다시 그림
  function renderStageCards() {
    list.innerHTML = '';
    getCards().forEach((card) => list.appendChild(buildCard(card, gameUrl)));
  }

  createHeader();
  renderStageCards();

  // 게임 화면에서 history.back()으로 돌아올 때 bfcache(뒤로/앞으로 가기 캐시)에서 그대로 복원되면
  // 모듈 스크립트가 다시 실행되지 않아 별점·해금·헤더 골드가 갱신되지 않는다.
  // event.persisted(=bfcache 복원)일 때만 카드와 헤더 골드를 다시 그린다.
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
      renderStageCards();
      updateHeaderGold(getGold());
    }
  });
}