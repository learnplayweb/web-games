// v0.1.0
// effects.js
// - 콤보 연출 트리거 (10종 이펙트, spawneffect 단일 진입점)
// - 대상 엘리먼트 기준 좌표에 파티클 레이어 생성 후 자동 정리
// - 이펙트별 설정은 EFFECT_CONFIG 테이블로 관리 (effects.css와 shape 클래스명 1:1 매칭)

export const COMBO_EFFECT_KEYS = Object.freeze([
  'stardust', 'sparkle', 'ring-burst', 'heart-pop', 'spark',
  'bubble-pop', 'ribbon-scatter', 'cross-flash', 'falling-leaf', 'water-drop',
]);

// shape: effects.css의 .combo-fx__particle--{shape} 클래스와 매칭
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

/** spawneffect(targetElement: HTMLElement, effectKey: string): void */
export function spawneffect(targetElement, effectKey) {
  if (!targetElement) return;

  const rect = targetElement.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  const layer = document.createElement('div');
  layer.className = `combo-fx combo-fx--${effectKey}`;
  layer.style.left = `${centerX}px`;
  layer.style.top = `${centerY}px`;

  if (effectKey === 'ring-burst') {
    buildRing(layer);
  } else if (effectKey === 'cross-flash') {
    buildCross(layer);
  } else {
    buildParticles(layer, effectKey);
  }

  document.body.appendChild(layer);
  scheduleCleanup(layer);
}

function buildRing(layer) {
  const ring = document.createElement('span');
  ring.className = 'combo-fx__ring';
  ring.style.borderColor = pickColor(RING_COLORS, 0);
  layer.appendChild(ring);
}

function buildCross(layer) {
  const cross = document.createElement('span');
  cross.className = 'combo-fx__cross';
  cross.style.color = pickColor(CROSS_COLORS, 0);
  layer.appendChild(cross);
}

function buildParticles(layer, effectKey) {
  const config = EFFECT_CONFIG[effectKey];
  if (!config) return;

  const count = randomInt(config.count[0], config.count[1]);

  for (let i = 0; i < count; i += 1) {
    const particle = document.createElement('span');
    particle.className = `combo-fx__particle combo-fx__particle--${config.shape}`;

    const angle = computeAngle(i, count, config.angleMode);
    particle.style.setProperty('--angle', `${angle}deg`);
    particle.style.background = pickColor(config.colors, i);
    particle.style.animationDelay = `${Math.random() * 0.03}s`;

    if (config.shape === 'spark') {
      const length = randomRange(config.length[0], config.length[1]);
      const thickness = randomRange(config.thickness[0], config.thickness[1]);
      particle.style.width = `${length}px`;
      particle.style.height = `${thickness}px`;
    } else {
      const size = randomRange(config.size[0], config.size[1]);
      const distance = randomRange(config.distance[0], config.distance[1]);
      particle.style.width = `${size}px`;
      particle.style.height = `${size}px`;
      particle.style.setProperty('--distance', `${distance}px`);
    }

    layer.appendChild(particle);
  }
}

function computeAngle(index, count, angleMode) {
  if (angleMode === 'upward') return -90 + (Math.random() * 100 - 50);
  if (angleMode === 'downward') return 90 + (Math.random() * 100 - 50);
  if (angleMode === 'horizontal') {
    const side = index % 2 === 0 ? 0 : 180;
    return side + (Math.random() * 60 - 30);
  }
  return (360 / count) * index + (Math.random() * 20 - 10);
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