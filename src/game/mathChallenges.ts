export type MathTrackId = 'addition' | 'multiplication' | 'geometry' | 'mixed';

export interface MathTrackMeta {
  id: MathTrackId;
  title: string;
  subtitle: string;
  badge: string;
}

export const MATH_TRACKS: MathTrackMeta[] = [
  {
    id: 'addition',
    title: 'Soma & Subtração',
    subtitle: 'Cálculo mental e contagem na trilha',
    badge: '+ / -',
  },
  {
    id: 'multiplication',
    title: 'Multiplicação & Divisão',
    subtitle: 'Agrupamento de suprimentos e tábuas da ponte',
    badge: '× / ÷',
  },
  {
    id: 'geometry',
    title: 'Frações & Geometria 2.5D',
    subtitle: 'Perímetro do acampamento, coordenadas e proporções',
    badge: 'm² / %',
  },
  {
    id: 'mixed',
    title: 'Trilha Completa',
    subtitle: 'Desafios progressivos em todas as operações',
    badge: '∑ Mix',
  },
];

export const KESSIA_ASSETS = {
  body: '/assets/aistudio/kessia-body.webp_20261022122138_1e1c0e1f.png',
  faceConfident: '/assets/aistudio/face-0.webp_20261022122138_d43e553c.png',
  faceThinking: '/assets/aistudio/face-1.webp_20261022122138_8e3531ab.png',
  faceCheering: '/assets/aistudio/face-2.webp_20261022122138_352a0b6d.png',
  faceCelebrate: '/assets/aistudio/face-2.webp_20261022122138_352a0b6d.png',
} as const;

export type KessiaMood = 'confident' | 'thinking' | 'cheering';

export interface MathChallenge {
  id: string;
  stationId: string;
  stationTitle: string;
  track: MathTrackId;
  storyPrompt: string;
  expression: string;
  options: number[];
  correctAnswer: number;
  visualHint: string;
  explanation: string;
  rewardPoints: number;
}

/**
 * Generates a deterministic or seeded contextual math problem for a specific
 * 2.5D trail station (lantern_south, lantern_bridge, lantern_camp, pack_south, pack_north, campfire_main, tent_main).
 */
export function generateMathChallenge(
  stationId: string,
  track: MathTrackId,
  stepIndex = 0
): MathChallenge {
  const effectiveTrack: Exclude<MathTrackId, 'mixed'> =
    track === 'mixed'
      ? (['addition', 'multiplication', 'geometry'] as const)[stepIndex % 3]
      : track;

  const stationNames: Record<string, string> = {
    lantern_south: 'Lanterna do Vale Sul (PR-006)',
    lantern_bridge: 'Lanterna da Ponte do Riacho (PR-006)',
    lantern_camp: 'Lanterna da Clareira Alta (PR-006)',
    lantern_1: 'Lanterna do Vale Sul (PR-006)',
    lantern_2: 'Lanterna da Margem do Riacho (PR-006)',
    lantern_3: 'Lanterna do Acampamento Alto (PR-006)',
    pack_south: 'Mochila de Suprimentos Sul (PR-005)',
    pack_north: 'Mochila de Suprimentos Norte (PR-005)',
    pack_1: 'Mochila de Suprimentos Sul (PR-005)',
    pack_2: 'Mochila de Suprimentos Norte (PR-005)',
    campfire_main: 'Fogueira de Pedras Central (PR-002)',
    tent_main: 'Barraca do Topo da Trilha (PR-001)',
    summit_tent: 'Barraca do Topo da Trilha (PR-001)',
    practice_trail: 'Treino Rápido da Trilha 2.5D',
  };

  const stationTitle = stationNames[stationId] || 'Estação da Trilha 2.5D';

  // Seed value derived from stationId + stepIndex so each station has a fresh problem
  const seed =
    stationId.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0) +
    stepIndex * 17;

  if (effectiveTrack === 'addition') {
    const a = 14 + (seed % 25);
    const b = 12 + ((seed * 3) % 19);
    const c = 5 + (seed % 9);
    const isAddOnly = seed % 2 === 0;
    const correctAnswer = isAddOnly ? a + b : a + b - c;
    const expression = isAddOnly ? `${a} + ${b} = ?` : `${a} + ${b} - ${c} = ?`;
    const storyPrompt = isAddOnly
      ? `Késsia contou ${a} passos na trilha baixa e mais ${b} passos até a ${stationTitle}. Quantos passos ela deu ao todo?`
      : `Késsia recolheu ${a} gravetos secos e depois mais ${b}, mas usou ${c} para sinalizar a trilha. Quantos restaram?`;
    const visualHint = isAddOnly
      ? `Some primeiro as dezenas (${Math.floor(a / 10) * 10} + ${
          Math.floor(b / 10) * 10
        } = ${
          Math.floor(a / 10) * 10 + Math.floor(b / 10) * 10
        }) e depois as unidades (${a % 10} + ${b % 10} = ${(a % 10) + (b % 10)}).`
      : `Primeiro some ${a} + ${b} = ${a + b}. Em seguida, subtraia ${c} de ${
          a + b
        }.`;
    const explanation = isAddOnly
      ? `${a} + ${b} = ${correctAnswer} passos calculados com precisão!`
      : `${a} + ${b} = ${a + b}, e ${a + b} - ${c} = ${correctAnswer}!`;

    return {
      id: `math_${stationId}_${seed}`,
      stationId,
      stationTitle,
      track: effectiveTrack,
      storyPrompt,
      expression,
      options: buildFourOptions(correctAnswer, seed),
      correctAnswer,
      visualHint,
      explanation,
      rewardPoints: stationId === 'campfire_main' ? 250 : 200,
    };
  }

  if (effectiveTrack === 'multiplication') {
    const groups = 3 + (seed % 6); // 3..8
    const perGroup = 4 + ((seed * 5) % 7); // 4..10
    const extra = seed % 2 === 0 ? 0 : 2 + (seed % 5);
    const correctAnswer = groups * perGroup + extra;
    const expression =
      extra === 0
        ? `${groups} × ${perGroup} = ?`
        : `${groups} × ${perGroup} + ${extra} = ?`;
    const storyPrompt =
      extra === 0
        ? `Na ${stationTitle}, Késsia organizou ${groups} caixas com ${perGroup} cristais luminosos em cada uma. Quantos cristais há no total?`
        : `Para ativar a ${stationTitle}, Késsia precisa de ${groups} feixes com ${perGroup} brasas cada, mais ${extra} brasas extras.`;
    const visualHint =
      extra === 0
        ? `Pense em ${groups} grupos iguais de ${perGroup}: ${Array.from(
            { length: groups },
            () => perGroup
          ).join(' + ')} = ${correctAnswer}.`
        : `Multiplique primeiro ${groups} × ${perGroup} = ${
            groups * perGroup
          }, e depois some + ${extra}.`;
    const explanation =
      extra === 0
        ? `${groups} × ${perGroup} = ${correctAnswer} cristais luminosos!`
        : `${groups} × ${perGroup} = ${groups * perGroup}, mais ${extra} resulta em ${correctAnswer}!`;

    return {
      id: `math_${stationId}_${seed}`,
      stationId,
      stationTitle,
      track: effectiveTrack,
      storyPrompt,
      expression,
      options: buildFourOptions(correctAnswer, seed),
      correctAnswer,
      visualHint,
      explanation,
      rewardPoints: stationId === 'campfire_main' ? 250 : 200,
    };
  }

  // Geometry & Proportions in 2.5D
  const widthM = 4 + (seed % 6); // 4..9m
  const lengthM = 5 + ((seed * 2) % 6); // 5..10m
  const isPerimeter = seed % 2 === 0;
  const correctAnswer = isPerimeter
    ? 2 * (widthM + lengthM)
    : widthM * lengthM;
  const expression = isPerimeter
    ? `Perímetro = 2 × (${widthM}m + ${lengthM}m) = ?`
    : `Área = ${widthM}m × ${lengthM}m = ?`;
  const storyPrompt = isPerimeter
    ? `Késsia está cercando a área retangular da ${stationTitle}, que mede ${widthM} metros de largura por ${lengthM} metros de comprimento. Qual é o perímetro total?`
    : `A base retangular da ${stationTitle} no mapa 2.5D mede ${widthM} metros por ${lengthM} metros. Qual é a área em metros quadrados (m²)?`;
  const visualHint = isPerimeter
    ? `Some os dois lados diferentes (${widthM} + ${lengthM} = ${
        widthM + lengthM
      }m) e multiplique por 2 para dar a volta completa.`
    : `A área de um retângulo é largura × comprimento: multiplique ${widthM} por ${lengthM}.`;
  const explanation = isPerimeter
    ? `2 × (${widthM} + ${lengthM}) = 2 × ${
        widthM + lengthM
      } = ${correctAnswer} metros de perímetro!`
    : `${widthM}m × ${lengthM}m = ${correctAnswer} m² de área!`;

  return {
    id: `math_${stationId}_${seed}`,
    stationId,
    stationTitle,
    track: effectiveTrack,
    storyPrompt,
    expression,
    options: buildFourOptions(correctAnswer, seed),
    correctAnswer,
    visualHint,
    explanation,
    rewardPoints: 220,
  };
}

function buildFourOptions(correct: number, seed: number): number[] {
  const candidates = new Set<number>([correct]);
  const offsets = [2, -2, 4, -3, 6, -5, 10, -4];
  let idx = 0;
  while (candidates.size < 4) {
    const off = offsets[(seed + idx) % offsets.length];
    const val = Math.max(1, correct + off + (idx > 4 ? idx : 0));
    candidates.add(val);
    idx++;
  }
  const arr = Array.from(candidates);
  // Deterministic rotation based on seed
  const shift = seed % 4;
  return [...arr.slice(shift), ...arr.slice(0, shift)];
}

export function evaluateMathAnswer(
  challenge: MathChallenge,
  selectedValue: number,
  currentStreak: number
): {
  isCorrect: boolean;
  nextStreak: number;
  pointsAwarded: number;
  feedbackText: string;
} {
  const isCorrect = selectedValue === challenge.correctAnswer;
  if (isCorrect) {
    const nextStreak = currentStreak + 1;
    const streakBonus = Math.min(150, (nextStreak - 1) * 35);
    const pointsAwarded = challenge.rewardPoints + streakBonus;
    return {
      isCorrect: true,
      nextStreak,
      pointsAwarded,
      feedbackText: challenge.explanation,
    };
  }

  return {
    isCorrect: false,
    nextStreak: 0,
    pointsAwarded: 0,
    feedbackText: `Quase! Use a dica da Késsia: ${challenge.visualHint}`,
  };
}
