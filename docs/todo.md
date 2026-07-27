 
* 을/를 자동 적용
----------------
# 메인 캐릭터 이름 적용 (구매 후)
function 을를(이름) {
  const 마지막글자 = 이름.trim().at(-1);
  const 코드 = 마지막글자?.charCodeAt(0) - 0xAC00;

  return 코드 >= 0 && 코드 <= 11171 && 코드 % 28 !== 0 ? '을' : '를';
}

# 파츠 svg 수정
## 원

---------------

모든 SVG는 다음 규칙을 적용하는 것을 추천한다.

외곽선(outline)과 내부(fill)를 별도의 path로 만든다.
색상이 바뀌는 부분에는 **fill**을 사용한다.
외곽선은 항상 stroke만 사용한다.
색상을 변경할 대상에는 고정된 id(head-fill, body-fill 등) 를 부여한다.


----------

캐릭터 상점 개발 순서 추천
파츠 구매 및 인벤토리 
머리 적용
조합(+1)
해체(-1)
이름 변경
색상 시스템
꾸밈 시스템




Commit Summary

Implement part purchase and inventory

---

다음 작업은 파츠 구매 및 인벤토리 시스템만 구현한다.

수정 파일

- characters/character-shop.html
- characters/character-shop.css
- characters/character-shop.js
- characters/data/characterData.js
- characters/data/save.js

## 목표

상점에서 파츠를 구매하여 인벤토리에 저장하고, 보유 개수를 관리한다.

## 요구사항

### 1. 구매

- 일반 파츠 구매 시 💎100 차감
- 랜덤 박스 구매 시 💎70 차감
- 💎이 부족하면 구매하지 않는다.
- 동일한 파츠는 여러 번 구매할 수 있다.

### 2. 인벤토리

각 파츠의 보유 개수를 저장한다.

예)

Circle : 3
Triangle : 1
Square : 0

### 3. 화면 표시

상점 슬롯에는 현재 보유 개수를 배지 형태로 표시한다.

- 미보유 : 0
- 보유 : 실제 개수

### 4. 저장

구매 결과는 save.js를 통해 localStorage에 저장한다.

새로고침 후에도 보유 개수와 💎이 유지되어야 한다.

### 5. 제외 사항

아직 구현하지 않는다.

- 머리 적용
- 조합
- 해체
- 이름 변경
- 색상
- 꾸밈

## 구현 원칙

- 구매 로직과 저장 로직을 분리한다.
- 인벤토리는 객체 형태로 관리한다.
- 기존 저장 시스템과 호환되도록 구현한다.

변경된 파일만 출력한다.

구현 완료 후 요구사항별 완료/미완료 체크리스트를 함께 보고한다.
-----------

게임화면 내 캐릭터 위치: 어울림. 자리차지x & 랜덤 위치 (다른 요소와 겹치지는 않으면서)

Commit Summary

Add random character placement system

---

다음 작업은 게임 화면과 메인 화면에 캐릭터를 표시하는 시스템만 구현한다.

수정 파일

* `index.html`
* `games/clock/index.html`
* `shared/header.js` (필요 시)
* `shared/character-display.js` (신규)
* `shared/character-display.css` (신규)

## 생성 파일

* `shared/character-display.js`
* `shared/character-display.css`

## 목표

현재 저장된 캐릭터를 메인 화면과 게임 화면에 자연스럽게 표시한다.

## 요구사항

### 1. 표시 대상

현재 저장된 캐릭터를 표시한다.

이름은 표시하지 않는다.

### 2. 표시 위치

캐릭터는 화면을 가리지 않는 후보 위치 중 하나를 랜덤으로 선택하여 표시한다.

예)

* 좌측 상단
* 우측 상단
* 좌측 하단
* 우측 하단

후보 위치는 UI 요소(시계, 입력 영역, 버튼, 헤더 등)와 겹치지 않도록 미리 정의한다.

게임 시작 또는 화면 진입 시마다 후보 위치 중 하나를 랜덤으로 선택한다.

### 3. 화면별 동작

메인 화면

* 자연스럽게 배치한다.

게임 화면

* 시계와 겹치지 않는 위치에 표시한다.
* 게임 플레이를 방해하지 않는다.

### 4. 애니메이션

기존 캐릭터 애니메이션을 그대로 사용한다.

* 둥실둥실
* 살랑살랑
* 자연스러운 흔들림

### 5. 공통화

캐릭터 표시 기능은 공통 컴포넌트로 구현한다.

향후 다른 화면에서도 동일한 방식으로 사용할 수 있도록 작성한다.

### 제외 사항

아직 구현하지 않는다.

* 클릭 기능
* 표정 변화
* 눈 깜박임
* 콤보 연출
* 정답/오답 연출

## 구현 원칙

* 후보 위치는 CSS 클래스로 관리한다.
* JavaScript는 후보 위치 중 하나만 랜덤 선택한다.
* 기존 UI를 가리지 않도록 배치한다.

변경된 파일만 출력한다.

구현 완료 후 요구사항별 완료/미완료 체크리스트를 함께 보고한다.

------------

1. 크기를 결정하는 지점 — core/svgLoader.js의 replaceSvgContent()
js
const viewBox = root.getAttribute('viewBox');
if (viewBox) svgElement.setAttribute('viewBox', viewBox);

검색 키워드: viewBox (svgLoader.js 내 유일하게 크기 관련 로직이 있는 곳)

이 함수는 원본 파츠 SVG 파일(assets/parts/p-*.svg)의 viewBox 값을 그대로 복사해서 .part-slot__svg에 씌운다.
width / height 속성은 원본에서 가져오지 않고 아예 건드리지 않는다. (replaceChildren으로 자식 노드만 교체)
2. 실제 화면 크기 — character-shop.css의 .part-slot__svg

검색 키워드: part-slot__svg

css
.part-slot__svg {
  width: 56px;
  height: 56px;
}

→ 화면에 그려지는 박스 자체의 크기(56×56px)는 CSS가 고정하고 있어서, 여기엔 문제가 없다.

3. 결론 — 진짜 원인은 "viewBox 대 도형 크기 비율"

replaceSvgContent()는 원본 파일의 viewBox를 무조건 그대로 복사한다. 즉:

56×56px 박스 자체는 정상 크기로 잡혀 있고
그 안에서 viewBox가 정의하는 좌표계(width, height)를 SVG가 그대로 채우는 구조 (preserveAspectRatio 기본값 xMidYMid meet)이기 때문에
만약 assets/parts/p-circle.svg 같은 원본 파일이 viewBox="0 0 200 200"인데 실제 도형은 그 중앙 100×100 영역에만 그려져 있다면(캔버스 여백이 큰 상태로 export된 경우), 56px 박스 전체를 여백까지 포함해 채우게 되어 도형 자체는 절반 크기로 작게 보인다.

→ character-shop.js의 호출부(replaceSvgContent(svgElement, part.assetPath))는 단순 호출만 하므로 문제 없음. 버그는 svgLoader.js가 원본 viewBox를 무조건 그대로 신뢰하고 복사하는 부분이다.

정확히 2배로 만드는 방법

원본 p-circle.svg 등을 열어 실제 viewBox="minX minY W H" 값을 확인한 뒤, 중앙 기준으로 절반 영역만 잘라내는(zoom-in) viewBox로 바꿔주면 모든 방향으로 정확히 2배가 된다.

계산식:

newMinX = minX + W / 4
newMinY = minY + H / 4
newW    = W / 2
newH    = H / 2

예를 들어 원본이 viewBox="0 0 200 200"이라면 → viewBox="50 50 100 100"로 바꾸면 도형이 정확히 2배 크게(=중앙 기준 확대) 보인다.

이 계산을 replaceSvgContent() 안에서, root.getAttribute('viewBox')를 가져온 직후 위 공식대로 가공해 svgElement.setAttribute('viewBox', ...)에 넣는 방식으로 수정하면 된다. (원본 SVG 파일 자체를 수정하는 대신 로더에서 배율만 조정하는 방식)