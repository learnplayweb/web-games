// v0.1.0 : 최초 생성 - 공통 Sticky Header 생성 함수

/**
 * 공통 Sticky Header를 생성하여 body 최상단에 삽입한다.
 * - 우측에 보유 💎 표시
 * - 향후 설정 버튼 등 추가 시 이 함수를 확장한다.
 *
 * Gold 값은 localStorage에서 읽는다.
 * 게임 화면 등 각 화면에서 gold가 변경되면 updateHeaderGold()를 호출해 갱신한다.
 */
function createHeader() {
  const gold = readGoldFromStorage();

  const header = document.createElement('header');
  header.className = 'shared-header';
  header.innerHTML = `
    <span class="shared-header__gold">
      <span class="shared-header__gold-value" id="shared-gold-value">${gold}</span>
      <span>💎</span>
    </span>
  `;

  // body 최상단에 삽입 (문서 흐름 안에 배치)
  document.body.insertBefore(header, document.body.firstChild);
}

/**
 * 헤더의 Gold 표시를 갱신한다.
 * 각 화면에서 gold 값이 변경될 때 호출한다.
 * @param {number} amount - 현재 보유 Gold
 */
function updateHeaderGold(amount) {
  const el = document.getElementById('shared-gold-value');
  if (el) el.textContent = amount;
}

/**
 * localStorage에서 보유 Gold를 읽어 반환한다.
 * @returns {number}
 */
function readGoldFromStorage() {
  try {
    const save = JSON.parse(localStorage.getItem('clockGame_save') || '{}');
    return save.gold ?? 0;
  } catch {
    return 0;
  }
}