import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SCENES_BY_ID,
  SCENE_ORDER,
  CANONICAL_ASSET_LIBRARY,
} from './scenesData';
import {
  isPositionWalkable,
  resolveMovement,
  isPlayerOccludedByCanopy,
  sortRenderablesByFootY,
  validateSceneContract,
  createInitialEnemiesForScene,
  updateEnemyBehavior,
  computeCameraViewport,
} from './rules';
import {
  KESSIA_ASSETS,
  MATH_TRACKS,
  generateMathChallenge,
  evaluateMathAnswer,
} from './mathChallenges';
import {
  createParticlePool,
  getAtmosphereParticleConfig,
  seedSceneAtmosphereParticles,
  spawnLanternFireflies,
  stepSingleParticle,
} from './particles';
import { PlayerState } from './types';

test('all 7 scenes in SCENES_BY_ID pass scene.schema.json v1.0 contract validation', () => {
  assert.equal(SCENE_ORDER.length, 7);
  for (const sceneId of SCENE_ORDER) {
    const scene = SCENES_BY_ID[sceneId];
    assert.ok(scene, `Scene ${sceneId} exists`);
    const result = validateSceneContract(scene);
    assert.deepEqual(result.errors, [], `Scene ${sceneId} validation errors`);
    assert.equal(result.valid, true);
    assert.equal(scene.world.width, 941);
    assert.equal(scene.world.height, 1672);
  }
});

test('canonical asset library covers all 26 planned codes from PLANO_OPERACIONAL.md', () => {
  assert.equal(CANONICAL_ASSET_LIBRARY.length, 26);
  const codes = new Set(CANONICAL_ASSET_LIBRARY.map((a) => a.code));
  assert.ok(codes.has('BG-001'));
  assert.ok(codes.has('PR-007')); // Bridge
  assert.ok(codes.has('VE-001')); // Pines
  assert.ok(codes.has('CH-001')); // Explorer Késsia
  assert.ok(codes.has('FX-004'));
});

test('bridge traversal (PR-007) allows crossing river (WA-001) while river margins block movement', () => {
  const scene = SCENES_BY_ID.day_forest;
  // Center of the wooden bridge over the river (y = 910)
  assert.equal(isPositionWalkable(470, 910, scene, 14), true);
  // North and South approaches to bridge
  assert.equal(isPositionWalkable(470, 845, scene, 14), true);
  assert.equal(isPositionWalkable(470, 975, scene, 14), true);

  // River west and east outside bridge deck must block
  assert.equal(isPositionWalkable(280, 910, scene, 14), false);
  assert.equal(isPositionWalkable(640, 910, scene, 14), false);
});

test('tree collision applies strictly to trunk base while canopy occlusion uses footY', () => {
  const scene = SCENES_BY_ID.day_forest;
  const leafyTree = scene.objects.find((o) => o.id === 'leafy_trail_west')!;
  const leafyOccluder = scene.occluders.find((o) =>
    o.id.startsWith('leafy_trail_west')
  )!;

  // Directly on the trunk base (330, 1210) is blocked
  assert.equal(isPositionWalkable(leafyTree.x, leafyTree.y, scene, 14), false);

  // Walking 65px behind the trunk (under the canopy crown at y = 1145) IS walkable!
  assert.equal(isPositionWalkable(leafyTree.x + 20, leafyTree.y - 65, scene, 14), true);

  // FootY behind trunk triggers canopy occlusion
  assert.equal(
    isPlayerOccludedByCanopy(leafyTree.x + 15, leafyTree.y - 60, leafyOccluder),
    true
  );

  // FootY in front of trunk (y > trunk.y) does NOT trigger canopy occlusion
  assert.equal(
    isPlayerOccludedByCanopy(leafyTree.x + 15, leafyTree.y + 25, leafyOccluder),
    false
  );
});

test('sortRenderablesByFootY respects fixedGroupsThenFootY policy', () => {
  const sorted = sortRenderablesByFootY([
    { id: 'canopy', depthGroup: 'front-of-player', footY: 500, kind: 'occluder' },
    { id: 'player', depthGroup: 'dynamic-y', footY: 1100, kind: 'player' },
    { id: 'tent', depthGroup: 'dynamic-y', footY: 335, kind: 'object' },
    { id: 'bridge', depthGroup: 'behind-player', footY: 910, kind: 'object' },
  ]);

  assert.deepEqual(
    sorted.map((s) => s.id),
    ['bridge', 'tent', 'player', 'canopy']
  );
});

test('resolveMovement slides smoothly along blocked boundaries', () => {
  const scene = SCENES_BY_ID.day_forest;
  // Near west riverbank trying to move diagonally into river (y=945 blocked) + along bank (x=370 walkable)
  const res = resolveMovement(355, 975, 15, -30, scene, 14);
  assert.equal(res.x, 370);
  assert.equal(res.y, 975);
  assert.equal(res.blocked, true);
});

test('3 enemy archetypes execute distinct movement & windup telegraph policies', () => {
  const scene = SCENES_BY_ID.day_forest;
  const enemies = createInitialEnemiesForScene(1);
  assert.equal(enemies.length, 3);

  const archetypes = new Set(enemies.map((e) => e.archetype));
  assert.deepEqual(archetypes, new Set(['charger', 'spitter', 'warden']));

  const dummyPlayer: PlayerState = {
    x: 545,
    y: 1030, // within 110px of charger at (545, 1140)
    vx: 0,
    vy: 0,
    facingX: 1,
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
    coyoteTimer: 0,
    attackBufferTimer: 0,
    dashBufferTimer: 0,
  };

  const charger = enemies.find((e) => e.archetype === 'charger')!;
  const ev = updateEnemyBehavior(charger, dummyPlayer, 0.016, scene, true);
  assert.equal(ev.telegraphStarted, true);
  assert.equal(charger.phase, 'windup');
  assert.ok(charger.phaseTimer >= 0.5, 'Windup telegraph lasts >= 0.5s');
});

test('computeCameraViewport clamps camera inside 941x1672 world bounds without stretching', () => {
  const vp = computeCameraViewport(470, 1500, 390, 844, 941, 1672);
  assert.ok(vp.scale > 0);
  assert.ok(vp.camX >= 0 && vp.camX + vp.viewWorldW <= 941.01);
  assert.ok(vp.camY >= 0 && vp.camY + vp.viewWorldH <= 1672.01);
});

test('Késsia math challenge generator produces valid 4-option challenges across all tracks', () => {
  assert.ok(KESSIA_ASSETS.body.includes('kessia-body.webp'));
  assert.equal(MATH_TRACKS.length, 4);

  for (const track of MATH_TRACKS) {
    const ch = generateMathChallenge('lantern_south', track.id, 0);
    assert.equal(ch.stationId, 'lantern_south');
    assert.equal(ch.options.length, 4);
    assert.ok(
      ch.options.includes(ch.correctAnswer),
      `Track ${track.id} options include correctAnswer ${ch.correctAnswer}`
    );
    const uniqueOptions = new Set(ch.options);
    assert.equal(uniqueOptions.size, 4, 'All 4 options must be distinct');

    // Correct evaluation awards points and increments streak
    const okEval = evaluateMathAnswer(ch, ch.correctAnswer, 2);
    assert.equal(okEval.isCorrect, true);
    assert.equal(okEval.nextStreak, 3);
    assert.ok(okEval.pointsAwarded >= 200);

    // Wrong evaluation resets streak and awards 0 points
    const wrongChoice = ch.options.find((o) => o !== ch.correctAnswer)!;
    const badEval = evaluateMathAnswer(ch, wrongChoice, 2);
    assert.equal(badEval.isCorrect, false);
    assert.equal(badEval.nextStreak, 0);
    assert.equal(badEval.pointsAwarded, 0);
  }
});

test('particle system seeds atmosphere-specific falling leaves and triggers lantern fireflies', () => {
  const pool = createParticlePool(260);
  const cursor = { index: 0 };

  for (const sceneId of SCENE_ORDER) {
    const cfg = getAtmosphereParticleConfig(sceneId);
    const counts = seedSceneAtmosphereParticles(pool, cursor, sceneId);
    assert.equal(counts.leavesSeeded, cfg.leafCount);
    assert.equal(counts.firefliesSeeded, cfg.ambientFireflyCount);
    assert.equal(counts.weatherSeeded, cfg.weatherCount);

    const activeLeaves = pool.filter((p) => p.active && p.kind === 'leaf');
    assert.equal(activeLeaves.length, cfg.leafCount);

    // Step a falling leaf and verify rotation + downward movement
    const sampleLeaf = activeLeaves[0];
    const prevY = sampleLeaf.y;
    const prevRot = sampleLeaf.rotation;
    stepSingleParticle(sampleLeaf, 0.05, 1.0, sceneId, 1200);
    assert.ok(sampleLeaf.y > prevY, 'Leaf falls downward');
    assert.notEqual(sampleLeaf.rotation, prevRot, 'Leaf tumbles as it falls');
  }

  // Trigger lantern firefly burst & orbiting fireflies at lantern_1 (375, 1290)
  const spawned = spawnLanternFireflies(pool, cursor, 375, 1290, 16);
  assert.equal(spawned, 16);

  const orbitingFireflies = pool.filter(
    (p) => p.active && p.kind === 'firefly' && p.anchorX === 375 && p.orbitRadius > 0
  );
  assert.ok(orbitingFireflies.length >= 8, 'At least half of lantern fireflies orbit lantern');

  const sampleFirefly = orbitingFireflies[0];
  stepSingleParticle(sampleFirefly, 0.05, 2.5, 'day_forest', 1200);
  assert.ok(sampleFirefly.alpha >= 0.2 && sampleFirefly.alpha <= 1.0);
});
