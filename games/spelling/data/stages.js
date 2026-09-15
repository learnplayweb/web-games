// v0.1.0
// Spelling Game - 마당(스테이지) 구성
// - 일반 마당은 하나의 맞춤법 주제(topic)와 1:1 연결
// - 복습 마당은 별도 문제 목록을 두지 않고, 직전 5개 일반 마당의 topics를 합쳐 출제 대상으로 사용
// - 실제 랜덤 출제(문제은행에서 필요한 문장 수만큼 뽑는 로직)는 이번 단계에서 구현하지 않음
// - topic 문자열은 data/problems/ 폴더의 파일명과 대응 (예: 'doe-dwae' → problems/doe-dwae.js)
//
// ※ an-anh / gat-gass / i-hi / ro-euro는 마당 구성 예시이며, 현재 doe-dwae 외에는
//    실제 문제은행 파일이 아직 없음. 해당 주제 문제은행 작성 시 이 배열의 topic과 이름을 맞출 것.

export const STAGES = [
  { level: 1, type: 'normal', topic: 'doe-dwae' },
  { level: 2, type: 'normal', topic: 'an-anh' },
  { level: 3, type: 'normal', topic: 'gat-gass' },
  { level: 4, type: 'normal', topic: 'i-hi' },
  { level: 5, type: 'normal', topic: 'ro-euro' },
  { level: 6, type: 'review', topics: ['doe-dwae', 'an-anh', 'gat-gass', 'i-hi', 'ro-euro'] }
];

// 마당 기본 출제 문장 수 (문제은행 크기와 독립적으로 관리)
export const NORMAL_STAGE_QUESTION_COUNT = 10;
export const REVIEW_STAGE_QUESTION_COUNT = 20;

// 마당 기본 목숨 수
export const NORMAL_STAGE_LIVES = 3;
export const REVIEW_STAGE_LIVES = 5;