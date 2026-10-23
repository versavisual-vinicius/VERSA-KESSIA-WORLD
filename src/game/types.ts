export type SceneId =
  | 'day_forest'
  | 'day_golden'
  | 'sunset'
  | 'mist'
  | 'rain'
  | 'snow'
  | 'night';

export type AnchorType = 'bottom-center' | 'top-left' | 'center';
export type DepthGroup = 'behind-player' | 'dynamic-y' | 'front-of-player';

export type CanonicalAssetCode =
  | 'BG-001'
  | 'BG-002'
  | 'GR-001'
  | 'GR-002'
  | 'WA-001'
  | 'WA-002'
  | 'PR-001'
  | 'PR-002'
  | 'PR-003'
  | 'PR-004'
  | 'PR-005'
  | 'PR-006'
  | 'PR-007'
  | 'PR-008'
  | 'VE-001'
  | 'VE-002'
  | 'VE-003'
  | 'VE-004'
  | 'VE-005'
  | 'RO-001'
  | 'AN-001'
  | 'CH-001'
  | 'FX-001'
  | 'FX-002'
  | 'FX-003'
  | 'FX-004';

export interface SceneDimensions {
  width: number;
  height: number;
}

export interface SceneSource {
  filename: string;
  sha256: string;
  dimensions: SceneDimensions;
}

export interface SceneWorld {
  width: number;
  height: number;
  coordinateSystem: 'top-left-pixels';
  projection: 'illustrated-2.5d';
  walkableSpace: 'image-plane';
}

export interface SceneLayer {
  id: string;
  kind: string;
  asset: string;
  z: number;
  parallax: number;
}

export interface SceneObject {
  id: string;
  asset: string;
  x: number;
  y: number;
  anchor: AnchorType;
  depthGroup: DepthGroup;
  collision: string | null;
  interactive?: boolean;
  interactionId?: string;
}

export interface ScenePointNamed {
  id: string;
  x: number;
  y: number;
}

export interface ScenePolygon {
  id: string;
  points: [number, number][];
}

export interface SceneBridgeLink {
  id: string;
  fromSpawn: string;
  toSpawn: string;
  bounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
}

export interface SceneNavigation {
  walkablePolygons: ScenePolygon[];
  blockedPolygons: ScenePolygon[];
  links: SceneBridgeLink[];
}

export interface SceneEffect {
  id: string;
  type: string;
  enabled: boolean;
  maskAsset?: string;
  params?: Record<string, number | string | boolean>;
}

export interface SceneAudit {
  sourceVerified: boolean;
  extractionVerified: boolean;
  collisionsVerified: boolean;
  visualParityVerified: boolean;
  notes: string[];
}

/**
 * Strictly conforms to schemas/scene.schema.json (Forest 2.5D scene v1.0)
 */
export interface SceneContract {
  schemaVersion: '1.0.0';
  sceneId: SceneId;
  source: SceneSource;
  world: SceneWorld;
  render: {
    layers: SceneLayer[];
    sortPolicy: 'fixedGroupsThenFootY';
    camera: {
      mode: 'follow';
      safeArea: {
        top: number;
        right: number;
        bottom: number;
        left: number;
      };
    };
  };
  objects: SceneObject[];
  spawns: ScenePointNamed[];
  navigation: SceneNavigation;
  occluders: SceneObject[];
  effects: SceneEffect[];
  audit: SceneAudit;
}

export interface ScenePalette {
  id: SceneId;
  title: string;
  subtitle: string;
  atmosphere: string;
  skyTop: string;
  skyBottom: string;
  mountainFar: string;
  mountainNear: string;
  groundBase: string;
  trailMain: string;
  trailEdge: string;
  riverDeep: string;
  riverFoam: string;
  foliageDark: string;
  foliageMid: string;
  foliageLight: string;
  trunkColor: string;
  rockBase: string;
  rockHighlight: string;
  ambientLight: string;
  accentColor: string;
  fogColor: string;
  fogOpacity: number;
  isNight: boolean;
}

export type GameState = 'title' | 'playing' | 'paused' | 'gameover';
export type OutcomeType = 'victory' | 'defeat';

export type EnemyArchetype = 'charger' | 'spitter' | 'warden';
export type EnemyPhase = 'idle' | 'patrol' | 'windup' | 'active' | 'recovery' | 'ko';

export interface EnemyEntity {
  id: string;
  archetype: EnemyArchetype;
  name: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  radius: number;
  phase: EnemyPhase;
  phaseTimer: number;
  targetX: number;
  targetY: number;
  homeX: number;
  homeY: number;
  hitFlashTimer: number;
  facingX: number;
  orbitAngle: number;
}

export interface ProjectileEntity {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  ttl: number;
  fromPlayer: boolean;
  color: string;
}

export interface PlayerState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  facingX: number;
  facingY: number;
  hp: number;
  maxHp: number;
  warmth: number;
  maxWarmth: number;
  scaleX: number;
  scaleY: number;
  walkDistance: number;
  attackPhase: 'none' | 'windup' | 'active' | 'recovery';
  attackTimer: number;
  attackCooldown: number;
  dashTimer: number;
  dashCooldown: number;
  invulnTimer: number;
  hitFlashTimer: number;
  coyoteTimer: number;
  attackBufferTimer: number;
  dashBufferTimer: number;
}

export interface HudSnapshot {
  sceneId: SceneId;
  sceneTitle: string;
  atmosphere: string;
  hp: number;
  maxHp: number;
  warmth: number;
  maxWarmth: number;
  score: number;
  bestScore: number;
  lanternsLit: number;
  totalLanterns: number;
  campfireLit: boolean;
  packsCollected: number;
  totalPacks: number;
  bridgeCrossed: boolean;
  summitReached: boolean;
  elapsedSec: number;
  nearbyPrompt: string | null;
  nearbyInteractionId: string | null;
  activeWave: number;
  enemiesDefeated: number;
  qaOverlayEnabled: boolean;
  mathSolvedCount: number;
  mathStreak: number;
}

export interface RunSnapshot {
  outcome: OutcomeType;
  sceneId: SceneId;
  sceneTitle: string;
  score: number;
  bestScore: number;
  clearTimeSec: number;
  lanternsLit: number;
  totalLanterns: number;
  packsCollected: number;
  totalPacks: number;
  enemiesDefeated: number;
  damageTaken: number;
  mathSolvedCount: number;
  maxMathStreak: number;
}

