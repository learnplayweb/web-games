프로젝트 개요 (260713)

- Mobile First 웹게임 프로젝트
- GitHub Pages 배포 예정
- 캐릭터 시스템 개발 중
- SVG 파츠 조립 방식
- JavaScript는 ES Module 사용


폴더 구조 tree /F
├─assets
│  └─fonts
├─characters
│  ├─assets
│  │  ├─face
│  │  └─parts
│  └─preview
├─core
├─docs
│  ├─games
│  └─systems
├─games
│  ├─clock
│  │  ├─assets
│  │  │  ├─images
│  │  │  ├─sounds
│  │  │  └─svg
│  │  └─data
│  └─number-connect
│      └─assets
│          ├─images
│          ├─sounds
│          └─svg
└─shared
    ├─css
    ├─icons
    └─sounds


개발 규칙

- 기존 구조를 유지한다.
- 불필요한 리팩터링 금지.
- 새 파일이 필요하면 경로를 명시한다.
- 항상 Commit Summary를 제공한다. (가능한 간략하게)
    - Implement : 새로운 기능
    - Update : 기능 개선
    - Refactor : 내부 구조 변경 (동작 변화 없음)
    - Fix : 버그 수정
    - Polish : UI/UX 다듬기


답변 규칙

- 변경 파일만 출력한다.
- 확신할 수 없는 내용은 추측하여 구현하지 않는다. 필요한 경우 먼저 확인을 요청한다.