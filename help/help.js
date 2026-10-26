// v0.1.1 : 게임 보상 표·예시를 core/reward.js 값으로 자동 생성 (수치 변경 시 도움말 수정 불필요)
import { createHeader } from '../shared/header.js';
import { getCharacterName } from '../core/saveManager.js';
import { validateCharacterData, importCharacterData } from '../characters/inventory.js';
import { QUIZ_GOLD_BY_STARS, COMBO_MULTIPLIER_BY_STARS, STAR_VALUE } from '../core/reward.js';

createHeader();

// 펼침 메뉴: 제목 바 전체 클릭으로 접기/펼치기 (캐릭터 상점의 setupToggle과 동일 방식)
function setupToggle(toggleId, bodyId) {
  const button = document.getElementById(toggleId);
  const header = button.closest('.help-section__header');
  const body = document.getElementById(bodyId);
  header.addEventListener('click', () => {
    const isHidden = body.classList.toggle('help-section__body--hidden');
    button.textContent = isHidden ? '\u25b6' : '\u25bc'; // ▶ 접힘 / ▼ 펼침
    button.setAttribute('aria-expanded', String(!isHidden));
  });
}

setupToggle('toggle-shop', 'shop-body');
setupToggle('toggle-reward', 'reward-body');

/* ===========================
   게임 보상 표·예시 (core/reward.js 값으로 생성)
   - help.html의 id 위치에 채워 넣음. 기존 내용이 있으면 덮어씀
=========================== */

// 별 개수 → 표시 문자열 (0개는 빈 별 1개). 도움말 표 디자인에 맞춘 표기
function starsLabel(stars) {
  return stars === 0 ? '\u2606' : '\u2B50'.repeat(stars);
}

// 표에 한 줄(tr) 추가
function addTableRow(tbody, cells) {
  const row = document.createElement('tr');
  cells.forEach((text) => {
    const cell = document.createElement('td');
    cell.textContent = text;
    row.appendChild(cell);
  });
  tbody.appendChild(row);
}

// 여러 줄 문장을 <br>로 이어서 채움
function setLines(element, lines) {
  element.replaceChildren();
  lines.forEach((line, index) => {
    if (index > 0) element.appendChild(document.createElement('br'));
    element.appendChild(document.createTextNode(line));
  });
}

function renderRewardTables() {
  // 별 개수 목록은 reward.js의 표 키(0~3)에서 가져옴
  const starKeys = Object.keys(QUIZ_GOLD_BY_STARS).map(Number).sort((a, b) => a - b);

  // 표 1: 이전 최고 별점별 정답 보상·콤보 배율
  const quizBody = document.getElementById('reward-quiz-body');
  if (quizBody) {
    quizBody.replaceChildren();
    starKeys.forEach((stars) => {
      addTableRow(quizBody, [
        stars === 0 ? '없음 (처음)' : starsLabel(stars),
        `\u{1F48E} ${QUIZ_GOLD_BY_STARS[stars]}`,
        `\u00D7 ${COMBO_MULTIPLIER_BY_STARS[stars]}`,
      ]);
    });
  }

  // 콤보 예시: 처음 하는 단계(이전 별점 없음)에서 5문제 연속 정답
  const comboExample = document.getElementById('reward-combo-example');
  if (comboExample) {
    const combo = 5;
    const multiplier = COMBO_MULTIPLIER_BY_STARS[0];
    comboExample.textContent = `예) 처음 하는 단계에서 ${combo}문제를 연속으로 맞히면 ${combo} \u00D7 ${multiplier} = \u{1F48E} ${combo * multiplier}`;
  }

  // 표 2: 맞힌 문제 수 → 별점 → 별점 보너스 (기준 문구는 calcStars의 정답률 기준과 같아야 함)
  const starBody = document.getElementById('reward-star-body');
  if (starBody) {
    starBody.replaceChildren();
    [
      { stars: 3, condition: '모두' },
      { stars: 2, condition: '3분의 2 이상' },
      { stars: 1, condition: '3분의 1 이상' },
      { stars: 0, condition: '3분의 1 미만' },
    ].forEach(({ stars, condition }) => {
      const value = STAR_VALUE[stars];
      addTableRow(starBody, [condition, starsLabel(stars), value > 0 ? `\u{1F48E} ${value}` : '없음']);
    });
  }

  // 별점 보너스 예시: 새 별 가치 − 이전 별 가치
  const starExample = document.getElementById('reward-star-example');
  if (starExample) {
    setLines(starExample, [[0, 1], [1, 2], [1, 3]].map(([from, to]) => {
      const fromLabel = from === 0 ? '별 없음' : starsLabel(from);
      return `${fromLabel} \u2192 ${starsLabel(to)} : \u{1F48E} ${STAR_VALUE[to] - STAR_VALUE[from]} (${STAR_VALUE[to]}-${STAR_VALUE[from]})`;
    }));
  }
}

renderRewardTables();

const MAX_FILE_SIZE = 64 * 1024; // 캐릭터 파일은 1KB 안팎이므로 지나치게 큰 파일은 거절

const importButton = document.getElementById('btn-import');
const importInput = document.getElementById('import-input');
const modal = document.getElementById('help-modal');
const modalTitle = document.getElementById('help-modal-title');
const modalBody = document.getElementById('help-modal-body');
const modalActions = document.getElementById('help-modal-actions');

// 실패 사유별 안내 문구
const ERROR_MESSAGES = {
  'invalid-file': '꼬무리 캐릭터 파일이 아니에요.',
  'unsupported-version': '지원하지 않는 버전의 파일이에요.',
  'invalid-data': '파일 내용이 올바르지 않아요.',
  'too-large': '파일이 너무 커요.',
};

/* ===========================
   모달 (버튼으로만 닫힘)
=========================== */
function closeModal() {
  modal.hidden = true;
}

// buttons: [{ label, cancel?, onClick? }] — 클릭 시 모달을 닫고 onClick 실행
function openModal({ title, lines = [], buttons }) {
  modalTitle.textContent = title;

  // textContent 사용: 캐릭터 이름에 특수문자가 있어도 HTML로 해석되지 않음
  modalBody.replaceChildren();
  lines.forEach((line, index) => {
    if (index > 0) modalBody.appendChild(document.createElement('br'));
    modalBody.appendChild(document.createTextNode(line));
  });

  modalActions.replaceChildren();
  buttons.forEach(({ label, cancel = false, onClick }) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `modal-card__btn${cancel ? ' modal-card__btn--cancel' : ''}`;
    button.textContent = label;
    button.addEventListener('click', () => {
      closeModal();
      onClick?.();
    });
    modalActions.appendChild(button);
  });

  modal.hidden = false;
  modalActions.firstElementChild?.focus();
}

function showError(reason) {
  openModal({
    title: '불러오기 실패',
    lines: [ERROR_MESSAGES[reason] ?? ERROR_MESSAGES['invalid-data']],
    buttons: [{ label: '확인' }],
  });
}

/* ===========================
   불러오기
=========================== */
// 파일 → 파싱 → 검증 (상태 변경 없음). 실패 시 { success: false, reason }
async function readCharacterFile(file) {
  if (file.size > MAX_FILE_SIZE) return { success: false, reason: 'too-large' };

  let parsed;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    return { success: false, reason: 'invalid-file' }; // JSON 파싱 실패
  }

  const result = validateCharacterData(parsed);
  return result.success ? { success: true, raw: parsed, name: result.data.name } : result;
}

function applyImport(raw) {
  const result = importCharacterData(raw);
  if (!result.success) {
    showError(result.reason);
    return;
  }

  openModal({
    title: '캐릭터 불러오기 성공!',
    lines: [`이름: ${result.name}`],
    buttons: [{ label: '확인' }],
  });
}

importButton.addEventListener('click', () => importInput.click());

importInput.addEventListener('change', async () => {
  const file = importInput.files?.[0];
  if (!file) return;

  const result = await readCharacterFile(file);
  importInput.value = ''; // 같은 파일을 다시 선택해도 change가 발생하도록 초기화

  if (!result.success) {
    showError(result.reason);
    return;
  }

  // 이미 꼬무리가 있으면 덮어쓰기 확인 (이름·생김새만 바뀌고 💎·보유 목록은 유지)
  const currentName = getCharacterName();
  if (!currentName) {
    applyImport(result.raw);
    return;
  }

  openModal({
    title: '꼬무리를 바꿀까요?',
    lines: [
      `지금 꼬무리: ${currentName}`,
      `불러올 꼬무리: ${result.name}`,
      '지금 꼬무리의 이름과', '생김새는 사라져요.',
    ],
    buttons: [
      { label: '불러오기', onClick: () => applyImport(result.raw) },
      { label: '취소', cancel: true },
    ],
  });
});