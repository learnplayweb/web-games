export const DAERO_DERO_PROBLEMS = [
  
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