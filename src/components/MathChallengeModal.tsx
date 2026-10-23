import React, { useEffect, useState } from 'react';
import {
  evaluateMathAnswer,
  KESSIA_ASSETS,
  MathChallenge,
} from '../game/mathChallenges';
import { soundEngine } from '../game/audio';

interface MathChallengeModalProps {
  challenge: MathChallenge;
  currentStreak: number;
  onSolved: (stationId: string, pointsAwarded: number, nextStreak: number) => void;
  onClose: () => void;
}

export const MathChallengeModal: React.FC<MathChallengeModalProps> = ({
  challenge,
  currentStreak,
  onSolved,
  onClose,
}) => {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isSolved, setIsSolved] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [awardedPts, setAwardedPts] = useState(0);
  const [finalStreak, setFinalStreak] = useState(currentStreak);

  const handleSelectOption = (optionValue: number) => {
    if (isSolved) return;
    setSelectedOption(optionValue);
    const res = evaluateMathAnswer(challenge, optionValue, currentStreak);
    setFeedback(res.feedbackText);

    if (res.isCorrect) {
      setIsSolved(true);
      setAwardedPts(res.pointsAwarded);
      setFinalStreak(res.nextStreak);
      soundEngine.playIgniteLantern();
    } else {
      setShowHint(true);
      soundEngine.playEnemyTelegraph();
    }
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isSolved) {
        if (e.code === 'Enter' || e.code === 'Space' || e.code === 'KeyE') {
          e.preventDefault();
          onSolved(challenge.stationId, awardedPts, finalStreak);
        }
        return;
      }

      if (e.code === 'Digit1' || e.code === 'Numpad1') {
        handleSelectOption(challenge.options[0]);
      } else if (e.code === 'Digit2' || e.code === 'Numpad2') {
        handleSelectOption(challenge.options[1]);
      } else if (e.code === 'Digit3' || e.code === 'Numpad3') {
        handleSelectOption(challenge.options[2]);
      } else if (e.code === 'Digit4' || e.code === 'Numpad4') {
        handleSelectOption(challenge.options[3]);
      } else if (e.code === 'KeyH') {
        setShowHint((v) => !v);
      } else if (e.code === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const portraitSrc = isSolved
    ? KESSIA_ASSETS.faceCheering
    : showHint
    ? KESSIA_ASSETS.faceConfident
    : KESSIA_ASSETS.faceThinking;

  const portraitAlt = isSolved
    ? 'Késsia comemorando a resposta correta'
    : 'Késsia pensando no desafio matemático';

  return (
    <div
      className="absolute inset-0 z-30 flex items-end sm:items-center justify-center p-3 mobile-safe-bottom"
      style={{ backgroundColor: 'rgba(6, 12, 9, 0.86)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="math-challenge-title"
      data-testid="math-challenge-modal"
    >
      <div className="w-full rounded-3xl bg-[#121e17] border-2 border-amber-500/60 p-4 shadow-2xl text-[#f4efe6] max-h-[92dvh] overflow-y-auto">
        {/* Header with Késsia Live Expression Portrait */}
        <div className="flex items-center gap-3 mb-3">
          <div className="relative w-16 h-16 rounded-2xl bg-[#1b2e23] border-2 border-amber-400/70 overflow-hidden shrink-0 flex items-center justify-center shadow-inner">
            <img
              src={portraitSrc}
              alt={portraitAlt}
              data-testid="kessia-modal-portrait"
              referrerPolicy="no-referrer"
              className="w-full h-full object-contain"
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-semibold text-amber-400 tracking-wide truncate">
              {challenge.stationTitle}
            </div>
            <h2
              id="math-challenge-title"
              className="text-lg font-bold font-display text-[#fef3c7] leading-tight"
            >
              {isSolved ? 'Muito bem, Explorador!' : 'Desafio Matemático da Késsia'}
            </h2>
            <div className="text-[11px] text-[#9ab0a2] mt-0.5 font-mono-num">
              +{challenge.rewardPoints} pts · Combo: {isSolved ? finalStreak : currentStreak}x
            </div>
          </div>
        </div>

        {/* Story Context & Formula Box */}
        <div className="p-3.5 rounded-2xl bg-[#0b130e] border border-[#263c2f] mb-3">
          <p className="text-xs text-[#e7e0d3] leading-relaxed mb-2.5">
            {challenge.storyPrompt}
          </p>
          <div
            className="py-2 px-3 rounded-xl bg-[#16261d] border border-amber-500/30 text-center font-mono-num text-xl font-bold text-amber-300 tracking-wide"
            data-testid="math-expression"
          >
            {challenge.expression}
          </div>
        </div>

        {/* 4 Touch-Friendly Answer Buttons */}
        <div className="grid grid-cols-2 gap-2 mb-3" role="group" aria-label="Opções de resposta">
          {challenge.options.map((opt, idx) => {
            const isSelected = selectedOption === opt;
            const isRightOption = opt === challenge.correctAnswer;
            let btnStyle =
              'bg-[#182920] active:bg-[#22382c] border-[#314f3e] text-[#fef3c7]';
            if (isSolved && isRightOption) {
              btnStyle =
                'bg-emerald-500 text-[#07140d] border-emerald-300 shadow-lg scale-[1.01]';
            } else if (isSelected && !isRightOption) {
              btnStyle = 'bg-rose-900/70 text-rose-200 border-rose-500';
            }

            return (
              <button
                key={opt}
                type="button"
                disabled={isSolved}
                data-testid={`math-option-${idx}`}
                data-correct={isRightOption ? 'true' : 'false'}
                onClick={() => handleSelectOption(opt)}
                className={`min-h-[54px] px-3.5 py-2.5 rounded-2xl border-2 font-mono-num font-bold text-lg flex items-center justify-between cursor-pointer transition-transform active:scale-95 ${btnStyle}`}
              >
                <span className="text-[11px] font-sans font-semibold opacity-75">
                  #{idx + 1}
                </span>
                <span>{opt}</span>
                <span className="text-[11px] font-sans opacity-90">
                  {isSolved && isRightOption
                    ? '✓'
                    : isSelected && !isRightOption
                    ? '✗'
                    : ''}
                </span>
              </button>
            );
          })}
        </div>

        {/* Visual Step-by-Step Hint or Solved Explanation */}
        {(showHint || feedback) && (
          <div
            className={`p-3 rounded-2xl border text-xs mb-3 leading-relaxed ${
              isSolved
                ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-200'
                : 'bg-amber-950/50 border-amber-500/40 text-amber-200'
            }`}
          >
            <span className="font-bold">
              {isSolved ? 'Explicação da Késsia: ' : 'Dica da Késsia: '}
            </span>
            {feedback || challenge.visualHint}
          </div>
        )}

        {/* Footer Touch Actions */}
        <div className="flex items-center justify-between gap-2">
          {!isSolved ? (
            <>
              <button
                type="button"
                data-testid="math-hint-toggle"
                onClick={() => setShowHint((v) => !v)}
                className="flex-1 min-h-[46px] px-3 py-2 rounded-2xl bg-[#1a2b22] active:bg-[#243a2e] border border-[#345240] text-amber-300 font-semibold text-xs cursor-pointer"
              >
                {showHint ? 'Ocultar Dica' : 'Pedir Dica da Késsia'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="min-h-[46px] px-4 py-2 rounded-2xl bg-[#0b130e] active:bg-[#16241c] border border-[#263c2f] text-[#a7b9ae] font-semibold text-xs cursor-pointer"
              >
                Voltar
              </button>
            </>
          ) : (
            <button
              type="button"
              data-testid="math-confirm-solved"
              onClick={() => onSolved(challenge.stationId, awardedPts, finalStreak)}
              className="w-full min-h-[50px] px-5 py-3 rounded-2xl bg-amber-500 active:bg-amber-400 text-[#140e05] font-bold text-sm cursor-pointer shadow-lg transition-transform active:scale-98"
            >
              Ativar Estação e Continuar (+{awardedPts} pts)
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
