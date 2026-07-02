docs/
│
├── project-design.md      # 프로젝트 철학, 세계관, 장기 설계
├── ai-rules.md            # AI 작업 규칙
├── roadmap.md             # 개발 진행 순서
├── changelog.md           # 주요 업데이트 기록(버전/커밋 요약)
├── tips.md                # Git, VS Code, Claude 활용 팁
│
├── systems/               # 여러 게임이 공통으로 사용하는 시스템
│   ├── reward-system.md   # Gold, Combo, 별점, 보상 규칙
│   ├── save-system.md     # 저장 구조
│   ├── character-system.md# 캐릭터 성장·진화·표정
│   └── ui-ux-system.md    # 공통 UI/UX 규칙
│
└── games/
    ├── clock-game.md      # 시계 게임 규칙
    ├── number-connect.md  # 숫자 잇기
    ├── ...

# 개발 습관
1. 기능 구현
2. Ctrl + Shift + S (모든 파일 저장)
3. 브라우저에서 테스트
4. docs 수정
   - changelog.md (기능 추가)
   - roadmap.md (단계 완료)
   - project-design.md, system관련.md (설계 변경)
5. 변경 파일 최종 확인
    - 기능: 요청한 기능이 모두 동작하는가?
    - 문서: 이번 변경으로 수정해야 할 문서는 없는가?
    - 커밋: 이번 커밋이 하나의 기능만 담고 있는가?
6. Stage
7. Commit
8. Push


# 커밋 서머리
- Implement : 새로운 기능
- Update : 기능 개선
- Refactor : 내부 구조 변경 (동작 변화 없음)
- Fix : 버그 수정
- Polish : UI/UX 다듬기
- docs : 문서 변경
- chore : 빌드, 설정, 폴더 정리 등


# 프로젝트 운영

새로운 기능을 추가하기 전에 공통 시스템으로 만들 수 있는지 먼저 검토한다.
공통 기능은 재사용 가능한 구조를 우선한다.

# 문서 관리

프로젝트 설계가 변경되면 관련 문서를 먼저 수정한 후 개발을 진행한다.
AI와 새로운 채팅을 시작할 경우 필요한 문서를 함께 전달한다.
   games/

게임마다 다른 것만 적는다.

예를 들어 clock-game.md

난이도
문제 생성 규칙
입력 방식
정답 판정
시계 전용 UI
최종 레벨 예외(시계 게임에만 있다면)
systems/

게임이 바뀌어도 공통인 것을 적는다.

예를 들어

reward-system.md

Gold란 무엇인가
Combo란 무엇인가
별점 계산
최고 별 저장
재도전 보상 감소
COMBO_MULTIPLIER
최종 레벨 예외 규칙(만약 모든 게임에 동일하게 적용된다면)

# GitHub Pages 배포 시 주의사항
# SVG 작업 노하우
# 모바일 테스트 체크리스트


