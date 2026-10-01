export const MAE_ME_PROBLEMS = [
  
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