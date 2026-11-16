export const CM01_PROBLEMS = [
  {
    id: 'cm01-01',
    tokens: [
      { text: '우리는' },
      { correct: '몇 년째', wrong: '몇년째' },
      { text: '친구지?' }
    ]
  },
  {
    id: 'cm01-02',
    tokens: [
      { text: '사건은' },
      { correct: '몇 년', wrong: '몇년' },
      { text: '전' },
      { text: '이야기다.' }
    ]
  },
  {
    id: 'cm01-03',
    tokens: [
      { text: '고향에' },
      { correct: '몇 년', wrong: '몇년' },
      { text: '만에' },
      { text: '돌아왔다.' }
    ]
  },
  {
    id: 'cm01-04',
    tokens: [
      { text: '지금은' },
      { correct: '몇 월', wrong: '몇월' },
      { text: '인가요?' }
    ]
  },
  {
    id: 'cm01-05',
    tokens: [
      { text: '생일이' },
      { correct: '몇 월', wrong: '몇월' },
      { text: '이야?' }
    ]
  },
  {
    id: 'cm01-06',
    tokens: [
      { text: '올해는' },
      { correct: '몇 월에', wrong: '몇월에' },
      { text: '연휴지?' }
    ]
  },
  {
    id: 'cm01-07',
    tokens: [
      { text: '내일은' },
      { correct: '무슨 요일', wrong: '몇 요일' },
      { text: '인가요?' }
    ]
  },
  {
    id: 'cm01-08',
    tokens: [
      { text: '독서록은' },
      { correct: '무슨 요일에', wrong: '몇 요일에' },
      { text: '내요?' }
    ]
  },
  {
    id: 'cm01-09',
    tokens: [
      { text: '시험은' },
      { correct: '무슨 요일에', wrong: '몇 요일에' },
      { text: '시작해?' }
    ]
  },
  {
    id: 'cm01-10',
    tokens: [
      { text: '오늘이' },
      { correct: '며칠이지?', wrong: '몇일이지?' }
    ]
  },
  {
    id: 'cm01-11',
    tokens: [
      { text: '완성에' },
      { correct: '며칠', wrong: '몇일' },
      { text: '걸렸어?' }
    ]
  },
  {
    id: 'cm01-12',
    tokens: [
      { text: '여행이' },
      { correct: '며칠', wrong: '몇일' },
      { text: '동안이야?' }
    ]
  },
  {
    id: 'cm01-13',
    tokens: [
      { text: '행사는' },
      { correct: '며칠에', wrong: '몇일에' },
      { text: '열리나요?' }
    ]
  },
  {
    id: 'cm01-14',
    tokens: [
      { text: '방학까지' },
      { correct: '며칠', wrong: '몇일' },
      { text: '남았나?' }
    ]
  },
  {
    id: 'cm01-15',
    tokens: [
      { text: '날짜가' },
      { correct: '며칠로', wrong: '몇일로' },
      { text: '정해졌니?' }
    ]
  },
  {
    id: 'cm01-16',
    tokens: [
      { text: '올해' },
      { correct: '유월에는', wrong: '육월에는' },
      { text: '연휴가' },
      { text: '있다.' }
    ]
  },
  {
    id: 'cm01-17',
    tokens: [
      { text: '호국보훈의' },
      { text: '달인' },
      { correct: '유월이', wrong: '육월이' },
      { text: '다가온다.' }
    ]
  },
  {
    id: 'cm01-18',
    tokens: [
      { text: '단풍이' },
      { correct: '시월에도', wrong: '십월에도' },
      { text: '아름답군.' }
    ]
  },
  {
    id: 'cm01-19',
    tokens: [
      { text: '개천절은' },
      { correct: '시월이다.', wrong: '십월이다.' }
    ]
  },
  {
    id: 'cm01-20',
    tokens: [
      { text: '부모님께서는' },
      { correct: '이천삼 년에', wrong: '이천삼년에' },
      { text: '만났다고' },
      { text: '하셨다.' }
    ]
  },
  {
    id: 'cm01-21',
    tokens: [
      { text: '용이' },
      { correct: '삼천 년', wrong: '삼천년' },
      { text: '만에' },
      { text: '깨어났다.' }
    ]
  },  
];

// 학습 모달 콘텐츠 (마당 시작 시 + 오답 시 공통 노출, 주제마다 달라지므로 해당 주제 파일에 위치)
// lines: 각 줄을 세그먼트 배열로 표현. emph 없는 세그먼트는 기본 텍스트, 있으면 강조 스타일 적용.
// emph: 'blue' → 강조(짙은 파랑, 굵게/크게), 'red' → 강조(짙은 빨강, 굵게/크게)
export const CM01_GUIDE = {
  title: '틀리기 쉬운 [날짜] 맞춤법',
  lines: [
    [
      { text: '한글+단위', emph: 'blue' }, { text: ': 띄어 씀' }
    ],
    [
      { text: '(월, 일은 허락)' }
    ],

    [
      { text: '몇 년, 몇 월, 삼 년 ', emph: 'blue' }, {text: '삼월 삼일'}
    ],
    [
      { text: '며칠, 유월, 시월', emph: 'red' }, { text: ": 소리 대로" }
    ],
    [
      { text: '몇', emph: 'green' }, { text: ": " },
      { text: '숫자', emph: 'green' }, { text: "를 물을 때" }
    ]
  ]
};
