import { SceneId } from './types';

export type ParticleKind =
  | 'leaf'
  | 'firefly'
  | 'weather'
  | 'spark'
  | 'dust'
  | 'ember'
  | 'ripple';

export interface ParticleSlot {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
  color: string;
  secondaryColor: string;
  kind: ParticleKind;
  phase: number;
  rotation: number;
  rotationSpeed: number;
  swayAmp: number;
  swayFreq: number;
  anchorX: number;
  anchorY: number;
  orbitRadius: number;
}

export interface AtmosphereParticleConfig {
  sceneId: SceneId;
  leafColors: string[];
  leafVeinColor: string;
  leafCount: number;
  leafWindX: number;
  leafFallSpeedY: number;
  leafSwayAmp: number;
  leafSwayFreq: number;
  leafSizeRange: [number, number];
  ambientFireflyCount: number;
  weatherCount: number;
}

const ATMOSPHERE_CONFIGS: Record<SceneId, AtmosphereParticleConfig> = {
  day_forest: {
    sceneId: 'day_forest',
    leafColors: ['#4ade80', '#22c55e', '#86efac', '#16a34a'],
    leafVeinColor: '#dcfce7',
    leafCount: 38,
    leafWindX: 16,
    leafFallSpeedY: 36,
    leafSwayAmp: 24,
    leafSwayFreq: 2.2,
    leafSizeRange: [4.5, 7.5],
    ambientFireflyCount: 6,
    weatherCount: 24,
  },
  day_golden: {
    sceneId: 'day_golden',
    leafColors: ['#fbbf24', '#f59e0b', '#fde047', '#d97706'],
    leafVeinColor: '#fef9c3',
    leafCount: 44,
    leafWindX: 20,
    leafFallSpeedY: 34,
    leafSwayAmp: 28,
    leafSwayFreq: 2.0,
    leafSizeRange: [4.8, 8.0],
    ambientFireflyCount: 14,
    weatherCount: 28,
  },
  sunset: {
    sceneId: 'sunset',
    leafColors: ['#fb923c', '#f97316', '#f43f5e', '#fbbf24'],
    leafVeinColor: '#ffedd5',
    leafCount: 42,
    leafWindX: 26,
    leafFallSpeedY: 42,
    leafSwayAmp: 30,
    leafSwayFreq: 2.5,
    leafSizeRange: [4.8, 8.2],
    ambientFireflyCount: 18,
    weatherCount: 24,
  },
  mist: {
    sceneId: 'mist',
    leafColors: ['#a7f3d0', '#6ee7b7', '#99f6e4', '#cbd5e1'],
    leafVeinColor: '#f0fdf4',
    leafCount: 30,
    leafWindX: 10,
    leafFallSpeedY: 26,
    leafSwayAmp: 18,
    leafSwayFreq: 1.6,
    leafSizeRange: [4.2, 7.0],
    ambientFireflyCount: 10,
    weatherCount: 30,
  },
  rain: {
    sceneId: 'rain',
    leafColors: ['#34d399', '#10b981', '#059669', '#6ee7b7'],
    leafVeinColor: '#d1fae5',
    leafCount: 26,
    leafWindX: -52,
    leafFallSpeedY: 78,
    leafSwayAmp: 34,
    leafSwayFreq: 3.4,
    leafSizeRange: [4.2, 6.8],
    ambientFireflyCount: 4,
    weatherCount: 75,
  },
  snow: {
    sceneId: 'snow',
    leafColors: ['#bae6fd', '#e0f2fe', '#99f6e4', '#cbd5e1'],
    leafVeinColor: '#ffffff',
    leafCount: 24,
    leafWindX: -14,
    leafFallSpeedY: 38,
    leafSwayAmp: 22,
    leafSwayFreq: 2.1,
    leafSizeRange: [4.0, 6.6],
    ambientFireflyCount: 6,
    weatherCount: 70,
  },
  night: {
    sceneId: 'night',
    leafColors: ['#2dd4bf', '#5eead4', '#38bdf8', '#a7f3d0'],
    leafVeinColor: '#ccfbf1',
    leafCount: 24,
    leafWindX: 12,
    leafFallSpeedY: 28,
    leafSwayAmp: 20,
    leafSwayFreq: 1.8,
    leafSizeRange: [4.2, 6.8],
    ambientFireflyCount: 28,
    weatherCount: 32,
  },
};

export function getAtmosphereParticleConfig(
  sceneId: SceneId
): AtmosphereParticleConfig {
  return ATMOSPHERE_CONFIGS[sceneId] || ATMOSPHERE_CONFIGS.day_forest;
}

export function createParticlePool(maxParticles = 260): ParticleSlot[] {
  return Array.from({ length: maxParticles }, () => ({
    active: false,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    size: 3,
    alpha: 1,
    life: 0,
    maxLife: 1,
    color: '#ffffff',
    secondaryColor: '#fef08a',
    kind: 'weather',
    phase: 0,
    rotation: 0,
    rotationSpeed: 0,
    swayAmp: 0,
    swayFreq: 2,
    anchorX: 0,
    anchorY: 0,
    orbitRadius: 0,
  }));
}

export function allocateParticleSlot(
  pool: ParticleSlot[],
  cursorRef: { index: number }
): ParticleSlot {
  const slot = pool[cursorRef.index % pool.length];
  cursorRef.index = (cursorRef.index + 1) % pool.length;
  return slot;
}

/**
 * Configures a single falling leaf particle according to the current scene's atmosphere.
 */
export function configureFallingLeafSlot(
  slot: ParticleSlot,
  cfg: AtmosphereParticleConfig,
  x: number,
  y: number,
  seed = Math.random()
): void {
  const colorIdx = Math.floor(seed * cfg.leafColors.length) % cfg.leafColors.length;
  const [minSz, maxSz] = cfg.leafSizeRange;
  slot.active = true;
  slot.kind = 'leaf';
  slot.x = x;
  slot.y = y;
  slot.vx = cfg.leafWindX + (seed - 0.5) * 14;
  slot.vy = cfg.leafFallSpeedY * (0.82 + seed * 0.38);
  slot.size = minSz + seed * (maxSz - minSz);
  slot.alpha = 0.92;
  slot.maxLife = 4.5 + seed * 3.5;
  slot.life = slot.maxLife * (0.35 + seed * 0.65);
  slot.color = cfg.leafColors[colorIdx];
  slot.secondaryColor = cfg.leafVeinColor;
  slot.phase = seed * Math.PI * 2;
  slot.rotation = seed * Math.PI * 2;
  slot.rotationSpeed = (seed >= 0.5 ? 1 : -1) * (1.2 + seed * 2.1);
  slot.swayAmp = cfg.leafSwayAmp * (0.8 + seed * 0.4);
  slot.swayFreq = cfg.leafSwayFreq * (0.85 + seed * 0.3);
  slot.anchorX = 0;
  slot.anchorY = 0;
  slot.orbitRadius = 0;
}

/**
 * Spawns a burst + orbiting swarm of glowing bioluminescent fireflies around a lit lantern (PR-006).
 */
export function spawnLanternFireflies(
  pool: ParticleSlot[],
  cursorRef: { index: number },
  lanternX: number,
  lanternY: number,
  count = 18
): number {
  let spawned = 0;
  for (let i = 0; i < count; i++) {
    const slot = allocateParticleSlot(pool, cursorRef);
    const ratio = i / Math.max(1, count);
    const angle = Math.PI * 2 * ratio;
    const isOrbiting = i % 2 === 0;
    const radius = 14 + (i % 5) * 8;

    slot.active = true;
    slot.kind = 'firefly';
    slot.anchorX = lanternX;
    slot.anchorY = lanternY - 26;
    slot.orbitRadius = isOrbiting ? radius : 0;
    slot.x = lanternX + Math.cos(angle) * (isOrbiting ? radius : 10);
    slot.y = lanternY - 26 + Math.sin(angle) * (isOrbiting ? radius * 0.7 : 10);
    slot.vx = Math.cos(angle) * (isOrbiting ? 16 : 38 + (i % 4) * 12);
    slot.vy = Math.sin(angle) * (isOrbiting ? 14 : 32 + (i % 3) * 10) - 12;
    slot.size = 2.8 + (i % 3) * 0.9;
    slot.alpha = 1;
    slot.maxLife = isOrbiting ? 5.5 + (i % 4) * 1.2 : 1.6 + (i % 3) * 0.4;
    slot.life = slot.maxLife;
    slot.color = i % 3 === 0 ? '#bef264' : '#fef08a';
    slot.secondaryColor = i % 3 === 0 ? '#65a30d' : '#f59e0b';
    slot.phase = angle;
    slot.rotation = 0;
    slot.rotationSpeed = 0;
    slot.swayAmp = 14 + (i % 4) * 4;
    slot.swayFreq = 1.8 + (i % 5) * 0.35;
    spawned++;
  }
  return spawned;
}

/**
 * Seeds the particle pool with atmosphere-specific falling leaves, weather particles, and ambient fireflies.
 */
export function seedSceneAtmosphereParticles(
  pool: ParticleSlot[],
  cursorRef: { index: number },
  sceneId: SceneId
): { leavesSeeded: number; firefliesSeeded: number; weatherSeeded: number } {
  const cfg = getAtmosphereParticleConfig(sceneId);
  let leavesSeeded = 0;
  let firefliesSeeded = 0;
  let weatherSeeded = 0;

  // Clear existing ambient weather/leaves before seeding new scene
  for (let i = 0; i < pool.length; i++) {
    if (
      pool[i].kind === 'leaf' ||
      pool[i].kind === 'weather' ||
      (pool[i].kind === 'firefly' && pool[i].orbitRadius === 0)
    ) {
      pool[i].active = false;
    }
  }

  // 1. Seed falling leaves tailored to the current atmosphere
  for (let i = 0; i < cfg.leafCount; i++) {
    const slot = allocateParticleSlot(pool, cursorRef);
    const seed = ((i * 37 + 13) % 100) / 100;
    const lx = 80 + ((i * 97) % 780);
    const ly = 260 + ((i * 131) % 1360);
    configureFallingLeafSlot(slot, cfg, lx, ly, seed);
    leavesSeeded++;
  }

  // 2. Seed ambient forest fireflies
  for (let i = 0; i < cfg.ambientFireflyCount; i++) {
    const slot = allocateParticleSlot(pool, cursorRef);
    const fx = 160 + ((i * 113) % 620);
    const fy = 320 + ((i * 149) % 1250);
    slot.active = true;
    slot.kind = 'firefly';
    slot.x = fx;
    slot.y = fy;
    slot.vx = ((i % 2 === 0 ? 1 : -1) * (8 + (i % 5) * 3));
    slot.vy = -6 - (i % 4) * 3;
    slot.size = 2.5 + (i % 3) * 0.7;
    slot.alpha = 0.85;
    slot.maxLife = 4.2 + (i % 4);
    slot.life = slot.maxLife * ((i % 5) * 0.2 + 0.2);
    slot.color = i % 2 === 0 ? '#fef08a' : '#bef264';
    slot.secondaryColor = '#f59e0b';
    slot.phase = i * 0.9;
    slot.rotation = 0;
    slot.rotationSpeed = 0;
    slot.swayAmp = 16;
    slot.swayFreq = 2.1;
    slot.anchorX = 0;
    slot.anchorY = 0;
    slot.orbitRadius = 0;
    firefliesSeeded++;
  }

  // 3. Seed weather particles (rain drops, snow flurries, mist motes)
  for (let i = 0; i < cfg.weatherCount; i++) {
    const slot = allocateParticleSlot(pool, cursorRef);
    const wx = (i * 83) % 941;
    const wy = (i * 127) % 1672;
    slot.active = true;
    slot.kind = 'weather';
    slot.x = wx;
    slot.y = wy;
    slot.phase = i * 0.5;
    slot.anchorX = 0;
    slot.anchorY = 0;
    slot.orbitRadius = 0;
    if (sceneId === 'rain') {
      slot.vx = -48;
      slot.vy = 520;
      slot.size = 2.0;
      slot.maxLife = 1.6;
      slot.life = 0.3 + (i % 10) * 0.13;
      slot.color = '#7dd3fc';
      slot.secondaryColor = '#bae6fd';
    } else if (sceneId === 'snow') {
      slot.vx = -18 + (i % 9) * 4;
      slot.vy = 66 + (i % 5) * 7;
      slot.size = 3.0 + (i % 3) * 0.6;
      slot.maxLife = 4.0;
      slot.life = 0.5 + (i % 8) * 0.4;
      slot.color = '#f8fafc';
      slot.secondaryColor = '#e2e8f0';
    } else {
      slot.vx = 12 + (i % 5) * 3;
      slot.vy = 20 + (i % 4) * 4;
      slot.size = 2.2;
      slot.maxLife = 3.8;
      slot.life = 0.6 + (i % 6) * 0.5;
      slot.color = sceneId === 'day_golden' ? '#fef08a' : '#a7f3d0';
      slot.secondaryColor = '#fde047';
    }
    slot.alpha = 0.75;
    weatherSeeded++;
  }

  return { leavesSeeded, firefliesSeeded, weatherSeeded };
}

/**
 * Steps a single particle slot forward by dt seconds. Pure & unit-testable.
 */
export function stepSingleParticle(
  p: ParticleSlot,
  dt: number,
  nowSec: number,
  sceneId: SceneId,
  camY: number
): void {
  if (!p.active) return;

  p.life -= dt;
  const cfg = getAtmosphereParticleConfig(sceneId);

  if (p.life <= 0) {
    if (p.kind === 'leaf') {
      const respawnX = 70 + Math.random() * 800;
      const respawnY = camY - 520 + Math.random() * 240;
      configureFallingLeafSlot(p, cfg, respawnX, respawnY, Math.random());
      p.life = p.maxLife;
      return;
    }

    if (p.kind === 'weather') {
      p.life = p.maxLife;
      p.x = Math.random() * 941;
      p.y = camY - 520 + Math.random() * 1040;
      if (sceneId === 'rain') {
        p.vx = -48;
        p.vy = 540;
        p.color = '#7dd3fc';
        p.size = 2;
      } else if (sceneId === 'snow') {
        p.vx = -20 + Math.random() * 40;
        p.vy = 68;
        p.color = '#f8fafc';
        p.size = 3.2;
      } else {
        p.vx = 14;
        p.vy = 24;
        p.color = sceneId === 'day_golden' ? '#fef08a' : '#86efac';
        p.size = 2.4;
      }
      return;
    }

    if (p.kind === 'firefly' && p.orbitRadius > 0) {
      // Persistent lantern fireflies keep orbiting their lit lantern
      p.life = p.maxLife;
    } else {
      p.active = false;
      return;
    }
  }

  if (p.kind === 'leaf') {
    const swayVx = Math.sin(nowSec * p.swayFreq + p.phase) * p.swayAmp;
    p.x += (p.vx + swayVx) * dt;
    p.y += p.vy * dt;
    p.rotation += p.rotationSpeed * dt;
    // Wrap horizontally inside forest corridor
    if (p.x < 40) p.x = 900;
    if (p.x > 900) p.x = 40;
    const lifeRatio = p.life / p.maxLife;
    p.alpha =
      lifeRatio < 0.2
        ? lifeRatio / 0.2
        : lifeRatio > 0.85
        ? (1 - lifeRatio) / 0.15
        : 0.92;
    return;
  }

  if (p.kind === 'firefly') {
    const pulse = 0.5 + 0.5 * Math.sin(nowSec * 4.5 + p.phase);
    if (p.orbitRadius > 0 && p.anchorX > 0) {
      // Smooth figure-8 / orbital dance around lit lantern
      const ang = nowSec * p.swayFreq + p.phase;
      const targetX = p.anchorX + Math.cos(ang) * p.orbitRadius;
      const targetY =
        p.anchorY +
        Math.sin(ang * 1.4) * (p.orbitRadius * 0.65) -
        Math.cos(ang * 0.7) * 6;
      p.x += (targetX - p.x) * Math.min(1, dt * 6);
      p.y += (targetY - p.y) * Math.min(1, dt * 6);
    } else {
      // Free-drifting firefly
      const driftX = Math.cos(nowSec * p.swayFreq + p.phase) * p.swayAmp;
      const driftY = Math.sin(nowSec * (p.swayFreq * 1.2) + p.phase) * 12;
      p.x += (p.vx + driftX) * dt;
      p.y += (p.vy + driftY) * dt;
    }
    const fade = Math.min(1, p.life / 0.4);
    p.alpha = Math.max(0.2, Math.min(1, (0.38 + 0.62 * pulse) * fade));
    return;
  }

  // Standard ballistic particle (weather, spark, ember, dust, ripple)
  p.x += p.vx * dt;
  p.y += p.vy * dt;
  p.alpha = Math.max(0, Math.min(1, p.life / p.maxLife));
}

/**
 * Renders a single particle slot onto the 2.5D Canvas context.
 */
export function drawParticleSlot(
  ctx: CanvasRenderingContext2D,
  p: ParticleSlot,
  nowSec: number,
  sceneId: SceneId
): void {
  if (!p.active || p.alpha <= 0.01) return;

  ctx.save();
  ctx.globalAlpha = p.alpha;

  if (p.kind === 'leaf') {
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);
    const rx = p.size;
    const ry = p.size * (0.52 + 0.18 * Math.abs(Math.cos(nowSec * 3 + p.phase)));

    // Botanical pointed leaf silhouette
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.moveTo(-rx, 0);
    ctx.quadraticCurveTo(0, -ry * 1.35, rx, 0);
    ctx.quadraticCurveTo(0, ry * 1.35, -rx, 0);
    ctx.closePath();
    ctx.fill();

    // Subtle central leaf vein
    ctx.strokeStyle = p.secondaryColor;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-rx * 0.75, 0);
    ctx.lineTo(rx * 0.75, 0);
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (p.kind === 'firefly') {
    const pulseRadius = p.size * (2.2 + 0.6 * Math.sin(nowSec * 5 + p.phase));
    const grad = ctx.createRadialGradient(
      p.x,
      p.y,
      0.5,
      p.x,
      p.y,
      pulseRadius * 2.4
    );
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.32, p.color);
    grad.addColorStop(0.7, 'rgba(250, 204, 21, 0.28)');
    grad.addColorStop(1, 'rgba(250, 204, 21, 0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(p.x, p.y, pulseRadius * 2.4, 0, Math.PI * 2);
    ctx.fill();

    // Bright bioluminescent core
    ctx.fillStyle = '#fef9c3';
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * 0.75, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  if (sceneId === 'rain' && p.kind === 'weather') {
    ctx.strokeStyle = p.color;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x - 5, p.y + 18);
    ctx.stroke();
    ctx.restore();
    return;
  }

  ctx.fillStyle = p.color;
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
