export const BUD_BUS_PROBLEMS = [
  
];

// 학습 모달 콘텐츠 (마당 시작 시 + 오답 시 공통 노출, 주제마다 달라지므로 해당 주제 파일에 위치)
// lines: 각 줄을 세그먼트 배열로 표현. emph 없는 세그먼트는 기본 텍스트, 있으면 강조 스타일 적용.
// emph: 'blue' → 강조(짙은 파랑, 굵게/크게), 'red' → 강조(짙은 빨강, 굵게/크게)
export const BUD_BUS_GUIDE = {
  title: '붇다 / 붓다 구별법',
  lines: [
    [
      { text: '붇다', emph: 'blue' }, { text: ": 부피가 " }, { text: '커지다', emph: 'blue' }, { text: ", 양이나 수가 " }, { text: '많아지다', emph: 'blue' } 
    ],
    [
      { text: '살', emph: 'red' }, { text: "이 " }, { text: '찌다', emph: 'red' } 
    ],
    [
      { text: "( 불어, 불으니, 붇는, 붇기 )" }
    ],
    [
      { text: '붓다', emph: 'red' }, { text: ": 액체나 가루를 " }, { text: '쏟아 넣다', emph: 'red' }, { text: "," }
    ],
    [
      { text: '몸', emph: 'red' }, { text: "의 부분이 " }, { text: '부풀어 오르다', emph: 'red' } 
    ],
    [
      { text: "( 부어, 부으니, 붓는, 붓기 )" }
    ]
  ]
};