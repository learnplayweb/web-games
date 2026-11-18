// characters v0.3.0 : play/playPreset에 duration 덮어쓰기·onEnd 콜백 추가, play가 재생 여부(true/false)를 돌려줌
// motionPlayer.js
// - 게임·상점은 이 엔진으로 캐릭터 동작을 재생한다. 동작 정의는 motions.js(등록부)에 있다.
//
// 사용법
//   const player = createMotionPlayer(svgElement, { getEquip: () => ({ head, body, legs, color, colorMix }) });
//   player.play('correct');                         // 이벤트에 등록된 프리셋 중 하나를 무작위로 재생. 재생했으면 true, 등록된 프리셋이 없으면 false
//   player.play('spelling:jump', { duration: 260 }); // 게임 흐름이 동작 길이에 맞물려 있으면 게임 쪽 길이로 덮어쓸 수 있음
//   player.play('shop:touch', { onEnd: () => {} }); // 기본 상태로 복귀가 끝나면 호출 (연타 방지 해제 등)
//   player.playPreset('correct-basic');             // 프리셋 id로 재생
//   player.applyCombo({ eyes: 'correct', body: 'bounce' }, { duration: 600 }); // 등록 없이 바로 조합 (프리뷰 테스트용)
//   player.reset();                                 // 기본 상태로 즉시 복귀
//
// Public API
// - createMotionPlayer(svgElement, options)
//   · play(eventName), playPreset(id), applyCombo(combo, { duration }), reset(), syncState(combo), getEvents()

import { renderCharacterSvg, setCharacterMotions, setCharacterFace } from './characterRenderer.js';
import { PRESETS, IDLE_COMBO } from './motions.js';

export function createMotionPlayer(svgElement, options = {}) {
  const {
    getEquip = () => ({}),            // 현재 장착 상태 (눈·입을 바꿀 때 다시 그리기 위해 필요)
    presets = PRESETS,
    render = renderCharacterSvg,      // 테스트에서 바꿔 끼울 수 있게 주입 가능 (아직 그려지지 않았을 때만 사용되는 전체 렌더링)
    setMotions = setCharacterMotions,
    setFace = setCharacterFace,       // 눈·입 슬롯만 교체
    random = Math.random,
  } = options;

  let current = { ...IDLE_COMBO };    // 지금 화면에 적용된 조합
  // 가장 최근에 요청한 눈·입. 요청이 겹칠 때(앞 요청이 아직 그리는 중) 바뀌었는지는 이 값과 비교해야 마지막 요청이 이긴다
  let faceTarget = { eyes: IDLE_COMBO.eyes, mouth: IDLE_COMBO.mouth };
  let revertTimer = null;             // 기본 상태로 돌아가는 타이머
  let requestId = 0;                  // 새 요청이 오면 이전 요청의 뒤처리(복귀 타이머 등)를 무효화
  const lastPickedByEvent = new Map();
  const warnedEvents = new Set();

  const motionsOf = (combo) => ({ body: combo.body, arms: combo.arms, legs: combo.legs });

  // 조합을 적용한다. duration(ms)이 있으면 그 시간 뒤 기본(idle)으로 복귀한다.
  async function applyCombo(combo, { duration, onEnd } = {}) {
    const next = { ...IDLE_COMBO, ...combo }; // 지정하지 않은 슬롯은 idle
    clearTimeout(revertTimer);
    const myRequest = ++requestId;

    try {
      const face = {};
      if (next.eyes !== faceTarget.eyes) face.eyes = next.eyes;
      if (next.mouth !== faceTarget.mouth) face.mouth = next.mouth;
      faceTarget = { eyes: next.eyes, mouth: next.mouth };

      if (Object.keys(face).length > 0) {
        // 눈·입이 바뀌면 그 슬롯만 교체한다. 아직 그려지지 않은 상태면(false) 전체를 그린다
        const swapped = await setFace(svgElement, face);
        if (myRequest !== requestId) return; // 기다리는 동안 더 새로운 요청이 들어왔으면 그쪽이 우선
        if (swapped) {
          setMotions(svgElement, motionsOf(next));
        } else {
          await render(svgElement, { ...getEquip(), eyes: next.eyes, mouth: next.mouth, motions: motionsOf(next) });
        }
      } else {
        setMotions(svgElement, motionsOf(next)); // 동작만 바뀌면 클래스만 교체 (즉시)
      }
    } catch (error) {
      console.error('캐릭터 동작 적용 중 오류:', error);
      return;
    }

    if (myRequest !== requestId) return; // 렌더링 중 더 새로운 요청이 들어왔으면 그쪽이 우선
    current = next;

    if (duration > 0) {
      revertTimer = setTimeout(async () => {
        if (myRequest !== requestId) return; // 그 사이 새 동작이 시작됐으면 복귀하지 않음
        await applyCombo(IDLE_COMBO);
        onEnd?.(); // 기본 상태로 복귀가 끝남
      }, duration);
    }
  }

  function reset() {
    return applyCombo(IDLE_COMBO);
  }

  // 화면이 이 엔진 밖에서 바뀌었을 때(프리뷰에서 직접 파츠를 다시 그린 경우 등) 엔진이 알고 있는 현재 상태를 맞춘다
  function syncState(combo) {
    clearTimeout(revertTimer);
    requestId += 1;
    current = { ...IDLE_COMBO, ...combo };
    faceTarget = { eyes: current.eyes, mouth: current.mouth };
  }

  // options.duration: 프리셋의 길이 대신 쓸 값(ms). options.onEnd: 기본 상태로 복귀가 끝나면 호출
  function playPreset(id, options = {}) {
    const preset = presets.find((item) => item.id === id);
    if (!preset) {
      console.warn(`등록되지 않은 프리셋: ${id}`);
      return Promise.resolve(false);
    }
    return applyCombo(preset, { duration: options.duration ?? preset.duration, onEnd: options.onEnd }).then(() => true);
  }

  // 이벤트에 등록된 프리셋 중 하나를 무작위로 재생 (같은 프리셋이 연속으로 나오지 않게)
  function play(eventName, options = {}) {
    const candidates = presets.filter((item) => item.enabled !== false && item.events?.includes(eventName));
    if (candidates.length === 0) {
      if (!warnedEvents.has(eventName)) {
        warnedEvents.add(eventName);
        console.warn(`'${eventName}' 이벤트에 등록된 프리셋이 없습니다 (motions.js의 PRESETS 확인)`);
      }
      return Promise.resolve(false);
    }
    const lastId = lastPickedByEvent.get(eventName);
    const pool = candidates.length > 1 ? candidates.filter((item) => item.id !== lastId) : candidates;
    const picked = pool[Math.floor(random() * pool.length)];
    lastPickedByEvent.set(eventName, picked.id);
    return applyCombo(picked, { duration: options.duration ?? picked.duration, onEnd: options.onEnd }).then(() => true);
  }

  // 등록된(사용 가능한) 이벤트 이름 목록
  function getEvents() {
    const names = new Set();
    presets.filter((item) => item.enabled !== false).forEach((item) => item.events?.forEach((name) => names.add(name)));
    return [...names].sort();
  }

  return { play, playPreset, applyCombo, reset, syncState, getEvents };
}
