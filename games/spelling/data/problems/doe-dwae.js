// v0.1.0
// Spelling Game - 문제은행 : 되/돼
// - 문제은행 기본 단위는 문장. 문장은 tokens 배열로 표현하며 선택 지점을 인라인으로 포함해
//   "문장 내부 선택 지점이 분리되지 않는다"는 요구를 구조적으로 보장한다.
// - 문장 수 제한 없음. 필요할 때마다 이 배열에 문제를 추가하면 된다.
//
// tokens 요소 형식
// - { text }                          : 고정 텍스트 (선택 지점 아님)
// - { correct, wrong, fixedSide? }    : 선택 지점. fixedSide('left'|'right')가 있으면 좌우 고정,
//                                        없으면 런타임에 랜덤 배치 (배치 로직은 이후 단계에서 구현)
//
// 한 문장에 선택 지점이 여러 개 있을 수 있음 (예: doe-dwae-08)

export const DOE_DWAE_PROBLEMS = [
  {
    id: 'doe-dwae-01',
    tokens: [
      { text: '멋쟁이가' },
      { correct: '되고', wrong: '돼고' },
      { text: '싶어.' }
    ]
  },
  {
    id: 'doe-dwae-02',
    tokens: [
      { text: '늦으면' },
      { text: '안' },
      { correct: '돼.', wrong: '되.' }
    ]
  },
  {
    id: 'doe-dwae-03',
    tokens: [
      { text: '밥' },
      { text: '다' },
      { correct: '됐나?', wrong: '됬나?' }
    ]
  },
  {
    id: 'doe-dwae-04',
    tokens: [
      { text: '준비가' },
      { text: '다' },
      { correct: '되었어.', wrong: '됐었어.' }
    ]
  },
  {
    id: 'doe-dwae-05',
    tokens: [
      { text: '이제' },
      { text: '집에' },
      { text: '가도' },
      { correct: '돼.', wrong: '되.' }
    ]
  },
  {
    id: 'doe-dwae-06',
    tokens: [
      { text: '착한' },
      { text: '사람이' },
      { correct: '돼라.', wrong: '되라.' }
    ]
  },
  {
    id: 'doe-dwae-07',
    tokens: [
      { text: '숙제를' },
      { text: '해야' },
      { correct: '돼요.', wrong: '되요.' }
    ]
  },
  {
    id: 'doe-dwae-08',
    tokens: [
      { correct: '됐다고', wrong: '됬다고' },
      { text: '할' },
      { text: '때까지' },
      { correct: '된', wrong: '됀' },
      { text: '게' },
      { text: '아니야.' }
    ]
  },
  {
    id: 'doe-dwae-09',
    tokens: [
      { text: '그러면' },
      { text: '안' },
      { correct: '되지.', wrong: '돼지.' }
    ]
  },
  {
    id: 'doe-dwae-10',
    tokens: [
      { text: '그렇게' },
      { text: '하면' },
      { correct: '돼?', wrong: '되?' }
    ]
  }
];