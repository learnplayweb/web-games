export const MATCHU_MACHI_PROBLEMS = [
  
];

// 학습 모달 콘텐츠 (마당 시작 시 + 오답 시 공통 노출, 주제마다 달라지므로 해당 주제 파일에 위치)
// lines: 각 줄을 세그먼트 배열로 표현. emph 없는 세그먼트는 기본 텍스트, 있으면 강조 스타일 적용.
// emph: 'blue' → 강조(짙은 파랑, 굵게/크게), 'red' → 강조(짙은 빨강, 굵게/크게)
export const MATCHU_MACHI_GUIDE = {
  title: '맞추다 / 맞히다 구별법',
  lines: [
    [
      { text: "맞" }, { text: '추', emph: 'blue' }, { text: "다: 제자리에 " }, { text: '붙이다', emph: 'blue' }, { text: "," }
    ],
    [
      { text: "나란히 놓고 " }, { text: '비교', emph: 'blue' }, { text: "하다" }
    ],
    [
      { text: "맞" }, { text: '히', emph: 'red' }, { text: "다: " }, { text: '옳은 답', emph: 'red' },  { text: "을 하다," }
    ],
    [
      { text: '겨냥', emph: 'red' }, { text: "한 곳에 " }, { text: '맞게', emph: 'red' },  { text: " 하다" }
    ]
  ]
};