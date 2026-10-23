import {
  DepthGroup,
  EnemyEntity,
  PlayerState,
  ProjectileEntity,
  SceneContract,
  SceneObject,
} from './types';

export interface RenderableItem {
  id: string;
  depthGroup: DepthGroup;
  footY: number;
  kind: 'object' | 'player' | 'enemy' | 'projectile' | 'occluder';
  ref?: SceneObject | EnemyEntity | ProjectileEntity;
}

/**
 * Ray-casting algorithm for point-in-polygon check
 */
export function isPointInPolygon(
  x: number,
  y: number,
  points: [number, number][]
): boolean {
  if (points.length < 3) return false;
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const xi = points[i][0];
    const yi = points[i][1];
    const xj = points[j][0];
    const yj = points[j][1];

    const intersect =
      yi > y !== yj > y &&
      x < ((xj - xi) * (y - yi)) / (yj - yi + 1e-10) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Checks if a given foot coordinate (x, y) collides with any object base collider.
 * Enforces Section 4.5 & 7 of PLANO_OPERACIONAL.md:
 * - Trees (VE-001, VE-002) collide ONLY at the trunk base, NEVER the canopy bounding box.
 */
export function collidesWithObjectBase(
  x: number,
  y: number,
  obj: SceneObject,
  actorRadius = 14
): boolean {
  if (!obj.collision) return false;

  if (obj.collision.startsWith('trunk_circle_')) {
    const r = Number(obj.collision.replace('trunk_circle_', '')) || 20;
    const dx = x - obj.x;
    const dy = y - obj.y;
    return dx * dx + dy * dy < (r + actorRadius) * (r + actorRadius);
  }

  if (obj.collision.startsWith('circle_')) {
    const parts = obj.collision.split('_');
    const r = Number(parts[parts.length - 1]) || 20;
    const dx = x - obj.x;
    const dy = y - obj.y;
    return dx * dx + dy * dy < (r + actorRadius) * (r + actorRadius);
  }

  if (obj.collision === 'rect_log_54x20') {
    const halfW = 27 + actorRadius;
    const halfH = 12 + actorRadius;
    return (
      Math.abs(x - obj.x) < halfW && Math.abs(y - (obj.y - 6)) < halfH
    );
  }

  if (obj.collision === 'poly_tent_base') {
    const halfW = 52 + actorRadius;
    const halfH = 26 + actorRadius;
    return (
      Math.abs(x - obj.x) < halfW && Math.abs(y - (obj.y - 14)) < halfH
    );
  }

  return false;
}

/**
 * Validates whether (x, y) in virtual 941x1672 world space is navigable.
 * - Must be inside at least one walkablePolygon (or bridge link corridor).
 * - Must NOT be inside any blockedPolygon (e.g. river outside bridge, cliffs).
 * - Must NOT collide with any solid trunk or prop base.
 */
export function isPositionWalkable(
  x: number,
  y: number,
  scene: SceneContract,
  actorRadius = 14
): boolean {
  if (x < 40 || x > scene.world.width - 40 || y < 240 || y > scene.world.height - 40) {
    return false;
  }

  // Check if on bridge link corridor
  const onBridgeLink = scene.navigation.links.some(
    (link) =>
      x >= link.bounds.minX &&
      x <= link.bounds.maxX &&
      y >= link.bounds.minY &&
      y <= link.bounds.maxY
  );

  // Check if inside any blocked polygon (unless safely on the bridge link corridor)
  for (const blocked of scene.navigation.blockedPolygons) {
    if (isPointInPolygon(x, y, blocked.points)) {
      return false;
    }
  }

  // Must be in a walkable polygon or bridge corridor
  const inWalkable =
    onBridgeLink ||
    scene.navigation.walkablePolygons.some((poly) =>
      isPointInPolygon(x, y, poly.points)
    );
  if (!inWalkable) return false;

  // Check object base colliders
  for (const obj of scene.objects) {
    if (collidesWithObjectBase(x, y, obj, actorRadius)) {
      return false;
    }
  }

  return true;
}

/**
 * Resolves movement with axis-separated sliding so the explorer glides along
 * riverbanks, bridge railings, and tree trunks without sticking.
 */
export function resolveMovement(
  x: number,
  y: number,
  dx: number,
  dy: number,
  scene: SceneContract,
  actorRadius = 14
): { x: number; y: number; blocked: boolean } {
  const nextX = x + dx;
  const nextY = y + dy;

  if (isPositionWalkable(nextX, nextY, scene, actorRadius)) {
    return { x: nextX, y: nextY, blocked: false };
  }
  if (dx !== 0 && isPositionWalkable(nextX, y, scene, actorRadius)) {
    return { x: nextX, y, blocked: true };
  }
  if (dy !== 0 && isPositionWalkable(x, nextY, scene, actorRadius)) {
    return { x, y: nextY, blocked: true };
  }
  return { x, y, blocked: true };
}

/**
 * Determines whether the player's feet are behind a tree canopy occluder.
 * Enforces Gate #7: "Oclusão do personagem validada nos pés e não pela cabeça."
 */
export function isPlayerOccludedByCanopy(
  playerFootX: number,
  playerFootY: number,
  treeOccluder: SceneObject
): boolean {
  // Player must be behind the tree trunk base (smaller Y in top-left coordinate system)
  // and horizontally within the canopy crown above the trunk.
  const canopyHalfWidth = treeOccluder.asset === 'VE-001' ? 68 : 76;
  const canopyHeight = treeOccluder.asset === 'VE-001' ? 165 : 150;
  return (
    playerFootY < treeOccluder.y &&
    playerFootY > treeOccluder.y - canopyHeight &&
    Math.abs(playerFootX - treeOccluder.x) <= canopyHalfWidth
  );
}

/**
 * Sorts renderable entities according to `fixedGroupsThenFootY`:
 * 1. `behind-player`
 * 2. `dynamic-y` ordered by ascending `footY` (higher on screen = drawn first)
 * 3. `front-of-player` (including canopy occluders when footY is behind trunk)
 */
export function sortRenderablesByFootY<T extends RenderableItem>(items: T[]): T[] {
  const groupRank: Record<DepthGroup, number> = {
    'behind-player': 0,
    'dynamic-y': 1,
    'front-of-player': 2,
  };

  return [...items].sort((a, b) => {
    const rankDiff = groupRank[a.depthGroup] - groupRank[b.depthGroup];
    if (rankDiff !== 0) return rankDiff;
    if (a.footY !== b.footY) return a.footY - b.footY;
    return a.id.localeCompare(b.id);
  });
}

/**
 * Computes normalized camera viewport in 941x1672 world space so the game
 * renders with `contain`/follow behavior without stretching.
 */
export function computeCameraViewport(
  playerX: number,
  playerY: number,
  canvasWidth: number,
  canvasHeight: number,
  worldWidth = 941,
  worldHeight = 1672
): {
  scale: number;
  viewWorldW: number;
  viewWorldH: number;
  camX: number;
  camY: number;
} {
  // Fit width on portrait mobile or show generous vertical slice (~920px tall) on landscape desktop
  const targetWorldHeightVisible = Math.min(worldHeight, 960);
  const scaleByH = canvasHeight / targetWorldHeightVisible;
  const scaleByW = canvasWidth / worldWidth;
  const scale = Math.max(scaleByW * 0.92, scaleByH);

  const viewWorldW = Math.min(worldWidth, canvasWidth / scale);
  const viewWorldH = Math.min(worldHeight, canvasHeight / scale);

  const unclampedX = playerX - viewWorldW / 2;
  const unclampedY = playerY - viewWorldH * 0.56;

  const camX = Math.max(0, Math.min(worldWidth - viewWorldW, unclampedX));
  const camY = Math.max(0, Math.min(worldHeight - viewWorldH, unclampedY));

  return { scale, viewWorldW, viewWorldH, camX, camY };
}

/**
 * Programmatic QA auditor for `scene.schema.json` v1.0 and Section 9 QA Matrix.
 */
export function validateSceneContract(scene: SceneContract): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (scene.schemaVersion !== '1.0.0') {
    errors.push(`Invalid schemaVersion: ${scene.schemaVersion}`);
  }
  if (!/^[a-f0-9]{64}$/.test(scene.source.sha256)) {
    errors.push(`Invalid SHA-256 hash for ${scene.sceneId}`);
  }
  if (scene.world.width !== 941 || scene.world.height !== 1672) {
    errors.push(`Invalid world dimensions: ${scene.world.width}x${scene.world.height}`);
  }
  if (scene.render.sortPolicy !== 'fixedGroupsThenFootY') {
    errors.push(`Invalid sortPolicy: ${scene.render.sortPolicy}`);
  }
  if (scene.spawns.length === 0) {
    errors.push('No spawns defined in scene');
  } else {
    for (const sp of scene.spawns) {
      if (!isPositionWalkable(sp.x, sp.y, scene, 14)) {
        errors.push(`Spawn ${sp.id} at (${sp.x}, ${sp.y}) is not walkable`);
      }
    }
  }

  // Verify bridge crossing vs river block (Gate #6)
  if (!isPositionWalkable(470, 910, scene, 14)) {
    errors.push('Bridge crossing center (470, 910) must be walkable');
  }
  if (isPositionWalkable(260, 910, scene, 14) || isPositionWalkable(660, 910, scene, 14)) {
    errors.push('River margins outside bridge must block traversal');
  }

  // Verify trees only use trunk colliders and have matching canopy occluders (Gate #7)
  const trees = scene.objects.filter(
    (o) => o.asset === 'VE-001' || o.asset === 'VE-002'
  );
  for (const tree of trees) {
    if (!tree.collision || !tree.collision.startsWith('trunk_circle_')) {
      errors.push(`Tree ${tree.id} must use trunk-only collision`);
    }
    const hasOccluder = scene.occluders.some((occ) =>
      occ.id.startsWith(tree.id)
    );
    if (!hasOccluder) {
      errors.push(`Tree ${tree.id} missing canopy occluder`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Spawns the 3 distinct forest hazard archetypes:
 * 1. `charger` (Javali da Sombra) — Line-of-sight charger with 0.55s ground telegraph line
 * 2. `spitter` (Vespa da Bruma) — Kiter/orbiter near river with 0.6s ranged target ring telegraph
 * 3. `warden` (Guardião de Pedra) — Bridge/camp sentinel with 0.5s radial shockwave telegraph
 */
export function createInitialEnemiesForScene(wave = 1): EnemyEntity[] {
  const hpScale = 1 + (wave - 1) * 0.25;
  return [
    {
      id: 'enemy_charger_valley',
      archetype: 'charger',
      name: 'Javali da Sombra',
      x: 545,
      y: 1140,
      vx: 0,
      vy: 0,
      hp: Math.round(45 * hpScale),
      maxHp: Math.round(45 * hpScale),
      radius: 18,
      phase: 'patrol',
      phaseTimer: 0,
      targetX: 545,
      targetY: 1140,
      homeX: 545,
      homeY: 1140,
      hitFlashTimer: 0,
      facingX: -1,
      orbitAngle: 0,
    },
    {
      id: 'enemy_spitter_river',
      archetype: 'spitter',
      name: 'Espírito da Bruma',
      x: 355,
      y: 1015,
      vx: 0,
      vy: 0,
      hp: Math.round(35 * hpScale),
      maxHp: Math.round(35 * hpScale),
      radius: 16,
      phase: 'patrol',
      phaseTimer: 0,
      targetX: 355,
      targetY: 1015,
      homeX: 355,
      homeY: 1015,
      hitFlashTimer: 0,
      facingX: 1,
      orbitAngle: 0.8,
    },
    {
      id: 'enemy_warden_camp',
      archetype: 'warden',
      name: 'Guardião de Pedra',
      x: 530,
      y: 700,
      vx: 0,
      vy: 0,
      hp: Math.round(60 * hpScale),
      maxHp: Math.round(60 * hpScale),
      radius: 21,
      phase: 'patrol',
      phaseTimer: 0,
      targetX: 530,
      targetY: 700,
      homeX: 530,
      homeY: 700,
      hitFlashTimer: 0,
      facingX: -1,
      orbitAngle: 0,
    },
  ];
}

export interface EnemyStepEvents {
  telegraphStarted: boolean;
  playerHitDamage: number;
  spawnedProjectiles: ProjectileEntity[];
}

/**
 * Advances a single enemy archetype with distinct movement policy and telegraph rules.
 */
export function updateEnemyBehavior(
  enemy: EnemyEntity,
  player: PlayerState,
  simDt: number,
  scene: SceneContract,
  canStartAttack: boolean
): EnemyStepEvents {
  const events: EnemyStepEvents = {
    telegraphStarted: false,
    playerHitDamage: 0,
    spawnedProjectiles: [],
  };

  if (enemy.hitFlashTimer > 0) {
    enemy.hitFlashTimer = Math.max(0, enemy.hitFlashTimer - simDt);
  }

  if (enemy.phase === 'ko') {
    enemy.phaseTimer -= simDt;
    enemy.x += enemy.vx * simDt;
    enemy.y += enemy.vy * simDt;
    enemy.vx *= Math.exp(-8 * simDt);
    enemy.vy *= Math.exp(-8 * simDt);
    return events;
  }

  const dxToPlayer = player.x - enemy.x;
  const dyToPlayer = player.y - enemy.y;
  const distToPlayer = Math.hypot(dxToPlayer, dyToPlayer);
  if (Math.abs(dxToPlayer) > 2) {
    enemy.facingX = dxToPlayer > 0 ? 1 : -1;
  }

  if (enemy.phase === 'recovery') {
    enemy.phaseTimer -= simDt;
    if (enemy.phaseTimer <= 0) {
      enemy.phase = 'patrol';
      enemy.phaseTimer = 0;
    }
    return events;
  }

  if (enemy.phase === 'windup') {
    enemy.phaseTimer -= simDt;
    if (enemy.phaseTimer <= 0) {
      enemy.phase = 'active';
      if (enemy.archetype === 'charger') {
        enemy.phaseTimer = 0.4;
        const dirX = enemy.targetX - enemy.x;
        const dirY = enemy.targetY - enemy.y;
        const len = Math.hypot(dirX, dirY) || 1;
        enemy.vx = (dirX / len) * 320;
        enemy.vy = (dirY / len) * 320;
      } else if (enemy.archetype === 'spitter') {
        enemy.phaseTimer = 0.2;
        const dirX = enemy.targetX - enemy.x;
        const dirY = enemy.targetY - enemy.y;
        const len = Math.hypot(dirX, dirY) || 1;
        events.spawnedProjectiles.push({
          id: `proj_${enemy.id}_${Date.now()}_${Math.random()}`,
          x: enemy.x,
          y: enemy.y - 12,
          vx: (dirX / len) * 210,
          vy: (dirY / len) * 210,
          radius: 9,
          ttl: 2.0,
          fromPlayer: false,
          color: '#38bdf8',
        });
      } else {
        // warden radial shockwave
        enemy.phaseTimer = 0.28;
        if (distToPlayer <= 92 && player.invulnTimer <= 0) {
          events.playerHitDamage = 12;
        }
      }
    }
    return events;
  }

  if (enemy.phase === 'active') {
    enemy.phaseTimer -= simDt;
    if (enemy.archetype === 'charger') {
      const moved = resolveMovement(
        enemy.x,
        enemy.y,
        enemy.vx * simDt,
        enemy.vy * simDt,
        scene,
        enemy.radius
      );
      enemy.x = moved.x;
      enemy.y = moved.y;
      if (
        Math.hypot(player.x - enemy.x, player.y - enemy.y) <
          enemy.radius + 16 &&
        player.invulnTimer <= 0
      ) {
        events.playerHitDamage = 12;
        enemy.phaseTimer = 0;
      }
    }
    if (enemy.phaseTimer <= 0) {
      enemy.vx = 0;
      enemy.vy = 0;
      enemy.phase = 'recovery';
      enemy.phaseTimer = 1.15;
    }
    return events;
  }

  // Distinct Patrol / Approach Policies per Archetype
  if (enemy.archetype === 'charger') {
    // Policy 1: Line-of-sight stalker that aligns and telegraphs a linear charge
    if (distToPlayer < 210 && canStartAttack) {
      enemy.phase = 'windup';
      enemy.phaseTimer = 0.58; // 0.58s visible ground line telegraph
      const normX = dxToPlayer / (distToPlayer || 1);
      const normY = dyToPlayer / (distToPlayer || 1);
      enemy.targetX = enemy.x + normX * 185;
      enemy.targetY = enemy.y + normY * 185;
      events.telegraphStarted = true;
    } else if (distToPlayer < 280) {
      const speed = 72;
      const stepX = (dxToPlayer / (distToPlayer || 1)) * speed * simDt;
      const stepY = (dyToPlayer / (distToPlayer || 1)) * speed * simDt;
      const moved = resolveMovement(enemy.x, enemy.y, stepX, stepY, scene, enemy.radius);
      enemy.x = moved.x;
      enemy.y = moved.y;
    } else {
      // Gentle patrol near home
      enemy.orbitAngle += simDt * 1.4;
      const goalX = enemy.homeX + Math.cos(enemy.orbitAngle) * 45;
      const goalY = enemy.homeY + Math.sin(enemy.orbitAngle) * 20;
      const moved = resolveMovement(
        enemy.x,
        enemy.y,
        (goalX - enemy.x) * 2 * simDt,
        (goalY - enemy.y) * 2 * simDt,
        scene,
        enemy.radius
      );
      enemy.x = moved.x;
      enemy.y = moved.y;
    }
  } else if (enemy.archetype === 'spitter') {
    // Policy 2: Kiter / Ranged Orbiter — retreats if player gets too close, orbits at 150-235px
    enemy.orbitAngle += simDt * 1.8;
    if (distToPlayer < 125) {
      // Kite away from player
      const fleeSpeed = 90;
      const stepX = (-dxToPlayer / (distToPlayer || 1)) * fleeSpeed * simDt;
      const stepY = (-dyToPlayer / (distToPlayer || 1)) * fleeSpeed * simDt;
      const moved = resolveMovement(enemy.x, enemy.y, stepX, stepY, scene, enemy.radius);
      enemy.x = moved.x;
      enemy.y = moved.y;
    } else if (distToPlayer < 235 && canStartAttack) {
      enemy.phase = 'windup';
      enemy.phaseTimer = 0.65; // 0.65s target ring telegraph
      enemy.targetX = player.x;
      enemy.targetY = player.y;
      events.telegraphStarted = true;
    } else {
      // Strafe orbit around home
      const goalX = enemy.homeX + Math.cos(enemy.orbitAngle) * 55;
      const goalY = enemy.homeY + Math.sin(enemy.orbitAngle * 0.7) * 30;
      const moved = resolveMovement(
        enemy.x,
        enemy.y,
        (goalX - enemy.x) * 2.5 * simDt,
        (goalY - enemy.y) * 2.5 * simDt,
        scene,
        enemy.radius
      );
      enemy.x = moved.x;
      enemy.y = moved.y;
    }
  } else {
    // Policy 3: Warden / Area-Denial Sentinel — guards territory and triggers radial shockwave
    if (distToPlayer < 95 && canStartAttack) {
      enemy.phase = 'windup';
      enemy.phaseTimer = 0.6; // 0.6s radial shockwave telegraph ring
      enemy.targetX = enemy.x;
      enemy.targetY = enemy.y;
      events.telegraphStarted = true;
    } else if (distToPlayer < 210) {
      const speed = 55;
      const stepX = (dxToPlayer / (distToPlayer || 1)) * speed * simDt;
      const stepY = (dyToPlayer / (distToPlayer || 1)) * speed * simDt;
      const moved = resolveMovement(enemy.x, enemy.y, stepX, stepY, scene, enemy.radius);
      enemy.x = moved.x;
      enemy.y = moved.y;
    } else {
      // Return to guard post
      const dxHome = enemy.homeX - enemy.x;
      const dyHome = enemy.homeY - enemy.y;
      const moved = resolveMovement(
        enemy.x,
        enemy.y,
        dxHome * 1.8 * simDt,
        dyHome * 1.8 * simDt,
        scene,
        enemy.radius
      );
      enemy.x = moved.x;
      enemy.y = moved.y;
    }
  }

  return events;
}
