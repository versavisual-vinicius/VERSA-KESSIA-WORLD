import React from 'react';
import { SceneId } from '../game/types';
import { SCENE_ORDER, SCENE_PALETTES } from '../game/scenesData';
import {
  KESSIA_ASSETS,
  MATH_TRACKS,
  MathTrackId,
} from '../game/mathChallenges';
import { PWAInstallButton } from './MobilePwaBar';

interface TitleScreenProps {
  selectedScene: SceneId;
  selectedMathTrack: MathTrackId;
  onSelectScene: (sceneId: SceneId) => void;
  onSelectMathTrack: (track: MathTrackId) => void;
  onStartGame: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  selectedScene,
  selectedMathTrack,
  onSelectScene,
  onSelectMathTrack,
  onStartGame,
}) => {
  return (
    <div
      className="absolute inset-0 z-20 flex flex-col justify-between px-3.5 py-3 mobile-safe-top mobile-safe-bottom overflow-y-auto pointer-events-none"
      style={{
        background:
          'linear-gradient(180deg, rgba(6, 13, 10, 0.90) 0%, rgba(6, 13, 10, 0.42) 44%, rgba(6, 13, 10, 0.95) 100%)',
      }}
    >
      {/* Top Mobile Header: Késsia Hero Portrait + Bespoke SVG Emblem + PWA Install */}
      <div className="flex flex-col items-center text-center pointer-events-auto">
        <div className="w-full flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-semibold tracking-wider uppercase text-amber-400/90">
            Mobile WebApp · 2.5D
          </span>
          <PWAInstallButton compact />
        </div>

        <div className="flex items-center justify-center gap-2.5 mb-1.5">
          {/* Késsia Hero Character Badge */}
          <div className="w-16 h-16 rounded-full bg-[#182920] border-2 border-amber-400 shadow-[0_6px_18px_rgba(0,0,0,0.85)] overflow-hidden shrink-0 flex items-center justify-center">
            <img
              src={KESSIA_ASSETS.faceConfident}
              alt="Késsia — Exploradora da Matemática"
              data-testid="kessia-title-portrait"
              referrerPolicy="no-referrer"
              className="w-full h-full object-contain"
            />
          </div>

          <svg
            viewBox="0 0 360 104"
            className="w-[248px] h-auto drop-shadow-[0_6px_14px_rgba(0,0,0,0.85)]"
            role="img"
            aria-label="Trilha Matemática da Késsia 2.5D"
          >
            <path
              d="M18 16 L342 16 L352 52 L342 88 L18 88 L8 52 Z"
              fill="#19120c"
              stroke="#d97706"
              strokeWidth="2.5"
            />
            <path
              d="M24 22 L336 22 L344 52 L336 82 L24 82 L16 52 Z"
              fill="none"
              stroke="#78350f"
              strokeWidth="1.2"
              strokeDasharray="6 4"
            />
            <polygon
              points="180,3 167,23 193,23"
              fill="#15803d"
              stroke="#052e16"
              strokeWidth="1.5"
            />
            <polygon points="180,10 171,27 189,27" fill="#22c55e" />
            <circle cx="180" cy="21" r="4" fill="#fbbf24" />
            <text
              x="180"
              y="52"
              textAnchor="middle"
              fill="#fef3c7"
              fontFamily="Fraunces, Georgia, serif"
              fontWeight="700"
              fontSize="22"
              letterSpacing="1"
            >
              TRILHA DA KÉSSIA
            </text>
            <text
              x="180"
              y="73"
              textAnchor="middle"
              fill="#fbbf24"
              fontFamily="Plus Jakarta Sans, sans-serif"
              fontWeight="600"
              fontSize="10"
              letterSpacing="2.2"
            >
              AVENTURA DE MATEMÁTICA 2.5D
            </text>
          </svg>
        </div>

        <p className="max-w-[360px] text-xs text-[#e7e0d3] font-normal leading-snug">
          Explore a floresta 2.5D no celular com a Késsia e resolva os desafios
          matemáticos para iluminar as lanternas e a fogueira central!
        </p>
      </div>

      {/* Bottom Interactive Mobile Sheet: 2x2 Math Tracks + Weather Selector + Touch CTA */}
      <div className="flex flex-col items-stretch gap-2.5 pointer-events-auto">
        {/* Math Learning Track 2x2 Mobile Grid */}
        <div
          className="p-2 rounded-2xl bg-[#111c16]/95 border border-[#2c4235] shadow-lg"
          role="group"
          aria-label="Selecionar Trilha de Aprendizado de Matemática"
        >
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#9ab0a2] mb-1.5 px-1">
            Escolha a Missão Matemática
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {MATH_TRACKS.map((track) => {
              const active = selectedMathTrack === track.id;
              return (
                <button
                  key={track.id}
                  type="button"
                  data-testid={`math-track-${track.id}`}
                  onClick={() => onSelectMathTrack(track.id)}
                  className={`px-2.5 py-2 rounded-xl text-left text-[11px] font-semibold transition-transform min-h-[46px] flex flex-col justify-center gap-0.5 cursor-pointer active:scale-98 ${
                    active
                      ? 'bg-emerald-500 text-[#07150d] shadow-md font-bold'
                      : 'bg-[#0b130e] text-[#d6d0c4] border border-[#23372b]'
                  }`}
                >
                  <span className="font-mono-num font-bold text-[10px] opacity-85">
                    {track.badge}
                  </span>
                  <span className="leading-tight">{track.title}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Weather / Biome Mobile Selector (7 Verified Renders) */}
        <div
          className="p-2 rounded-2xl bg-[#111c16]/95 border border-[#2c4235] shadow-lg"
          role="group"
          aria-label="Selecionar Clima do Cenário"
        >
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#9ab0a2] mb-1.5 px-1">
            Clima da Floresta (7 Cenários 2.5D)
          </div>
          <div className="flex flex-wrap items-center justify-center gap-1">
            {SCENE_ORDER.map((id) => {
              const p = SCENE_PALETTES[id];
              const active = selectedScene === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onSelectScene(id)}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-transform whitespace-nowrap shrink-0 min-h-[36px] cursor-pointer active:scale-95 ${
                    active
                      ? 'bg-amber-500 text-[#140e06] shadow-sm font-bold'
                      : 'bg-[#0b130e] text-[#d6d0c4] border border-[#23372b]'
                  }`}
                >
                  {p.title}
                </button>
              );
            })}
          </div>
        </div>

        {/* Full-Width Mobile Start Handshake CTA (`data-start="true"`) */}
        <button
          type="button"
          data-start="true"
          onClick={(e) => {
            e.currentTarget.blur();
            onStartGame();
          }}
          className="w-full py-3.5 px-6 rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-[#171005] font-bold text-base tracking-wide shadow-[0_8px_24px_rgba(245,158,11,0.4)] transition-transform cursor-pointer min-h-[52px]"
        >
          Começar Aventura com a Késsia
        </button>

        {/* Mobile Touch-First Control Hint Line */}
        <div className="text-[11px] text-[#c7bfb1] text-center leading-tight">
          Toque na trilha ou use o analógico · Toque nas estações para calcular
        </div>
      </div>
    </div>
  );
};
