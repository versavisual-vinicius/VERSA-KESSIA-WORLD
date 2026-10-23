import React, { useEffect, useRef } from 'react';
import {
  EnemyEntity,
  GameState,
  HudSnapshot,
  OutcomeType,
  PlayerState,
  ProjectileEntity,
  RunSnapshot,
  SceneId,
  SceneObject,
} from '../game/types';
import { SCENES_BY_ID, SCENE_PALETTES } from '../game/scenesData';
import {
  computeCameraViewport,
  createInitialEnemiesForScene,
  isPlayerOccludedByCanopy,
  RenderableItem,
  resolveMovement,
  sortRenderablesByFootY,
  updateEnemyBehavior,
} from '../game/rules';
import { KESSIA_ASSETS } from '../game/mathChallenges';
import {
  allocateParticleSlot,
  createParticlePool,
  drawParticleSlot,
  ParticleSlot,
  seedSceneAtmosphereParticles,
  spawnLanternFireflies,
  stepSingleParticle,
} from '../game/particles';
import { soundEngine } from '../game/audio';

const MAX_PARTICLES = 260;

export interface ExternalControlRef {
  moveX: number;
  moveY: number;
  triggerAttack: boolean;
  triggerDash: boolean;
  triggerInteract: boolean;
  resetRun: (sceneId?: SceneId) => void;
  completeMathStation: (
    stationId: string,
    pointsAwarded: number,
    nextStreak: number
  ) => void;
}

interface ForestCanvas25DProps {
  gameState: GameState;
  sceneId: SceneId;
  qaOverlayEnabled: boolean;
  isMathModalOpen: boolean;
  externalControlRef: React.MutableRefObject<ExternalControlRef>;
  onHudUpdate: (snapshot: HudSnapshot) => void;
  onOutcome: (snapshot: RunSnapshot) => void;
  onTogglePause: () => void;
  onStartFromTitle: () => void;
  onRequestMathChallenge: (stationId: string) => void;
}

/**
 * Flood-fills from image borders to remove solid white backgrounds while keeping
 * interior whites (eyes, teeth, badge details) 100% intact.
 */
function extractTransparentSpriteCanvas(
  img: HTMLImageElement
): HTMLCanvasElement {
  const off = document.createElement('canvas');
  const w = img.naturalWidth || img.width || 256;
  const h = img.naturalHeight || img.height || 256;
  off.width = w;
  off.height = h;
  const octx = off.getContext('2d');
  if (!octx) return off;

  octx.drawImage(img, 0, 0, w, h);
  try {
    const imgData = octx.getImageData(0, 0, w, h);
    const data = imgData.data;
    const visited = new Uint8Array(w * h);
    const queue = new Int32Array(w * h);
    let head = 0;
    let tail = 0;

    const isBgWhite = (idx: number) => {
      const p = idx * 4;
      const r = data[p];
      const g = data[p + 1];
      const b = data[p + 2];
      const a = data[p + 3];
      return a < 20 || (r > 232 && g > 232 && b > 232);
    };

    const enqueue = (x: number, y: number) => {
      if (x < 0 || x >= w || y < 0 || y >= h) return;
      const idx = y * w + x;
      if (visited[idx]) return;
      if (isBgWhite(idx)) {
        visited[idx] = 1;
        queue[tail++] = idx;
      }
    };

    for (let x = 0; x < w; x++) {
      enqueue(x, 0);
      enqueue(x, h - 1);
    }
    for (let y = 0; y < h; y++) {
      enqueue(0, y);
      enqueue(w - 1, y);
    }

    while (head < tail) {
      const curr = queue[head++];
      const p = curr * 4;
      data[p + 3] = 0; // transparent
      const cx = curr % w;
      const cy = (curr / w) | 0;
      enqueue(cx + 1, cy);
      enqueue(cx - 1, cy);
      enqueue(cx, cy + 1);
      enqueue(cx, cy - 1);
    }

    // Soften 1px halo edges adjacent to transparent background
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const idx = y * w + x;
        if (visited[idx]) continue;
        if (
          visited[idx - 1] ||
          visited[idx + 1] ||
          visited[idx - w] ||
          visited[idx + w]
        ) {
          const p = idx * 4;
          if (data[p] > 210 && data[p + 1] > 210 && data[p + 2] > 210) {
            data[p + 3] = Math.min(data[p + 3], 90);
          }
        }
      }
    }

    octx.putImageData(imgData, 0, 0);
  } catch {
    // Ignore CORS if any
  }
  return off;
}

export const ForestCanvas25D: React.FC<ForestCanvas25DProps> = ({
  gameState,
  sceneId,
  qaOverlayEnabled,
  isMathModalOpen,
  externalControlRef,
  onHudUpdate,
  onOutcome,
  onTogglePause,
  onStartFromTitle,
  onRequestMathChallenge,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  const stateRef = useRef({
    gameState,
    sceneId,
    qaOverlayEnabled,
    isMathModalOpen,
    onHudUpdate,
    onOutcome,
    onTogglePause,
    onStartFromTitle,
    onRequestMathChallenge,
  });

  useEffect(() => {
    stateRef.current = {
      gameState,
      sceneId,
      qaOverlayEnabled,
      isMathModalOpen,
      onHudUpdate,
      onOutcome,
      onTogglePause,
      onStartFromTitle,
      onRequestMathChallenge,
    };
  }, [
    gameState,
    sceneId,
    qaOverlayEnabled,
    isMathModalOpen,
    onHudUpdate,
    onOutcome,
    onTogglePause,
    onStartFromTitle,
    onRequestMathChallenge,
  ]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const canvas = document.createElement('canvas');
    canvas.dataset.testid = 'game-canvas';
    canvas.className = 'block w-full h-full cursor-crosshair';
    container.innerHTML = '';
    container.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Load Késsia's full-body sprite (CH-001) and extract alpha background
    let kessiaSpriteCanvas: HTMLCanvasElement | null = null;
    const kessiaBodyImg = new Image();
    kessiaBodyImg.crossOrigin = 'anonymous';
    kessiaBodyImg.onload = () => {
      kessiaSpriteCanvas = extractTransparentSpriteCanvas(kessiaBodyImg);
    };
    kessiaBodyImg.src = KESSIA_ASSETS.body;

    let canvasW = container.clientWidth || window.innerWidth;
    let canvasH = container.clientHeight || window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const updateCanvasSize = () => {
      if (!container) return;
      canvasW = Math.max(320, container.clientWidth || window.innerWidth);
      canvasH = Math.max(480, container.clientHeight || window.innerHeight);
      canvas.width = Math.round(canvasW * dpr);
      canvas.height = Math.round(canvasH * dpr);
    };
    updateCanvasSize();

    const resizeObserver = new ResizeObserver(() => {
      updateCanvasSize();
    });
    resizeObserver.observe(container);

    // Pre-allocated Zero-GC Particle Ring Buffer (Leaves, Fireflies, Weather, Sparks, Embers)
    const particlePool: ParticleSlot[] = createParticlePool(MAX_PARTICLES);
    const particleCursorRef = { index: 0 };
    let lastSeededSceneId: SceneId = stateRef.current.sceneId;

    const spawnParticle = (
      x: number,
      y: number,
      vx: number,
      vy: number,
      size: number,
      maxLife: number,
      color: string,
      kind: ParticleSlot['kind']
    ) => {
      const slot = allocateParticleSlot(particlePool, particleCursorRef);
      slot.active = true;
      slot.x = x;
      slot.y = y;
      slot.vx = vx;
      slot.vy = vy;
      slot.size = size;
      slot.alpha = 1;
      slot.life = maxLife;
      slot.maxLife = maxLife;
      slot.color = color;
      slot.secondaryColor = '#fef08a';
      slot.kind = kind;
      slot.phase = Math.random() * Math.PI * 2;
      slot.rotation = 0;
      slot.rotationSpeed = 0;
      slot.swayAmp = 0;
      slot.swayFreq = 2;
      slot.anchorX = 0;
      slot.anchorY = 0;
      slot.orbitRadius = 0;
    };

    const keysHeld = new Set<string>();
    const keysJustPressed = new Set<string>();
    let pointerTargetWorld: { x: number; y: number } | null = null;

    const player: PlayerState = {
      x: 470,
      y: 1500,
      vx: 0,
      vy: 0,
      facingX: 0,
      facingY: -1,
      hp: 100,
      maxHp: 100,
      warmth: 100,
      maxWarmth: 100,
      scaleX: 1,
      scaleY: 1,
      walkDistance: 0,
      attackPhase: 'none',
      attackTimer: 0,
      attackCooldown: 0,
      dashTimer: 0,
      dashCooldown: 0,
      invulnTimer: 0,
      hitFlashTimer: 0,
      coyoteTimer: 0.1,
      attackBufferTimer: 0,
      dashBufferTimer: 0,
    };

    let enemies: EnemyEntity[] = createInitialEnemiesForScene(1);
    let projectiles: ProjectileEntity[] = [];
    const litLanterns = new Set<string>();
    const collectedPacks = new Set<string>();
    let campfireLit = false;
    let bridgeCrossed = false;
    let summitReached = false;
    let score = 0;
    let bestScore = 0;
    let elapsedSec = 0;
    let enemiesDefeated = 0;
    let damageTaken = 0;
    let activeWave = 1;
    let mathSolvedCount = 0;
    let mathStreak = 0;
    let maxMathStreak = 0;
    let hitstopTimer = 0;
    let cameraTrauma = 0;
    let camCurrentX = 470;
    let camCurrentY = 1350;
    let titleTourTime = 0;
    let defeatDelayTimer = 0;
    let pendingOutcome: OutcomeType | null = null;
    let lastStepSoundDist = 0;
    let lastHudBroadcast = 0;

    const seedWeatherParticles = (targetSceneId: SceneId) => {
      lastSeededSceneId = targetSceneId;
      seedSceneAtmosphereParticles(particlePool, particleCursorRef, targetSceneId);
      // Re-attach orbiting fireflies for any currently lit lanterns
      const activeScene = SCENES_BY_ID[targetSceneId];
      for (const lanternId of litLanterns) {
        const lObj = activeScene.objects.find(
          (o) => o.interactionId === lanternId
        );
        if (lObj) {
          spawnLanternFireflies(
            particlePool,
            particleCursorRef,
            lObj.x + 8,
            lObj.y - 12,
            16
          );
        }
      }
    };

    const resetRun = (overrideSceneId?: SceneId) => {
      const activeScene =
        SCENES_BY_ID[overrideSceneId || stateRef.current.sceneId];
      const entrySpawn = activeScene.spawns[0] || { x: 470, y: 1500 };
      player.x = entrySpawn.x;
      player.y = entrySpawn.y;
      player.vx = 0;
      player.vy = 0;
      player.facingX = 0;
      player.facingY = -1;
      player.hp = 100;
      player.maxHp = 100;
      player.warmth = 100;
      player.maxWarmth = 100;
      player.scaleX = 1;
      player.scaleY = 1;
      player.walkDistance = 0;
      player.attackPhase = 'none';
      player.attackTimer = 0;
      player.attackCooldown = 0;
      player.dashTimer = 0;
      player.dashCooldown = 0;
      player.invulnTimer = 0;
      player.hitFlashTimer = 0;
      player.attackBufferTimer = 0;
      player.dashBufferTimer = 0;

      enemies = createInitialEnemiesForScene(1);
      projectiles = [];
      litLanterns.clear();
      collectedPacks.clear();
      campfireLit = false;
      bridgeCrossed = false;
      summitReached = false;
      score = 0;
      elapsedSec = 0;
      enemiesDefeated = 0;
      damageTaken = 0;
      activeWave = 1;
      mathSolvedCount = 0;
      mathStreak = 0;
      maxMathStreak = 0;
      hitstopTimer = 0;
      cameraTrauma = 0;
      defeatDelayTimer = 0;
      pendingOutcome = null;
      pointerTargetWorld = null;
      keysHeld.clear();
      keysJustPressed.clear();
      camCurrentX = player.x;
      camCurrentY = player.y;

      seedWeatherParticles(overrideSceneId || stateRef.current.sceneId);
      broadcastHud(true);
    };

    const completeMathStation = (
      stationId: string,
      pointsAwarded: number,
      nextStreak: number
    ) => {
      const scene = SCENES_BY_ID[stateRef.current.sceneId];
      // If triggered from HUD practice button, ignite the next unlit lantern on the trail
      const resolvedStationId =
        stationId === 'practice_trail'
          ? (['lantern_1', 'lantern_2', 'lantern_3'] as const).find(
              (id) => !litLanterns.has(id)
            ) || 'campfire_main'
          : stationId;

      const targetObj = scene.objects.find(
        (o) => o.interactionId === resolvedStationId
      );
      const fxX = targetObj ? targetObj.x : player.x;
      const fxY = targetObj ? targetObj.y : player.y;

      mathSolvedCount += 1;
      mathStreak = nextStreak;
      maxMathStreak = Math.max(maxMathStreak, mathStreak);
      score += pointsAwarded;
      bestScore = Math.max(bestScore, score);
      keysHeld.clear();
      keysJustPressed.clear();

      if (resolvedStationId.startsWith('lantern_')) {
        litLanterns.add(resolvedStationId);
        player.warmth = Math.min(player.maxWarmth, player.warmth + 30);
        player.hp = Math.min(player.maxHp, player.hp + 15);
        // Trigger bioluminescent firefly burst + orbiting firefly swarm around the lit lantern
        spawnLanternFireflies(
          particlePool,
          particleCursorRef,
          fxX + 8,
          fxY - 12,
          20
        );
        // Also spawn celebratory fireflies around Késsia in the camera view
        spawnLanternFireflies(
          particlePool,
          particleCursorRef,
          player.x,
          player.y - 18,
          12
        );
      } else if (resolvedStationId === 'campfire_main') {
        campfireLit = true;
        player.hp = player.maxHp;
        player.warmth = player.maxWarmth;
        spawnLanternFireflies(
          particlePool,
          particleCursorRef,
          fxX,
          fxY - 14,
          16
        );
        for (let i = 0; i < 20; i++) {
          const ang = (Math.PI * 2 * i) / 20;
          spawnParticle(
            fxX,
            fxY - 14,
            Math.cos(ang) * 70,
            Math.sin(ang) * 50 - 35,
            4.2,
            0.8,
            '#f97316',
            'ember'
          );
        }
      } else if (resolvedStationId.startsWith('pack_')) {
        collectedPacks.add(resolvedStationId);
        player.hp = Math.min(player.maxHp, player.hp + 25);
        player.warmth = Math.min(player.maxWarmth, player.warmth + 25);
        for (let i = 0; i < 16; i++) {
          const ang = (Math.PI * 2 * i) / 16;
          spawnParticle(
            fxX,
            fxY - 12,
            Math.cos(ang) * 55,
            Math.sin(ang) * 55,
            3.4,
            0.6,
            '#34d399',
            'spark'
          );
        }
      } else if (resolvedStationId === 'summit_tent') {
        summitReached = true;
        score += 400 + Math.round(player.hp * 2);
        bestScore = Math.max(bestScore, score);
        soundEngine.playVictory();
        const curSceneId = stateRef.current.sceneId;
        stateRef.current.onOutcome({
          outcome: 'victory',
          sceneId: curSceneId,
          sceneTitle: SCENE_PALETTES[curSceneId].title,
          score: Math.round(score),
          bestScore: Math.round(bestScore),
          clearTimeSec: Math.round(elapsedSec),
          lanternsLit: litLanterns.size,
          totalLanterns: 3,
          packsCollected: collectedPacks.size,
          totalPacks: 2,
          enemiesDefeated,
          damageTaken: Math.round(damageTaken),
          mathSolvedCount,
          maxMathStreak,
        });
      }

      broadcastHud(true);
    };

    externalControlRef.current.resetRun = resetRun;
    externalControlRef.current.completeMathStation = completeMathStation;
    seedWeatherParticles(stateRef.current.sceneId);

    const findNearbyInteractive = (
      scene: typeof SCENES_BY_ID.day_forest
    ): { obj: SceneObject; prompt: string; interactionId: string } | null => {
      let best: {
        obj: SceneObject;
        dist: number;
        prompt: string;
        interactionId: string;
      } | null = null;
      for (const obj of scene.objects) {
        if (!obj.interactive || !obj.interactionId) continue;
        const dist = Math.hypot(player.x - obj.x, player.y - obj.y);
        if (dist > 84) continue;

        if (obj.interactionId.startsWith('lantern_')) {
          if (litLanterns.has(obj.interactionId)) continue;
          if (!best || dist < best.dist) {
            best = {
              obj,
              dist,
              interactionId: obj.interactionId,
              prompt: '[E] Resolver Desafio Matemático da Lanterna (+150 pts)',
            };
          }
        } else if (obj.interactionId === 'campfire_main') {
          const label = campfireLit
            ? '[E] Novo Desafio na Fogueira (+Vida/Calor)'
            : '[E] Resolver Equação da Fogueira Central (+250 pts)';
          if (!best || dist < best.dist) {
            best = {
              obj,
              dist,
              interactionId: obj.interactionId,
              prompt: label,
            };
          }
        } else if (obj.interactionId.startsWith('pack_')) {
          if (collectedPacks.has(obj.interactionId)) continue;
          if (!best || dist < best.dist) {
            best = {
              obj,
              dist,
              interactionId: obj.interactionId,
              prompt: '[E] Desafio da Mochila de Suprimentos (+180 pts)',
            };
          }
        } else if (obj.interactionId === 'summit_tent') {
          const ready = litLanterns.size >= 3 && campfireLit;
          const label = ready
            ? '[E] Desafio Final da Barraca (Concluir Expedição!)'
            : `Resolva as 3 Lanternas (${litLanterns.size}/3) e a Fogueira (${
                campfireLit ? '1/1' : '0/1'
              })`;
          if (!best || dist < best.dist) {
            best = {
              obj,
              dist,
              interactionId: obj.interactionId,
              prompt: label,
            };
          }
        }
      }
      return best
        ? {
            obj: best.obj,
            prompt: best.prompt,
            interactionId: best.interactionId,
          }
        : null;
    };

    const broadcastHud = (force = false) => {
      const now = performance.now();
      if (!force && now - lastHudBroadcast < 90) return;
      lastHudBroadcast = now;

      const curSceneId = stateRef.current.sceneId;
      const palette = SCENE_PALETTES[curSceneId];
      const scene = SCENES_BY_ID[curSceneId];
      const nearby = findNearbyInteractive(scene);

      stateRef.current.onHudUpdate({
        sceneId: curSceneId,
        sceneTitle: palette.title,
        atmosphere: palette.atmosphere,
        hp: Math.max(0, Math.round(player.hp)),
        maxHp: player.maxHp,
        warmth: Math.max(0, Math.round(player.warmth)),
        maxWarmth: player.maxWarmth,
        score: Math.round(score),
        bestScore: Math.round(bestScore),
        lanternsLit: litLanterns.size,
        totalLanterns: 3,
        campfireLit,
        packsCollected: collectedPacks.size,
        totalPacks: 2,
        bridgeCrossed,
        summitReached,
        elapsedSec,
        nearbyPrompt: nearby ? nearby.prompt : null,
        nearbyInteractionId: nearby ? nearby.interactionId : null,
        activeWave,
        enemiesDefeated,
        qaOverlayEnabled: stateRef.current.qaOverlayEnabled,
        mathSolvedCount,
        mathStreak,
      });
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (stateRef.current.isMathModalOpen) return;

      const code = e.code;
      if (stateRef.current.gameState === 'title') {
        if (code === 'Enter' || code === 'Space') {
          e.preventDefault();
          stateRef.current.onStartFromTitle();
        }
        return;
      }

      if (code === 'Escape' || code === 'KeyP') {
        e.preventDefault();
        stateRef.current.onTogglePause();
        return;
      }

      if (!keysHeld.has(code)) {
        keysJustPressed.add(code);
      }
      keysHeld.add(code);

      if (
        [
          'ArrowUp',
          'ArrowDown',
          'ArrowLeft',
          'ArrowRight',
          'Space',
        ].includes(code)
      ) {
        e.preventDefault();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keysHeld.delete(e.code);
    };

    const clearHeldInputs = () => {
      keysHeld.clear();
      keysJustPressed.clear();
      pointerTargetWorld = null;
    };

    const screenToWorld = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      const vp = computeCameraViewport(
        camCurrentX,
        camCurrentY,
        canvasW,
        canvasH,
        941,
        1672
      );
      const offsetX = (canvasW - vp.viewWorldW * vp.scale) * 0.5;
      const offsetY = (canvasH - vp.viewWorldH * vp.scale) * 0.5;
      const localX = clientX - rect.left - offsetX;
      const localY = clientY - rect.top - offsetY;
      return {
        x: vp.camX + localX / vp.scale,
        y: vp.camY + localY / vp.scale,
      };
    };

    const onPointerDown = (e: PointerEvent) => {
      if (
        stateRef.current.gameState !== 'playing' ||
        stateRef.current.isMathModalOpen
      ) {
        return;
      }
      const worldPt = screenToWorld(e.clientX, e.clientY);
      pointerTargetWorld = worldPt;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', clearHeldInputs);
    canvas.addEventListener('pointerdown', onPointerDown);

    const executeInteraction = (scene: typeof SCENES_BY_ID.day_forest) => {
      const nearby = findNearbyInteractive(scene);
      if (!nearby) return;
      const id = nearby.interactionId;

      if (id === 'summit_tent' && (litLanterns.size < 3 || !campfireLit)) {
        soundEngine.playEnemyTelegraph();
        return;
      }

      keysHeld.clear();
      keysJustPressed.clear();
      pointerTargetWorld = null;
      stateRef.current.onRequestMathChallenge(id);
    };

    const stepSimulation = (rawDt: number) => {
      const dt = Math.min(rawDt, 0.05);
      const curState = stateRef.current.gameState;
      const curSceneId = stateRef.current.sceneId;
      const scene = SCENES_BY_ID[curSceneId];

      cameraTrauma = Math.max(0, cameraTrauma - dt * 2.4);
      player.scaleX += (1 - player.scaleX) * (1 - Math.exp(-14 * dt));
      player.scaleY += (1 - player.scaleY) * (1 - Math.exp(-14 * dt));

      if (curState === 'title') {
        titleTourTime += dt;
        const tourT = (Math.sin(titleTourTime * 0.32) + 1) * 0.5;
        camCurrentX = 470 + Math.sin(titleTourTime * 0.65) * 45;
        camCurrentY = 1380 - tourT * 820;
        stepParticles(dt, curSceneId);
        return;
      }

      if (curState !== 'playing' || stateRef.current.isMathModalOpen) {
        stepParticles(dt * 0.3, curSceneId);
        return;
      }

      if (pendingOutcome === 'defeat') {
        defeatDelayTimer -= dt;
        stepParticles(dt, curSceneId);
        if (defeatDelayTimer <= 0) {
          const finalOutcome = pendingOutcome;
          pendingOutcome = null;
          stateRef.current.onOutcome({
            outcome: finalOutcome,
            sceneId: curSceneId,
            sceneTitle: SCENE_PALETTES[curSceneId].title,
            score: Math.round(score),
            bestScore: Math.round(bestScore),
            clearTimeSec: Math.round(elapsedSec),
            lanternsLit: litLanterns.size,
            totalLanterns: 3,
            packsCollected: collectedPacks.size,
            totalPacks: 2,
            enemiesDefeated,
            damageTaken: Math.round(damageTaken),
            mathSolvedCount,
            maxMathStreak,
          });
        }
        return;
      }

      if (hitstopTimer > 0) {
        hitstopTimer = Math.max(0, hitstopTimer - dt);
        stepParticles(dt * 0.25, curSceneId);
        keysJustPressed.clear();
        return;
      }

      const simDt = dt;
      elapsedSec += simDt;

      const ext = externalControlRef.current;
      const attackEdge =
        keysJustPressed.has('Space') ||
        keysJustPressed.has('KeyJ') ||
        ext.triggerAttack;
      const dashEdge =
        keysJustPressed.has('ShiftLeft') ||
        keysJustPressed.has('ShiftRight') ||
        keysJustPressed.has('KeyK') ||
        ext.triggerDash;
      const interactEdge =
        keysJustPressed.has('KeyE') ||
        keysJustPressed.has('KeyF') ||
        ext.triggerInteract;

      ext.triggerAttack = false;
      ext.triggerDash = false;
      ext.triggerInteract = false;
      keysJustPressed.clear();

      if (attackEdge) player.attackBufferTimer = 0.12;
      if (dashEdge) player.dashBufferTimer = 0.12;

      player.attackBufferTimer = Math.max(0, player.attackBufferTimer - simDt);
      player.dashBufferTimer = Math.max(0, player.dashBufferTimer - simDt);
      player.attackCooldown = Math.max(0, player.attackCooldown - simDt);
      player.dashCooldown = Math.max(0, player.dashCooldown - simDt);
      player.invulnTimer = Math.max(0, player.invulnTimer - simDt);
      player.hitFlashTimer = Math.max(0, player.hitFlashTimer - simDt);

      if (interactEdge) {
        executeInteraction(scene);
      }

      if (
        player.dashBufferTimer > 0 &&
        player.dashCooldown <= 0 &&
        player.dashTimer <= 0
      ) {
        player.dashBufferTimer = 0;
        player.dashTimer = 0.18;
        player.dashCooldown = 0.65;
        player.invulnTimer = 0.24;
        player.scaleX = 1.22;
        player.scaleY = 0.8;
        soundEngine.playDash();
        for (let i = 0; i < 8; i++) {
          spawnParticle(
            player.x,
            player.y,
            (Math.random() - 0.5) * 60,
            (Math.random() - 0.5) * 40,
            3.2,
            0.35,
            '#d6d3d1',
            'dust'
          );
        }
      }

      if (
        player.attackBufferTimer > 0 &&
        player.attackCooldown <= 0 &&
        player.attackPhase === 'none'
      ) {
        player.attackBufferTimer = 0;
        player.attackPhase = 'windup';
        player.attackTimer = 0.07;
        player.attackCooldown = 0.36;
        player.scaleX = 0.9;
        player.scaleY = 1.12;
        soundEngine.playStaffSwing();
      }

      if (player.attackPhase === 'windup') {
        player.attackTimer -= simDt;
        if (player.attackTimer <= 0) {
          player.attackPhase = 'active';
          player.attackTimer = 0.12;
          player.scaleX = 1.16;
          player.scaleY = 0.86;

          const attackCenterX = player.x + player.facingX * 36;
          const attackCenterY = player.y + player.facingY * 36;
          const attackRadius = 68;

          for (const proj of projectiles) {
            if (
              !proj.fromPlayer &&
              Math.hypot(proj.x - attackCenterX, proj.y - attackCenterY) <=
                attackRadius
            ) {
              proj.fromPlayer = true;
              proj.vx = -proj.vx * 1.3;
              proj.vy = -proj.vy * 1.3;
              proj.color = '#fbbf24';
              score += 35;
            }
          }

          let hitAny = false;
          for (const enemy of enemies) {
            if (enemy.phase === 'ko') continue;
            const dist = Math.hypot(
              enemy.x - attackCenterX,
              enemy.y - attackCenterY
            );
            if (dist <= attackRadius + enemy.radius) {
              hitAny = true;
              enemy.hp -= 24;
              enemy.hitFlashTimer = 0.06;
              const pushX = enemy.x - player.x;
              const pushY = enemy.y - player.y;
              const pushLen = Math.hypot(pushX, pushY) || 1;
              const moved = resolveMovement(
                enemy.x,
                enemy.y,
                (pushX / pushLen) * 28,
                (pushY / pushLen) * 28,
                scene,
                enemy.radius
              );
              enemy.x = moved.x;
              enemy.y = moved.y;

              for (let i = 0; i < 14; i++) {
                const ang = Math.random() * Math.PI * 2;
                spawnParticle(
                  enemy.x,
                  enemy.y - 14,
                  Math.cos(ang) * (50 + Math.random() * 80),
                  Math.sin(ang) * (50 + Math.random() * 80),
                  3.4,
                  0.42,
                  '#fde047',
                  'spark'
                );
              }

              if (enemy.hp <= 0) {
                enemy.phase = 'ko';
                enemy.phaseTimer = 0.38;
                enemy.vx = (pushX / pushLen) * 180;
                enemy.vy = (pushY / pushLen) * 180;
                enemiesDefeated += 1;
                score += 120;
                bestScore = Math.max(bestScore, score);
              }
            }
          }

          if (hitAny) {
            hitstopTimer = 0.048;
            cameraTrauma = Math.min(1, cameraTrauma + 0.42);
            soundEngine.playHeavyHit();
          }
        }
      } else if (player.attackPhase === 'active') {
        player.attackTimer -= simDt;
        if (player.attackTimer <= 0) {
          player.attackPhase = 'recovery';
          player.attackTimer = 0.1;
        }
      } else if (player.attackPhase === 'recovery') {
        player.attackTimer -= simDt;
        if (player.attackTimer <= 0) {
          player.attackPhase = 'none';
        }
      }

      let moveX = ext.moveX;
      let moveY = ext.moveY;
      if (keysHeld.has('KeyA') || keysHeld.has('ArrowLeft')) moveX -= 1;
      if (keysHeld.has('KeyD') || keysHeld.has('ArrowRight')) moveX += 1;
      if (keysHeld.has('KeyW') || keysHeld.has('ArrowUp')) moveY -= 1;
      if (keysHeld.has('KeyS') || keysHeld.has('ArrowDown')) moveY += 1;

      if (moveX !== 0 || moveY !== 0) {
        pointerTargetWorld = null;
      } else if (pointerTargetWorld) {
        const dx = pointerTargetWorld.x - player.x;
        const dy = pointerTargetWorld.y - player.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 10) {
          moveX = dx / dist;
          moveY = dy / dist;
        } else {
          pointerTargetWorld = null;
        }
      }

      const moveLen = Math.hypot(moveX, moveY);
      if (moveLen > 0.01) {
        const normX = moveX / moveLen;
        const normY = moveY / moveLen;
        player.facingX = normX;
        player.facingY = normY;

        const baseSpeed = player.dashTimer > 0 ? 390 : 185;
        const stepX = normX * baseSpeed * simDt;
        const stepY = normY * baseSpeed * simDt;
        const prevX = player.x;
        const prevY = player.y;
        const resolved = resolveMovement(
          player.x,
          player.y,
          stepX,
          stepY,
          scene,
          14
        );
        player.x = resolved.x;
        player.y = resolved.y;

        const traveled = Math.hypot(player.x - prevX, player.y - prevY);
        player.walkDistance += traveled;

        if (player.walkDistance - lastStepSoundDist >= 46) {
          lastStepSoundDist = player.walkDistance;
          const onBridge = player.y >= 835 && player.y <= 985;
          soundEngine.playFootstep(onBridge);
          spawnParticle(
            player.x + (Math.random() - 0.5) * 10,
            player.y,
            (Math.random() - 0.5) * 16,
            -8,
            2.4,
            0.32,
            onBridge ? '#d97706' : '#a8a29e',
            'dust'
          );
        }
      }

      if (player.dashTimer > 0) {
        player.dashTimer = Math.max(0, player.dashTimer - simDt);
      }

      if (!bridgeCrossed && player.y < 835) {
        bridgeCrossed = true;
        score += 100;
        bestScore = Math.max(bestScore, score);
      }

      const isColdScene =
        curSceneId === 'snow' || curSceneId === 'rain' || curSceneId === 'night';
      let nearHeatSource = false;
      if (campfireLit && Math.hypot(player.x - 470, player.y - 560) < 130) {
        nearHeatSource = true;
      }
      for (const obj of scene.objects) {
        if (
          obj.interactionId &&
          litLanterns.has(obj.interactionId) &&
          Math.hypot(player.x - obj.x, player.y - obj.y) < 110
        ) {
          nearHeatSource = true;
        }
      }
      if (nearHeatSource) {
        player.warmth = Math.min(player.maxWarmth, player.warmth + 14 * simDt);
      } else if (isColdScene) {
        player.warmth = Math.max(0, player.warmth - 1.8 * simDt);
      }

      let activeAttackers = enemies.filter(
        (e) => e.phase === 'windup' || e.phase === 'active'
      ).length;

      for (const enemy of enemies) {
        const canAttack = activeAttackers < 2;
        const ev = updateEnemyBehavior(enemy, player, simDt, scene, canAttack);
        if (ev.telegraphStarted) {
          activeAttackers += 1;
          soundEngine.playEnemyTelegraph();
        }
        if (ev.spawnedProjectiles.length > 0) {
          projectiles.push(...ev.spawnedProjectiles);
        }
        if (ev.playerHitDamage > 0 && player.invulnTimer <= 0) {
          applyPlayerDamage(ev.playerHitDamage);
        }
      }

      enemies = enemies.filter(
        (e) => !(e.phase === 'ko' && e.phaseTimer <= 0)
      );

      for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];
        p.ttl -= simDt;
        p.x += p.vx * simDt;
        p.y += p.vy * simDt;

        if (p.ttl <= 0) {
          projectiles.splice(i, 1);
          continue;
        }

        if (!p.fromPlayer) {
          if (
            Math.hypot(p.x - player.x, p.y - (player.y - 12)) <
              p.radius + 14 &&
            player.invulnTimer <= 0
          ) {
            applyPlayerDamage(12);
            projectiles.splice(i, 1);
          }
        } else {
          for (const enemy of enemies) {
            if (enemy.phase === 'ko') continue;
            if (
              Math.hypot(p.x - enemy.x, p.y - (enemy.y - 12)) <
              p.radius + enemy.radius
            ) {
              enemy.hp -= 25;
              enemy.hitFlashTimer = 0.06;
              hitstopTimer = 0.04;
              projectiles.splice(i, 1);
              if (enemy.hp <= 0) {
                enemy.phase = 'ko';
                enemy.phaseTimer = 0.35;
                enemiesDefeated += 1;
                score += 120;
              }
              break;
            }
          }
        }
      }

      const camLambda = 8.5;
      camCurrentX +=
        (player.x - camCurrentX) * (1 - Math.exp(-camLambda * simDt));
      camCurrentY +=
        (player.y - camCurrentY) * (1 - Math.exp(-camLambda * simDt));

      stepParticles(simDt, curSceneId);
      broadcastHud(false);
    };

    const applyPlayerDamage = (amount: number) => {
      player.hp = Math.max(0, player.hp - amount);
      damageTaken += amount;
      player.invulnTimer = 0.65;
      player.hitFlashTimer = 0.06;
      player.scaleX = 1.2;
      player.scaleY = 0.8;
      hitstopTimer = 0.05;
      cameraTrauma = Math.min(1, cameraTrauma + 0.6);
      soundEngine.playPlayerHurt();

      for (let i = 0; i < 16; i++) {
        const ang = (Math.PI * 2 * i) / 16;
        spawnParticle(
          player.x,
          player.y - 14,
          Math.cos(ang) * 75,
          Math.sin(ang) * 75,
          3.5,
          0.45,
          '#ef4444',
          'spark'
        );
      }

      broadcastHud(true);

      if (player.hp <= 0 && !pendingOutcome) {
        pendingOutcome = 'defeat';
        defeatDelayTimer = 0.5;
        soundEngine.playDefeat();
      }
    };

    const stepParticles = (dt: number, curSceneId: SceneId) => {
      if (lastSeededSceneId !== curSceneId) {
        seedWeatherParticles(curSceneId);
      }

      if (Math.random() < 0.45) {
        spawnParticle(
          470 + (Math.random() - 0.5) * 22,
          552,
          (Math.random() - 0.5) * 18,
          -35 - Math.random() * 35,
          2.6,
          0.85,
          campfireLit ? '#fb923c' : '#fde047',
          'ember'
        );
      }

      const nowSec = performance.now() * 0.001;
      for (let i = 0; i < MAX_PARTICLES; i++) {
        stepSingleParticle(
          particlePool[i],
          dt,
          nowSec,
          curSceneId,
          camCurrentY
        );
      }
    };

    const renderWorld = () => {
      const curSceneId = stateRef.current.sceneId;
      const palette = SCENE_PALETTES[curSceneId];
      const scene = SCENES_BY_ID[curSceneId];
      const nowSec = performance.now() * 0.001;

      ctx.save();
      ctx.scale(dpr, dpr);

      ctx.fillStyle = '#070d0a';
      ctx.fillRect(0, 0, canvasW, canvasH);

      const vp = computeCameraViewport(
        camCurrentX,
        camCurrentY,
        canvasW,
        canvasH,
        941,
        1672
      );

      const shakeMag = cameraTrauma * cameraTrauma * 12;
      const shakeX = (Math.random() - 0.5) * 2 * shakeMag;
      const shakeY = (Math.random() - 0.5) * 2 * shakeMag;

      const offsetX = (canvasW - vp.viewWorldW * vp.scale) * 0.5 + shakeX;
      const offsetY = (canvasH - vp.viewWorldH * vp.scale) * 0.5 + shakeY;

      ctx.translate(offsetX, offsetY);
      ctx.scale(vp.scale, vp.scale);

      ctx.beginPath();
      ctx.rect(0, 0, vp.viewWorldW, vp.viewWorldH);
      ctx.clip();

      ctx.translate(-vp.camX, -vp.camY);

      // 1. LAYER: BG-001 Sky & Mountains
      const skyGrad = ctx.createLinearGradient(0, 0, 0, 560);
      skyGrad.addColorStop(0, palette.skyTop);
      skyGrad.addColorStop(1, palette.skyBottom);
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, 941, 600);

      const parallaxY = vp.camY * 0.25;
      ctx.save();
      if (curSceneId === 'night') {
        ctx.fillStyle = 'rgba(254, 249, 195, 0.16)';
        ctx.beginPath();
        ctx.arc(710, 145 + parallaxY * 0.4, 72, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fef9c3';
        ctx.beginPath();
        ctx.arc(710, 145 + parallaxY * 0.4, 36, 0, Math.PI * 2);
        ctx.fill();
      } else if (
        curSceneId === 'day_golden' ||
        curSceneId === 'sunset' ||
        curSceneId === 'day_forest'
      ) {
        ctx.fillStyle = 'rgba(253, 224, 71, 0.22)';
        ctx.beginPath();
        ctx.arc(470, 130 + parallaxY * 0.4, 95, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      ctx.fillStyle = palette.mountainFar;
      ctx.beginPath();
      ctx.moveTo(0, 360);
      ctx.lineTo(180, 175);
      ctx.lineTo(390, 270);
      ctx.lineTo(610, 150);
      ctx.lineTo(810, 255);
      ctx.lineTo(941, 190);
      ctx.lineTo(941, 460);
      ctx.lineTo(0, 460);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = palette.mountainNear;
      ctx.beginPath();
      ctx.moveTo(0, 410);
      ctx.lineTo(140, 260);
      ctx.lineTo(340, 325);
      ctx.lineTo(520, 230);
      ctx.lineTo(740, 310);
      ctx.lineTo(941, 245);
      ctx.lineTo(941, 520);
      ctx.lineTo(0, 520);
      ctx.closePath();
      ctx.fill();

      // 2. LAYER: GR-001 Forest Floor & Winding Trail
      ctx.fillStyle = palette.groundBase;
      ctx.fillRect(0, 270, 941, 1402);

      const groundGrad = ctx.createLinearGradient(0, 270, 0, 1672);
      groundGrad.addColorStop(0, 'rgba(0,0,0,0.22)');
      groundGrad.addColorStop(0.5, 'rgba(0,0,0,0)');
      groundGrad.addColorStop(1, 'rgba(0,0,0,0.32)');
      ctx.fillStyle = groundGrad;
      ctx.fillRect(0, 270, 941, 1402);

      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = palette.trailEdge;
      ctx.lineWidth = 176;
      ctx.beginPath();
      ctx.moveTo(470, 1640);
      ctx.bezierCurveTo(430, 1420, 515, 1180, 470, 965);
      ctx.lineTo(470, 845);
      ctx.bezierCurveTo(450, 710, 490, 520, 470, 340);
      ctx.stroke();

      ctx.strokeStyle = palette.trailMain;
      ctx.lineWidth = 148;
      ctx.stroke();
      ctx.restore();

      ctx.fillStyle = palette.trailMain;
      ctx.beginPath();
      ctx.ellipse(470, 560, 210, 145, 0, 0, Math.PI * 2);
      ctx.fill();

      // 3. LAYER: GR-002 Cliff Borders
      ctx.fillStyle = palette.rockBase;
      ctx.fillRect(0, 270, 185, 1402);
      ctx.fillRect(756, 270, 185, 1402);
      ctx.fillStyle = palette.foliageDark;
      ctx.fillRect(0, 270, 155, 1402);
      ctx.fillRect(786, 270, 155, 1402);

      // 4. LAYER: WA-001 & WA-002 River
      const riverGrad = ctx.createLinearGradient(0, 855, 0, 965);
      riverGrad.addColorStop(0, '#082f49');
      riverGrad.addColorStop(0.5, palette.riverDeep);
      riverGrad.addColorStop(1, '#082f49');
      ctx.fillStyle = riverGrad;
      ctx.fillRect(0, 855, 941, 110);

      ctx.strokeStyle = palette.rockBase;
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(0, 855);
      ctx.lineTo(941, 855);
      ctx.moveTo(0, 965);
      ctx.lineTo(941, 965);
      ctx.stroke();

      ctx.strokeStyle = palette.riverFoam;
      ctx.lineWidth = 2.5;
      ctx.globalAlpha = 0.55;
      for (let r = 0; r < 14; r++) {
        const flowX = ((r * 85 + nowSec * 65) % 960) - 20;
        const flowY = 875 + (r % 4) * 22;
        ctx.beginPath();
        ctx.moveTo(flowX, flowY);
        ctx.quadraticCurveTo(flowX + 20, flowY - 4, flowX + 42, flowY);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // 5. SORT & DRAW ALL 2.5D ENTITIES BY `fixedGroupsThenFootY`
      const renderQueue: RenderableItem[] = [];

      for (const obj of scene.objects) {
        renderQueue.push({
          id: obj.id,
          depthGroup: obj.depthGroup,
          footY: obj.y,
          kind: 'object',
          ref: obj,
        });
      }

      renderQueue.push({
        id: 'player_kessia_ch001',
        depthGroup: 'dynamic-y',
        footY: player.y,
        kind: 'player',
      });

      for (const enemy of enemies) {
        renderQueue.push({
          id: enemy.id,
          depthGroup: 'dynamic-y',
          footY: enemy.y,
          kind: 'enemy',
          ref: enemy,
        });
      }

      for (const proj of projectiles) {
        renderQueue.push({
          id: proj.id,
          depthGroup: 'dynamic-y',
          footY: proj.y,
          kind: 'projectile',
          ref: proj,
        });
      }

      for (const occ of scene.occluders) {
        const isOccluding = isPlayerOccludedByCanopy(player.x, player.y, occ);
        renderQueue.push({
          id: occ.id,
          depthGroup: isOccluding ? 'front-of-player' : 'dynamic-y',
          footY: occ.y + 0.1,
          kind: 'occluder',
          ref: occ,
        });
      }

      const sortedRenderables = sortRenderablesByFootY(renderQueue);

      for (const item of sortedRenderables) {
        if (item.kind === 'object') {
          drawSceneObject(
            ctx,
            item.ref as SceneObject,
            palette,
            nowSec,
            litLanterns,
            collectedPacks,
            campfireLit
          );
        } else if (item.kind === 'occluder') {
          const occ = item.ref as SceneObject;
          const isOccludingPlayer = isPlayerOccludedByCanopy(
            player.x,
            player.y,
            occ
          );
          drawTreeCanopyOccluder(
            ctx,
            occ,
            palette,
            nowSec,
            isOccludingPlayer
          );
        } else if (item.kind === 'enemy') {
          drawEnemy(ctx, item.ref as EnemyEntity, nowSec);
        } else if (item.kind === 'projectile') {
          const p = item.ref as ProjectileEntity;
          ctx.save();
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y - 12, p.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.restore();
        } else if (item.kind === 'player') {
          drawKessiaPlayer(ctx, player, kessiaSpriteCanvas, nowSec);
        }
      }

      // 6. LAYER: Weather, Falling Leaves & Firefly Particles
      for (let i = 0; i < MAX_PARTICLES; i++) {
        drawParticleSlot(ctx, particlePool[i], nowSec, curSceneId);
      }

      // 7. LAYER: Atmospheric Sun Rays / Fog
      if (
        curSceneId === 'day_golden' ||
        curSceneId === 'sunset' ||
        curSceneId === 'mist'
      ) {
        ctx.save();
        const rayGrad = ctx.createLinearGradient(
          180,
          vp.camY,
          720,
          vp.camY + 650
        );
        rayGrad.addColorStop(0, 'rgba(253, 224, 71, 0.16)');
        rayGrad.addColorStop(1, 'rgba(253, 224, 71, 0)');
        ctx.fillStyle = rayGrad;
        ctx.beginPath();
        ctx.moveTo(120, vp.camY);
        ctx.lineTo(420, vp.camY);
        ctx.lineTo(780, vp.camY + 900);
        ctx.lineTo(340, vp.camY + 900);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      if (palette.fogOpacity > 0.15) {
        ctx.save();
        ctx.fillStyle = palette.fogColor;
        const drift = Math.sin(nowSec * 0.5) * 40;
        ctx.fillRect(0, vp.camY + 180 + drift, 941, 220);
        ctx.fillRect(0, vp.camY + 520 - drift, 941, 190);
        ctx.restore();
      }

      if (stateRef.current.qaOverlayEnabled) {
        drawQaOverlay(ctx, scene, player);
      }

      ctx.restore();
    };

    let rafId = 0;
    let lastTime = performance.now();

    const tick = (now: number) => {
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      stepSimulation(rawDt);
      renderWorld();
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    broadcastHud(true);

    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', clearHeldInputs);
      canvas.removeEventListener('pointerdown', onPointerDown);
    };
  }, [externalControlRef]);

  return (
    <div
      ref={mountRef}
      className="absolute inset-0 w-full h-full overflow-hidden bg-[#070d0a]"
      aria-label="Mundo 2.5D da Trilha Matemática da Késsia"
    />
  );
};

function drawSceneObject(
  ctx: CanvasRenderingContext2D,
  obj: SceneObject,
  palette: typeof SCENE_PALETTES.day_forest,
  nowSec: number,
  litLanterns: Set<string>,
  collectedPacks: Set<string>,
  campfireLit: boolean
) {
  ctx.save();

  switch (obj.asset) {
    case 'PR-007': {
      const bx = obj.x - 58;
      const by = 835;
      const bw = 116;
      const bh = 150;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
      ctx.fillRect(bx + 6, by + 6, bw, bh);

      ctx.fillStyle = '#5c3a21';
      ctx.fillRect(bx, by, 10, bh);
      ctx.fillRect(bx + bw - 10, by, 10, bh);

      for (let py = by + 6; py < by + bh - 4; py += 14) {
        ctx.fillStyle = py % 28 === 0 ? '#855836' : '#734829';
        ctx.fillRect(bx + 6, py, bw - 12, 11);
        ctx.strokeStyle = '#3e2412';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(bx + 6, py, bw - 12, 11);
      }

      ctx.fillStyle = '#3e2412';
      for (const postY of [by + 8, by + 75, by + bh - 12]) {
        ctx.fillRect(bx - 3, postY, 12, 12);
        ctx.fillRect(bx + bw - 9, postY, 12, 12);
      }
      break;
    }

    case 'PR-001': {
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.ellipse(obj.x, obj.y - 6, 68, 24, 0, 0, Math.PI * 2);
      ctx.fill();

      if (litLanterns.size >= 3 && campfireLit) {
        const glow = ctx.createRadialGradient(
          obj.x,
          obj.y - 35,
          10,
          obj.x,
          obj.y - 35,
          125
        );
        glow.addColorStop(0, 'rgba(251, 191, 36, 0.55)');
        glow.addColorStop(1, 'rgba(251, 191, 36, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(obj.x, obj.y - 35, 125, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = '#ea580c';
      ctx.beginPath();
      ctx.moveTo(obj.x - 62, obj.y);
      ctx.lineTo(obj.x, obj.y - 92);
      ctx.lineTo(obj.x + 62, obj.y);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#7c2d12';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.fillStyle = '#1e3a8a';
      ctx.beginPath();
      ctx.moveTo(obj.x - 42, obj.y - 32);
      ctx.lineTo(obj.x, obj.y - 92);
      ctx.lineTo(obj.x + 42, obj.y - 32);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle =
        litLanterns.size >= 3 && campfireLit ? '#fef08a' : '#292524';
      ctx.beginPath();
      ctx.moveTo(obj.x - 20, obj.y);
      ctx.lineTo(obj.x, obj.y - 52);
      ctx.lineTo(obj.x + 20, obj.y);
      ctx.closePath();
      ctx.fill();
      break;
    }

    case 'PR-002': {
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.beginPath();
      ctx.ellipse(obj.x, obj.y, 34, 22, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#451a03';
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(obj.x - 16, obj.y - 6);
      ctx.lineTo(obj.x + 16, obj.y + 4);
      ctx.moveTo(obj.x + 16, obj.y - 6);
      ctx.lineTo(obj.x - 16, obj.y + 4);
      ctx.stroke();

      for (let i = 0; i < 8; i++) {
        const ang = (Math.PI * 2 * i) / 8;
        const sx = obj.x + Math.cos(ang) * 26;
        const sy = obj.y + Math.sin(ang) * 16;
        ctx.fillStyle = i % 2 === 0 ? palette.rockBase : palette.rockHighlight;
        ctx.beginPath();
        ctx.arc(sx, sy, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#1c1917';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      if (!campfireLit) {
        // Math badge above unlit campfire
        drawMathBadge(ctx, obj.x, obj.y - 52, '∑');
      }
      break;
    }

    case 'PR-003': {
      const radius = campfireLit ? 150 : 75;
      const fireGlow = ctx.createRadialGradient(
        obj.x,
        obj.y - 12,
        6,
        obj.x,
        obj.y - 12,
        radius
      );
      fireGlow.addColorStop(
        0,
        campfireLit ? 'rgba(249, 115, 22, 0.55)' : 'rgba(249, 115, 22, 0.28)'
      );
      fireGlow.addColorStop(1, 'rgba(249, 115, 22, 0)');
      ctx.fillStyle = fireGlow;
      ctx.beginPath();
      ctx.arc(obj.x, obj.y - 12, radius, 0, Math.PI * 2);
      ctx.fill();

      const flameScale = campfireLit ? 1.35 : 0.75;
      const flicker = Math.sin(nowSec * 14) * 4;
      ctx.fillStyle = '#ea580c';
      ctx.beginPath();
      ctx.moveTo(obj.x - 14 * flameScale, obj.y);
      ctx.quadraticCurveTo(
        obj.x - 18 * flameScale,
        obj.y - 28 * flameScale,
        obj.x + flicker,
        obj.y - 46 * flameScale
      );
      ctx.quadraticCurveTo(
        obj.x + 18 * flameScale,
        obj.y - 28 * flameScale,
        obj.x + 14 * flameScale,
        obj.y
      );
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.moveTo(obj.x - 7 * flameScale, obj.y);
      ctx.quadraticCurveTo(
        obj.x,
        obj.y - 28 * flameScale,
        obj.x + flicker * 0.5,
        obj.y - 30 * flameScale
      );
      ctx.quadraticCurveTo(
        obj.x + 7 * flameScale,
        obj.y - 16 * flameScale,
        obj.x + 7 * flameScale,
        obj.y
      );
      ctx.closePath();
      ctx.fill();
      break;
    }

    case 'PR-004': {
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(obj.x - 28, obj.y - 4, 56, 12);
      ctx.fillStyle = '#78350f';
      ctx.fillRect(obj.x - 27, obj.y - 16, 54, 16);
      ctx.strokeStyle = '#451a03';
      ctx.lineWidth = 2;
      ctx.strokeRect(obj.x - 27, obj.y - 16, 54, 16);
      ctx.fillStyle = '#d97706';
      ctx.beginPath();
      ctx.ellipse(obj.x - 27, obj.y - 8, 5, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'PR-005': {
      if (obj.interactionId && collectedPacks.has(obj.interactionId)) {
        break;
      }
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.ellipse(obj.x, obj.y, 16, 9, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#d97706';
      ctx.fillRect(obj.x - 13, obj.y - 26, 26, 24);
      ctx.fillStyle = '#92400e';
      ctx.fillRect(obj.x - 14, obj.y - 28, 28, 9);
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(obj.x - 4, obj.y - 21, 8, 6);

      drawMathBadge(ctx, obj.x, obj.y - 40, '×');
      break;
    }

    case 'PR-006': {
      const isLit = !!(obj.interactionId && litLanterns.has(obj.interactionId));
      if (isLit) {
        const lanternGlow = ctx.createRadialGradient(
          obj.x,
          obj.y - 36,
          4,
          obj.x,
          obj.y - 36,
          95
        );
        lanternGlow.addColorStop(0, 'rgba(253, 224, 71, 0.55)');
        lanternGlow.addColorStop(1, 'rgba(253, 224, 71, 0)');
        ctx.fillStyle = lanternGlow;
        ctx.beginPath();
        ctx.arc(obj.x, obj.y - 36, 95, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = '#451a03';
      ctx.fillRect(obj.x - 4, obj.y - 48, 8, 48);
      ctx.fillRect(obj.x - 4, obj.y - 48, 18, 5);

      ctx.fillStyle = isLit ? '#fef08a' : '#475569';
      ctx.fillRect(obj.x + 6, obj.y - 43, 12, 15);
      ctx.strokeStyle = isLit ? '#f59e0b' : '#1e293b';
      ctx.lineWidth = 2;
      ctx.strokeRect(obj.x + 6, obj.y - 43, 12, 15);

      if (!isLit) {
        ctx.strokeStyle = 'rgba(251, 191, 36, 0.5)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.ellipse(obj.x, obj.y, 26, 13, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        drawMathBadge(ctx, obj.x + 6, obj.y - 62, '+?');
      }
      break;
    }

    case 'PR-008': {
      ctx.fillStyle = '#5c3a21';
      ctx.fillRect(obj.x - 4, obj.y - 42, 8, 42);
      ctx.fillStyle = '#9a6b43';
      ctx.beginPath();
      ctx.moveTo(obj.x - 18, obj.y - 38);
      ctx.lineTo(obj.x + 18, obj.y - 38);
      ctx.lineTo(obj.x + 25, obj.y - 30);
      ctx.lineTo(obj.x + 18, obj.y - 22);
      ctx.lineTo(obj.x - 18, obj.y - 22);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#3e2412';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      break;
    }

    case 'VE-001':
    case 'VE-002': {
      ctx.fillStyle = 'rgba(0,0,0,0.34)';
      ctx.beginPath();
      ctx.ellipse(obj.x, obj.y, 28, 14, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = palette.trunkColor;
      ctx.fillRect(obj.x - 12, obj.y - 44, 24, 44);
      ctx.strokeStyle = '#1c1917';
      ctx.lineWidth = 2;
      ctx.strokeRect(obj.x - 12, obj.y - 44, 24, 44);
      break;
    }

    case 'RO-001': {
      ctx.fillStyle = 'rgba(0,0,0,0.32)';
      ctx.beginPath();
      ctx.ellipse(obj.x, obj.y + 2, 28, 13, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = palette.rockBase;
      ctx.beginPath();
      ctx.moveTo(obj.x - 24, obj.y);
      ctx.lineTo(obj.x - 18, obj.y - 24);
      ctx.lineTo(obj.x + 6, obj.y - 28);
      ctx.lineTo(obj.x + 25, obj.y - 14);
      ctx.lineTo(obj.x + 22, obj.y);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = palette.rockHighlight;
      ctx.beginPath();
      ctx.moveTo(obj.x - 18, obj.y - 24);
      ctx.lineTo(obj.x + 6, obj.y - 28);
      ctx.lineTo(obj.x + 12, obj.y - 14);
      ctx.lineTo(obj.x - 10, obj.y - 12);
      ctx.closePath();
      ctx.fill();
      break;
    }

    case 'VE-003':
    case 'VE-004':
    case 'VE-005': {
      ctx.fillStyle = palette.foliageMid;
      ctx.beginPath();
      ctx.arc(obj.x - 10, obj.y - 8, 12, 0, Math.PI * 2);
      ctx.arc(obj.x + 10, obj.y - 8, 11, 0, Math.PI * 2);
      ctx.arc(obj.x, obj.y - 14, 14, 0, Math.PI * 2);
      ctx.fill();
      if (obj.asset === 'VE-005') {
        ctx.fillStyle = '#f43f5e';
        ctx.beginPath();
        ctx.arc(obj.x - 6, obj.y - 14, 3.5, 0, Math.PI * 2);
        ctx.arc(obj.x + 7, obj.y - 11, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }

    case 'AN-001': {
      const hop = Math.abs(Math.sin(nowSec * 3.5)) * 5;
      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.arc(obj.x, obj.y - 8 - hop, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(obj.x + 7, obj.y - 13 - hop, 6, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
  }

  ctx.restore();
}

function drawMathBadge(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  symbol: string
) {
  ctx.save();
  ctx.fillStyle = '#f59e0b';
  ctx.beginPath();
  ctx.arc(x, y, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#140e05';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#140e05';
  ctx.font = '700 11px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(symbol, x, y + 0.5);
  ctx.restore();
}

function drawTreeCanopyOccluder(
  ctx: CanvasRenderingContext2D,
  occ: SceneObject,
  palette: typeof SCENE_PALETTES.day_forest,
  nowSec: number,
  isOccludingPlayer: boolean
) {
  ctx.save();
  ctx.globalAlpha = isOccludingPlayer ? 0.82 : 1.0;
  const sway = Math.sin(nowSec * 1.6 + occ.x * 0.05) * 3.5;

  if (occ.asset === 'VE-001') {
    const tiers = [
      { yOff: -36, w: 66, h: 58, color: palette.foliageDark },
      { yOff: -74, w: 54, h: 54, color: palette.foliageMid },
      { yOff: -112, w: 40, h: 50, color: palette.foliageLight },
    ];
    for (const t of tiers) {
      ctx.fillStyle = t.color;
      ctx.beginPath();
      ctx.moveTo(occ.x - t.w + sway * 0.5, occ.y + t.yOff);
      ctx.lineTo(occ.x + sway, occ.y + t.yOff - t.h);
      ctx.lineTo(occ.x + t.w + sway * 0.5, occ.y + t.yOff);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.28)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  } else {
    ctx.fillStyle = palette.foliageDark;
    ctx.beginPath();
    ctx.arc(occ.x - 26 + sway * 0.4, occ.y - 72, 42, 0, Math.PI * 2);
    ctx.arc(occ.x + 26 + sway * 0.4, occ.y - 72, 42, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = palette.foliageMid;
    ctx.beginPath();
    ctx.arc(occ.x + sway * 0.7, occ.y - 96, 48, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = palette.foliageLight;
    ctx.beginPath();
    ctx.arc(occ.x - 10 + sway, occ.y - 106, 28, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

/**
 * Renders Késsia (CH-001) anchored at bottom-center feet (player.x, player.y)
 * using her extracted alpha sprite `/assets/aistudio/kessia-body.webp_20261022122138_1e1c0e1f.png`.
 */
function drawKessiaPlayer(
  ctx: CanvasRenderingContext2D,
  player: PlayerState,
  kessiaSpriteCanvas: HTMLCanvasElement | null,
  nowSec: number
) {
  ctx.save();

  // Warm lantern aura around Késsia
  const aura = ctx.createRadialGradient(
    player.x,
    player.y - 30,
    8,
    player.x,
    player.y - 30,
    120
  );
  aura.addColorStop(0, 'rgba(251, 191, 36, 0.34)');
  aura.addColorStop(1, 'rgba(251, 191, 36, 0)');
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(player.x, player.y - 30, 120, 0, Math.PI * 2);
  ctx.fill();

  // Contact shadow at Késsia's boots (anchor: bottom-center)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.48)';
  ctx.beginPath();
  ctx.ellipse(player.x, player.y, 19, 9, 0, 0, Math.PI * 2);
  ctx.fill();

  // Attack swing arc visual
  if (player.attackPhase === 'active' || player.attackPhase === 'windup') {
    const cx = player.x + player.facingX * 32;
    const cy = player.y - 22 + player.facingY * 32;
    ctx.strokeStyle =
      player.attackPhase === 'active'
        ? 'rgba(253, 224, 71, 0.92)'
        : 'rgba(253, 224, 71, 0.35)';
    ctx.lineWidth = player.attackPhase === 'active' ? 7 : 3;
    ctx.beginPath();
    ctx.arc(cx, cy, 48, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Gait-synced walk bob
  const bob = Math.abs(Math.sin(player.walkDistance * 0.085)) * 5;
  ctx.translate(player.x, player.y - bob);
  ctx.scale(
    player.scaleX * (player.facingX < -0.15 ? -1 : 1),
    player.scaleY
  );

  if (kessiaSpriteCanvas) {
    // Draw Késsia full-body sprite anchored at bottom-center (boots at y=0)
    const spriteH = 88;
    const aspect = kessiaSpriteCanvas.width / (kessiaSpriteCanvas.height || 1);
    const spriteW = spriteH * aspect;
    ctx.drawImage(
      kessiaSpriteCanvas,
      -spriteW / 2,
      -spriteH + 3,
      spriteW,
      spriteH
    );
  } else {
    // Stylized fallback matching Késsia's palette (khaki/blue/red vest, beaded locs)
    ctx.fillStyle = '#78350f';
    ctx.fillRect(-8, -12, 6, 12);
    ctx.fillRect(2, -12, 6, 12);
    ctx.fillStyle = '#a18052';
    ctx.fillRect(-9, -30, 18, 18);
    ctx.fillStyle = '#1d4ed8';
    ctx.fillRect(-11, -50, 22, 20);
    ctx.fillStyle = '#7c2d12';
    ctx.beginPath();
    ctx.arc(0, -60, 12, 0, Math.PI * 2);
    ctx.fill();
  }

  // Glowing Geometric Staff in Késsia's hand
  ctx.strokeStyle = '#fde047';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(22, -8);
  ctx.lineTo(22, -56);
  ctx.stroke();

  ctx.fillStyle = '#fef08a';
  ctx.beginPath();
  ctx.arc(22, -58 + Math.sin(nowSec * 8) * 1.5, 5.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawEnemy(
  ctx: CanvasRenderingContext2D,
  enemy: EnemyEntity,
  nowSec: number
) {
  ctx.save();

  if (enemy.phase === 'windup') {
    const pulse = 0.55 + Math.sin(nowSec * 22) * 0.35;
    if (enemy.archetype === 'charger') {
      ctx.strokeStyle = `rgba(239, 68, 68, ${pulse})`;
      ctx.lineWidth = 22;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(enemy.x, enemy.y);
      ctx.lineTo(enemy.targetX, enemy.targetY);
      ctx.stroke();

      ctx.strokeStyle = '#fca5a5';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(enemy.x, enemy.y);
      ctx.lineTo(enemy.targetX, enemy.targetY);
      ctx.stroke();
    } else if (enemy.archetype === 'spitter') {
      ctx.strokeStyle = `rgba(56, 189, 248, ${pulse})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(enemy.x, enemy.y - 12);
      ctx.lineTo(enemy.targetX, enemy.targetY);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(enemy.targetX, enemy.targetY, 26, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.fillStyle = `rgba(245, 158, 11, ${pulse * 0.28})`;
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, 92, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(251, 191, 36, ${pulse})`;
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  }

  if (enemy.phase === 'active' && enemy.archetype === 'warden') {
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, 92, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.ellipse(
    enemy.x,
    enemy.y,
    enemy.radius,
    enemy.radius * 0.5,
    0,
    0,
    Math.PI * 2
  );
  ctx.fill();

  const isFlash = enemy.hitFlashTimer > 0;
  ctx.translate(enemy.x, enemy.y);
  if (enemy.phase === 'ko') {
    ctx.rotate((1 - enemy.phaseTimer / 0.38) * Math.PI * 0.65);
    ctx.globalAlpha = Math.max(0, enemy.phaseTimer / 0.38);
  }

  if (enemy.archetype === 'charger') {
    ctx.fillStyle = isFlash ? '#ffffff' : '#31102f';
    ctx.beginPath();
    ctx.ellipse(0, -14, 21, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#f43f5e';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.moveTo(enemy.facingX * 16, -12);
    ctx.lineTo(enemy.facingX * 26, -20);
    ctx.lineTo(enemy.facingX * 18, -6);
    ctx.closePath();
    ctx.fill();
  } else if (enemy.archetype === 'spitter') {
    const hover = Math.sin(nowSec * 6) * 5;
    ctx.fillStyle = isFlash ? '#ffffff' : '#0284c7';
    ctx.beginPath();
    ctx.moveTo(0, -36 + hover);
    ctx.lineTo(16, -18 + hover);
    ctx.lineTo(0, -2 + hover);
    ctx.lineTo(-16, -18 + hover);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#bae6fd';
    ctx.lineWidth = 2;
    ctx.stroke();
  } else {
    ctx.fillStyle = isFlash ? '#ffffff' : '#44403c';
    ctx.fillRect(-18, -38, 36, 36);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(-18, -38, 36, 36);
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(-8, -26, 16, 6);
  }

  if (enemy.hp < enemy.maxHp && enemy.phase !== 'ko') {
    const bw = 34;
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(-bw / 2, -48, bw, 5);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(-bw / 2, -48, bw * (enemy.hp / enemy.maxHp), 5);
  }

  ctx.restore();
}

function drawQaOverlay(
  ctx: CanvasRenderingContext2D,
  scene: typeof SCENES_BY_ID.day_forest,
  player: PlayerState
) {
  ctx.save();

  for (const poly of scene.navigation.walkablePolygons) {
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.85)';
    ctx.fillStyle = 'rgba(16, 185, 129, 0.1)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    poly.points.forEach(([px, py], idx) => {
      if (idx === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  for (const poly of scene.navigation.blockedPolygons) {
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.85)';
    ctx.fillStyle = 'rgba(239, 68, 68, 0.16)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    poly.points.forEach(([px, py], idx) => {
      if (idx === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  for (const link of scene.navigation.links) {
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.strokeRect(
      link.bounds.minX,
      link.bounds.minY,
      link.bounds.maxX - link.bounds.minX,
      link.bounds.maxY - link.bounds.minY
    );
  }

  ctx.font = '600 11px "JetBrains Mono", monospace';
  for (const obj of scene.objects) {
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(obj.x - 16, obj.y);
    ctx.lineTo(obj.x + 16, obj.y);
    ctx.stroke();

    ctx.fillStyle = '#fde047';
    ctx.fillText(`${obj.asset} (y:${obj.y})`, obj.x - 28, obj.y + 14);
  }

  ctx.strokeStyle = '#22d3ee';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(player.x - 24, player.y);
  ctx.lineTo(player.x + 24, player.y);
  ctx.stroke();
  ctx.fillStyle = '#22d3ee';
  ctx.fillText(
    `Késsia CH-001 footY:${Math.round(player.y)}`,
    player.x - 58,
    player.y + 16
  );

  ctx.restore();
}
