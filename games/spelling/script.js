// v0.1.0
// Spelling Game - Stage 1: 기본 화면 구현
// - 저장된 파츠로 캐릭터를 정면 idle 상태로 렌더링
// - 블록/문제 진행 로직은 이후 단계에서 구현 (board-area는 현재 placeholder)
//
// Public API
// - initCharacter()

import { renderCharacterSvg } from '../../characters/characterRenderer.js';
import { getEquippedParts } from '../../core/saveManager.js';

/* ===========================
   캐릭터 초기화 (정면 idle)
=========================== */

function initCharacter() {
  const container = document.getElementById('character-container');
  if (!container) return;

  const equipState = getEquippedParts();

  const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svgEl.classList.add('ingame-character');
  svgEl.setAttribute('viewBox', '0 0 160 300');
  container.appendChild(svgEl);

  renderCharacterSvg(svgEl, {
    head: equipState.head,
    body: equipState.body,
    legs: equipState.legs,
    color: equipState.color,
    colorMix: equipState.colorMix,
    expression: 'idle',
    animation: 'idle'
  });
}

/* ===========================
   키패드 (Stage 1 : 시각적 바인딩만, 게임 로직은 이후 단계)
=========================== */

document.querySelector('.keypad-area').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-key]');
  if (!btn) return;
  // TODO: 이후 단계에서 좌/우 이동, 점프 로직 연결
});

/* ===========================
   초기화
=========================== */

initCharacter();