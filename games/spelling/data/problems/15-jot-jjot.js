export const JOT_JJOT_PROBLEMS = [
  {
    id: 'jot-jjot-01',
    tokens: [
      { text: '꿈을' },
      { correct: '좇아', wrong: '쫓아', fixedSide: 'left' },
      { text: '노력했다.' }
    ]
  },
  {
    id: 'jot-jjot-02',
    tokens: [
      { text: '도둑을' },
      { correct: '쫓아', wrong: '좇아', fixedSide: 'right' },
      { text: '달렸다.' }
    ]
  },
  {
    id: 'jot-jjot-03',
    tokens: [
      { text: '스승의' },
      { text: '가르침을' },
      { correct: '좇기로', wrong: '쫓기로', fixedSide: 'left' },
      { text: '결심했다.' }
    ]
  },
  {
    id: 'jot-jjot-04',
    tokens: [
      { text: '파리를' },
      { text: '손으로' },
      { correct: '쫓았다.', wrong: '좇았다.', fixedSide: 'right' }
    ]
  },
  {
    id: 'jot-jjot-05',
    tokens: [
      { text: '이상을' },
      { correct: '좇는', wrong: '쫓는', fixedSide: 'left' },
      { text: '삶은' },
      { text: '아름답다.' }
    ]
  },
  {
    id: 'jot-jjot-06',
    tokens: [
      { text: '술래가' },
      { text: '친구를' },
      { correct: '쫓아', wrong: '좇아', fixedSide: 'right' },
      { text: '갔다.' }
    ]
  },
  {
    id: 'jot-jjot-07',
    tokens: [
      { text: '부모님의' },
      { text: '뜻을' },
      { correct: '좇아', wrong: '쫓아', fixedSide: 'left' },
      { text: '진학했다.' }
    ]
  },
  {
    id: 'jot-jjot-08',
    tokens: [
      { text: '딴생각을' },
      { text: '머리에서' },
      { correct: '쫓아냈다.', wrong: '좇아냈다.', fixedSide: 'right' }
    ]
  },
  {
    id: 'jot-jjot-09',
    tokens: [
      { text: '명예를' },
      { correct: '좇는', wrong: '쫓는', fixedSide: 'left' },
      { text: '사람이' },
      { text: '많다.' }
    ]
  },
  {
    id: 'jot-jjot-10',
    tokens: [
      { text: '고양이가' },
      { text: '쥐를' },
      { correct: '쫓는다.', wrong: '좇는다.', fixedSide: 'right' }
    ]
  },
  {
    id: 'jot-jjot-11',
    tokens: [
      { text: '규칙을' },
      { correct: '좇아', wrong: '쫓아', fixedSide: 'left' },
      { text: '행동했다.' }
    ]
  },
  {
    id: 'jot-jjot-12',
    tokens: [
      { text: '모기를' },
      { correct: '쫓으려고', wrong: '좇으려고', fixedSide: 'right' },
      { text: '약을' },
      { text: '피웠다.' }
    ]
  },
  {
    id: 'jot-jjot-13',
    tokens: [
      { text: '자신의' },
      { text: '소신을' },
      { correct: '좇아', wrong: '쫓아', fixedSide: 'left' },
      { text: '행동해라.' }
    ]
  },
  {
    id: 'jot-jjot-14',
    tokens: [
      { text: '경찰이' },
      { text: '범인을' },
      { correct: '쫓아', wrong: '좇아', fixedSide: 'right' },
      { text: '갔다.' }
    ]
  },
  {
    id: 'jot-jjot-15',
    tokens: [
      { text: '진리를' },
      { correct: '좇는', wrong: '쫓는', fixedSide: 'left' },
      { text: '학자의' },
      { text: '자세다.' }
    ]
  },
  {
    id: 'jot-jjot-16',
    tokens: [
      { text: '까마귀를' },
      { correct: '쫓으러', wrong: '좇으러', fixedSide: 'right' },
      { text: '밭으로' },
      { text: '갔다.' }
    ]
  },
  {
    id: 'jot-jjot-17',
    tokens: [
      { text: '성공을' },
      { correct: '좇기', wrong: '쫓기', fixedSide: 'left' },
      { text: '전에' },
      { text: '실력을' },
      { text: '쌓아라.' }
    ]
  },
  {
    id: 'jot-jjot-18',
    tokens: [
      { text: '잡념을' },
      { text: '털어' },
      { correct: '쫓아', wrong: '좇아', fixedSide: 'right' },
      { text: '버렸다.' }
    ]
  },
  {
    id: 'jot-jjot-19',
    tokens: [
      { text: '나쁜' },
      { text: '기운을' },
      { correct: '쫓기', wrong: '좇기', fixedSide: 'right' },
      { text: '위해' },
      { text: '환기를' },
      { text: '했다.' }
    ]
  },
  {
    id: 'jot-jjot-20',
    tokens: [
      { text: '다수의' },
      { text: '의견을' },
      { correct: '좇는', wrong: '쫓는', fixedSide: 'left' },
      { text: '것을' },
      { text: '택했다.' }
    ]
  }
];

// 학습 모달 콘텐츠 (마당 시작 시 + 오답 시 공통 노출, 주제마다 달라지므로 해당 주제 파일에 위치)
// lines: 각 줄을 세그먼트 배열로 표현. emph 없는 세그먼트는 기본 텍스트, 있으면 강조 스타일 적용.
// emph: 'blue' → 강조(짙은 파랑, 굵게/크게), 'red' → 강조(짙은 빨강, 굵게/크게)
export const JOT_JJOT_GUIDE = {
  title: '좇다 / 쫓다 구별법',
  lines: [
    [
      { text: '좇다', emph: 'blue' }, { text: ": 꿈/생각을 따르다" }
    ],
    [
      { text: "(눈에 " }, { text: '안 보이는', emph: 'blue' }, { text: " 대상)" }
    ],
    [
      { text: '쫓다', emph: 'red' }, { text: ": 따라가다" } 
    ],
    [
      { text: "(눈에 " }, { text: '보이는', emph: 'red' }, { text: " 대상)," }
    ],
    [
      { text: '쫓아내다' }
    ]
  ]
};