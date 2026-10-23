import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC<{ compact?: boolean }> = ({
  compact = false,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      await install();
    } else {
      setShowGuide(true);
    }
  };

  return (
    <>
      <button
        type="button"
        data-testid="pwa-install-btn"
        onClick={handleClick}
        className={`flex items-center justify-center gap-1.5 rounded-xl bg-[#16271e] hover:bg-[#1f362a] border border-emerald-400/50 text-emerald-300 font-semibold cursor-pointer active:scale-95 transition-transform whitespace-nowrap ${
          compact ? 'min-h-[38px] px-3 py-1.5 text-xs' : 'min-h-[42px] px-3.5 py-2 text-xs'
        }`}
      >
        <svg
          className="w-4 h-4 shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth="2"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
          />
        </svg>
        <span>{isIOS ? 'Instalar no iPhone' : 'Instalar App Mobile'}</span>
      </button>

      {showGuide && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-guide-title"
        >
          <div className="w-full max-w-[390px] rounded-2xl bg-[#121e17] border border-emerald-500/50 p-5 shadow-2xl text-[#f4efe6] text-left">
            <h3
              id="pwa-guide-title"
              className="text-lg font-bold font-display text-[#fef3c7] mb-2"
            >
              Instalar Késsia 2.5D no Celular
            </h3>
            <div className="text-xs text-[#d6d0c4] space-y-2 leading-relaxed mb-4">
              <p>
                <strong>No iPhone / iPad (Safari):</strong> Toque no botão{' '}
                <strong>Compartilhar</strong> na barra inferior e escolha{' '}
                <strong>Adicionar à Tela de Início</strong>.
              </p>
              <p>
                <strong>No Android (Chrome):</strong> Toque no menu{' '}
                <strong>⋮</strong> do navegador e selecione{' '}
                <strong>Instalar aplicativo</strong> ou{' '}
                <strong>Adicionar à tela inicial</strong>.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="w-full min-h-[46px] rounded-xl bg-amber-500 hover:bg-amber-400 text-[#140e05] font-bold text-sm cursor-pointer"
            >
              Entendi
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export const OfflineIndicator: React.FC = () => {
  const { isOnline } = usePWAInstall();

  if (isOnline) return null;

  return (
    <div className="absolute top-14 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-xl bg-amber-500 px-3 py-1.5 text-xs font-bold text-[#140e05] shadow-lg whitespace-nowrap">
      <span className="h-2 w-2 rounded-full bg-[#140e05] animate-pulse" />
      Modo Offline Ativo — Jogando via Cache Local
    </div>
  );
};
