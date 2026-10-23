import React, { useRef, useState } from 'react';
import { HudSnapshot } from '../game/types';
import { KESSIA_ASSETS } from '../game/mathChallenges';
import { ExternalControlRef } from './ForestCanvas25D';

interface PlayingHudProps {
  hud: HudSnapshot;
  muted: boolean;
  externalControlRef: React.MutableRefObject<ExternalControlRef>;
  onCycleScene: () => void;
  onToggleQaOverlay: () => void;
  onToggleMute: () => void;
  onPause: () => void;
  onRestart: () => void;
  onPracticeMath: () => void;
}

export const PlayingHud: React.FC<PlayingHudProps> = ({
  hud,
  muted,
  externalControlRef,
  onCycleScene,
  onToggleQaOverlay,
  onToggleMute,
  onPause,
  onPracticeMath,
}) => {
  const stickRef = useRef<HTMLDivElement | null>(null);
  const [knobOffset, setKnobOffset] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });

  const pips = [0, 1, 2, 3, 4].map((idx) => {
    const thresholdFull = (idx + 1) * 20;
    const thresholdHalf = idx * 20 + 8;
    if (hud.hp >= thresholdFull) return 'full';
    if (hud.hp >= thresholdHalf) return 'damaged';
    return 'empty';
  });

  // Choose Késsia's dynamic portrait expression based on gameplay context
  const kessiaAvatarSrc = hud.nearbyPrompt
    ? KESSIA_ASSETS.faceThinking
    : hud.mathStreak >= 2 || hud.campfireLit
    ? KESSIA_ASSETS.faceCheering
    : KESSIA_ASSETS.faceConfident;

  const setMoveDir = (dx: number, dy: number) => {
    externalControlRef.current.moveX = dx;
    externalControlRef.current.moveY = dy;
    setKnobOffset({ x: dx * 24, y: dy * 24 });
  };

  const handleStickPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!stickRef.current) return;
    const rect = stickRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const rawX = e.clientX - cx;
    const rawY = e.clientY - cy;
    const maxRadius = rect.width * 0.36;
    const dist = Math.hypot(rawX, rawY);
    if (dist < 6) {
      setMoveDir(0, 0);
      return;
    }
    const clampedDist = Math.min(dist, maxRadius);
    const nx = rawX / dist;
    const ny = rawY / dist;
    externalControlRef.current.moveX = nx;
    externalControlRef.current.moveY = ny;
    setKnobOffset({ x: nx * clampedDist, y: ny * clampedDist });
  };

  const resetStick = () => {
    externalControlRef.current.moveX = 0;
    externalControlRef.current.moveY = 0;
    setKnobOffset({ x: 0, y: 0 });
  };

  return (
    <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between px-2.5 py-2 mobile-safe-top mobile-safe-bottom">
      {/* Top Mobile Perimeter Section */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-1.5">
          {/* Cluster 1 (Top-Left): Késsia Live Portrait + Vitality Pips + Score */}
          <div className="pointer-events-auto flex items-center gap-2 px-2 py-1.5 rounded-2xl bg-[#111c16]/95 border border-[#2d4637] shadow-lg shrink-0">
            <div className="w-9 h-9 rounded-xl bg-[#1a2c22] border border-amber-400/70 overflow-hidden shrink-0 flex items-center justify-center">
              <img
                src={kessiaAvatarSrc}
                alt="Késsia"
                referrerPolicy="no-referrer"
                className="w-full h-full object-contain"
              />
            </div>

            <div>
              <div className="text-[9px] font-bold tracking-wider text-[#a7b9ae] uppercase mb-0.5">
                KÉSSIA · {Math.round(hud.hp)}
              </div>
              <div
                className="flex items-center gap-0.5"
                aria-label={`Vida: ${Math.round(hud.hp)} de ${hud.maxHp}`}
              >
                {pips.map((state, i) => (
                  <svg
                    key={i}
                    viewBox="0 0 24 24"
                    className="w-3 h-3"
                    aria-hidden="true"
                  >
                    <path
                      d="M12 21s-7-4.4-9.5-8.5C.5 9 2.5 4.5 6.5 4.5c2.3 0 4 1.3 5.5 3 1.5-1.7 3.2-3 5.5-3 4 0 6 4.5 4 8-2.5 4.1-9.5 8.5-9.5 8.5z"
                      fill={
                        state === 'full'
                          ? '#ef4444'
                          : state === 'damaged'
                          ? '#f97316'
                          : '#1c2b22'
                      }
                      stroke="#09110c"
                      strokeWidth="2"
                    />
                  </svg>
                ))}
              </div>
              <div className="mt-1 flex items-center gap-1">
                <span className="text-[8px] font-bold text-amber-300 uppercase">
                  CALOR
                </span>
                <div className="w-10 h-1.5 bg-[#09110c] rounded-sm overflow-hidden border border-[#293d31]">
                  <div
                    className="h-full bg-amber-400 transition-transform duration-150 origin-left"
                    style={{
                      transform: `scaleX(${Math.max(
                        0,
                        Math.min(1, hud.warmth / hud.maxWarmth)
                      )})`,
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="w-[1px] h-7 bg-[#283e31]" />

            <div className="pr-0.5">
              <div className="text-[8px] font-bold tracking-wider text-[#a7b9ae] uppercase">
                PONTOS
              </div>
              <div
                className="text-base font-bold text-[#fef3c7] font-mono-num hud-stroke leading-none mt-0.5"
                data-testid="hud-score"
              >
                {Math.round(hud.score)}
              </div>
            </div>
          </div>

          {/* Cluster 2 (Top-Right): 4 Compact 38x38px Mobile Utility Buttons (fits 390px cleanly) */}
          <div className="pointer-events-auto flex items-center gap-1 shrink-0">
            <button
              type="button"
              tabIndex={-1}
              aria-label="Alternar Clima do Cenário"
              onClick={(e) => {
                e.currentTarget.blur();
                onCycleScene();
              }}
              className="w-[38px] h-[38px] rounded-xl bg-[#111c16]/95 border border-[#2d4637] text-amber-300 flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
            >
              <svg
                viewBox="0 0 24 24"
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
              </svg>
            </button>

            <button
              type="button"
              tabIndex={-1}
              aria-label="Alternar Malha 2.5D e FootY"
              onClick={(e) => {
                e.currentTarget.blur();
                onToggleQaOverlay();
              }}
              className={`w-[38px] h-[38px] rounded-xl border flex items-center justify-center text-xs font-semibold cursor-pointer active:scale-95 transition-transform ${
                hud.qaOverlayEnabled
                  ? 'bg-emerald-500 text-[#09140e] border-emerald-300'
                  : 'bg-[#111c16]/95 border-[#2d4637] text-[#d6d0c4]'
              }`}
            >
              <svg
                viewBox="0 0 24 24"
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polygon points="12 2 2 7 12 12 22 7 12 2" />
                <polyline points="2 17 12 22 22 17" />
                <polyline points="2 12 12 17 22 12" />
              </svg>
            </button>

            <button
              type="button"
              tabIndex={-1}
              aria-label={muted ? 'Ativar Áudio' : 'Silenciar Áudio'}
              onClick={(e) => {
                e.currentTarget.blur();
                onToggleMute();
              }}
              className="w-[38px] h-[38px] rounded-xl bg-[#111c16]/95 border border-[#2d4637] text-[#e7e0d3] flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
            >
              {muted ? (
                <svg
                  viewBox="0 0 24 24"
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M11 5L6 9H2v6h4l5 4V5zM23 9l-6 6M17 9l6 6" />
                </svg>
              ) : (
                <svg
                  viewBox="0 0 24 24"
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M11 5L6 9H2v6h4l5 4V5zM15.54 8.46a5 5 0 0 1 0 7.07" />
                </svg>
              )}
            </button>

            <button
              type="button"
              tabIndex={-1}
              aria-label="Pausar Jogo"
              onClick={(e) => {
                e.currentTarget.blur();
                onPause();
              }}
              className="w-[38px] h-[38px] rounded-xl bg-[#111c16]/95 border border-[#2d4637] text-[#e7e0d3] flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
            >
              <svg
                viewBox="0 0 24 24"
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="6" y="4" width="4" height="16" />
                <rect x="14" y="4" width="4" height="16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Objective & Math Progress Bar */}
        <div className="pointer-events-auto flex items-center justify-between px-3 py-1.5 rounded-xl bg-[#111c16]/95 border border-[#2d4637] text-[11px] font-mono-num shadow-md">
          <div className="flex items-center gap-1.5 truncate">
            <span>
              <span className="text-[#a7b9ae]">Cálculos </span>
              <span
                className="text-emerald-300 font-bold"
                data-testid="hud-math-solved"
              >
                {hud.mathSolvedCount}
              </span>
            </span>
            <span aria-hidden="true" className="text-[#4a6b58]">
              ·
            </span>
            <span>
              <span className="text-[#a7b9ae]">Lanternas </span>
              <span className="text-amber-300 font-bold">
                {hud.lanternsLit}/{hud.totalLanterns}
              </span>
            </span>
            <span aria-hidden="true" className="text-[#4a6b58]">
              ·
            </span>
            <span>
              <span className="text-[#a7b9ae]">Fogueira </span>
              <span
                className={
                  hud.campfireLit
                    ? 'text-emerald-400 font-bold'
                    : 'text-amber-300 font-bold'
                }
              >
                {hud.campfireLit ? 'Acesa' : '0/1'}
              </span>
            </span>
          </div>
          <button
            type="button"
            data-testid="hud-practice-math-btn"
            onClick={(e) => {
              e.currentTarget.blur();
              onPracticeMath();
            }}
            className="ml-2 px-2.5 py-1 rounded-lg bg-amber-500 active:bg-amber-400 text-[#140e05] font-sans font-bold text-[11px] shrink-0 cursor-pointer"
          >
            + Desafio
          </button>
        </div>
      </div>

      {/* Bottom Mobile Touch Controls (Always Active 100% Mobile WebApp) */}
      <div className="flex flex-col items-center gap-2">
        {hud.nearbyPrompt && (
          <button
            type="button"
            data-testid="hud-nearby-prompt-btn"
            onClick={() => {
              externalControlRef.current.triggerInteract = true;
            }}
            className="pointer-events-auto w-full px-4 py-2.5 rounded-2xl bg-amber-500 text-[#140e05] font-bold text-xs shadow-xl cursor-pointer active:scale-95 transition-transform flex items-center justify-center gap-2"
          >
            <span className="px-1.5 py-0.5 rounded bg-black/20 font-mono-num">
              +?
            </span>
            <span className="truncate">{hud.nearbyPrompt}</span>
          </button>
        )}

        <div className="w-full flex items-end justify-between pointer-events-auto pt-1">
          {/* 360-Degree Touch Thumbstick + SVG Directional Chevrons */}
          <div
            ref={stickRef}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              handleStickPointer(e);
            }}
            onPointerMove={(e) => {
              if (e.buttons > 0) handleStickPointer(e);
            }}
            onPointerUp={resetStick}
            onPointerCancel={resetStick}
            className="relative w-[128px] h-[128px] rounded-full bg-[#111c16]/88 border-2 border-[#2d4637] shadow-xl flex items-center justify-center touch-none"
            aria-label="Controle Direcional de Toque"
          >
            {/* Cardinal SVG Touch Buttons */}
            <button
              type="button"
              aria-label="Mover Acima"
              onPointerDown={(e) => {
                e.stopPropagation();
                setMoveDir(0, -1);
              }}
              onPointerUp={resetStick}
              onPointerLeave={resetStick}
              className="absolute top-1 left-1/2 -translate-x-1/2 w-10 h-9 rounded-t-xl text-[#c7bfb1] active:text-amber-300 flex items-center justify-center"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="18 15 12 9 6 15" />
              </svg>
            </button>
            <button
              type="button"
              aria-label="Mover Abaixo"
              onPointerDown={(e) => {
                e.stopPropagation();
                setMoveDir(0, 1);
              }}
              onPointerUp={resetStick}
              onPointerLeave={resetStick}
              className="absolute bottom-1 left-1/2 -translate-x-1/2 w-10 h-9 rounded-b-xl text-[#c7bfb1] active:text-amber-300 flex items-center justify-center"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            <button
              type="button"
              aria-label="Mover Esquerda"
              onPointerDown={(e) => {
                e.stopPropagation();
                setMoveDir(-1, 0);
              }}
              onPointerUp={resetStick}
              onPointerLeave={resetStick}
              className="absolute left-1 top-1/2 -translate-y-1/2 w-9 h-10 rounded-l-xl text-[#c7bfb1] active:text-amber-300 flex items-center justify-center"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <button
              type="button"
              aria-label="Mover Direita"
              onPointerDown={(e) => {
                e.stopPropagation();
                setMoveDir(1, 0);
              }}
              onPointerUp={resetStick}
              onPointerLeave={resetStick}
              className="absolute right-1 top-1/2 -translate-y-1/2 w-9 h-10 rounded-r-xl text-[#c7bfb1] active:text-amber-300 flex items-center justify-center"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>

            {/* Draggable Thumb Puck */}
            <div
              className="w-11 h-11 rounded-full bg-amber-500/95 border-2 border-[#fef3c7] shadow-md pointer-events-none transition-transform duration-75 flex items-center justify-center text-[#140e05] font-bold text-[10px]"
              style={{
                transform: `translate(${knobOffset.x}px, ${knobOffset.y}px)`,
              }}
            >
              2.5D
            </div>
          </div>

          {/* Right Thumb Action Cluster */}
          <div className="flex flex-col items-end gap-2">
            <button
              type="button"
              aria-label="Resolver Desafio Matemático"
              onClick={onPracticeMath}
              className="min-w-[122px] min-h-[48px] px-3.5 py-2 rounded-2xl bg-emerald-500 active:bg-emerald-400 text-[#07150d] font-bold text-xs shadow-lg flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-transform"
            >
              <span className="font-mono-num text-sm font-extrabold">+×</span>
              <span>Calcular</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Esquiva Rápida"
                onClick={() => {
                  externalControlRef.current.triggerDash = true;
                }}
                className="min-w-[60px] min-h-[54px] px-3 rounded-2xl bg-[#111c16]/95 border border-[#2d4637] text-sky-300 font-bold text-xs shadow-lg flex items-center justify-center cursor-pointer active:scale-95"
              >
                Impulso
              </button>
              <button
                type="button"
                aria-label="Golpe de Bastão"
                onClick={() => {
                  externalControlRef.current.triggerAttack = true;
                }}
                className="min-w-[68px] min-h-[54px] px-3.5 rounded-2xl bg-amber-500 text-[#140e05] font-bold text-xs shadow-lg flex items-center justify-center cursor-pointer active:scale-95"
              >
                Bastão
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
