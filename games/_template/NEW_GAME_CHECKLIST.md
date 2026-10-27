<!-- template v0.1.0 : 버전 기록 시작, 게임 화면 공통 CSS(game-common.css) 안내 반영 -->

# 새 게임 추가 체크리스트

새 게임 `<id>`를 추가할 때 손봐야 하는 곳을 순서대로 확인한다. 항목마다 `[ ]`를 `[x]`로 바꿔 가며 쓴다.

## 1. 기획·규칙 정하기

- [ ] 게임 이름, 메인 화면 설명 문구, 아이콘(이모지) 확정
- [ ] 단계 구성 확정 (일반 단계 몇 개, 복습 단계 유무)
- [ ] 복습 단계가 있으면 `reward-system.md`에 규칙 추가 (규칙 A/B 중 선택 또는 새 규칙)
- [ ] 한 단계의 문제 수, 정답·오답 처리 방식, 목숨·페널티 유무 확정
- [ ] 캐릭터 이름이 등록되어야 플레이할 수 있는 게임인지 확정 (맞춤법 모험처럼 잠금 처리)

## 2. 게임 폴더 만들기 (`games\<id>\`)

- [ ] `games\_template\script.js`를 `games\<id>\script.js`로 복사 후 `TODO(게임별)` 채우기
- [ ] `games\_template\index.html`, `style.css`를 복사하고 `TODO(게임별)` 채우기 (`script.js` 템플릿이 쓰는 요소 id 포함, 공통 CSS `shared\game-common.css`·캐릭터·효과 CSS·파비콘 `<link>`도 이미 연결됨)
  - 필수 id: `character-container`, `display-combo`, `stage-result`(+ `stage-result--hidden`), `result-level`, `result-stars`, `result-score`, `result-rate`, `result-combo`, `result-gold-quiz`, `result-gold-combo`, `result-gold-star`, `result-gold-total`
- [ ] `games\_template\select.html`, `select.js`를 복사하고 `buildCards()`의 TODO 채우기 (카드 렌더링은 `shared\stageSelect.js`가 처리). 잠김 안내 같은 모달이 필요하면 `select.html`의 `modal.css` 주석을 풀고 `select.js`에 `onLockedClick` 연결
- [ ] `data\`: 문제 데이터와 단계 정의

## 3. 저장 (`core\saveManager.js`)

- [ ] 게임 id 정하기 (영문 소문자로 시작하는 영문/숫자, `clock` 제외). 저장 키는 `{게임id}Game_save`로 자동 정해짐
- [ ] `script.js`·`select.js`의 `GAME_ID`와 단계 키(`stageKey`)가 서로 같은지 확인
- [ ] 단계 종류(`STAGE_KIND`) 정하기: `normal` / `review-recent`(규칙 A) / `review-monthly`(규칙 B)
- [ ] 월별 초기화(규칙 B)를 쓰면 메인 화면 접속 시 `checkGamePeriodReset(게임id)` 호출 여부 결정
- [ ] 개발용 초기화: `core\debug.js`의 `GENERIC_GAME_IDS`에 게임 id 추가
- [ ] 게임 진행 데이터는 캐릭터 내보내기 대상이 아님 → 저장·불러오기 기능 수정 불필요

## 4. 메인 화면 연결 (`index.html`, `index.js`)

- [ ] 게임 카드 추가 (`href="games/<id>/select.html"`, 활성 시 `card--active` + `Play` 뱃지)
- [ ] 카드 순서 확인: "Coming Soon" 카드는 항상 마지막 위치 유지
- [ ] 캐릭터 등록이 필요한 게임이면 `index.js`에 활성/잠김 토글과 안내 모달 연결

## 5. 도움말 (`help\help.html`)

- [ ] 게임 보상 설명이 새 게임에도 맞는지 확인 (복습 단계 규칙이 다르면 설명 추가)

## 6. 파비콘

- [ ] `index.html`은 템플릿에 이미 들어 있음. `select.html` 등 새로 만드는 HTML의 `<head>`에는 3줄 추가 (`games\<id>\`는 `../../` 기준)
  ```html
  <link rel="icon" href="../../assets/favicon/favicon.ico" sizes="48x48" />
  <link rel="icon" href="../../assets/favicon/favicon.svg" type="image/svg+xml" />
  <link rel="apple-touch-icon" href="../../assets/favicon/apple-touch-icon.png" />
  ```

## 7. 확인 (브라우저·모바일)

- [ ] 단계 완료 시 보상이 1회만 지급되고, 새로고침·중간 이탈로는 지급되지 않는다
- [ ] 별점이 올라가면 차액만, 유지·하락이면 별 보상 없음 (복습 단계는 해당 규칙대로)
- [ ] 결과 화면을 닫으면 선택 화면으로 즉시 이동하고, 뒤로 가기: 선택 화면 → 메인 화면 순서
- [ ] 선택 화면에 돌아왔을 때 별점이 바로 갱신된다
- [ ] 캐릭터가 없거나 머리만 있는 상태에서도 오류 없이 동작한다
- [ ] 모바일 좁은 폭(320px 전후)과 PC 폭에서 레이아웃 확인
- [ ] 아이폰 Safari에서 확인

## 8. 배포

- [ ] 푸시 후 저장소 Actions 탭에서 배포 완료 확인, 강력 새로고침(Ctrl+Shift+R)으로 확인
- [ ] 글꼴·이미지를 추가했다면 용량 확인 (사이트 1GB 이하)
- [ ] 코드 파일 맨 위 버전 주석(해당 업데이트 내용 한 줄)과 Commit Summary 작성