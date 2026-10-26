// v0.1.1 : starsToEmoji 추가 (선택 화면 별점 표시 공통화)

// 보상 수치는 reward-system.md 기준. 밸런스 조정은 이 파일의 상수만 바꾸면 모든 게임에 반영됨.
// 키 = 단계의 "이전 최고 별점"(0~3). 플레이 시작 시점의 값을 게임 쪽에서 넘겨준다.

// 문제 정답 1개당 Gold: 이전 최고 별점이 낮을수록(=처음 도전에 가까울수록) 많이 지급
export const QUIZ_GOLD_BY_STARS = Object.freeze({ 0: 10, 1: 7, 2: 4, 3: 1 });

// 콤보 보너스 배율: 최장 콤보 × 배율. 이전 최고 별점이 낮을수록 배율이 큼
export const COMBO_MULTIPLIER_BY_STARS = Object.freeze({ 0: 4, 1: 3, 2: 2, 3: 1 });

// 별점 자체의 가치(누적): 별 보상 = 새 별 가치 − 이전 최고 별 가치
export const STAR_VALUE = Object.freeze({ 0: 0, 1: 10, 2: 30, 3: 50 });

// 정답률 → 별점: 100% ★3, 2/3 이상 ★2, 1/3 이상 ★1, 그 미만 0
export function calcStars(correctCount, total) {
  if (total === 0) return 0;
  const rate = correctCount / total;
  if (rate >= 1) return 3;
  if (rate >= 2 / 3) return 2;
  if (rate >= 1 / 3) return 1;
  return 0;
}

// 결과 화면 표시용 별 문자열 (예: 2 → ★★☆)
export function starsToString(stars) {
  return '\u2605'.repeat(stars) + '\u2606'.repeat(3 - stars);
}

// 선택 화면 표시용 별 문자열 (예: 2 → ⭐⭐☆). 결과 화면은 위의 starsToString(★/☆) 사용
export function starsToEmoji(stars) {
  return '\u2B50'.repeat(stars) + '\u2606'.repeat(3 - stars);
}

/**
 * 단계 종료 시 Gold 계산 (저장·표시는 각 게임이 담당).
 * - prevBestStars: 이전 최고 별점. 어떤 값을 쓸지는 게임이 결정 (예: 시계 최종 레벨은 0 고정)
 * - fullStarBonus: true면 별 보상을 차액이 아니라 새 별 가치 전액으로 지급 (예: 시계 최종 레벨)
 */
export function calcRewardGold({ correctCount, maxCombo, stars, prevBestStars, fullStarBonus = false }) {
  const goldQuiz = correctCount * (QUIZ_GOLD_BY_STARS[prevBestStars] ?? QUIZ_GOLD_BY_STARS[0]);
  const goldCombo = maxCombo * (COMBO_MULTIPLIER_BY_STARS[prevBestStars] ?? COMBO_MULTIPLIER_BY_STARS[0]);
  const goldStar = fullStarBonus
    ? STAR_VALUE[stars]
    : Math.max(0, STAR_VALUE[stars] - STAR_VALUE[prevBestStars]);

  return { goldQuiz, goldCombo, goldStar, goldTotal: goldQuiz + goldCombo + goldStar };
}