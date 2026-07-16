# Public Interface

Clock Game 관련 4개 파일(index.html, script.js, style.css, core/saveManager.js)의 공개 인터페이스를 정리한 참조 문서.

---

## index.html

### 역할
Clock Game의 화면 구조(정보 바, 시계 SVG, 계산식 표시 영역, 입력 영역, 키패드, 결과 화면)를 정의하는 마크업 파일.

### 공개 함수
없음 (마크업 파일).

### 공개 데이터
script.js가 참조하는 DOM 요소 id 목록 (읽기/변경 대상은 script.js 쪽에서 결정):
- `display-combo`, `display-gold` — 콤보/골드 표시
- `clock-svg`, `hour-hand`, `minute-hand`, `second-hand` — 시계 바늘 회전 대상
- `calc-area`, `calc-expression` — 계산식 표시 영역(Lv.6~8)
- `input-hour`, `input-minute`, `input-second` — 시/분/초 입력칸
- `result-screen`, `result-level`, `result-stars`, `result-score`, `result-rate`, `result-combo` — 결과 화면 텍스트
- `result-gold-quiz`, `result-gold-combo`, `result-gold-star`, `result-gold-total` — 결과 화면 골드 세부 항목 (내부 `.result-gold-value`)
- `.keypad-area` — 키패드 클릭 이벤트 위임 대상 (`data-key` 속성으로 개별 버튼 식별)
- `.input-group` — 입력 그룹 표시/숨김 대상 (initInputUI에서 사용)
- `.input-area` — 정답/오답 피드백 클래스(`input-area--correct`, `input-area--wrong`) 부여 대상

### 의존성
- style.css (스타일시트)
- script.js (`type="module"`로 로드)

### 사용처
브라우저에서 직접 로드되는 진입 파일 (games/clock/index.html로 추정되는 위치).

---

## script.js

### 역할
Clock Game의 진행 로직(시계 표시, 입력 처리, 단계 진행, 정답 판정, 골드/콤보 계산, 결과 화면 표시)을 담당하는 메인 스크립트.

### 공개 함수
export된 함수 없음. 모듈 최상단에서 URL 파라미터(`level`)를 읽어 즉시 게임을 초기화하는 진입 스크립트로, 다른 파일에서 import하여 사용하는 구조가 아님.

### 공개 데이터
export된 데이터 없음. 내부 상태(`gold`, `currentCombo`, `maxCombo`, `stageState`, `inputState`, `currentAnswer`)는 모듈 스코프 내부에서만 사용됨.

### 의존성
- core/saveManager.js — `getClockBestStars`, `getGold`, `addGold`, `saveClockResult` import
- ./data/levels.js — `LEVELS`, `shuffleArray` import

### 사용처
index.html에서 `<script type="module" src="script.js">`로 로드.

---

## style.css

### 역할
Clock Game 화면 레이아웃(정보 바/시계/계산식/입력/키패드/결과 화면)과 상태별 스타일(입력칸 활성, 정답/오답 피드백)을 정의하는 스타일시트.

### 공개 함수
해당 없음 (CSS 파일).

### 공개 데이터
- CSS 커스텀 프로퍼티(`:root` 변수): `--color-bg`, `--color-surface`, `--color-primary`, `--color-primary-dark`, `--color-text`, `--color-text-muted`, `--color-keypad-bg`, `--color-keypad-active`, `--font-base`, `--max-width` — 값 고정, 다른 곳에서 변경하지 않음
- index.html이 참조하는 클래스: `.game-wrapper`, `.info-bar` 계열, `.clock-area`, `.clock-svg`, `.calc-area`(`--hidden` 포함), `.calc-expression`, `.input-area`(`--correct`, `--wrong` 포함), `.input-group`, `.input-box`(`--active` 포함), `.input-label`, `.keypad-area`, `.keypad-numbers`, `.keypad-row`, `.keypad-btn`(`--nav` 포함), `.result-screen`(`--hidden` 포함), `.result-card` 및 하위 결과 항목 클래스들
- script.js가 동적으로 추가/제거하는 클래스: `input-box--active`, `input-area--correct`, `input-area--wrong`, `calc-area--hidden`, `result-screen--hidden`

### 의존성
없음.

### 사용처
index.html에서 `<link rel="stylesheet" href="style.css">`로 로드.

---

## core/saveManager.js

### 역할
LocalStorage 기반 저장 데이터(`clockGame_save`)에 대한 단일 접근 창구. 골드, Clock Game 단계별 별점, 해금 단계를 관리.

### 공개 함수
- `getClockSave()` — 현재 저장 데이터 전체 조회
- `getGold()` — 보유 골드 조회
- `addGold(amount)` — 골드 즉시 추가 저장
- `getClockBestStars(level)` — 특정 단계의 최고 별점 조회
- `getClockCurrentStars()` — Lv.8 최근 별점 조회
- `saveClockResult(level, stars, goldEarned, totalLevels)` — 단계 종료 시 최고 별점/최근 별점(Lv.8)/골드 누적/다음 단계 해금을 한 번에 처리
- `resetSave()` — 저장 데이터 초기화 (디버그 전용)
- `setGold(amount)` — 골드 값 강제 설정 (디버그 전용)
- `unlockAllClockLevels(totalLevels)` — 전체 단계 강제 해금 (디버그 전용)
- `setAllClockStars(stars, totalLevels)` — 전체 단계 별점 강제 설정 (디버그 전용)

### 공개 데이터
export되는 데이터 없음. 저장 데이터 구조(`gold`, `unlockedLevel`, `bestStars`, `currentStars`)는 함수를 통해서만 간접 접근되며, LocalStorage 키 `clockGame_save`는 이 파일 내부에서만 직접 사용됨.

### 의존성
없음 (LocalStorage 직접 접근은 이 파일에서만 수행).

### 사용처
- script.js — `getClockBestStars`, `getGold`, `addGold`, `saveClockResult` 사용
- (디버그 전용 함수는 core/debug.js에서 사용하는 것으로 파일 내 주석에 명시되어 있으나, 해당 파일은 확인 대상에 포함되지 않음)