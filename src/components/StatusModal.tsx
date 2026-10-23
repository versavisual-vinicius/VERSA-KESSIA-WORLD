import React, { useState } from 'react';
import {
  HudSnapshot,
  RunSnapshot,
  SceneId,
} from '../game/types';
import {
  CANONICAL_ASSET_LIBRARY,
  SCENES_BY_ID,
  SCENE_ORDER,
  SCENE_PALETTES,
} from '../game/scenesData';
import { validateSceneContract } from '../game/rules';
import {
  KESSIA_ASSETS,
  MATH_TRACKS,
  MathTrackId,
} from '../game/mathChallenges';
import { PWAInstallButton } from './MobilePwaBar';

interface StatusModalProps {
  mode: 'paused' | 'gameover';
  hud: HudSnapshot;
  runSnapshot: RunSnapshot | null;
  selectedMathTrack: MathTrackId;
  onSelectMathTrack: (track: MathTrackId) => void;
  onResume: () => void;
  onRestart: () => void;
  onNextScene: () => void;
  onSelectScene: (id: SceneId) => void;
  onReturnToTitle: () => void;
}

export const StatusModal: React.FC<StatusModalProps> = ({
  mode,
  hud,
  runSnapshot,
  selectedMathTrack,
  onSelectMathTrack,
  onResume,
  onRestart,
  onNextScene,
  onSelectScene,
  onReturnToTitle,
}) => {
  const [showSchemaAudit, setShowSchemaAudit] = useState(false);

  const activeScene = SCENES_BY_ID[hud.sceneId];
  const validation = validateSceneContract(activeScene);

  const handleDownloadSceneJson = () => {
    const jsonString = JSON.stringify(activeScene, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${hud.sceneId}.scene.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (mode === 'gameover' && runSnapshot) {
    const isVictory = runSnapshot.outcome === 'victory';
    return (
      <div
        className="absolute inset-0 z-30 flex items-end sm:items-center justify-center p-3 mobile-safe-bottom"
        style={{ backgroundColor: 'rgba(6, 12, 9, 0.88)' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="gameover-modal-title"
      >
        <div className="w-full rounded-3xl bg-[#121e17] border border-[#355240] p-5 shadow-2xl text-[#f4efe6]">
          <div className="flex items-center gap-3 mb-3">
            <img
              src={isVictory ? KESSIA_ASSETS.faceCelebrate : KESSIA_ASSETS.faceThinking}
              alt="Késsia"
              className="w-16 h-16 rounded-2xl object-cover border-2 border-amber-400/70 bg-[#1a2b22] shrink-0"
            />
            <div>
              <div className="text-xs font-semibold text-amber-400 tracking-wide mb-0.5">
                {isVictory
                  ? `Expedição Concluída · ${runSnapshot.sceneTitle}`
                  : `Fim de Trilha · ${runSnapshot.sceneTitle}`}
              </div>
              <h2
                id="gameover-modal-title"
                className="text-xl font-bold font-display text-[#fef3c7]"
              >
                {isVictory ? 'Missão Matemática Concluída!' : 'A Floresta Escureceu'}
              </h2>
            </div>
          </div>

          <p className="text-xs text-[#c7bfb1] mb-4 leading-relaxed">
            {isVictory
              ? 'Késsia resolveu os desafios matemáticos da trilha, atravessou a ponte sobre o riacho e iluminou o acampamento no topo!'
              : 'As criaturas da bruma bloquearam a travessia antes de Késsia concluir a expedição.'}
          </p>

          {/* 3 Tabular-Nums Stat Tiles */}
          <div className="grid grid-cols-3 gap-2 mb-5">
            <div className="p-2.5 rounded-2xl bg-[#0b130e] border border-[#24382c]">
              <div className="text-[10px] text-[#9ab0a2]">Pontuação</div>
              <div className="text-lg font-bold font-mono-num text-[#fef3c7] mt-0.5">
                {runSnapshot.score}
              </div>
              <div className="text-[10px] text-[#6d8576] font-mono-num">
                Rec. {runSnapshot.bestScore}
              </div>
            </div>
            <div className="p-2.5 rounded-2xl bg-[#0b130e] border border-[#24382c]">
              <div className="text-[10px] text-[#9ab0a2]">Cálculos</div>
              <div className="text-lg font-bold font-mono-num text-emerald-300 mt-0.5">
                {runSnapshot.mathSolvedCount}
              </div>
              <div className="text-[10px] text-[#6d8576] font-mono-num">
                Lanternas {runSnapshot.lanternsLit}/{runSnapshot.totalLanterns}
              </div>
            </div>
            <div className="p-2.5 rounded-2xl bg-[#0b130e] border border-[#24382c]">
              <div className="text-[10px] text-[#9ab0a2]">Tempo</div>
              <div className="text-lg font-bold font-mono-num text-amber-300 mt-0.5">
                {runSnapshot.clearTimeSec}s
              </div>
              <div className="text-[10px] text-[#6d8576] font-mono-num">
                Combo {runSnapshot.maxMathStreak}x
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {isVictory ? (
              <button
                type="button"
                data-start="true"
                onClick={onNextScene}
                className="w-full min-h-[50px] px-5 py-3 rounded-2xl bg-amber-500 active:bg-amber-400 text-[#140e05] font-bold text-sm cursor-pointer active:scale-98 transition-transform"
              >
                Próximo Cenário Climático
              </button>
            ) : (
              <button
                type="button"
                data-start="true"
                onClick={onRestart}
                className="w-full min-h-[50px] px-5 py-3 rounded-2xl bg-amber-500 active:bg-amber-400 text-[#140e05] font-bold text-sm cursor-pointer active:scale-98 transition-transform"
              >
                Tentar Novamente
              </button>
            )}
            <button
              type="button"
              onClick={onReturnToTitle}
              className="w-full min-h-[46px] px-5 py-2.5 rounded-2xl bg-[#1a2b22] active:bg-[#243a2e] border border-[#345240] text-[#e7e0d3] font-semibold text-xs cursor-pointer"
            >
              Tela Inicial
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Pause Modal ('paused')
  return (
    <div
      className="absolute inset-0 z-30 flex items-end sm:items-center justify-center p-3 mobile-safe-bottom"
      style={{ backgroundColor: 'rgba(6, 12, 9, 0.86)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="pause-modal-title"
    >
      <div className="w-full max-h-[90dvh] overflow-y-auto rounded-3xl bg-[#121e17] border border-[#355240] p-4 shadow-2xl text-[#f4efe6]">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2.5">
            <img
              src={KESSIA_ASSETS.faceConfident}
              alt="Késsia"
              className="w-12 h-12 rounded-2xl object-cover border border-amber-400/60 bg-[#1a2b22]"
            />
            <div>
              <div className="text-[11px] font-semibold text-amber-400">
                Pausa · {hud.sceneTitle}
              </div>
              <h2
                id="pause-modal-title"
                className="text-lg font-bold font-display text-[#fef3c7]"
              >
                Diário Mobile da Késsia
              </h2>
            </div>
          </div>
          <PWAInstallButton compact />
        </div>

        {/* 3 Tabular-Nums Stat Tiles */}
        <div className="grid grid-cols-3 gap-2 mb-3.5">
          <div className="p-2.5 rounded-2xl bg-[#0b130e] border border-[#24382c]">
            <div className="text-[10px] text-[#9ab0a2]">Pontuação</div>
            <div className="text-base font-bold font-mono-num text-[#fef3c7]">
              {hud.score}
            </div>
          </div>
          <div className="p-2.5 rounded-2xl bg-[#0b130e] border border-[#24382c]">
            <div className="text-[10px] text-[#9ab0a2]">Cálculos</div>
            <div className="text-base font-bold font-mono-num text-emerald-300">
              {hud.mathSolvedCount}
            </div>
          </div>
          <div className="p-2.5 rounded-2xl bg-[#0b130e] border border-[#24382c]">
            <div className="text-[10px] text-[#9ab0a2]">Lanternas</div>
            <div className="text-base font-bold font-mono-num text-amber-300">
              {hud.lanternsLit}/{hud.totalLanterns}
            </div>
          </div>
        </div>

        {/* Math Learning Track Switcher */}
        <div className="mb-3.5">
          <div className="text-[11px] font-semibold text-[#a7b9ae] mb-1.5">
            Trilha de Aprendizado de Matemática
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {MATH_TRACKS.map((track) => {
              const active = selectedMathTrack === track.id;
              return (
                <button
                  key={track.id}
                  type="button"
                  onClick={() => onSelectMathTrack(track.id)}
                  className={`px-2.5 py-2 rounded-xl text-xs font-semibold cursor-pointer text-left min-h-[40px] ${
                    active
                      ? 'bg-emerald-500 text-[#08150d] font-bold'
                      : 'bg-[#0b130e] text-[#c7bfb1] border border-[#24382c]'
                  }`}
                >
                  <div className="truncate">{track.title}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Weather Scene Switcher */}
        <div className="mb-3.5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-semibold text-[#a7b9ae]">
              Cenário Climático (941 × 1672 px)
            </span>
            <button
              type="button"
              onClick={() => setShowSchemaAudit((v) => !v)}
              className="text-[11px] font-semibold text-amber-300 underline cursor-pointer"
            >
              {showSchemaAudit ? 'Ocultar JSON' : 'Auditoria JSON v1.0'}
            </button>
          </div>
          <div className="flex flex-wrap gap-1">
            {SCENE_ORDER.map((id) => {
              const p = SCENE_PALETTES[id];
              const active = hud.sceneId === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onSelectScene(id)}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer whitespace-nowrap min-h-[36px] ${
                    active
                      ? 'bg-amber-500 text-[#140e05] font-bold'
                      : 'bg-[#0b130e] text-[#c7bfb1] border border-[#24382c]'
                  }`}
                >
                  {p.title}
                </button>
              );
            })}
          </div>
        </div>

        {/* Expandable Operational Plan & Schema v1.0 Inspector */}
        {showSchemaAudit && (
          <div className="mb-3.5 p-3 rounded-2xl bg-[#0b130e] border border-[#24382c] text-[11px] space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-emerald-300">
                scene.schema.json v1.0 · {validation.valid ? 'Aprovado' : 'Com Alertas'}
              </span>
              <button
                type="button"
                onClick={handleDownloadSceneJson}
                className="px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-400/40 text-amber-300 font-semibold cursor-pointer"
              >
                Baixar JSON
              </button>
            </div>
            <div className="text-[#9ab0a2] font-mono-num space-y-0.5">
              <div>
                Protagonista: <span className="text-[#e7e0d3]">Késsia (CH-001)</span>
              </div>
              <div>
                Geometria: {activeScene.navigation.walkablePolygons.length} polígonos ·{' '}
                {activeScene.objects.length} objetos · {CANONICAL_ASSET_LIBRARY.length} códigos
              </div>
            </div>
          </div>
        )}

        {/* Primary Mobile Action Buttons */}
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={onResume}
            className="w-full min-h-[48px] px-5 py-3 rounded-2xl bg-amber-500 active:bg-amber-400 text-[#140e05] font-bold text-sm cursor-pointer"
          >
            Continuar Expedição
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onRestart}
              className="min-h-[44px] px-4 py-2.5 rounded-2xl bg-[#1a2b22] border border-[#345240] text-[#e7e0d3] font-semibold text-xs cursor-pointer"
            >
              Reiniciar
            </button>
            <button
              type="button"
              onClick={onReturnToTitle}
              className="min-h-[44px] px-4 py-2.5 rounded-2xl bg-[#1a2b22] border border-[#345240] text-[#e7e0d3] font-semibold text-xs cursor-pointer"
            >
              Tela Inicial
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
