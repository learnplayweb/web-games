// v0.1.0 : 도움말 페이지 최초 생성 - 캐릭터 불러오기(파일 선택 → 검증 → 덮어쓰기 확인 → 적용)
import { createHeader } from '../shared/header.js';
import { getCharacterName } from '../core/saveManager.js';
import { validateCharacterData, importCharacterData } from '../characters/inventory.js';

createHeader();

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
      '지금 꼬무리의 이름과 생김새는 사라져요.',
    ],
    buttons: [
      { label: '불러오기', onClick: () => applyImport(result.raw) },
      { label: '취소', cancel: true },
    ],
  });
});