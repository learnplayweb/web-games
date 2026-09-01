// v0.3.4
// effects.js
// - 게임 내 재생: spawnEffect() - 대상 좌표에 매번 랜덤 파티클 생성
// - 상점 썸네일: renderEffectThumbnail()(고정, 정지 프레임) / renderEffectPreview()(랜덤, 반복 미리보기)
//   둘 다 3번째 인자(anchorElement)로 캐릭터 몸통 범위 내 랜덤 위치 지정 가능 (생략 시 컨테이너 정중앙)
// - 정지 화면은 PREVIEW_DISTANCE_SCALE(효과별 previewScale로 override 가능)로 이동거리 축소해 박스 안에 담음
// - setEffectThumbnailActive()로 .active 토글 재생, EFFECT_CONFIG가 전체 설정 소스

export const EFFECT_KEYS = Object.freeze([
  // 단순 (Simple)
  'stardust', 'sparkle', 'ring-burst', 'heart-pop', 'spark',
  'bubble-pop', 'ribbon-scatter', 'cross-flash', 'falling-leaf', 'water-drop',
  'spark-shower',
  // 화려 (Fancy)
  'firework-launch', 'spiral-whirl', 'flame-chain', 'shooting-star', 'mega-ring-burst',
  'confetti-burst', 'vortex-blast', 'laser-volley', 'cross-laser',
]);

// shape: effects.css의 .fx__particle--{shape} 클래스와 매칭 (배열이면 인덱스별로 순환 사용)
// angleMode: 'radial' | 'upward' | 'downward' | 'horizontal' | 'diagonal'
const EFFECT_CONFIG = {
  // --- 단순 ---
  stardust: { shape: 'star', count: [5, 8], size: [8, 12], distance: [24, 38], angleMode: 'radial', colors: ['#ffffff', '#fff6b3', '#ffe27a'] },
  sparkle: { shape: 'sparkle', count: [8, 12], size: [3, 6], distance: [20, 34], angleMode: 'radial', colors: ['#ffffff', '#bfe6ff', '#fff6b3'] },
  'heart-pop': { shape: 'heart', count: [4, 6], size: [8, 12], distance: [16, 26], angleMode: 'upward', colors: ['#ff8fab', '#ffb3c6', '#ffffff'] },
  spark: { shape: 'spark', count: [6, 10], length: [12, 18], thickness: [2, 3], angleMode: 'radial', colors: ['#ffffff', '#ffe27a', '#bfe6ff'] },
  'bubble-pop': { shape: 'bubble', count: [5, 8], size: [6, 14], distance: [18, 30], angleMode: 'radial', colors: ['#bfe6ff', '#e0f7ff', '#ffffff'] },
  'ribbon-scatter': { shape: 'ribbon', count: [6, 9], size: [10, 16], distance: [22, 34], angleMode: 'horizontal', colors: ['#ffd166', '#ff8fab', '#8ecae6'] },
  'falling-leaf': { shape: 'leaf', count: [5, 7], size: [8, 12], distance: [20, 30], angleMode: 'downward', colors: ['#b7e4a0', '#8fce6a', '#d8f28d'] },
  'water-drop': { shape: 'drop', count: [5, 8], size: [6, 10], distance: [18, 28], angleMode: 'downward', colors: ['#bfe6ff', '#8ecae6', '#ffffff'] },
  'spark-shower': { shape: 'ember', count: [6, 8], size: [10, 16], dx: [-30, 30], rise: [-60, -45], fall: [40, 55], colors: ['#ffe066', '#ff9f1c', '#ffffff'], previewScale: 0.35 },

  // --- 화려 ---
  'firework-launch': { shape: 'firework', count: [5, 7], size: [6, 9], distance: [55, 75], angleMode: 'radial', colors: ['#ff6b6b', '#ffd93d', '#4dd4ac'], previewScale: 0.3 },
  'spiral-whirl': { shape: 'spiral', count: [5, 7], size: [5, 8], distance: [50, 70], angleMode: 'radial', colors: ['#c77dff', '#7b2ff7', '#5ee7df'] },
  'flame-chain': { shape: 'flame', count: [4, 5], size: [7, 10], distance: [45, 60], angleMode: 'radial', colors: ['#ff9f1c', '#ff4d4d', '#ffd23f'], staggered: true },
  'shooting-star': { shape: 'comet', count: [3, 4], length: [26, 34], thickness: [3, 4], distance: [70, 90], angleMode: 'diagonal', colors: ['#ffffff', '#bfe6ff', '#ffd93d'] },
  'confetti-burst': { shape: ['confetti-rect', 'confetti-tri'], count: [7, 9], size: [8, 12], distance: [50, 70], angleMode: 'radial', colors: ['#ff6b6b', '#ffd93d', '#4dd4ac', '#6bc1ff'] },
  'vortex-blast': { shape: 'vortex', count: [6, 8], size: [5, 8], distance: [55, 75], angleMode: 'radial', colors: ['#4cc9f0', '#4361ee', '#7209b7'] },
  'laser-volley': { shape: 'laser', count: [5, 7], length: [40, 55], thickness: [3, 4], angleMode: 'radial', colors: ['#ff006e', '#8338ec', '#3a86ff'], staggered: true },
};

const RING_COLORS = ['#d5fdfaf3', '#a1f8f2f3', '#fff6b3'];
const CROSS_COLORS = ['#fff6b3', '#bfe6ff', '#ffb3c6'];
const MEGA_RING_COLORS = ['#ffffff', '#bfe6ff'];
const CROSS_LASER_COLORS = ['#ff006e', '#8338ec', '#3a86ff', '#ffbe0b'];

const CLEANUP_FALLBACK_MS = 750; // 안전망 (mega-ring 트레일 0.68s 종료분 여유 포함)

// staggered 효과(불꽃 연쇄, 레이저 발사)의 전체 종료 시점을 0.6s로 맞추기 위한 상수
const STAGGER_TOTAL_S = 0.6; // 기존 .fx__particle의 animation-duration과 동일
const STAGGER_MIN_DURATION_S = 0.28; // 가장 늦게 시작하는 파티클도 이 정도는 눈에 보이게 확보

// 정지 화면(deterministic) 전용: 화려한 효과는 distance/rise가 커서 80x80 썸네일 박스를
// 벗어나 잘려 보이지 않는 문제가 있었다. 정지 화면일 때만 이동 거리를 축소해 박스 안에 담는다.
// (실제 게임 재생/반복 미리보기는 원래 거리 그대로 유지되어 화려함이 줄지 않는다)
// 효과별로 더 강하게 줄여야 하면 EFFECT_CONFIG에 previewScale을 개별 지정해 이 기본값을 덮어쓴다.
const PREVIEW_DISTANCE_SCALE = 0.55;

/** spawnEffect(targetElement: HTMLElement, effectKey: string): void */
export function spawnEffect(targetElement, effectKey) {
  if (!targetElement) return;

  const rect = targetElement.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  const layer = document.createElement('div');
  layer.className = `fx fx--${effectKey}`;
  layer.style.left = `${centerX}px`;
  layer.style.top = `${centerY}px`;

  mount(layer, effectKey, { deterministic: false });

  document.body.appendChild(layer);
  scheduleCleanup(layer);
}

/** renderEffectThumbnail(container: HTMLElement, effectKey: string, anchorElement?: HTMLElement): void */
export function renderEffectThumbnail(container, effectKey, anchorElement) {
  mountAtAnchor(container, effectKey, { deterministic: true }, anchorElement);
}

/** renderEffectPreview(container: HTMLElement, effectKey: string, anchorElement?: HTMLElement): void */
export function renderEffectPreview(container, effectKey, anchorElement) {
  mountAtAnchor(container, effectKey, { deterministic: false }, anchorElement);
}

// container 안에 위치 계산용 anchor(0x0, position:absolute)를 만들어 그 자리에 파티클을 그림.
// anchorElement가 주어지면 그 엘리먼트의 몸통 범위(viewBox 0 0 160 300 기준 x:35~125, y:20~180)
// 안에서 매번 랜덤한 지점을 골라 anchor를 그 좌표로 옮긴다. 생략 시 container 정중앙(기존 동작).
function mountAtAnchor(container, effectKey, options, anchorElement) {
  if (!container) return;
  container.replaceChildren();
  container.className = `ui-eff ui-eff--${effectKey}`;

  const anchor = document.createElement('span');
  anchor.style.position = 'absolute';
  anchor.style.width = '0';
  anchor.style.height = '0';
  positionAnchor(container, anchor, anchorElement);
  container.appendChild(anchor);

  mount(anchor, effectKey, options);
}

function positionAnchor(container, anchor, anchorElement) {
  if (!anchorElement) {
    anchor.style.left = '50%';
    anchor.style.top = '50%';
    return;
  }
  const containerRect = container.getBoundingClientRect();
  const targetRect = anchorElement.getBoundingClientRect();
  // 캐릭터 몸통 범위 비율: viewBox 0 0 160 300 기준 x=35~125(21.9%~78.1%), y=20~180(6.7%~60%)
  const pointX = targetRect.left + targetRect.width * (0.219 + Math.random() * 0.562);
  const pointY = targetRect.top + targetRect.height * (0.067 + Math.random() * 0.533);
  anchor.style.left = `${pointX - containerRect.left}px`;
  anchor.style.top = `${pointY - containerRect.top}px`;
}

/** setEffectThumbnailActive(container: HTMLElement, isActive: boolean): void */
export function setEffectThumbnailActive(container, isActive) {
  if (!container) return;
  if (!isActive) {
    container.classList.remove('active');
    return;
  }
  container.classList.remove('active');
  void container.offsetWidth; // eslint-disable-line no-void
  container.classList.add('active');
}

function mount(layer, effectKey, options) {
  if (effectKey === 'ring-burst') {
    buildRing(layer);
  } else if (effectKey === 'cross-flash') {
    buildCross(layer);
  } else if (effectKey === 'mega-ring-burst') {
    buildMegaRing(layer);
  } else if (effectKey === 'cross-laser') {
    buildCrossLaser(layer, options.deterministic);
  } else {
    buildParticles(layer, effectKey, options);
  }
}

function buildRing(layer) {
  const ring = document.createElement('span');
  ring.className = 'fx__ring';
  ring.style.borderColor = pickColor(RING_COLORS, 0);
  layer.appendChild(ring);
}

function buildCross(layer) {
  const cross = document.createElement('span');
  cross.className = 'fx__cross';
  cross.style.color = pickColor(CROSS_COLORS, 0);
  layer.appendChild(cross);
}

function buildMegaRing(layer) {
  const outer = document.createElement('span');
  outer.className = 'fx__ring fx__ring--mega';
  outer.style.borderColor = pickColor(MEGA_RING_COLORS, 0);

  const trail = document.createElement('span');
  trail.className = 'fx__ring fx__ring--mega-trail';
  trail.style.borderColor = pickColor(MEGA_RING_COLORS, 1);

  layer.appendChild(outer);
  layer.appendChild(trail);
}

function buildCrossLaser(layer, deterministic) {
  const barAngles = [0, 45, 90, 135];
  barAngles.forEach((deg, i) => {
    const bar = document.createElement('span');
    bar.className = 'fx__bar';
    bar.style.setProperty('--bar-angle', `${deg}deg`);
    bar.style.color = pickColor(CROSS_LASER_COLORS, i);
    // deterministic(썸네일 정지 화면)일 때는 인라인 delay를 절대 설정하지 않는다.
    // 인라인 스타일은 CSS 클래스 규칙보다 우선순위가 높아서, 여기서 delay를 넣으면
    // .ui-eff 쪽의 정지 프레임용 animation-delay(-0.24s 등)를 덮어써버려 애니메이션이
    // 시작 지점(투명/길이 0) 근처에서 얼어붙는 버그가 있었다.
    if (!deterministic) {
      bar.style.animationDelay = `${i * 0.02}s`;
    }
    layer.appendChild(bar);
  });
}

function buildParticles(layer, effectKey, { deterministic }) {
  const config = EFFECT_CONFIG[effectKey];
  if (!config) return;

  // 상점 썸네일(deterministic)은 항상 동일한 모양이 나오도록 최대 개수 고정 사용,
  // 게임 내 재생은 매번 랜덤 개수 사용
  const count = deterministic ? config.count[1] : randomInt(config.count[0], config.count[1]);

  for (let i = 0; i < count; i += 1) {
    const shapeVariant = Array.isArray(config.shape) ? config.shape[i % config.shape.length] : config.shape;
    const particle = document.createElement('span');
    particle.className = `fx__particle fx__particle--${shapeVariant}`;
    particle.style.background = pickColor(config.colors, i);

    if (shapeVariant === 'ember') {
      setEmberVars(particle, config, i, count, deterministic);
    } else {
      const angle = deterministic
        ? computeStaticAngle(i, count, config.angleMode)
        : computeAngle(i, count, config.angleMode);
      particle.style.setProperty('--angle', `${angle}deg`);

      if (shapeVariant === 'spark' || shapeVariant === 'laser') {
        setBarSize(particle, config, deterministic);
      } else if (shapeVariant === 'comet') {
        setBarSize(particle, config, deterministic);
        setDistance(particle, config, deterministic);
      } else {
        setDotSize(particle, config, deterministic);
        setDistance(particle, config, deterministic);
      }
    }

    if (!deterministic) {
      if (config.staggered) {
        // delay가 커질수록 duration을 줄여 delay+duration이 항상 0.6s가 되게 함
        // → 순차 발동 느낌은 유지하면서 마지막 파티클도 정확히 0.6s에 종료됨
        applyStagger(particle, i, count);
      } else {
        particle.style.animationDelay = `${Math.random() * 0.03}s`;
      }
    }

    layer.appendChild(particle);
  }
}

// delay + duration = STAGGER_TOTAL_S 가 항상 성립하도록 계산 (전체가 0.6s 안에 종료)
function applyStagger(particle, index, count) {
  const maxDelay = STAGGER_TOTAL_S - STAGGER_MIN_DURATION_S;
  const step = count > 1 ? maxDelay / (count - 1) : 0;
  const delay = step * index;
  const duration = STAGGER_TOTAL_S - delay;
  particle.style.animationDelay = `${delay.toFixed(3)}s`;
  particle.style.animationDuration = `${duration.toFixed(3)}s`;
}

function setDotSize(particle, config, deterministic) {
  const size = deterministic ? averageOf(config.size) : randomRange(config.size[0], config.size[1]);
  particle.style.width = `${size}px`;
  particle.style.height = `${size}px`;
}

function setBarSize(particle, config, deterministic) {
  const length = deterministic ? averageOf(config.length) : randomRange(config.length[0], config.length[1]);
  const thickness = deterministic ? averageOf(config.thickness) : randomRange(config.thickness[0], config.thickness[1]);
  particle.style.width = `${length}px`;
  particle.style.height = `${thickness}px`;
}

function setDistance(particle, config, deterministic) {
  const scale = config.previewScale ?? PREVIEW_DISTANCE_SCALE;
  const distance = deterministic
    ? averageOf(config.distance) * scale
    : randomRange(config.distance[0], config.distance[1]);
  particle.style.setProperty('--distance', `${distance}px`);
}

function setEmberVars(particle, config, index, count, deterministic) {
  const scale = config.previewScale ?? PREVIEW_DISTANCE_SCALE;
  const size = deterministic ? averageOf(config.size) : randomRange(config.size[0], config.size[1]);
  const dx = deterministic
    ? staticSpread(index, count, config.dx) * scale
    : randomRange(config.dx[0], config.dx[1]);
  const rise = deterministic
    ? averageOf(config.rise) * scale
    : randomRange(config.rise[0], config.rise[1]);
  const fall = deterministic
    ? averageOf(config.fall) * scale
    : randomRange(config.fall[0], config.fall[1]);
  particle.style.width = `${size}px`;
  particle.style.height = `${size}px`;
  particle.style.setProperty('--dx', `${dx}px`);
  particle.style.setProperty('--rise', `${rise}px`);
  particle.style.setProperty('--fall', `${fall}px`);
}

// 게임 내 재생용: 각도에 랜덤 흔들림(jitter) 포함
function computeAngle(index, count, angleMode) {
  if (angleMode === 'upward') return -90 + (Math.random() * 100 - 50);
  if (angleMode === 'downward') return 90 + (Math.random() * 100 - 50);
  if (angleMode === 'diagonal') return 20 + Math.random() * 50; // 우하향 대각선 밴드 (20~70deg)
  if (angleMode === 'horizontal') {
    const side = index % 2 === 0 ? 0 : 180;
    return side + (Math.random() * 60 - 30);
  }
  return (360 / count) * index + (Math.random() * 20 - 10);
}

// 상점 썸네일용: 매번 동일한 모양이 나오도록 jitter 없이 균등 분배
function computeStaticAngle(index, count, angleMode) {
  if (angleMode === 'upward') return -150 + (120 / (count - 1 || 1)) * index; // -150~-30deg 부채꼴
  if (angleMode === 'downward') return 40 + (100 / (count - 1 || 1)) * index; // 40~140deg 부채꼴
  if (angleMode === 'diagonal') return 25 + (30 / (count - 1 || 1)) * index; // 25~55deg 밴드
  if (angleMode === 'horizontal') {
    const side = index % 2 === 0 ? -20 : 200;
    const laneIndex = Math.floor(index / 2);
    return side + laneIndex * 14;
  }
  return (360 / count) * index;
}

// 상점 썸네일용: [-30,30] 같은 대칭 범위를 count개로 균등 분배
function staticSpread(index, count, [min, max]) {
  return min + ((max - min) / (count - 1 || 1)) * index;
}

function averageOf([min, max]) {
  return (min + max) / 2;
}

function pickColor(colors, index) {
  return colors[index % colors.length];
}

function randomInt(min, max) {
  return Math.floor(randomRange(min, max + 1));
}

function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

function scheduleCleanup(layer) {
  // 스태거링 효과(연쇄/레이저 등)는 자식마다 animationend 시점이 다르므로,
  // 전체 자식 수만큼 다 끝난 뒤에만 제거한다 (첫 파티클만 보고 조기 삭제하면
  // 나머지 지연된 파티클이 중간에 끊겨 사라져 보임).
  const expected = layer.childElementCount;
  let completed = 0;
  let removed = false;

  const remove = () => {
    if (removed) return;
    removed = true;
    layer.remove();
  };
  const onChildAnimationEnd = () => {
    completed += 1;
    if (completed >= expected) remove();
  };

  layer.addEventListener('animationend', onChildAnimationEnd);
  setTimeout(remove, CLEANUP_FALLBACK_MS); // 안전망 (애니메이션 미지원 등)
}