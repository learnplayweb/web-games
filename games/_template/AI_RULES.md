# AI 요청용 규칙 (꼬무리 마을 웹게임)

새 게임을 만들거나 기존 게임을 수정하도록 AI에게 요청할 때 함께 첨부한다.

## 0. 요청할 때 첨부할 파일

- 필수: 이 문서, `games\_template\t_script.js`, `t_index.html`, `t_style.css`, `t_select.html`, `t_select.js`(모두 `games\_template\`), `reward-system.md`
- 필요 시: `core\saveManager.js`, 참고 게임의 `script.js`(시계/맞춤법), 수정 대상 파일

## 1. 프로젝트

- 모바일 우선 웹게임 플랫폼. 여러 게임이 한 저장소에 있고, GitHub Pages로 배포한다.
- 바닐라 JS(ES 모듈). 서버가 없으며 데이터는 브라우저 저장소에 저장한다.
- 화면 흐름: 메인(`index.html`) → 게임 선택(`games\<id>\select.html`) → 게임(`games\<id>\index.html`)

## 2. 폴더 구조

```
index.html / index.js / style.css          메인 화면
shared\header.js, header.css               공용 헤더 (메인·선택 화면)
shared\modal.css                           공통 모달 스타일 (.modal-overlay / .modal-card …)
shared\stageSelect.js, stage-select.css     단계 선택 화면 공통 모듈·스타일 (카드 렌더링, 헤더, 뒤로가기 후 갱신)
core\saveManager.js                        저장/불러오기 (골드, 별점, 캐릭터, 일반 게임 공통 저장)
core\reward.js                             보상·별점 공통 계산 (수치는 여기에만)
characters\                                캐릭터 (characterRenderer.js, inventory.js, assets\effects\effects.js)
games\<id>\                                게임별 (index.html, script.js, style.css, select.html, select.js, data\)
help\help.html                             도움말
```

## 3. 공통 모듈 (필수 사용)

- **보상·별점**: `core\reward.js`의 `calcStars`, `calcRewardGold`, `starsToString`, `starsToEmoji`를 쓴다. 게임 안에 수치나 계산식을 복사하지 않는다.
- **저장**: 새 게임은 `saveManager.js`에 함수를 새로 만들지 않고 일반 함수를 쓴다. `getStageBestStars(게임id, 단계키)`, `getStageReviewBestStars`(복습 규칙 B), `getStageRecentStars`(복습 규칙 A), `saveStageResult(게임id, 단계키, stars, 골드, kind)`(kind: `normal` / `review-monthly` / `review-recent`). 게임 id는 영문 소문자로 시작하는 영문/숫자이고 `clock`은 쓸 수 없다. 시계는 골드·해금이 들어 있는 전용 저장 구조라 기존 함수(`saveClockResult` 등)를 그대로 쓴다. 골드(💎)는 프로젝트 전체에서 하나뿐인 재화다.
- **캐릭터**: `renderCharacterSvg(svg, { head, body, legs, color, colorMix, expression, animation })`. expression/animation 값은 `idle` / `correct` / `wrong`.
- **효과**: `pickRandomEquippedEffect()`로 고른 id를 `spawnEffect(대상요소, id)`로 재생한다.
- **단계 선택 화면**: `games\<id>\select.js`는 `initStageSelect({ getCards })`만 호출하고, 카드 정보(이름·별점·해금 여부·복습 단계 여부)만 게임에서 계산한다. 카드를 직접 그리는 코드를 새로 쓰지 않는다.
- **모달**: 안내·확인 모달은 `shared\modal.css`의 클래스(`.modal-overlay`, `.modal-card`, `.modal-card__text`/`__title`/`__body`/`__actions`/`__btn`, `--cancel`)를 쓰고, 페이지 CSS에 모달 스타일을 복사하지 않는다. 게임 진행 중 모달(학습·결과 등)은 게임 CSS에서 따로 정의한다. 캐릭터 상점의 모달은 기능이 달라 `character-shop.css`에 독립된 전용 디자인을 두며, 클래스 이름이 같아도 값이 다르다(상점 페이지는 `modal.css`를 불러오지 않음).

## 4. 보상 규칙 (자세한 내용은 `reward-system.md`)

- 지급 시점: 게임 중에는 지급하지 않는다. 정상 완료 후 `finishStage()`에서 1회만 계산·저장하고, 중복 실행 방지 플래그를 둔다.
- 일반 단계: 정답 보상(문제당) + 콤보 보너스(최장 콤보 × 배율) + 별 보상(새 별 가치 − 이전 별 가치, 유지·하락 시 0).
- 이전 최고 별점은 플레이 시작 시 1회 읽어 고정한다. 최고 별점은 게임·단계별로 독립 저장한다.
- 복습 단계는 학습 성격에 따라 게임마다 규칙이 다를 수 있다. 규칙 A(시계 Lv.8): 이전 별점 0 고정 + 별 보상 전액 / 규칙 B(맞춤법 달인 마당): 해당 level 최고 별점(매달 초기화) 기준. 새 게임의 복습 단계 규칙은 `reward-system.md`에 먼저 정하고 사용자에게 확인한다.

## 5. 진행·표시 규칙

- 콤보: 정답 +1, 오답 0으로 리셋, 3콤보마다(3, 6, 9 …) 장착된 효과 재생.
- 캐릭터 리액션: 정답은 `correct`, 오답은 `wrong` 표정·동작을 보여주고 일정 시간 뒤 `idle`로 복귀(`renderCharacterState`, `playCharacterMotion`). 표정·동작 조합과 지속 시간은 게임마다 다를 수 있다.
- 별 표시: 결과 화면 ★/☆(`starsToString`), 선택 화면 ⭐/☆(`starsToEmoji`). 골드 💎, 콤보 🔥.
- 결과 화면 요소 id: `result-level`, `result-stars`, `result-score`, `result-rate`, `result-combo`, `result-gold-quiz`, `result-gold-combo`, `result-gold-star`, `result-gold-total`. 오버레이는 `stage-result`(숨김 클래스 `stage-result--hidden`).

## 6. 화면 이동

- 선택 → 게임: `location.href = 'index.html?level=N'` (기록이 쌓이는 정상 이동).
- 게임 종료·나가기: `location.href`로 선택 화면에 이동하지 않는다. 기록이 쌓여서 뒤로 가기를 누르면 이전 게임이 다시 나온다. 템플릿의 `goToSelect()`(`history.back()` + 중복 호출 방지 + 직접 진입 시 `location.replace`)를 쓴다.
- 기대 동작: 마당2에서 뒤로 → 선택 화면 → 뒤로 → 메인 화면.

## 7. 코드 작성·응답 규칙

- 파일 맨 위에 `// vX.Y.Z : 이번 업데이트 내용 한 줄`만 적는다 (누적 이력 금지).
- 설명은 응답 본문보다 코드의 인라인 주석에 적는다.
- 수정한 파일만 출력한다. 사소한 수정(오타, 경로 대소문자 등)은 전체 파일 대신 원인과 수정 방법만 설명한다.
- 요구사항 체크리스트는 체크 표시만 쓰고 설명은 붙이지 않는다.
- 응답 마지막에 `Commit Summary`로 짧은 영문 제목 한 줄을 적는다 (예: `Implement Review Stage Guide Modal Buttons`).
- 요청하지 않은 기능·문구는 임의로 추가하지 않고 먼저 묻는다. 질문이나 개선 제안이 있으면 먼저 하고, 없으면 코드를 제공한다.
- 게임마다 다른 부분을 "공통화"를 이유로 없애지 않는다.

## 8. 게임별로 달라도 되는 것 / 고정인 것

- 달라도 됨: 문제 형식과 UI, 목숨·페널티, 복습 단계 보상 규칙, 저장 함수 시그니처, 결과 화면 세부 DOM, 학습 모달.
- 고정: `reward.js` 사용, 콤보·효과 규칙, 보상 지급 시점, 화면 이동 방식, 골드 단일 재화.