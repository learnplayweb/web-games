export const E_UI_PROBLEMS = [
  {
    id: 'e-ui-01',
    tokens: [
      { text: '부모님' },
      { correct: '의 말씀을', wrong: '에 말씀을', fixedSide: 'right' },
      { text: '잘' },
      { text: '듣자.' }
    ]
  },
  {
    id: 'e-ui-02',
    tokens: [
      { text: '운동장' },
      { correct: '에 모여라.', wrong: '의 모여라.', fixedSide: 'left' }
    ]
  },
  {
    id: 'e-ui-03',
    tokens: [
      { text: '이것은' },
      { text: '동생' },
      { correct: '의 공책이다.', wrong: '에 공책이다.', fixedSide: 'right' }
    ]
  },
  {
    id: 'e-ui-04',
    tokens: [
      { text: '친구' },
      { correct: '의 손을', wrong: '에 손을', fixedSide: 'right' },
      { text: '잡았다.' }
    ]
  },
  {
    id: 'e-ui-05',
    tokens: [
      { text: '책상' },
      { correct: '에 놓인', wrong: '의 놓인', fixedSide: 'left' },
      { text: '필통을' },
      { text: '찾았다.' }
    ]
  },
  {
    id: 'e-ui-06',
    tokens: [
      { text: '선생님' },
      { correct: '의 연필이', wrong: '에 연필이', fixedSide: 'right' },
      { text: '멋지다.' }
    ]
  },
  {
    id: 'e-ui-07',
    tokens: [
      { text: '우리' },
      { text: '반' },
      { correct: '의 친구야.', wrong: '에 친구야.', fixedSide: 'right' }
    ]
  },
  {
    id: 'e-ui-08',
    tokens: [
      { text: '하늘' },
      { correct: '에 구름이 있다.', wrong: '의 구름이 있다.', fixedSide: 'left' }
    ]
  },
  {
    id: 'e-ui-09',
    tokens: [
      { text: '강아지' },
      { correct: '의 꼬리가', wrong: '에 꼬리가', fixedSide: 'right' },
      { text: '살랑살랑' },
      { text: '흔들린다.' }
    ]
  },
  {
    id: 'e-ui-10',
    tokens: [
      { text: '도서관' },
      { correct: '에 누가 있어?', wrong: '의 누가 있어?', fixedSide: 'left' }
    ]
  },
  {
    id: 'e-ui-11',
    tokens: [
      { text: '나무' },
      { correct: '에 벌레가 있다.', wrong: '의 벌레가 있다.', fixedSide: 'left' }
    ]
  },
  {
    id: 'e-ui-12',
    tokens: [
      { text: '오늘' },
      { correct: '의 날씨는', wrong: '에 날씨는', fixedSide: 'right' },
      { text: '따뜻하다.' }
    ]
  },
  {
    id: 'e-ui-13',
    tokens: [
      { text: '냉장고' },
      { correct: '에 주스가 있다.', wrong: '의 주스가 있다.', fixedSide: 'left' }
    ]
  },
  {
    id: 'e-ui-14',
    tokens: [
      { text: '누구' },
      { correct: '의 강아지야?', wrong: '에 강아지야?', fixedSide: 'right' }
    ]
  },
  {
    id: 'e-ui-15',
    tokens: [
      { text: '가방' },
      { correct: '에 있는', wrong: '의 있는', fixedSide: 'left' },
      { text: '물건을' },
      { text: '꺼냈다.' }
    ]
  },
  {
    id: 'e-ui-16',
    tokens: [
      { text: '냉장고' },
      { correct: '의 주인은', wrong: '에 주인은', fixedSide: 'right' },
      { text: '누구?' }
    ]
  },
  {
    id: 'e-ui-17',
    tokens: [
      { text: '우리' },
      { correct: '의 소원은', wrong: '에 소원은', fixedSide: 'right' },
      { text: '통일.' }
    ]
  },
  {
    id: 'e-ui-18',
    tokens: [
      { text: '하늘' },
      { correct: '의 빛깔은', wrong: '에 빛깔은', fixedSide: 'right' },
      { text: '온통' },
      { text: '파랑.' }
    ]
  },
  {
    id: 'e-ui-19',
    tokens: [
      { text: '도서관' },
      { correct: '의 전설을', wrong: '에 전설을', fixedSide: 'right' },
      { text: '들었어?' }
    ]
  },
  {
    id: 'e-ui-20',
    tokens: [
      { text: '나무' },
      { correct: '의 둘레가', wrong: '에 둘레가', fixedSide: 'right' },
      { text: '한아름이다.' }
    ]
  },
  {
    id: 'e-ui-21',
    tokens: [
      { text: '원' },
      { correct: '의 지름은', wrong: '에 지름은', fixedSide: 'right' },
      { text: '반지름' },
      { correct: '의 2배다.', wrong: '에 2배다.', fixedSide: 'right' },
    ]
  }
];

// 학습 모달 콘텐츠 (마당 시작 시 + 오답 시 공통 노출, 주제마다 달라지므로 해당 주제 파일에 위치)
// lines: 각 줄을 세그먼트 배열로 표현. emph 없는 세그먼트는 기본 텍스트, 있으면 강조 스타일 적용.
// emph: 'blue' → 강조(짙은 파랑, 굵게/크게), 'red' → 강조(짙은 빨강, 굵게/크게)
export const E_UI_GUIDE = {
  title: '에 / 의 구별법',
  lines: [
    [
      { text: '에', emph: 'blue' }, { text: ": 무엇이 있는 " },
      { text: ' 위치', emph: 'blue' }, { text: " 뒤에" }
    ],
    [
      { text: '의', emph: 'red' }, { text: ": 무엇을 " },
      { text: '가진', emph: 'red' }, { text: " 대상 뒤에" }
    ]
  ]
};