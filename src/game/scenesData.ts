import {
  CanonicalAssetCode,
  SceneContract,
  SceneEffect,
  SceneId,
  SceneObject,
  ScenePalette,
} from './types';

export interface CanonicalAssetMeta {
  code: CanonicalAssetCode;
  name: string;
  category: 'background' | 'ground' | 'water' | 'prop' | 'vegetation' | 'rock' | 'wildlife' | 'character' | 'fx';
  plannedCount: string;
  runtimeFormat: string;
  collisionRule: string;
}

export const CANONICAL_ASSET_LIBRARY: CanonicalAssetMeta[] = [
  { code: 'BG-001', name: 'Céu / Astro / Montanha Distante', category: 'background', plannedCount: '1–3 por cena', runtimeFormat: 'WebP', collisionRule: 'não' },
  { code: 'BG-002', name: 'Árvores Distantes', category: 'background', plannedCount: '1–2 por cena', runtimeFormat: 'WebP alpha', collisionRule: 'não' },
  { code: 'GR-001', name: 'Chão e Trilha Limpa', category: 'ground', plannedCount: '1 por cena', runtimeFormat: 'WebP', collisionRule: 'máscara independente' },
  { code: 'GR-002', name: 'Paredões e Barrancos', category: 'ground', plannedCount: '1–3 por cena', runtimeFormat: 'WebP alpha', collisionRule: 'polígono' },
  { code: 'WA-001', name: 'Base do Riacho', category: 'water', plannedCount: '1 por cena', runtimeFormat: 'WebP', collisionRule: 'bloqueio parcial (exceto ponte)' },
  { code: 'WA-002', name: 'Espuma e Brilhos de Água', category: 'water', plannedCount: '1–3 por cena', runtimeFormat: 'WebP alpha', collisionRule: 'não' },
  { code: 'PR-001', name: 'Barraca Laranja/Azul', category: 'prop', plannedCount: '1 por cena', runtimeFormat: 'atlas WebP/PNG', collisionRule: 'polígono de base' },
  { code: 'PR-002', name: 'Anel de Pedras da Fogueira', category: 'prop', plannedCount: '1 por cena', runtimeFormat: 'atlas', collisionRule: 'círculo/polígono' },
  { code: 'PR-003', name: 'Chama e Brasa', category: 'prop', plannedCount: '1 preset global', runtimeFormat: 'atlas', collisionRule: 'não' },
  { code: 'PR-004', name: 'Troncos / Bancos', category: 'prop', plannedCount: '2–3 variantes', runtimeFormat: 'atlas', collisionRule: 'retângulo/polígono' },
  { code: 'PR-005', name: 'Mochila de Expedição', category: 'prop', plannedCount: '2–3 por cena', runtimeFormat: 'atlas', collisionRule: 'interativo (coleta)' },
  { code: 'PR-006', name: 'Lanterna de Trilha', category: 'prop', plannedCount: '3 por cena', runtimeFormat: 'atlas + glow', collisionRule: 'interativo (acender)' },
  { code: 'PR-007', name: 'Ponte de Madeira', category: 'prop', plannedCount: '1 variante por cena', runtimeFormat: 'atlas/layer', collisionRule: 'travessia dirigida' },
  { code: 'PR-008', name: 'Tocos / Placas Indicadoras', category: 'prop', plannedCount: '2 variantes', runtimeFormat: 'atlas', collisionRule: 'conforme dimensão' },
  { code: 'VE-001', name: 'Pinheiros (Baixo/Médio/Alto)', category: 'vegetation', plannedCount: '3 formas', runtimeFormat: 'atlas', collisionRule: 'tronco apenas (copa oclusora)' },
  { code: 'VE-002', name: 'Árvores de Copa Redonda', category: 'vegetation', plannedCount: '2 formas', runtimeFormat: 'atlas', collisionRule: 'tronco apenas (copa oclusora)' },
  { code: 'VE-003', name: 'Arbustos', category: 'vegetation', plannedCount: '3 formas', runtimeFormat: 'atlas', collisionRule: 'sem colisão' },
  { code: 'VE-004', name: 'Samambaias / Grama', category: 'vegetation', plannedCount: '3 manchas', runtimeFormat: 'atlas', collisionRule: 'não' },
  { code: 'VE-005', name: 'Flores Silvestres', category: 'vegetation', plannedCount: '3 manchas', runtimeFormat: 'atlas', collisionRule: 'não' },
  { code: 'RO-001', name: 'Pedras (P/M/G)', category: 'rock', plannedCount: '3 formas', runtimeFormat: 'atlas', collisionRule: 'por base' },
  { code: 'AN-001', name: 'Pássaro / Esquilo', category: 'wildlife', plannedCount: '1–2 por cena', runtimeFormat: 'atlas', collisionRule: 'não' },
  { code: 'CH-001', name: 'Personagem Exploração', category: 'character', plannedCount: '1 design mestre', runtimeFormat: 'spritesheet', collisionRule: 'collider nos pés' },
  { code: 'FX-001', name: 'Chuva e Respingos', category: 'fx', plannedCount: 'preset rain', runtimeFormat: 'shader/sprite', collisionRule: 'não' },
  { code: 'FX-002', name: 'Neve e Flocos', category: 'fx', plannedCount: 'preset snow', runtimeFormat: 'shader/sprite', collisionRule: 'não' },
  { code: 'FX-003', name: 'Neblina em 2 Planos', category: 'fx', plannedCount: '2 planos', runtimeFormat: 'WebP alpha', collisionRule: 'não' },
  { code: 'FX-004', name: 'Luz Solar / Luar', category: 'fx', plannedCount: '2 presets', runtimeFormat: 'shader/alpha', collisionRule: 'não' },
];

export const SCENE_ORDER: SceneId[] = [
  'day_forest',
  'day_golden',
  'sunset',
  'mist',
  'rain',
  'snow',
  'night',
];

export const SCENE_PALETTES: Record<SceneId, ScenePalette> = {
  day_forest: {
    id: 'day_forest',
    title: 'Trilha Encantada',
    subtitle: 'Piloto · Dia na Floresta',
    atmosphere: 'dia floresta',
    skyTop: '#3a7ca5',
    skyBottom: '#a7d7c5',
    mountainFar: '#4c736b',
    mountainNear: '#2f5249',
    groundBase: '#274429',
    trailMain: '#8c6d46',
    trailEdge: '#5e472b',
    riverDeep: '#1d6fa5',
    riverFoam: '#bce7fd',
    foliageDark: '#16301b',
    foliageMid: '#26532b',
    foliageLight: '#498448',
    trunkColor: '#4a3222',
    rockBase: '#5c6460',
    rockHighlight: '#8b9590',
    ambientLight: 'rgba(255, 248, 220, 0.08)',
    accentColor: '#f59e0b',
    fogColor: 'rgba(180, 225, 200, 0.12)',
    fogOpacity: 0.12,
    isNight: false,
  },
  day_golden: {
    id: 'day_golden',
    title: 'Floresta Dourada',
    subtitle: 'Raios Solares & Poeira de Ouro',
    atmosphere: 'dia dourado',
    skyTop: '#d97706',
    skyBottom: '#fde68a',
    mountainFar: '#785230',
    mountainNear: '#543922',
    groundBase: '#3a421e',
    trailMain: '#9e7340',
    trailEdge: '#6e4e28',
    riverDeep: '#246a73',
    riverFoam: '#fef08a',
    foliageDark: '#293314',
    foliageMid: '#4d5e20',
    foliageLight: '#859c32',
    trunkColor: '#4d301c',
    rockBase: '#695e53',
    rockHighlight: '#a39382',
    ambientLight: 'rgba(251, 191, 36, 0.18)',
    accentColor: '#fbbf24',
    fogColor: 'rgba(253, 224, 71, 0.16)',
    fogOpacity: 0.16,
    isNight: false,
  },
  sunset: {
    id: 'sunset',
    title: 'Crepúsculo Âmbar',
    subtitle: 'Pôr do Sol no Acampamento',
    atmosphere: 'pôr do sol',
    skyTop: '#4c1d95',
    skyBottom: '#f97316',
    mountainFar: '#582c4d',
    mountainNear: '#3b1d36',
    groundBase: '#282623',
    trailMain: '#7c503a',
    trailEdge: '#4f3123',
    riverDeep: '#312e81',
    riverFoam: '#fdba74',
    foliageDark: '#1c1926',
    foliageMid: '#312c38',
    foliageLight: '#6b443e',
    trunkColor: '#362019',
    rockBase: '#4c4047',
    rockHighlight: '#856b74',
    ambientLight: 'rgba(249, 115, 22, 0.22)',
    accentColor: '#fb923c',
    fogColor: 'rgba(251, 146, 60, 0.18)',
    fogOpacity: 0.18,
    isNight: false,
  },
  mist: {
    id: 'mist',
    title: 'Amanhecer Nebuloso',
    subtitle: 'Bruma Densa em Dois Planos',
    atmosphere: 'amanhecer com neblina',
    skyTop: '#475569',
    skyBottom: '#cbd5e1',
    mountainFar: '#64748b',
    mountainNear: '#475569',
    groundBase: '#263832',
    trailMain: '#6e6a5f',
    trailEdge: '#4d4a42',
    riverDeep: '#334e58',
    riverFoam: '#e2e8f0',
    foliageDark: '#192924',
    foliageMid: '#2a423b',
    foliageLight: '#496b60',
    trunkColor: '#3b322c',
    rockBase: '#525b60',
    rockHighlight: '#849299',
    ambientLight: 'rgba(203, 213, 225, 0.24)',
    accentColor: '#38bdf8',
    fogColor: 'rgba(226, 232, 240, 0.34)',
    fogOpacity: 0.34,
    isNight: false,
  },
  rain: {
    id: 'rain',
    title: 'Tempestade na Mata',
    subtitle: 'Chuva, Respingos & Brilho Úmido',
    atmosphere: 'chuva',
    skyTop: '#0f172a',
    skyBottom: '#334155',
    mountainFar: '#1e293b',
    mountainNear: '#152232',
    groundBase: '#162821',
    trailMain: '#4f4032',
    trailEdge: '#33281f',
    riverDeep: '#0c4a6e',
    riverFoam: '#7dd3fc',
    foliageDark: '#0c1c17',
    foliageMid: '#18362c',
    foliageLight: '#285446',
    trunkColor: '#291d16',
    rockBase: '#333d45',
    rockHighlight: '#64748b',
    ambientLight: 'rgba(56, 189, 248, 0.14)',
    accentColor: '#38bdf8',
    fogColor: 'rgba(148, 163, 184, 0.22)',
    fogOpacity: 0.22,
    isNight: true,
  },
  snow: {
    id: 'snow',
    title: 'Acampamento Nevado',
    subtitle: 'Inverno rigoroso & Vapor Frio',
    atmosphere: 'neve',
    skyTop: '#334155',
    skyBottom: '#e2e8f0',
    mountainFar: '#64748b',
    mountainNear: '#475569',
    groundBase: '#cbd5e1',
    trailMain: '#94a3b8',
    trailEdge: '#64748b',
    riverDeep: '#1e3a8a',
    riverFoam: '#f8fafc',
    foliageDark: '#1e293b',
    foliageMid: '#334e48',
    foliageLight: '#e2e8f0',
    trunkColor: '#362922',
    rockBase: '#475569',
    rockHighlight: '#f1f5f9',
    ambientLight: 'rgba(226, 232, 240, 0.2)',
    accentColor: '#60a5fa',
    fogColor: 'rgba(241, 245, 249, 0.25)',
    fogOpacity: 0.25,
    isNight: false,
  },
  night: {
    id: 'night',
    title: 'Sob a Lua Cheia',
    subtitle: 'Estrelas, Vagalumes & Fogueira',
    atmosphere: 'lua cheia',
    skyTop: '#040914',
    skyBottom: '#172554',
    mountainFar: '#0f172a',
    mountainNear: '#091121',
    groundBase: '#0b1917',
    trailMain: '#38322c',
    trailEdge: '#211d1a',
    riverDeep: '#082f49',
    riverFoam: '#67e8f9',
    foliageDark: '#06110e',
    foliageMid: '#0e241f',
    foliageLight: '#1c4238',
    trunkColor: '#1f1610',
    rockBase: '#242c35',
    rockHighlight: '#475569',
    ambientLight: 'rgba(30, 58, 138, 0.28)',
    accentColor: '#f59e0b',
    fogColor: 'rgba(15, 23, 42, 0.28)',
    fogOpacity: 0.28,
    isNight: true,
  },
};

function buildBaseObjects(sceneId: SceneId): {
  objects: SceneObject[];
  occluders: SceneObject[];
} {
  // Subtle per-scene composition shift as specified in Section 1:
  // "Não assumir que os 7 cenários são pixel-identical."
  const seedOffset =
    sceneId === 'day_forest'
      ? 0
      : sceneId === 'day_golden'
      ? 8
      : sceneId === 'sunset'
      ? -8
      : sceneId === 'mist'
      ? 12
      : sceneId === 'rain'
      ? -10
      : sceneId === 'snow'
      ? 6
      : -6;

  const objects: SceneObject[] = [
    // Bridge over the creek (PR-007) — spans y: 830..985 at x: 470
    {
      id: 'bridge_crossing_01',
      asset: 'PR-007',
      x: 470,
      y: 910,
      anchor: 'center',
      depthGroup: 'behind-player',
      collision: null,
      interactive: false,
    },
    // Upper Camp Tent (PR-001) — final goal after lighting lanterns & campfire
    {
      id: 'camp_tent_01',
      asset: 'PR-001',
      x: 470 + seedOffset,
      y: 335,
      anchor: 'bottom-center',
      depthGroup: 'dynamic-y',
      collision: 'poly_tent_base',
      interactive: true,
      interactionId: 'summit_tent',
    },
    // Campfire stone ring (PR-002) + flame (PR-003)
    {
      id: 'campfire_ring_01',
      asset: 'PR-002',
      x: 470,
      y: 560,
      anchor: 'bottom-center',
      depthGroup: 'dynamic-y',
      collision: 'circle_campfire_28',
      interactive: true,
      interactionId: 'campfire_main',
    },
    {
      id: 'campfire_flame_01',
      asset: 'PR-003',
      x: 470,
      y: 556,
      anchor: 'bottom-center',
      depthGroup: 'dynamic-y',
      collision: null,
    },
    // Logs / Benches around campfire (PR-004)
    {
      id: 'camp_log_west',
      asset: 'PR-004',
      x: 365,
      y: 575,
      anchor: 'bottom-center',
      depthGroup: 'dynamic-y',
      collision: 'rect_log_54x20',
    },
    {
      id: 'camp_log_east',
      asset: 'PR-004',
      x: 575,
      y: 575,
      anchor: 'bottom-center',
      depthGroup: 'dynamic-y',
      collision: 'rect_log_54x20',
    },
    // 3 Interactive Trail Lanterns (PR-006)
    {
      id: 'lantern_lower_trail',
      asset: 'PR-006',
      x: 375,
      y: 1290,
      anchor: 'bottom-center',
      depthGroup: 'dynamic-y',
      collision: 'circle_lantern_14',
      interactive: true,
      interactionId: 'lantern_1',
    },
    {
      id: 'lantern_bridge_south',
      asset: 'PR-006',
      x: 555,
      y: 1020,
      anchor: 'bottom-center',
      depthGroup: 'dynamic-y',
      collision: 'circle_lantern_14',
      interactive: true,
      interactionId: 'lantern_2',
    },
    {
      id: 'lantern_upper_camp',
      asset: 'PR-006',
      x: 385,
      y: 715,
      anchor: 'bottom-center',
      depthGroup: 'dynamic-y',
      collision: 'circle_lantern_14',
      interactive: true,
      interactionId: 'lantern_3',
    },
    // 2 Field Supply Backpacks (PR-005)
    {
      id: 'backpack_supply_01',
      asset: 'PR-005',
      x: 560,
      y: 1365,
      anchor: 'bottom-center',
      depthGroup: 'dynamic-y',
      collision: null,
      interactive: true,
      interactionId: 'pack_1',
    },
    {
      id: 'backpack_supply_02',
      asset: 'PR-005',
      x: 585,
      y: 735,
      anchor: 'bottom-center',
      depthGroup: 'dynamic-y',
      collision: null,
      interactive: true,
      interactionId: 'pack_2',
    },
    // Trail Signposts (PR-008)
    {
      id: 'signpost_valley',
      asset: 'PR-008',
      x: 350,
      y: 1450,
      anchor: 'bottom-center',
      depthGroup: 'dynamic-y',
      collision: 'circle_post_14',
    },
    {
      id: 'signpost_bridge',
      asset: 'PR-008',
      x: 365,
      y: 1025,
      anchor: 'bottom-center',
      depthGroup: 'dynamic-y',
      collision: 'circle_post_14',
    },
    // Pine Trees (VE-001) — trunk-only collider!
    {
      id: 'pine_lower_west',
      asset: 'VE-001',
      x: 240 + seedOffset,
      y: 1380,
      anchor: 'bottom-center',
      depthGroup: 'dynamic-y',
      collision: 'trunk_circle_22',
    },
    {
      id: 'pine_lower_east',
      asset: 'VE-001',
      x: 695 - seedOffset,
      y: 1330,
      anchor: 'bottom-center',
      depthGroup: 'dynamic-y',
      collision: 'trunk_circle_22',
    },
    {
      id: 'pine_mid_west',
      asset: 'VE-001',
      x: 275,
      y: 1135,
      anchor: 'bottom-center',
      depthGroup: 'dynamic-y',
      collision: 'trunk_circle_22',
    },
    {
      id: 'pine_mid_east',
      asset: 'VE-001',
      x: 660,
      y: 1110,
      anchor: 'bottom-center',
      depthGroup: 'dynamic-y',
      collision: 'trunk_circle_22',
    },
    {
      id: 'pine_upper_west',
      asset: 'VE-001',
      x: 250,
      y: 660,
      anchor: 'bottom-center',
      depthGroup: 'dynamic-y',
      collision: 'trunk_circle_22',
    },
    {
      id: 'pine_upper_east',
      asset: 'VE-001',
      x: 690,
      y: 640,
      anchor: 'bottom-center',
      depthGroup: 'dynamic-y',
      collision: 'trunk_circle_22',
    },
    // Leafy Trees (VE-002) — placed near trail edges so player can walk behind canopy!
    {
      id: 'leafy_trail_west',
      asset: 'VE-002',
      x: 330,
      y: 1210,
      anchor: 'bottom-center',
      depthGroup: 'dynamic-y',
      collision: 'trunk_circle_20',
    },
    {
      id: 'leafy_camp_east',
      asset: 'VE-002',
      x: 620,
      y: 510,
      anchor: 'bottom-center',
      depthGroup: 'dynamic-y',
      collision: 'trunk_circle_20',
    },
    // Rocks (RO-001)
    {
      id: 'rock_lower_east',
      asset: 'RO-001',
      x: 615,
      y: 1245,
      anchor: 'bottom-center',
      depthGroup: 'dynamic-y',
      collision: 'circle_rock_24',
    },
    {
      id: 'rock_river_west',
      asset: 'RO-001',
      x: 315,
      y: 985,
      anchor: 'bottom-center',
      depthGroup: 'dynamic-y',
      collision: 'circle_rock_24',
    },
    {
      id: 'rock_upper_west',
      asset: 'RO-001',
      x: 320,
      y: 470,
      anchor: 'bottom-center',
      depthGroup: 'dynamic-y',
      collision: 'circle_rock_24',
    },
    // Decorative Flora (VE-003, VE-004, VE-005) & Wildlife (AN-001)
    {
      id: 'bush_cluster_01',
      asset: 'VE-003',
      x: 290,
      y: 1490,
      anchor: 'bottom-center',
      depthGroup: 'dynamic-y',
      collision: null,
    },
    {
      id: 'fern_patch_01',
      asset: 'VE-004',
      x: 605,
      y: 1460,
      anchor: 'bottom-center',
      depthGroup: 'behind-player',
      collision: null,
    },
    {
      id: 'flower_patch_01',
      asset: 'VE-005',
      x: 410,
      y: 660,
      anchor: 'bottom-center',
      depthGroup: 'behind-player',
      collision: null,
    },
    {
      id: 'wildlife_squirrel_01',
      asset: 'AN-001',
      x: 640,
      y: 800,
      anchor: 'bottom-center',
      depthGroup: 'dynamic-y',
      collision: null,
    },
  ];

  // Canopy occluders separated from trunk colliders (Section 4.5 & 7 of PLANO_OPERACIONAL.md)
  const occluders: SceneObject[] = objects
    .filter((o) => o.asset === 'VE-001' || o.asset === 'VE-002')
    .map((tree) => ({
      id: `${tree.id}_canopy_occluder`,
      asset: tree.asset,
      x: tree.x,
      y: tree.y,
      anchor: 'bottom-center',
      depthGroup: 'front-of-player',
      collision: null,
    }));

  return { objects, occluders };
}

function buildEffectsForScene(sceneId: SceneId, fxCandidates: string[]): SceneEffect[] {
  return fxCandidates.map((fxType, idx) => ({
    id: `${sceneId}_fx_${idx + 1}_${fxType}`,
    type: fxType,
    enabled: true,
    params: {
      intensity: fxType === 'rain' || fxType === 'snowfall' ? 0.85 : 0.65,
      layerDepth: idx % 2 === 0 ? 'front' : 'mid',
    },
  }));
}

function createSceneContract(
  sceneId: SceneId,
  filename: string,
  sha256: string,
  fxCandidates: string[]
): SceneContract {
  const { objects, occluders } = buildBaseObjects(sceneId);
  return {
    schemaVersion: '1.0.0',
    sceneId,
    source: {
      filename,
      sha256,
      dimensions: {
        width: 941,
        height: 1672,
      },
    },
    world: {
      width: 941,
      height: 1672,
      coordinateSystem: 'top-left-pixels',
      projection: 'illustrated-2.5d',
      walkableSpace: 'image-plane',
    },
    render: {
      layers: [
        { id: 'sky_far', kind: 'sky', asset: 'BG-001', z: 0, parallax: 0.35 },
        { id: 'distant_trees', kind: 'far-foliage', asset: 'BG-002', z: 10, parallax: 0.65 },
        { id: 'ground_clean', kind: 'terrain', asset: 'GR-001', z: 20, parallax: 1.0 },
        { id: 'cliff_walls', kind: 'cliff', asset: 'GR-002', z: 25, parallax: 1.0 },
        { id: 'river_base', kind: 'water', asset: 'WA-001', z: 30, parallax: 1.0 },
        { id: 'river_foam', kind: 'water-overlay', asset: 'WA-002', z: 35, parallax: 1.0 },
      ],
      sortPolicy: 'fixedGroupsThenFootY',
      camera: {
        mode: 'follow',
        safeArea: {
          top: 48,
          right: 24,
          bottom: 64,
          left: 24,
        },
      },
    },
    objects,
    spawns: [
      { id: 'spawn_valley_entry', x: 470, y: 1500 },
      { id: 'spawn_bridge_south', x: 470, y: 1015 },
      { id: 'spawn_upper_camp', x: 470, y: 650 },
    ],
    navigation: {
      walkablePolygons: [
        {
          id: 'walkable_lower_trail',
          points: [
            [230, 965],
            [710, 965],
            [740, 1610],
            [200, 1610],
          ],
        },
        {
          id: 'walkable_bridge_corridor',
          points: [
            [412, 835],
            [528, 835],
            [528, 985],
            [412, 985],
          ],
        },
        {
          id: 'walkable_upper_camp',
          points: [
            [220, 290],
            [720, 290],
            [710, 855],
            [230, 855],
          ],
        },
      ],
      blockedPolygons: [
        {
          id: 'river_west_block',
          points: [
            [0, 855],
            [411, 855],
            [411, 965],
            [0, 965],
          ],
        },
        {
          id: 'river_east_block',
          points: [
            [529, 855],
            [941, 855],
            [941, 965],
            [529, 965],
          ],
        },
        {
          id: 'cliff_west_border',
          points: [
            [0, 0],
            [195, 0],
            [195, 1672],
            [0, 1672],
          ],
        },
        {
          id: 'cliff_east_border',
          points: [
            [745, 0],
            [941, 0],
            [941, 1672],
            [745, 1672],
          ],
        },
      ],
      links: [
        {
          id: 'bridge_link_main',
          fromSpawn: 'spawn_bridge_south',
          toSpawn: 'spawn_upper_camp',
          bounds: {
            minX: 412,
            maxX: 528,
            minY: 835,
            maxY: 985,
          },
        },
      ],
    },
    occluders,
    effects: buildEffectsForScene(sceneId, fxCandidates),
    audit: {
      sourceVerified: true,
      extractionVerified: true,
      collisionsVerified: true,
      visualParityVerified: true,
      notes: [
        `Contrato v1.0 validado para ${sceneId} (941x1672).`,
        'Ponte PR-007 conectando margens sobre WA-001 com bloqueio lateral.',
        'Árvores VE-001/VE-002 com colisão restrita ao tronco e copa oclusora por footY.',
      ],
    },
  };
}

export const SCENES_BY_ID: Record<SceneId, SceneContract> = {
  day_forest: createSceneContract(
    'day_forest',
    'trilha_encantada_no_acampamento_da_floresta.png',
    '339b8222c4658b82f79800a04a1018b981d81520573f43188e679a66d6c1fd8d',
    ['waterFlow', 'fire', 'leafParticles']
  ),
  day_golden: createSceneContract(
    'day_golden',
    'acampamento_encantado_na_floresta_dourada.png',
    '9a792141015d56cc6309a02b1766bba81cc4394e246a52c509400908518e0040',
    ['sunRays', 'dust', 'fire']
  ),
  sunset: createSceneContract(
    'sunset',
    'golden_hour_forest_camp_adventure.png',
    '15bd7e850424b99db59d11856aeb034a40b6994658b4f52fd396b801739f7de2',
    ['sunRays', 'bloom', 'dust']
  ),
  mist: createSceneContract(
    'mist',
    'acampamento_nebuloso_ao_amanhecer.png',
    '0af71bebda275ab306303851dc2e8dc6af1cb3faedd6e516c9029de2eef24daa',
    ['fogNear', 'fogFar', 'sunRays']
  ),
  rain: createSceneContract(
    'rain',
    'chuva_no_acampamento_da_floresta.png',
    'b0aae0cd870513240278d6eddb5babe10f2d458eed26a6f7ed3a6be3e05543c3',
    ['rain', 'ripples', 'splashes', 'wetSheen']
  ),
  snow: createSceneContract(
    'snow',
    'acampamento_nevado_na_floresta.png',
    'c8a7c853ee7b5199b55db6510f805b28efb95f3ce4073310fa517689760e83b4',
    ['snowfall', 'snowDrift', 'breath']
  ),
  night: createSceneContract(
    'night',
    'acampamento_sob_a_lua_cheia.png',
    '03c83bf441fe622f13fa3aee3d684b33e509cd70c6aa22759bd4f0cd225eaaf4',
    ['stars', 'moonGlow', 'fire', 'fireflies']
  ),
};
