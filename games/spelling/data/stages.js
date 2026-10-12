// v0.4.0
// Spelling Game - 마당(스테이지) 구성
// - STAGES는 직접 나열하지 않고 topics.js의 TOPICS 배열에서 자동으로 만든다.
//   일반 마당 5개(CHUNK_SIZE)마다 그 5개를 묶은 달인 마당을 하나씩 끼워 넣는다.
//   (예: 1~5 일반 + 달인(1~5), 6~10 일반 + 달인(6~10), 11~15 일반 + 달인(11~15) ...)
// - 주제를 추가/삭제/순서 변경해도 이 파일은 건드릴 필요가 없다 (topics.js만 고치면 됨).
// - level은 "마당 번호"가 아니라 내부 식별자일 뿐이다 (?level= 파라미터로 어떤 마당인지 찾는 용도이자,
//   saveManager의 달인 마당별 최근 별점을 구분하는 키로도 쓰인다).
// - 화면에 보이는 "마당N" 번호·"달인 마당 N~M" 범위는 select.js가 STAGES를 보고 따로 계산한다.
// - 마지막 묶음이 5개를 채우지 못하면(예: 7개 중 마지막 2개) 그 묶음은 아직 달인 마당을 만들지 않는다.

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

  return stages;
}

export const STAGES = buildStages(TOPICS);

// 마당 기본 출제 문장 수 (문제은행 크기와 독립적으로 관리)
export const NORMAL_STAGE_QUESTION_COUNT = 10;
export const REVIEW_STAGE_QUESTION_COUNT = 20;

// 마당 기본 목숨 수
export const NORMAL_STAGE_LIVES = 3;
export const REVIEW_STAGE_LIVES = 5;