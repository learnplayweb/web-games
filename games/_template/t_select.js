// template v0.1.1 : 별점 조회를 saveManager 일반 함수(getStageBestStars 등)로 연결
// 사용법: games\<게임id>\select.js로 복사 후 TODO(게임별) 부분만 채운다.
// - 카드 렌더링·헤더·뒤로가기 후 갱신은 shared/stageSelect.js가 처리하므로 여기서는 카드 정보만 만든다.
// - 해금 조건·별점·카드 이름은 게임마다 다른 규칙이므로 이 파일에서 계산한다.

import { initStageSelect } from '../../shared/stageSelect.js';
import { getStageBestStars } from '../../core/saveManager.js';
// TODO(게임별): 복습 단계가 있으면 getStageReviewBestStars(규칙 B) 또는 getStageRecentStars(규칙 A)도 가져온다.

// TODO(게임별): script.js와 같은 게임 id / 단계 키를 사용해야 별점이 연결된다.
const GAME_ID = 'myGame';

// TODO(게임별): 단계 이름 목록 (순서 = 단계 번호)
const STAGE_NAMES = ['1단계', '2단계', '3단계'];

// 카드 정보 만들기. 반환 형식은 shared/stageSelect.js 상단 설명 참고
function buildCards() {
  return STAGE_NAMES.map((name, index) => {
    const level = index + 1;
    return {
      level,
      name,
      stars: getStageBestStars(GAME_ID, String(level)), // TODO(게임별): 복습 단계는 규칙에 맞는 함수로 교체 (규칙 A: getStageRecentStars, 규칙 B: getStageReviewBestStars)
      unlocked: true,    // TODO(게임별): 해금 조건 (순서대로 해금 / 조건부 해금 등)
      // review: true,   // TODO(게임별): 복습 단계 카드는 연노랑으로 표시
      // onLockedClick: () => { /* TODO(게임별): 잠긴 카드를 눌렀을 때 안내 모달 등 */ },
    };
  });
}

initStageSelect({ getCards: buildCards });