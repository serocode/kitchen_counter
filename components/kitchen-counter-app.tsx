'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePickleballGame } from '@/hooks/usePickleballGame';
import { useOpenPlay } from '@/hooks/useOpenPlay';
import { useCourtScoreboard } from '@/hooks/useCourtScoreboard';
import { useWakeLock } from '@/hooks/useWakeLock';
import type { AppSection } from './app-header';
import { PickleballDashboard } from './pickleball/dashboard';
import { OpenPlayDashboard } from './open-play/open-play-dashboard';
import { ScoreboardCourtBar } from './open-play/scoreboard-court-bar';

const SECTION_KEY = 'kc-section';

/**
 * The two halves of the app — open play across many courts, and the full
 * doubles scoreboard — kept in step: the scoreboard follows an open play
 * court, every court keeps its own score, and a finished game goes back to
 * its court as the result.
 */
export function KitchenCounterApp() {
  const game = usePickleballGame();
  const openPlay = useOpenPlay();
  const courtBoard = useCourtScoreboard(game, openPlay);
  const [section, setSection] = useState<AppSection>('open-play');
  const [sectionLoaded, setSectionLoaded] = useState(false);
  const [keepAwake, setKeepAwake] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SECTION_KEY);
      if (stored === 'open-play' || stored === 'scoreboard') setSection(stored);
    } catch {
      // Storage blocked — open play is a fine default.
    }
    setSectionLoaded(true);
  }, []);

  useEffect(() => {
    if (!sectionLoaded) return;
    try {
      localStorage.setItem(SECTION_KEY, section);
    } catch {
      // Not worth surfacing: only the last-viewed section is lost.
    }
  }, [section, sectionLoaded]);

  // Each section is a different page. Arriving mid-scroll from a court low on
  // the courts list would hide the court bar at the top of the scoreboard.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [section]);

  const { session } = openPlay;
  const { gameState, matchWon } = game;
  const { isFreePlay, firstCourtInPlay, show } = courtBoard;

  // Only hold the screen awake while something is actually being played or run.
  const scoreboardLive = Boolean(gameState) && !matchWon.isWon;
  const openPlayLive = Boolean(session && session.players.length > 0);
  const wakeLock = useWakeLock(keepAwake && (section === 'scoreboard' ? scoreboardLive : openPlayLive));

  const freePlayUnderWay = Boolean(gameState?.isMatchStarted) && !matchWon.isWon;

  const changeSection = useCallback(
    (next: AppSection) => {
      // Opening the scoreboard while courts are in play shows a court — unless
      // a free-play game is under way there, which is left alone.
      if (next === 'scoreboard' && isFreePlay && firstCourtInPlay && !freePlayUnderWay) {
        show(firstCourtInPlay.id);
      }
      setSection(next);
    },
    [isFreePlay, firstCourtInPlay, freePlayUnderWay, show],
  );

  const keepScore = useCallback(
    (courtId: string) => {
      show(courtId);
      setSection('scoreboard');
    },
    [show],
  );

  if (
    game.isLoading ||
    openPlay.isLoading ||
    !courtBoard.isLoaded ||
    !sectionLoaded ||
    !session ||
    !openPlay.derived
  ) {
    return (
      <div className="flex h-dvh items-center justify-center" style={{ background: 'var(--kc-bg)' }}>
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <div className="w-12 h-12 rounded-full kinetic-gradient animate-pulse" />
          <span className="font-lexend text-sm uppercase tracking-[0.3em]" style={{ color: 'var(--kc-text-dim)' }}>
            Loading...
          </span>
        </div>
      </div>
    );
  }

  const shared = {
    onSectionChange: changeSection,
    keepAwake,
    onToggleKeepAwake: () => setKeepAwake(v => !v),
    wakeLockActive: wakeLock.isActive,
  };

  return section === 'open-play' ? (
    <OpenPlayDashboard
      {...shared}
      openPlay={openPlay}
      session={session}
      derived={openPlay.derived}
      courtScores={courtBoard.courtScores}
      onKeepScore={keepScore}
      onRecordScoreboard={courtBoard.recordCourt}
    />
  ) : (
    <PickleballDashboard
      {...shared}
      game={game}
      banner={
        courtBoard.hasCourtsInPlay || !isFreePlay ? (
          <ScoreboardCourtBar
            courts={session.courts}
            followedCourt={courtBoard.followedCourt}
            isShowingCourtMatch={courtBoard.isShowingCourtMatch}
            courtScores={courtBoard.courtScores}
            onSelect={show}
            onRecord={courtBoard.recordCourt}
            onBack={() => changeSection('open-play')}
          />
        ) : null
      }
    />
  );
}
