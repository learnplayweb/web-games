export const CHAE_CHE_PROBLEMS = [
  {
    id: 'chae-che-01',
    tokens: [
      { text: '옷을' },
      { text: '입은' },
      { correct: '채', wrong: '체', fixedSide: 'left' },
      { text: '물로' },
      { text: '들어갔다.' }
    ]
  },
  {
    id: 'chae-che-02',
    tokens: [
      { text: '정답을' },
      { text: '알면서도' },
      { text: '모르는' },
      { correct: '체', wrong: '채', fixedSide: 'right' },
      { text: '했다.' }
    ]
  },
  {
    id: 'chae-che-03',
    tokens: [
      { text: '신발을' },
      { text: '신은' },
      { correct: '채', wrong: '체', fixedSide: 'left' },
      { text: '집에' },
      { text: '들어갔다.' }
    ]
  },
  {
    id: 'chae-che-04',
    tokens: [
      { text: '친구는' },
      { text: '나를' },
      { text: '보고도' },
      { text: '못' },
      { text: '본' },
      { correct: '체', wrong: '채', fixedSide: 'right' },
      { text: '지나쳤다.' }
    ]
  },
  {
    id: 'chae-che-05',
    tokens: [
      { text: '불을' },
      { text: '켠' },
      { correct: '채', wrong: '체', fixedSide: 'left' },
      { text: '잠이' },
      { text: '들었다.' }
    ]
  },
  {
    id: 'chae-che-06',
    tokens: [
      { text: '알지도' },
      { text: '못하면서' },
      { text: '아는' },
      { correct: '체', wrong: '채', fixedSide: 'right' },
      { text: '하네.' }
    ]
  },
  {
    id: 'chae-che-07',
    tokens: [
      { text: '사과를' },
      { text: '껍질' },
      { correct: '채', wrong: '체', fixedSide: 'left' },
      { text: '먹었다.' }
    ]
  },
  {
    id: 'chae-che-08',
    tokens: [
      { text: '아이는' },
      { text: '자는' },
      { correct: '체', wrong: '채', fixedSide: 'right' },
      { text: '했다.' }
    ]
  },
  {
    id: 'chae-che-09',
    tokens: [
      { text: '눈을' },
      { text: '감은' },
      { correct: '채', wrong: '체', fixedSide: 'left' },
      { text: '음악을' },
      { text: '들었다.' }
    ]
  },
  {
    id: 'chae-che-10',
    tokens: [
      { text: '잘난' },
      { correct: '체', wrong: '채', fixedSide: 'right' },
      { text: '큰소리를' },
      { text: '쳤다.' }
    ]
  },
  {
    id: 'chae-che-11',
    tokens: [
      { text: '고개를' },
      { text: '숙인' },
      { correct: '채', wrong: '체', fixedSide: 'left' },
      { text: '아무' },
      { text: '말도' },
      { text: '하지' },
      { text: '않았다.' }
    ]
  },
  {
    id: 'chae-che-12',
    tokens: [
      { text: '그는' },
      { text: '돈이' },
      { text: '많은' },
      { correct: '체', wrong: '채', fixedSide: 'right' },
      { text: '자랑했다.' }
    ]
  },
  {
    id: 'chae-che-13',
    tokens: [
      { text: '가방을' },
      { text: '멘' },
      { correct: '채', wrong: '체', fixedSide: 'left' },
      { text: '의자에' },
      { text: '앉았다.' }
    ]
  },
  {
    id: 'chae-che-14',
    tokens: [
      { text: '알고도' },
      { text: '모르는' },
      { correct: '체', wrong: '채', fixedSide: 'right' },
      { text: '했다.' }
    ]
  },
  {
    id: 'chae-che-15',
    tokens: [
      { text: '낚싯대를' },
      { text: '드리운' },
      { correct: '채', wrong: '체', fixedSide: 'left' },
      { text: '입질을' },
      { text: '기다렸다.' }
    ]
  },
  {
    id: 'chae-che-16',
    tokens: [
      { text: '아무렇지' },
      { text: '않은' },
      { correct: '체', wrong: '채', fixedSide: 'right' },
      { text: '웃었다.' }
    ]
  },
  {
    id: 'chae-che-17',
    tokens: [
      { text: '모자를' },
      { text: '쓴' },
      { correct: '채', wrong: '체', fixedSide: 'left' },
      { text: '인사를' },
      { text: '건넸다.' }
    ]
  },
  {
    id: 'chae-che-18',
    tokens: [
      { text: '무서웠지만' },
      { text: '용감한' },
      { correct: '체', wrong: '채', fixedSide: 'right' },
      { text: '행동했다.' }
    ]
  },
  {
    id: 'chae-che-19',
    tokens: [
      { text: '세워' },
      { text: '둔' },
      { correct: '채', wrong: '체', fixedSide: 'left' },
      { text: '잊었던' },
      { text: '자전거를' },
      { text: '가져왔다.' }
    ]
  },
  {
    id: 'chae-che-20',
    tokens: [
      { text: '숙제를' },
      { text: '못했지만' },
      { text: '다' },
      { text: '한' },
      { correct: '체', wrong: '채', fixedSide: 'right' },
      { text: '시치미를' },
      { text: '뗐다.' }
    ]
  }
];

// 학습 모달 콘텐츠 (마당 시작 시 + 오답 시 공통 노출, 주제마다 달라지므로 해당 주제 파일에 위치)
// lines: 각 줄을 세그먼트 배열로 표현. emph 없는 세그먼트는 기본 텍스트, 있으면 강조 스타일 적용.
// emph: 'blue' → 강조(짙은 파랑, 굵게/크게), 'red' → 강조(짙은 빨강, 굵게/크게)
export const CHAE_CHE_GUIDE = {
  title: '채 / 체 구별법',
  lines: [
    [
      { text: '채', emph: 'blue' }, { text: ": 상태 " }, { text: '그대로', emph: 'blue' }
    ],
    [
      { text: '체', emph: 'red' }, { text: ": " },  { text: '거짓', emph: 'red' }, { text: "으로 꾸미는 태도" }
    ],
    [
      { text: "(" }, { text: '척', emph: 'red' }, { text: "으로 바꿔 보기)" }
    ]
  ]
};