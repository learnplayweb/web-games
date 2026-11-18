// spelling v0.5.1 : 무한 마당 위치 설명 수정 (배열은 맨 끝, 선택 화면에서는 select.js가 맨 위로 표시)
// Spelling Game - 마당(스테이지) 구성
// - STAGES는 직접 나열하지 않고 topics.js의 TOPICS 배열에서 자동으로 만든다.
//   일반 마당 5개(CHUNK_SIZE)마다 그 5개를 묶은 달인 마당을 하나씩 끼워 넣는다.
//   (예: 1~5 일반 + 달인(1~5), 6~10 일반 + 달인(6~10), 11~15 일반 + 달인(11~15) ...)
// - 주제를 추가/삭제/순서 변경해도 이 파일은 건드릴 필요가 없다 (topics.js만 고치면 됨).
// - level은 "마당 번호"가 아니라 내부 식별자일 뿐이다 (?level= 파라미터로 어떤 마당인지 찾는 용도이자,
//   saveManager의 달인 마당별 최근 별점을 구분하는 키로도 쓰인다).
// - 화면에 보이는 "마당N" 번호·"달인 마당 N~M" 범위는 select.js가 STAGES를 보고 따로 계산한다.
// - 마지막 묶음이 5개를 채우지 못하면(예: 7개 중 마지막 2개) 그 묶음은 아직 달인 마당을 만들지 않는다.
// - 무한 마당(type: 'infinite')은 항상 배열 맨 끝에 1개 추가된다(선택 화면에서는 select.js가 맨 위에 표시). level 번호는 마당이 늘면 뒤로 밀리므로 저장 키로 쓰지 않는다(saveManager의 'infinite' 고정 키 사용).

import { TOPICS } from './topics.js';

const CHUNK_SIZE = 5; // 일반 마당 몇 개마다 달인 마당을 끼워 넣을지

function buildStages(topics) {
  const stages = [];
  let level = 1;

  for (let i = 0; i < topics.length; i += CHUNK_SIZE) {
    const chunk = topics.slice(i, i + CHUNK_SIZE);

    chunk.forEach((topic) => {
      stages.push({ level, type: 'normal', topic: topic.id });
      level += 1;
    });

    if (chunk.length === CHUNK_SIZE) {
      stages.push({ level, type: 'review', topics: chunk.map((topic) => topic.id) });
      level += 1;
    }
  }

  // 무한 마당 : 항상 배열 맨 끝 (level 번호와 STAGES[0] 기본값에 영향을 주지 않도록 순서는 그대로 두고, 선택 화면의 맨 위 표시는 select.js가 처리)
  stages.push({ level, type: 'infinite' });

  return stages;
}

export const STAGES = buildStages(TOPICS);

// 마당 기본 출제 문장 수 (문제은행 크기와 독립적으로 관리)
export const NORMAL_STAGE_QUESTION_COUNT = 10;
export const REVIEW_STAGE_QUESTION_COUNT = 20;

// 마당 기본 목숨 수
export const NORMAL_STAGE_LIVES = 3;
export const REVIEW_STAGE_LIVES = 5;

// 무한 마당 : 목숨은 1개(한 번만 틀려도 종료), 점프 점수 규칙
// - 일반 블록 → 일반 블록: +1 / 선택지로 점프: +3 / 선택지 → 일반 블록: +2
export const INFINITE_STAGE_LIVES = 1;
export const INFINITE_SCORE = Object.freeze({ normalToNormal: 1, toChoice: 3, choiceToNormal: 2 });