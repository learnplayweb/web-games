// v0.3.0
// Spelling Game - 문제은행 : 되/돼
// - 문제은행 기본 단위는 문장. 문장은 tokens 배열로 표현하며 선택 지점을 인라인으로 포함해
//   "문장 내부 선택 지점이 분리되지 않는다"는 요구를 구조적으로 보장한다.
// - 문장 수 제한 없음. 필요할 때마다 이 배열에 문제를 추가하면 된다.
// - 좌우 고정 규칙 : '되' 계열(되/된/됬) → 왼쪽, '돼' 계열(돼/됐/됀) → 오른쪽.
//   따라서 정답이 어느 계열이냐에 따라 fixedSide 값이 문항마다 달라짐(항상 왼쪽 고정 아님).
//
// tokens 요소 형식
// - { text }                          : 고정 텍스트 (선택 지점 아님)
// - { correct, wrong, fixedSide }     : 선택 지점. fixedSide는 correct가 놓일 위치('left'|'right')
//
// 한 문장에 선택 지점이 여러 개 있을 수 있음 (예: doe-dwae-08)

export const DOE_DWAE_PROBLEMS = [
  {
    id: 'doe-dwae-01',
    tokens: [
      { text: '멋쟁이가' },
      { correct: '되고', wrong: '돼고', fixedSide: 'left' }, // 되 계열 → 왼쪽
      { text: '싶어.' }
    ]
  },
  {
    id: 'doe-dwae-02',
    tokens: [
      { text: '늦으면' },
      { text: '안' },
      { correct: '돼.', wrong: '되.', fixedSide: 'right' } // 돼 계열 → 오른쪽
    ]
  },
  {
    id: 'doe-dwae-03',
    tokens: [
      { text: '밥' },
      { text: '다' },
      { correct: '됐나?', wrong: '됬나?', fixedSide: 'right' } // 됐(돼 계열) → 오른쪽
    ]
  },
  {
    id: 'doe-dwae-04',
    tokens: [
      { text: '준비가' },
      { text: '다' },
      { correct: '되었어.', wrong: '돼었어.', fixedSide: 'left' } // 되 계열 → 왼쪽
    ]
  },
  {
    id: 'doe-dwae-05',
    tokens: [
      { text: '이제' },
      { text: '집에' },
      { text: '가도' },
      { correct: '돼.', wrong: '되.', fixedSide: 'right' } // 돼 계열 → 오른쪽
    ]
  },
  {
    id: 'doe-dwae-06',
    tokens: [
      { text: '착한' },
      { text: '사람이' },
      { correct: '돼라.', wrong: '되라.', fixedSide: 'right' } // 돼 계열 → 오른쪽
    ]
  },
  {
    id: 'doe-dwae-07',
    tokens: [
      { text: '숙제를' },
      { text: '해야' },
      { correct: '돼요.', wrong: '되요.', fixedSide: 'right' } // 돼 계열 → 오른쪽
    ]
  },
  {
    id: 'doe-dwae-08',
    tokens: [
      { text: '스스로' },
      { correct: '됐다고', wrong: '됬다고', fixedSide: 'right' }, // 됐(돼 계열) → 오른쪽
      { text: '할' },
      { text: '때까지' },
      { correct: '된', wrong: '됀', fixedSide: 'left' }, // 된(되 계열) → 왼쪽
      { text: '게' },
      { text: '아니야.' }
    ]
  },
  {
    id: 'doe-dwae-09',
    tokens: [
      { text: '그러면' },
      { text: '안' },
      { correct: '되지.', wrong: '돼지.', fixedSide: 'left' } // 되 계열 → 왼쪽
    ]
  },
  {
    id: 'doe-dwae-10',
    tokens: [
      { text: '그렇게' },
      { text: '하면' },
      { correct: '돼?', wrong: '되?', fixedSide: 'right' } // 돼 계열 → 오른쪽
    ]
  },
  {
    id: 'doe-dwae-11',
    tokens: [
    { text: '열심히' },
    { text: '했다면' },
    { text: '잘' },
    { correct: '될', wrong: '됄', fixedSide: 'left' },
    { text: '거야.' }
  ]
},
{
  id: 'doe-dwae-12',
  tokens: [
    { text: '오늘은' },
    { text: '여기까지' },
    { text: '해도' },
    { correct: '돼.', wrong: '되.', fixedSide: 'right' }
  ]
},
{
    id: 'doe-dwae-13',
    tokens: [
      { text: '그러면' },
      { text: '절대' },
      { text: '안' },
      { correct: '된다고', wrong: '됀다고', fixedSide: 'left' },
      { text: '하셨어.' }
    ]
},
  {
    id: 'doe-dwae-14',
    tokens: [
      { text: '그렇게' },
      { correct: '될 줄', wrong: '됄 줄', fixedSide: 'left' }, 
      { text: '몰라서' },
      { text: '이렇게' },
      { correct: '됐네.', wrong: '됬네.', fixedSide: 'right' }
    ]
  },
  {
    id: 'doe-dwae-15',
    tokens: [
      { text: '준비가' },
      { correct: '됐다면', wrong: '됬다면', fixedSide: 'right' },
      { text: '바로' },
      { text: '시작하자.' }
    ]
  },
    {
    id: 'doe-dwae-16',
    tokens: [
      { text: '맞춤법을' },
      { text: '틀리면' },
      { correct: '되겠어요?', wrong: '돼겠어요?', fixedSide: 'left' },
    ]
  },{
    id: 'doe-dwae-17',
    tokens: [
      { text: '일이' },
      { text: '잘' },
      { correct: '되어간다.', wrong: '돼어간다.', fixedSide: 'left' },
    ]
  },
  {
    id: 'doe-dwae-18',
    tokens: [
      { text: '일이' },
      { text: '잘' },
      { correct: '돼간다.', wrong: '되간다.', fixedSide: 'right' },
    ]
  },
  {
    id: 'doe-dwae-19',
    tokens: [
      { text: '어른이' },
      { correct: '되면.', wrong: '돼면', fixedSide: 'left' },
      { text: '무엇이' },
      { correct: '될까?', wrong: '됄까?', fixedSide: 'left' },
    ]
  },
];

// 학습 모달 콘텐츠 (마당 시작 시 + 오답 시 공통 노출, 주제마다 달라지므로 해당 주제 파일에 위치)
// lines: 각 줄을 세그먼트 배열로 표현. emph 없는 세그먼트는 기본 텍스트, 있으면 강조 스타일 적용.
// emph: 'blue' → 되/하 강조(짙은 파랑, 굵게/크게), 'red' → 돼/해 강조(짙은 빨강, 굵게/크게)
export const DOE_DWAE_GUIDE = {
  title: '되 / 돼 구별법',
  lines: [
    [
      { text: "'" }, { text: '되', emph: 'blue' }, { text: "' 자리에 '" },
      { text: '하', emph: 'blue' }, { text: "'를," }
    ],
    [
      { text: "'" }, { text: '돼', emph: 'red' }, { text: "' 자리에 '" },
      { text: '해', emph: 'red' }, { text: "'를" }
    ],
    [
      { text: '넣어 말이 되는지 살피기' }
    ]
  ]
};