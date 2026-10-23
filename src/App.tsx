/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  GameState,
  HudSnapshot,
  RunSnapshot,
  SceneId,
} from './game/types';
import { SCENE_ORDER, SCENE_PALETTES } from './game/scenesData';
import {
  MathChallenge,
  MathTrackId,
  generateMathChallenge,
} from './game/mathChallenges';
import { soundEngine } from './game/audio';
import { ExternalControlRef, ForestCanvas25D } from './components/ForestCanvas25D';
import { TitleScreen } from './components/TitleScreen';
import { PlayingHud } from './components/PlayingHud';
import { StatusModal } from './components/StatusModal';
import { MathChallengeModal } from './components/MathChallengeModal';
import { OfflineIndicator } from './components/MobilePwaBar';

export default function App() {
  const [gameState, setGameState] = useState<GameState>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1') {
        document.body.dataset.state = 'playing';
        return 'playing';
      }
      document.body.dataset.state = 'title';
    }
    return 'title';
  });

  const [sceneId, setSceneId] = useState<SceneId>('day_forest');
  const [selectedMathTrack, setSelectedMathTrack] = useState<MathTrackId>('addition');
  const [activeMathChallenge, setActiveMathChallenge] = useState<MathChallenge | null>(null);
  const [qaOverlayEnabled, setQaOverlayEnabled] = useState(false);
  const [muted, setMuted] = useState(false);
  const [runSnapshot, setRunSnapshot] = useState<RunSnapshot | null>(null);

  const [hud, setHud] = useState<HudSnapshot>({
    sceneId: 'day_forest',
    sceneTitle: SCENE_PALETTES.day_forest.title,
    atmosphere: SCENE_PALETTES.day_forest.atmosphere,
    hp: 100,
    maxHp: 100,
    warmth: 100,
    maxWarmth: 100,
    score: 0,
    bestScore: 0,
    lanternsLit: 0,
    totalLanterns: 3,
    campfireLit: false,
    packsCollected: 0,
    totalPacks: 2,
    bridgeCrossed: false,
    summitReached: false,
    elapsedSec: 0,
    nearbyPrompt: null,
    nearbyInteractionId: null,
    activeWave: 1,
    enemiesDefeated: 0,
    qaOverlayEnabled: false,
    mathSolvedCount: 0,
    mathStreak: 0,
  });

  const externalControlRef = useRef<ExternalControlRef>({
    moveX: 0,
    moveY: 0,
    triggerAttack: false,
    triggerDash: false,
    triggerInteract: false,
    resetRun: () => {},
    completeMathStation: () => {},
  });

  // Synchronize document.body.dataset.state immediately on state transitions
  useEffect(() => {
    document.body.dataset.state = gameState;
  }, [gameState]);

  const handleStartGame = useCallback(() => {
    document.body.dataset.state = 'playing';
    setRunSnapshot(null);
    setActiveMathChallenge(null);
    setGameState('playing');
    externalControlRef.current.resetRun(sceneId);
  }, [sceneId]);

  const handleTogglePause = useCallback(() => {
    if (activeMathChallenge) {
      setActiveMathChallenge(null);
      return;
    }
    setGameState((prev) => {
      const next =
        prev === 'playing' ? 'paused' : prev === 'paused' ? 'playing' : prev;
      document.body.dataset.state = next;
      return next;
    });
  }, [activeMathChallenge]);

  const handleRestart = useCallback(() => {
    document.body.dataset.state = 'playing';
    setRunSnapshot(null);
    setActiveMathChallenge(null);
    setGameState('playing');
    externalControlRef.current.resetRun(sceneId);
  }, [sceneId]);

  const handleSelectScene = useCallback((nextScene: SceneId) => {
    setSceneId(nextScene);
    setHud((prev) => ({
      ...prev,
      sceneId: nextScene,
      sceneTitle: SCENE_PALETTES[nextScene].title,
      atmosphere: SCENE_PALETTES[nextScene].atmosphere,
    }));
  }, []);

  const handleCycleScene = useCallback(() => {
    setSceneId((prev) => {
      const idx = SCENE_ORDER.indexOf(prev);
      const next = SCENE_ORDER[(idx + 1) % SCENE_ORDER.length];
      return next;
    });
  }, []);

  const handleNextSceneFromVictory = useCallback(() => {
    const idx = SCENE_ORDER.indexOf(sceneId);
    const next = SCENE_ORDER[(idx + 1) % SCENE_ORDER.length];
    setSceneId(next);
    document.body.dataset.state = 'playing';
    setRunSnapshot(null);
    setActiveMathChallenge(null);
    setGameState('playing');
    externalControlRef.current.resetRun(next);
  }, [sceneId]);

  const handleReturnToTitle = useCallback(() => {
    document.body.dataset.state = 'title';
    setRunSnapshot(null);
    setActiveMathChallenge(null);
    setGameState('title');
  }, []);

  const handleToggleMute = useCallback(() => {
    const nowMuted = soundEngine.toggleMute();
    setMuted(nowMuted);
  }, []);

  const handleToggleQaOverlay = useCallback(() => {
    setQaOverlayEnabled((prev) => !prev);
  }, []);

  const handleOutcome = useCallback((snapshot: RunSnapshot) => {
    document.body.dataset.state = 'gameover';
    setActiveMathChallenge(null);
    setRunSnapshot(snapshot);
    setGameState('gameover');
  }, []);

  const handleRequestMathChallenge = useCallback(
    (stationId: string) => {
      const challenge = generateMathChallenge(
        stationId,
        selectedMathTrack,
        hud.mathSolvedCount
      );
      setActiveMathChallenge(challenge);
    },
    [selectedMathTrack, hud.mathSolvedCount]
  );

  const handlePracticeMath = useCallback(() => {
    const targetStation = hud.nearbyInteractionId || 'practice_trail';
    const challenge = generateMathChallenge(
      targetStation,
      selectedMathTrack,
      hud.mathSolvedCount
    );
    setActiveMathChallenge(challenge);
  }, [hud.nearbyInteractionId, selectedMathTrack, hud.mathSolvedCount]);

  const handleSolvedMathChallenge = useCallback(
    (stationId: string, pointsAwarded: number, nextStreak: number) => {
      setActiveMathChallenge(null);
      externalControlRef.current.completeMathStation(
        stationId,
        pointsAwarded,
        nextStreak
      );
    },
    []
  );

  // Silent keyboard bindings for accessibility & automated testing
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (activeMathChallenge) return;
      if (e.code === 'KeyM') {
        handleToggleMute();
      } else if (e.code === 'KeyV') {
        handleToggleQaOverlay();
      } else if (e.code === 'KeyC' && gameState === 'playing') {
        handleCycleScene();
      } else if (e.code === 'KeyR' && gameState === 'playing') {
        handleRestart();
      } else if (e.code === 'KeyQ' && gameState === 'playing') {
        handlePracticeMath();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [
    activeMathChallenge,
    gameState,
    handleToggleMute,
    handleToggleQaOverlay,
    handleCycleScene,
    handleRestart,
    handlePracticeMath,
  ]);

  return (
    <div className="w-screen h-[100dvh] bg-[#040806] flex items-center justify-center overflow-hidden select-none">
      {/* 100% Mobile WebApp 9:16 Portrait Shell (full-bleed on phones, portrait frame on larger screens) */}
      <main
        data-testid="mobile-webapp-shell"
        className="relative w-full max-w-[430px] h-[100dvh] overflow-hidden bg-[#070d0a] sm:border-x sm:border-[#1f3528]/80 shadow-[0_0_80px_rgba(0,0,0,0.95)]"
      >
        <OfflineIndicator />

        {/* Isolated 60fps 2.5D Canvas Container */}
        <ForestCanvas25D
          gameState={gameState}
          sceneId={sceneId}
          qaOverlayEnabled={qaOverlayEnabled}
          isMathModalOpen={Boolean(activeMathChallenge)}
          externalControlRef={externalControlRef}
          onHudUpdate={setHud}
          onOutcome={handleOutcome}
          onTogglePause={handleTogglePause}
          onStartFromTitle={handleStartGame}
          onRequestMathChallenge={handleRequestMathChallenge}
        />

        {/* Mobile Title Screen Overlay */}
        {gameState === 'title' && (
          <TitleScreen
            selectedScene={sceneId}
            selectedMathTrack={selectedMathTrack}
            onSelectScene={handleSelectScene}
            onSelectMathTrack={setSelectedMathTrack}
            onStartGame={handleStartGame}
          />
        )}

        {/* Mobile Touch HUD & Virtual Thumbstick during Active Gameplay */}
        {gameState === 'playing' && (
          <PlayingHud
            hud={{ ...hud, qaOverlayEnabled }}
            muted={muted}
            externalControlRef={externalControlRef}
            onCycleScene={handleCycleScene}
            onToggleQaOverlay={handleToggleQaOverlay}
            onToggleMute={handleToggleMute}
            onPause={handleTogglePause}
            onRestart={handleRestart}
            onPracticeMath={handlePracticeMath}
          />
        )}

        {/* Interactive Mobile Math Sheet with Késsia */}
        {gameState === 'playing' && activeMathChallenge && (
          <MathChallengeModal
            challenge={activeMathChallenge}
            currentStreak={hud.mathStreak}
            onSolved={handleSolvedMathChallenge}
            onClose={() => setActiveMathChallenge(null)}
          />
        )}

        {/* Mobile Status Sheet for Pause, Victory, and Defeat */}
        {(gameState === 'paused' || gameState === 'gameover') && (
          <StatusModal
            mode={gameState}
            hud={hud}
            runSnapshot={runSnapshot}
            selectedMathTrack={selectedMathTrack}
            onSelectMathTrack={setSelectedMathTrack}
            onResume={handleTogglePause}
            onRestart={handleRestart}
            onNextScene={handleNextSceneFromVictory}
            onSelectScene={handleSelectScene}
            onReturnToTitle={handleReturnToTitle}
          />
        )}
      </main>
    </div>
  );
}
