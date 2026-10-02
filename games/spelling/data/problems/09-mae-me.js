export const MAE_ME_PROBLEMS = [
  {
    id: 'mae-me-01',
    tokens: [
      { text: '신발' },
      { text: '끈을' },
      { text: '단단히' },
      { correct: '맸다.', wrong: '멨다.', fixedSide: 'left' }
    ]
  },
  {
    id: 'mae-me-02',
    tokens: [
      { text: '배낭을' },
      { correct: '메고', wrong: '매고', fixedSide: 'right' },
      { text: '놀러' },
      { text: '간다.' }
    ]
  },
  {
    id: 'mae-me-03',
    tokens: [
      { text: '넥타이를' },
      { correct: '매었다.', wrong: '메었다.', fixedSide: 'left' }
    ]
  },
  {
    id: 'mae-me-04',
    tokens: [
      { text: '너무' },
      { text: '기뻐' },
      { text: '목이' },
      { correct: '메었다.', wrong: '매었다.', fixedSide: 'right' }
    ]
  },
  {
    id: 'mae-me-05',
    tokens: [
      { text: '차에선' },
      { text: '안전벨트를' },
      { correct: '매세요.', wrong: '메세요.', fixedSide: 'left' }
    ]
  },
  {
    id: 'mae-me-06',
    tokens: [
      { text: '가방을' },
      { text: '가볍게' },
      { correct: '메고', wrong: '매고', fixedSide: 'right' },
      { text: '집을' },
      { text: '나섰다.' }
    ]
  },
  {
    id: 'mae-me-07',
    tokens: [
      { text: '강아지' },
      { text: '목줄을' },
      { correct: '매주고', wrong: '메주고', fixedSide: 'left' },
      { text: '산책' },
      { text: '갈까?' }
    ]
  },
  {
    id: 'mae-me-08',
    tokens: [
      { text: '슬픈' },
      { text: '소식에' },
      { text: '목이' },
      { correct: '메어', wrong: '매어', fixedSide: 'right' },
      { text: '말을' },
      { text: '잇지' },
      { text: '못했다.' }
    ]
  },
  {
    id: 'mae-me-09',
    tokens: [
      { text: '허리띠를' },
      { text: '조여' },
      { correct: '매었다.', wrong: '메었다.', fixedSide: 'left' }
    ]
  },
  {
    id: 'mae-me-10',
    tokens: [
      { text: '군인이' },
      { text: '총을' },
      { text: '어깨에' },
      { correct: '메고', wrong: '매고', fixedSide: 'right' },
      { text: '있었다.' }
    ]
  },
  {
    id: 'mae-me-11',
    tokens: [
      { text: '리본을' },
      { text: '예쁘게' },
      { correct: '매었다.', wrong: '메었다.', fixedSide: 'left' }
    ]
  },
  {
    id: 'mae-me-12',
    tokens: [
      { text: '감격해서' },
      { text: '목이' },
      { correct: '메인', wrong: '매인', fixedSide: 'right' },
      { text: '채' },
      { text: '인사를' },
      { text: '했다.' }
    ]
  },
  {
    id: 'mae-me-13',
    tokens: [
      { text: '줄을' },
      { text: '나무에' },
      { correct: '매었다.', wrong: '메었다.', fixedSide: 'left' }
    ]
  },
  {
    id: 'mae-me-14',
    tokens: [
      { text: '짐을' },
      { text: '어깨에' },
      { correct: '메고', wrong: '매고', fixedSide: 'right' },
      { text: '가느라' },
      { text: '힘들다.' }
    ]
  },
  {
    id: 'mae-me-15',
    tokens: [
      { text: '슬픔에' },
      { text: '목이' },
      { correct: '메는', wrong: '매는', fixedSide: 'right' },
      { text: '것을' },
      { text: '참았다.' }
    ]
  },
  {
    id: 'mae-me-16',
    tokens: [
      { text: '목도리를' },
      { text: '목에' },
      { correct: '매고', wrong: '메고', fixedSide: 'left' },
      { text: '나갔다.' }
    ]
  },
  {
    id: 'mae-me-17',
    tokens: [
      { text: '카메라를' },
      { text: '어깨에' },
      { correct: '메고', wrong: '매고', fixedSide: 'right' },
      { text: '촬영했다.' }
    ]
  },
  {
    id: 'mae-me-18',
    tokens: [
      { text: '밧줄로' },
      { text: '배를' },
      { text: '묶어' },
      { correct: '매었다.', wrong: '메었다.', fixedSide: 'left' }
    ]
  },
  {
    id: 'mae-me-19',
    tokens: [
      { text: '서러움에' },
      { text: '목이' },
      { correct: '메어', wrong: '매어', fixedSide: 'right' },
      { text: '왔다.' }
    ]
  }
];

// 학습 모달 콘텐츠 (마당 시작 시 + 오답 시 공통 노출, 주제마다 달라지므로 해당 주제 파일에 위치)
// lines: 각 줄을 세그먼트 배열로 표현. emph 없는 세그먼트는 기본 텍스트, 있으면 강조 스타일 적용.
// emph: 'blue' → 강조(짙은 파랑, 굵게/크게), 'red' → 강조(짙은 빨강, 굵게/크게)
export const MAE_ME_GUIDE = {
  title: '매다 / 메다 구별법',
  lines: [
    [
      { text: '매다', emph: 'blue' }, { text: ": 줄, 끈을 " }, { text: '묶거나 두르다', emph: 'blue' }
    ],
    [
      { text: '메다', emph: 'red' }, { text: ": " },
      { text: '어깨', emph: 'red' }, { text: "에 올려놓다," }
    ],
    [
      { text: "감정이 북받쳐 " }, { text: '목소리가 잘 안나옴', emph: 'red' }
    ]
  ]
};