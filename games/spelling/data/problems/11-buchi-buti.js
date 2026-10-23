export const BUCHI_BUTI_PROBLEMS = [
  {
    id: 'buchi-buti-01',
    tokens: [
      { text: '상자에' },
      { text: '주소를' },
      { correct: '붙이고', wrong: '부치고', fixedSide: 'right' },
      { text: '친구에게' },
      { text: '택배를' },
      { correct: '부쳤다.', wrong: '붙였다.', fixedSide: 'left' }
    ]
  },
  {
    id: 'buchi-buti-02',
    tokens: [
      { text: '봉투에' },
      { text: '우표를' },
      { correct: '붙이고', wrong: '부치고', fixedSide: 'right' },
      { text: '편지를' },
      { correct: '부쳤다.', wrong: '붙였다.', fixedSide: 'left' }
    ]
  },
  {
    id: 'buchi-buti-03',
    tokens: [
      { text: '칭찬' },
      { text: '스티커가' },
      { correct: '붙여졌다.', wrong: '부쳐졌다.', fixedSide: 'right' }
    ]
  },
  {
    id: 'buchi-buti-04',
    tokens: [
      { text: '벽에' },
      { text: '포스터를' },
      { correct: '붙였다.', wrong: '부쳤다.', fixedSide: 'right' }
    ]
  },
  {
    id: 'buchi-buti-05',
    tokens: [
      { text: '이름표를' },
      { text: '옷에' },
      { correct: '붙이고', wrong: '부치고', fixedSide: 'right' },
      { text: '앉았다.' }
    ]
  },
  {
    id: 'buchi-buti-06',
    tokens: [
      { text: '냉장고에' },
      { correct: '붙인', wrong: '부친', fixedSide: 'right' },
      { text: '메모를' },
      { text: '봤다.' }
    ]
  },
  {
    id: 'buchi-buti-07',
    tokens: [
      { text: '돈을' },
      { correct: '부쳐', wrong: '붙여', fixedSide: 'left' },
      { text: '주세요.' }
    ]
  },
  {
    id: 'buchi-buti-08',
    tokens: [
      { text: '시험지를' },
      { text: '공책에' },
      { correct: '붙여라.', wrong: '부쳐라.', fixedSide: 'right' }
    ]
  },
  {
    id: 'buchi-buti-09',
    tokens: [
      { text: '작품은' },
      { text: '게시판에' },
      { correct: '붙여요.', wrong: '부쳐요.', fixedSide: 'right' }
    ]
  },
  {
    id: 'buchi-buti-10',
    tokens: [
      { text: '창문에' },
      { text: '단열재를' },
      { correct: '붙였더니', wrong: '부쳤더니', fixedSide: 'right' },
      { text: '따뜻하다.' }
    ]
  },
  {
    id: 'buchi-buti-11',
    tokens: [
      { text: '부모님께' },
      { text: '용돈을' },
      { correct: '부쳐', wrong: '붙여', fixedSide: 'left' },
      { text: '드렸다.' }
    ]
  },
  {
    id: 'buchi-buti-12',
    tokens: [
      { text: '게시판에' },
      { text: '안내문이' },
      { correct: '붙여져', wrong: '부쳐져', fixedSide: 'right' },
      { text: '있다.' }
    ]
  },
  {
    id: 'buchi-buti-13',
    tokens: [
      { text: '짐을' },
      { correct: '부치기', wrong: '붙이기', fixedSide: 'left' },
      { text: '위해' },
      { text: '무게를' },
      { text: '재었다.' }
    ]
  },
  {
    id: 'buchi-buti-14',
    tokens: [
      { text: '문에' },
      { text: '장식을' },
      { correct: '붙이자.', wrong: '부치자.', fixedSide: 'right' },
    ]
  },
  {
    id: 'buchi-buti-15',
    tokens: [
      { text: '엽서를' },
      { correct: '부치러', wrong: '붙이러', fixedSide: 'left' },
      { text: '우체통에' },
      { text: '간다.' }
    ]
  }
  ];

// 학습 모달 콘텐츠 (마당 시작 시 + 오답 시 공통 노출, 주제마다 달라지므로 해당 주제 파일에 위치)
// lines: 각 줄을 세그먼트 배열로 표현. emph 없는 세그먼트는 기본 텍스트, 있으면 강조 스타일 적용.
// emph: 'blue' → 강조(짙은 파랑, 굵게/크게), 'red' → 강조(짙은 빨강, 굵게/크게)
export const BUCHI_BUTI_GUIDE = {
  title: '부치다 / 붙이다 구별법',
  lines: [
    [
      { text: '부치다', emph: 'blue' }, { text: ": 물건 등을 " }, { text: '보내다', emph: 'blue' }
    ],
    [
      { text: '붙이다', emph: 'red' }, { text: ": " }, { text: '떨어지지 않게', emph: 'red' }, { text: " 하다" }
    ]
  ]
};