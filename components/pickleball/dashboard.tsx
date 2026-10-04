'use client';

import { useCallback, useEffect, useState } from 'react';
import type { PickleballGame } from '@/hooks/usePickleballGame';
import { useMatchArchive } from '@/hooks/useMatchArchive';
import { MATCH_MODES, safeMatchMode } from '@/lib/pickleball-state';
import { AppHeader, type AppSection, type MenuItem } from '@/components/app-header';
import { BottomNav, type NavItem } from '@/components/bottom-nav';
import { Chip } from '@/components/ui/chip';
import { ScoreDisplay } from './score-display';
import { CourtDiagram } from './court-diagram';
import { ControlPanel } from './control-panel';
import { PlayersView } from './players-view';
import { PlayerSetupModal } from './player-setup';
import { StatsView } from './stats-view';
import { HistoryView } from './history-view';
import { ConfirmResetDialog } from './confirm-reset-dialog';

type ViewTab = 'scoring' | 'stats' | 'players' | 'history';

const NAV_ITEMS: NavItem<ViewTab>[] = [
  { id: 'scoring', icon: 'scoreboard', label: 'Scoring' },
  { id: 'stats', icon: 'leaderboard', label: 'Stats' },
  { id: 'players', icon: 'group', label: 'Players' },
  { id: 'history', icon: 'history_edu', label: 'History' },
];

interface PickleballDashboardProps {
  game: PickleballGame;
  onSectionChange: (section: AppSection) => void;
  keepAwake: boolean;
  onToggleKeepAwake: () => void;
  wakeLockActive: boolean;
  /** Shown above the scoreboard, e.g. when it is scoring an open play court. */
  banner?: React.ReactNode;
}

export function PickleballDashboard({
  game,
  onSectionChange,
  keepAwake,
  onToggleKeepAwake,
  wakeLockActive,
  banner,
}: PickleballDashboardProps) {
  const {
    gameState,
    isLoading,
    lastAction,
    storageError,
    canUndo,
    scorePoint,
    recordFault,
    resetGame,
    resetGameKeepSettings,
    startNextGame,
    undo,
    swapPartners,
    updateMatchSettings,
    serverPosition,
    servingPlayerIndex,
    receivingPlayerIndex,
    scoreCall,
    gamePoint,
    matchPoint,
    gameWon,
    matchWon,
    momentum,
    winProbability,
    matchStats,
    longestRuns,
    serveConversion,
    events,
  } = game;

  // A won match is archived under its own storage key, so it survives the
  // reset that clears the live scoreboard.
  const { archive, deleteMatch, clearArchive } = useMatchArchive(
    gameState,
    matchWon.winner,
  );

  const [activeView, setActiveView] = useState<ViewTab>('scoring');
  const [setupModalOpen, setSetupModalOpen] = useState(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  const isDialogOpen = setupModalOpen || confirmResetOpen;

  const handleResetRequest = useCallback(() => {
    if (!gameState || !gameState.isMatchStarted) {
      resetGame();
    } else {
      setConfirmResetOpen(true);
    }
  }, [gameState, resetGame]);

  // ── Keyboard shortcuts ───────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (isDialogOpen || e.metaKey || e.ctrlKey || e.altKey) return;

      // Never hijack typing.
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.isContentEditable ||
          ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
      ) {
        return;
      }

      // Space is how a keyboard user activates the focused control. Claiming
      // it globally would score a point when they meant to press that button.
      if (e.key === ' ' && target?.closest('button, a, [role="menuitem"]')) {
        return;
      }

      const scoringLocked = gameWon.isWon || matchWon.isWon;

      switch (e.key.toLowerCase()) {
        case ' ':
        case 'p':
          if (scoringLocked) return;
          e.preventDefault();
          scorePoint();
          break;
        case 'f':
          if (scoringLocked) return;
          e.preventDefault();
          recordFault();
          break;
        case 'z':
          if (!canUndo) return;
          e.preventDefault();
          undo();
          break;
        case 'n':
          if (!gameWon.isWon || matchWon.isWon) return;
          e.preventDefault();
          startNextGame();
          break;
        case '1':
        case '2':
        case '3':
        case '4':
          e.preventDefault();
          setActiveView(NAV_ITEMS[Number(e.key) - 1].id);
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [
    isDialogOpen,
    gameWon.isWon,
    matchWon.isWon,
    canUndo,
    scorePoint,
    recordFault,
    undo,
    startNextGame,
  ]);

  if (isLoading) {
    return (
      <div className="flex h-dvh items-center justify-center" style={{ background: 'var(--kc-bg)' }}>
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <div className="w-12 h-12 rounded-full kinetic-gradient animate-pulse" />
          <span
            className="font-lexend text-sm uppercase tracking-[0.3em]"
            style={{ color: 'var(--kc-text-dim)' }}
          >
            Loading Match...
          </span>
        </div>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="flex h-dvh items-center justify-center px-6" style={{ background: 'var(--kc-bg)' }}>
        <div className="text-center space-y-4">
          <p className="text-lg" style={{ color: 'var(--kc-text-dim)' }}>
            Could not load the saved match.
          </p>
          <button
            onClick={resetGame}
            className="px-6 py-3 rounded-full font-lexend font-bold text-sm uppercase tracking-widest kinetic-gradient cursor-pointer"
            style={{ color: 'var(--kc-on-accent)' }}
          >
            Start a New Match
          </button>
        </div>
      </div>
    );
  }

  const servingTeam = gameState.serving.team;
  const servingTeamName = gameState.teams[servingTeam].name;
  const matchMode = safeMatchMode(gameState.matchMode);
  const winnerName =
    matchWon.winner ? gameState.teams[matchWon.winner].name : '';
  const gameWinnerName = gameWon.winner ? gameState.teams[gameWon.winner].name : '';

  const menuItems: MenuItem[] = [
    {
      icon: 'settings',
      label: 'Match setup',
      onClick: () => setSetupModalOpen(true),
    },
    {
      icon: keepAwake ? 'visibility' : 'visibility_off',
      label: keepAwake ? 'Keep screen awake: on' : 'Keep screen awake: off',
      onClick: onToggleKeepAwake,
    },
    {
      icon: 'restart_alt',
      label: 'Reset match',
      onClick: handleResetRequest,
      danger: true,
    },
  ];

  return (
    <div className="min-h-dvh" style={{ background: 'var(--kc-bg)' }}>
      {/* Score announcements for assistive tech, without visual duplication. */}
      <div className="sr-only" role="status" aria-live="polite">
        {gameState.teams.A.name} {gameState.teams.A.score}, {gameState.teams.B.name}{' '}
        {gameState.teams.B.score}. {servingTeamName} serving, server{' '}
        {gameState.serving.serverNumber}.
      </div>

      <AppHeader
        section="scoreboard"
        onSectionChange={onSectionChange}
        menuItems={menuItems}
        menuLabel="Match options"
        wakeLockActive={wakeLockActive}
      />

      {/* ========== VIEW CONTENT ========== */}
      {activeView === 'players' ? (
        <main className="pt-20 pb-28 md:pb-36 w-full animate-fade-in">
          <PlayersView
            gameState={gameState}
            gameWon={gameWon}
            matchWon={matchWon}
            momentum={momentum}
            matchStats={matchStats}
            longestRuns={longestRuns}
            servingPlayerIndex={servingPlayerIndex}
            receivingPlayerIndex={receivingPlayerIndex}
            onSwapPartners={swapPartners}
            onEditPlayers={() => setSetupModalOpen(true)}
          />
        </main>
      ) : (
        <main className="pt-20 px-4 max-w-5xl mx-auto pb-28 md:pb-36 w-full">
          {banner}

          {storageError && (
            <div
              role="alert"
              className="mb-4 rounded-2xl px-4 py-3 text-sm font-inter"
              style={{ background: 'var(--kc-surface-high)', color: 'var(--kc-error)' }}
            >
              {storageError}
            </div>
          )}

          {/* Match Won / Game Won Banners */}
          {matchWon.isWon ? (
            <div
              className="mb-6 rounded-[32px] p-8 text-center animate-fade-in"
              style={{ background: 'var(--kc-accent-container)', color: 'var(--kc-on-accent)' }}
            >
              <span className="material-symbols-outlined text-6xl mb-4" aria-hidden="true">trophy</span>
              <h2 className="font-lexend font-black text-2xl md:text-3xl uppercase tracking-widest mb-2 wrap-break-words">
                {winnerName} wins the match
              </h2>
              <p className="font-lexend text-lg opacity-80 uppercase tracking-widest">
                {matchMode === 'casual'
                  ? `${gameState.teams.A.score} — ${gameState.teams.B.score}`
                  : `Games ${gameState.gamesWon?.A ?? 0} — ${gameState.gamesWon?.B ?? 0}`}
              </p>
            </div>
          ) : gameWon.isWon ? (
            <div
              className="mb-6 rounded-3xl p-6 text-center animate-fade-in"
              style={{ background: 'var(--kc-surface-high)', border: '2px solid var(--kc-accent)' }}
            >
              <h3
                className="font-lexend font-bold text-xl uppercase tracking-widest mb-1 wrap-break-words"
                style={{ color: 'var(--kc-accent)' }}
              >
                {gameWinnerName} wins game {gameState.currentGame}
              </h3>
              <p className="text-sm font-medium" style={{ color: 'var(--kc-text-dim)' }}>
                Switch ends, then start the next game when you&apos;re ready.
              </p>
            </div>
          ) : null}

          {/* Game State Chips */}
          <div className="flex flex-wrap items-center gap-2 mb-6 animate-fade-in">
            <Chip background="var(--kc-secondary)" color="var(--kc-secondary-text)">
              Doubles • {MATCH_MODES[matchMode].label}
            </Chip>
            <Chip background="var(--kc-surface-highest)" color="var(--kc-text)">
              Game {gameState.currentGame}
              {matchMode !== 'casual' && ` of ${MATCH_MODES[matchMode].totalGames}`}
            </Chip>
            {!gameWon.isWon && !matchWon.isWon && (
              <Chip background="var(--kc-surface-highest)" color="var(--kc-accent)" className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--kc-accent)' }} />
                Live
              </Chip>
            )}
            {gamePoint.isGamePoint && (
              <Chip background="var(--kc-accent)" color="var(--kc-on-accent)" className="animate-pulse-glow">
                {matchPoint.isMatchPoint ? 'Match point' : 'Game point'} —{' '}
                {gamePoint.team ? gameState.teams[gamePoint.team].name : ''}
              </Chip>
            )}
            {momentum.streak.team && momentum.streak.count >= 3 && !gameWon.isWon && !matchWon.isWon && (
              <Chip background="var(--kc-surface-highest)" color="var(--kc-text)">
                🔥 {momentum.streak.count} streak
              </Chip>
            )}
          </div>

          {/* View Content */}
          <div className="space-y-6 animate-fade-in">
            {activeView === 'scoring' && (
              <>
                <ScoreDisplay
                  gameState={gameState}
                  servingTeam={servingTeam}
                  servingPlayerIndex={servingPlayerIndex}
                  lastAction={lastAction}
                  gamePoint={gamePoint}
                  matchPoint={matchPoint}
                />
                <ControlPanel
                  onScorePoint={scorePoint}
                  onFault={recordFault}
                  onResetRequest={handleResetRequest}
                  onRestartMatch={resetGameKeepSettings}
                  onNextGame={startNextGame}
                  onUndo={undo}
                  canUndo={canUndo}
                  isGameWon={gameWon.isWon}
                  isMatchWon={matchWon.isWon}
                  servingTeamName={servingTeamName}
                  serverNumber={gameState.serving.serverNumber}
                />
                <CourtDiagram
                  gameState={gameState}
                  servingTeam={servingTeam}
                  serverPosition={serverPosition}
                  servingPlayerIndex={servingPlayerIndex}
                  receivingPlayerIndex={receivingPlayerIndex}
                />
              </>
            )}

            {activeView === 'stats' && (
              <StatsView
                gameState={gameState}
                scoreCall={scoreCall}
                momentum={momentum}
                gamePoint={gamePoint}
                matchPoint={matchPoint}
                winProbability={winProbability}
                matchStats={matchStats}
                longestRuns={longestRuns}
                serveConversion={serveConversion}
              />
            )}

            {activeView === 'history' && (
              <HistoryView
                events={events}
                gameState={gameState}
                archive={archive}
                onDeleteMatch={deleteMatch}
                onClearArchive={clearArchive}
              />
            )}
          </div>
        </main>
      )}

      <BottomNav items={NAV_ITEMS} active={activeView} onChange={setActiveView} />

      {/* ========== MODALS ========== */}
      <PlayerSetupModal
        open={setupModalOpen}
        onOpenChange={setSetupModalOpen}
        teamAName={gameState.teams.A.name}
        teamBName={gameState.teams.B.name}
        teamAPlayers={gameState.teams.A.players}
        teamBPlayers={gameState.teams.B.players}
        currentMatchMode={matchMode}
        isMatchStarted={gameState.isMatchStarted}
        onSave={updateMatchSettings}
      />

      <ConfirmResetDialog
        open={confirmResetOpen}
        onOpenChange={setConfirmResetOpen}
        onConfirm={resetGame}
        onConfirmKeepSettings={resetGameKeepSettings}
      />
    </div>
  );
}
