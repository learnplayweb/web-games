// characters v0.2.0 : 맞춤법 게임(spelling:*)·상점 터치(shop:touch) 기본 프리셋 추가
// motions.js
// - 캐릭터 동작을 한 곳에서 등록하는 파일. 게임·상점은 이 파일을 직접 읽지 않고 motionPlayer.js의 play('이벤트')로 부른다.
//
// [슬롯 5개] 한 번의 동작 = 아래 5개 슬롯을 하나씩 고른 조합
//   eyes  : 눈 이미지 키  (characterData.js의 FACE_ASSETS.eyes 키. 키를 추가하면 자동으로 선택 가능)
//   mouth : 입 이미지 키  (FACE_ASSETS.mouth 키)
//   body  : 머리(눈·입 포함) + 상체 + 하체가 함께 움직이는 동작 이름
//   arms  : 좌우 팔 동작 이름
//   legs  : 좌우 다리 동작 이름
//   (프리셋에서 지정하지 않은 슬롯은 'idle'로 처리된다)
//
// [새 동작 추가 방법]
//   1) 새 눈·입 표정: SVG 에셋을 만들고 characterData.js의 FACE_ASSETS에 키를 추가 (이 파일은 수정 불필요)
//   2) 새 몸·팔·다리 동작: character-anim.css에 keyframes와 .state-<이름>, .mo-body-/.mo-arms-/.mo-legs-<이름> 규칙을 만들고
//      아래 BODY_MOTIONS / ARM_MOTIONS / LEG_MOTIONS 목록에 이름을 추가
//   3) 자주 쓰는 조합: PRESETS에 한 줄 추가 (프리뷰 화면의 "등록용 코드 복사"로 만들 수 있음)
//
// [프리셋 항목]
//   id        고유 이름
//   label     화면 표시용 이름
//   eyes, mouth, body, arms, legs   슬롯 값 (생략하면 'idle')
//   duration  재생 시간(ms). 이 시간이 지나면 기본(idle)으로 돌아옴. 0이면 돌아오지 않고 유지. 현재 동작은 모두 무한 반복이라 타이머 방식 사용
//             (게임 흐름이 동작 길이와 맞물려 있으면 게임 쪽에서 play('이벤트', { duration })으로 덮어쓴다)
//   events    이 프리셋을 쓰는 이벤트 이름 목록. 이벤트 이름은 미리 정해 둔 목록이 없고 여기에 적으면 등록됨
//             (공용은 'correct'처럼, 게임 전용은 'spelling:jump'처럼 앞에 게임 이름을 붙이는 것을 권장)
//   enabled   false로 두면 모든 게임에서 제외 (삭제하지 않고 잠시 끄기). 생략하면 true
//   같은 이벤트에 프리셋이 여러 개면 동일한 확률로 무작위 선택하고, 같은 프리셋이 연속으로 나오지 않게 한다.

import { FACE_ASSETS } from './characterData.js';

// character-anim.css에 정의된 동작 이름 (CSS와 이름이 같아야 함)
export const BODY_MOTIONS = Object.freeze(['idle', 'correct', 'wrong', 'wiggle', 'bounce', 'squish', 'sway', 'breathe']);
export const ARM_MOTIONS = Object.freeze(['idle', 'correct', 'wrong', 'wiggle', 'bounce', 'squish', 'sway', 'breathe']);
export const LEG_MOTIONS = Object.freeze(['idle', 'correct', 'wrong', 'wiggle', 'bounce', 'squish', 'sway', 'breathe']);

// 눈·입 키는 FACE_ASSETS에서 읽는다 (키 추가 시 코드 수정 불필요)
export const getEyeKeys = () => Object.keys(FACE_ASSETS.eyes);
export const getMouthKeys = () => Object.keys(FACE_ASSETS.mouth);

// 기본(대기) 조합: 동작이 끝나면 이 상태로 돌아온다
export const IDLE_COMBO = Object.freeze({ eyes: 'idle', mouth: 'idle', body: 'idle', arms: 'idle', legs: 'idle' });

// 상점 터치 반응: 캐릭터를 눌렀을 때 눈·입·동작을 각각 idle/correct/wrong 중 무작위로 3초간 보여 주는 기존 동작과 같은 27조합.
// (눈·입은 서로 독립, 몸·팔·다리는 같은 동작). 마음에 드는 조합만 남기려면 이 블록을 지우고 shop:touch 프리셋을 직접 등록한다.
const SHOP_TOUCH_KEYS = ['idle', 'correct', 'wrong'];
const SHOP_TOUCH_PRESETS = SHOP_TOUCH_KEYS.flatMap((eyes) => SHOP_TOUCH_KEYS.flatMap((mouth) => SHOP_TOUCH_KEYS.map((motion) => ({
  id: `shop-touch-${eyes}-${mouth}-${motion}`,
  label: `상점 터치 (눈 ${eyes}, 입 ${mouth}, 동작 ${motion})`,
  eyes, mouth, body: motion, arms: motion, legs: motion,
  duration: 3000, events: ['shop:touch'], enabled: true,
}))));

// 프리셋 등록부 (필요할 때 한 줄씩 추가)
export const PRESETS = Object.freeze([
  // 현재 시계·맞춤법 게임이 쓰는 정답/오답 반응과 같은 기본 프리셋 (필요 없으면 삭제하거나 enabled: false)
  { id: 'correct-basic', label: '정답 기본', eyes: 'correct', mouth: 'correct', body: 'correct', arms: 'correct', legs: 'correct', duration: 600, events: ['correct'], enabled: true },
  { id: 'wrong-basic', label: '오답 기본', eyes: 'wrong', mouth: 'wrong', body: 'wrong', arms: 'wrong', legs: 'wrong', duration: 600, events: ['wrong'], enabled: true },

  // 맞춤법 게임 (길이는 게임 흐름에 맞춰 script.js에서 덮어쓴다: 점프 260, 조작 실수 추락 1600(달인·무한 마당의 오답 추락은 500), 일반 마당 오답 플래시 400)
  { id: 'spelling-jump', label: '맞춤법 점프', eyes: 'idle', mouth: 'idle', body: 'correct', arms: 'correct', legs: 'correct', duration: 260, events: ['spelling:jump'], enabled: true },
  { id: 'spelling-fall', label: '맞춤법 추락(조작 실수·달인 마당 오답)', eyes: 'wrong', mouth: 'wrong', body: 'correct', arms: 'correct', legs: 'correct', duration: 1600, events: ['spelling:fall'], enabled: true },
  { id: 'spelling-flash', label: '맞춤법 오답 플래시(일반 마당 오답)', eyes: 'wrong', mouth: 'wrong', body: 'wrong', arms: 'wrong', legs: 'wrong', duration: 400, events: ['spelling:flash'], enabled: true },

  ...SHOP_TOUCH_PRESETS,
]);
