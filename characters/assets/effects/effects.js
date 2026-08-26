// v0.2.1
// effects.js
// - 게임 내 재생: spawnEffect() - 대상 좌표에 매번 랜덤 파티클 생성 (콤보 등 이벤트 발동용)
// - 상점 썸네일: renderEffectThumbnail() / setEffectThumbnailActive() - 고정 프리셋 좌표, .active로 재생 토글
// - EFFECT_CONFIG가 두 기능의 단일 설정 소스 (shape/개수/크기/거리/색상)

export const EFFECT_KEYS = Object.freeze([
  'stardust', 'sparkle', 'ring-burst', 'heart-pop', 'spark',
  'bubble-pop', 'ribbon-scatter', 'cross-flash', 'falling-leaf', 'water-drop',
]);

// shape: effects.css의 .fx__particle--{shape} 클래스와 매칭
// angleMode: 'radial' | 'upward' | 'downward' | 'horizontal'
const EFFECT_CONFIG = {
  stardust: { shape: 'star', count: [5, 8], size: [8, 12], distance: [24, 38], angleMode: 'radial', colors: ['#ffffff', '#fff6b3', '#ffe27a'] },
  sparkle: { shape: 'sparkle', count: [8, 12], size: [3, 6], distance: [20, 34], angleMode: 'radial', colors: ['#ffffff', '#bfe6ff', '#fff6b3'] },
  'heart-pop': { shape: 'heart', count: [4, 6], size: [8, 12], distance: [16, 26], angleMode: 'upward', colors: ['#ff8fab', '#ffb3c6', '#ffffff'] },
  spark: { shape: 'spark', count: [6, 10], length: [12, 18], thickness: [2, 3], angleMode: 'radial', colors: ['#ffffff', '#ffe27a', '#bfe6ff'] },
  'bubble-pop': { shape: 'bubble', count: [5, 8], size: [6, 14], distance: [18, 30], angleMode: 'radial', colors: ['#bfe6ff', '#e0f7ff', '#ffffff'] },
  'ribbon-scatter': { shape: 'ribbon', count: [6, 9], size: [10, 16], distance: [22, 34], angleMode: 'horizontal', colors: ['#ffd166', '#ff8fab', '#8ecae6'] },
  'falling-leaf': { shape: 'leaf', count: [5, 7], size: [8, 12], distance: [20, 30], angleMode: 'downward', colors: ['#b7e4a0', '#8fce6a', '#d8f28d'] },
  'water-drop': { shape: 'drop', count: [5, 8], size: [6, 10], distance: [18, 28], angleMode: 'downward', colors: ['#bfe6ff', '#8ecae6', '#ffffff'] },
};

const RING_COLORS = ['#ffffff', '#bfe6ff', '#fff6b3'];
const CROSS_COLORS = ['#fff6b3', '#bfe6ff', '#ffb3c6'];

const CLEANUP_FALLBACK_MS = 700;

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

  if (effectKey === 'ring-burst') {
    buildRing(layer);
  } else if (effectKey === 'cross-flash') {
    buildCross(layer);
  } else {
    buildParticles(layer, effectKey, { deterministic: false });
  }

  document.body.appendChild(layer);
  scheduleCleanup(layer);
}

/** renderEffectThumbnail(container: HTMLElement, effectKey: string): void */
export function renderEffectThumbnail(container, effectKey) {
  if (!container) return;
  container.replaceChildren();
  container.className = `ui-eff ui-eff--${effectKey}`;

  if (effectKey === 'ring-burst') {
    buildRing(container);
  } else if (effectKey === 'cross-flash') {
    buildCross(container);
  } else {
    buildParticles(container, effectKey, { deterministic: true });
  }
}

/** setEffectThumbnailActive(container: HTMLElement, isActive: boolean): void */
export function setEffectThumbnailActive(container, isActive) {
  if (!container) return;
  if (!isActive) {
    container.classList.remove('active');
    return;
  }
  // 이미 재생 중이어도 항상 처음부터 다시 재생되도록 reflow를 강제한 뒤 재적용
  container.classList.remove('active');
  void container.offsetWidth; // eslint-disable-line no-void
  container.classList.add('active');
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

function buildParticles(layer, effectKey, { deterministic }) {
  const config = EFFECT_CONFIG[effectKey];
  if (!config) return;

  // 상점 썸네일(deterministic)은 항상 동일한 모양이 나오도록 최대 개수 고정 사용,
  // 게임 내 재생은 매번 랜덤 개수 사용
  const count = deterministic ? config.count[1] : randomInt(config.count[0], config.count[1]);

  for (let i = 0; i < count; i += 1) {
    const particle = document.createElement('span');
    particle.className = `fx__particle fx__particle--${config.shape}`;

    const angle = deterministic
      ? computeStaticAngle(i, count, config.angleMode)
      : computeAngle(i, count, config.angleMode);
    particle.style.setProperty('--angle', `${angle}deg`);
    particle.style.background = pickColor(config.colors, i);

    if (!deterministic) {
      particle.style.animationDelay = `${Math.random() * 0.03}s`;
    }

    if (config.shape === 'spark') {
      const length = deterministic ? averageOf(config.length) : randomRange(config.length[0], config.length[1]);
      const thickness = deterministic ? averageOf(config.thickness) : randomRange(config.thickness[0], config.thickness[1]);
      particle.style.width = `${length}px`;
      particle.style.height = `${thickness}px`;
    } else {
      const size = deterministic ? averageOf(config.size) : randomRange(config.size[0], config.size[1]);
      const distance = deterministic ? averageOf(config.distance) : randomRange(config.distance[0], config.distance[1]);
      particle.style.width = `${size}px`;
      particle.style.height = `${size}px`;
      particle.style.setProperty('--distance', `${distance}px`);
    }

    layer.appendChild(particle);
  }
}

// 게임 내 재생용: 각도에 랜덤 흔들림(jitter) 포함
function computeAngle(index, count, angleMode) {
  if (angleMode === 'upward') return -90 + (Math.random() * 100 - 50);
  if (angleMode === 'downward') return 90 + (Math.random() * 100 - 50);
  if (angleMode === 'horizontal') {
    const side = index % 2 === 0 ? 0 : 180;
    return side + (Math.random() * 60 - 30);
  }
  return (360 / count) * index + (Math.random() * 20 - 10);
}

// 상점 썸네일용: 매번 동일한 모양이 나오도록 jitter 없이 균등 분배
function computeStaticAngle(index, count, angleMode) {
  if (angleMode === 'upward') {
    const spread = 120; // -150deg ~ -30deg 부채꼴
    return -150 + (spread / (count - 1 || 1)) * index;
  }
  if (angleMode === 'downward') {
    const spread = 100; // 40deg ~ 140deg 부채꼴
    return 40 + (spread / (count - 1 || 1)) * index;
  }
  if (angleMode === 'horizontal') {
    const side = index % 2 === 0 ? -20 : 200; // 좌우로 균등 배치
    const laneIndex = Math.floor(index / 2);
    return side + laneIndex * 14;
  }
  return (360 / count) * index;
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
  let removed = false;
  const remove = () => {
    if (removed) return;
    removed = true;
    layer.remove();
  };
  layer.addEventListener('animationend', remove, { once: true });
  setTimeout(remove, CLEANUP_FALLBACK_MS);
}