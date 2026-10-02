export const DAERO_DERO_PROBLEMS = [
  {
    id: 'daero-dero-01',
    tokens: [
      { text: '범죄자는' },
      { correct: '법대로', wrong: '법데로', fixedSide: 'left' },
      { text: '처벌될' },
      { text: '거야.' }
    ]
  },
  {
    id: 'daero-dero-02',
    tokens: [
      { text: '약속했던' },
      { correct: '대로', wrong: '데로', fixedSide: 'left' },
      { text: '행동하라.' }
    ]
  },
  {
    id: 'daero-dero-03',
    tokens: [
      { text: '시원한' },
      { correct: '데로', wrong: '대로', fixedSide: 'right' },
      { text: '가서' },
      { text: '쉬자.' }
    ]
  },
  {
    id: 'daero-dero-04',
    tokens: [
      { text: '내가' },
      { text: '말하는' },
      { correct: '대로', wrong: '데로', fixedSide: 'left' },
      { text: '하면' },
      { text: '좋은' },
      { correct: '데', wrong: '대', fixedSide: 'right' },
      { text: '데려갈게.' }
    ]
  },
  {
    id: 'daero-dero-05',
    tokens: [
      { text: '바람이' },
      { text: '부는' },
      { correct: '대로', wrong: '데로', fixedSide: 'left' },
      { text: '움직였다.' }
    ]
  },
  {
    id: 'daero-dero-06',
    tokens: [
      { text: '내일' },
      { text: '재밌는' },
      { correct: '데', wrong: '대', fixedSide: 'right' },
      { text: '간다!' }
    ]
  },
  {
    id: 'daero-dero-07',
    tokens: [
      { text: '내가' },
      { text: '말한' },
      { correct: '대로', wrong: '데로', fixedSide: 'left' },
      { text: '정답이다.' }
    ]
  },
  {
    id: 'daero-dero-08',
    tokens: [
      { text: '따뜻한' },
      { correct: '데로', wrong: '대로', fixedSide: 'right' },
      { text: '옮겨' },
      { text: '앉았다.' }
    ]
  },
  {
    id: 'daero-dero-09',
    tokens: [
      { text: '원래' },
      { text: '있던' },
      { correct: '데에', wrong: '대에', fixedSide: 'right' },
      { text: '놓아라.' }
    ]
  },
  {
    id: 'daero-dero-10',
    tokens: [
      { text: '약을' },
      { text: '먹는' },
      { correct: '대로', wrong: '데로', fixedSide: 'left' },
      { text: '효과가' },
      { text: '난다.' }
    ]
  },
  {
    id: 'daero-dero-11',
    tokens: [
      { text: '햇볕이' },
      { text: '잘' },
      { text: '드는' },
      { correct: '데로', wrong: '대로', fixedSide: 'right' },
      { text: '가자.' }
    ]
  },
  {
    id: 'daero-dero-12',
    tokens: [
      { text: '일기를' },
      { correct: '사실대로', wrong: '사실데로', fixedSide: 'left' },
      { text: '썼다.' }
    ]
  },
  {
    id: 'daero-dero-13',
    tokens: [
      { text: '친구가' },
      { text: '말하는' },
      { correct: '대로', wrong: '데로', fixedSide: 'left' },
      { text: '했다.' }
    ]
  },
  {
    id: 'daero-dero-14',
    tokens: [
      { text: '편하고' },
      { text: '넓은' },
      { correct: '데로', wrong: '대로', fixedSide: 'right' },
      { text: '앉자.' }
    ]
  },
  {
    id: 'daero-dero-15',
    tokens: [
      { text: '보이는' },
      { correct: '대로', wrong: '데로', fixedSide: 'left' },
      { text: '사실을' },
      { text: '말해라.' }
    ]
  },
  {
    id: 'daero-dero-16',
    tokens: [
      { text: '비를' },
      { text: '피할' },
      { text: '만한' },
      { correct: '데로', wrong: '대로', fixedSide: 'right' },
      { text: '가자.' }
    ]
  },
  {
    id: 'daero-dero-17',
    tokens: [
      { text: '평소에' },
      { text: '하던' },
      { correct: '대로', wrong: '데로', fixedSide: 'left' },
      { text: '잘했다.' }
    ]
  },
  {
    id: 'daero-dero-18',
    tokens: [
      { text: '물이' },
      { text: '깊은' },
      { correct: '데로', wrong: '대로', fixedSide: 'right' },
      { text: '가면' },
      { text: '안' },
      { text: '된다.' }
    ]
  },
  {
    id: 'daero-dero-19',
    tokens: [
      { text: '계획을' },
      { text: '세운' },
      { correct: '대로', wrong: '데로', fixedSide: 'left' },
      { text: '진행했다.' }
    ]
  },
  {
    id: 'daero-dero-20',
    tokens: [
      { text: '그늘이' },
      { text: '있는' },
      { correct: '데로', wrong: '대로', fixedSide: 'right' },
      { text: '걸어갔다.' }
    ]
  }
];

// 학습 모달 콘텐츠 (마당 시작 시 + 오답 시 공통 노출, 주제마다 달라지므로 해당 주제 파일에 위치)
// lines: 각 줄을 세그먼트 배열로 표현. emph 없는 세그먼트는 기본 텍스트, 있으면 강조 스타일 적용.
// emph: 'blue' → 강조(짙은 파랑, 굵게/크게), 'red' → 강조(짙은 빨강, 굵게/크게)
export const DAERO_DERO_GUIDE = {
  title: '대로 / 데로 구별법',
  lines: [
    [
      { text: '대로', emph: 'blue' }, { text: ": 상태 " }, { text: '그대로', emph: 'blue' }
    ],
    [
      { text: '데로', emph: 'red' }, { text: ": 어떤 " }, { text: '곳으로', emph: 'red' }
    ]
  ]
};